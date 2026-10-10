import express from 'express'
import ProcurementM from '../models/procurement'
import ProductM from '../models/product'
import InstitutionM from '../models/institution'
import UserM from '../models/user'
import OrderM from '../models/order'
import { nextSequence } from '../models/counter'
import { OrderStatus } from '../constants/order-status'
import { ProcurementStatus } from '../constants/procurement-status'
import { UserType } from '../constants/user-type'

export class ProcurementController {

    // Nabavke ustanove u kojoj nalog username radi. 
    // Pre slanja spiska zatvaraju se one kojima je isteklo vreme za licitaciju, provera se radi kad se ustanova koja je objavila nabavku vrati na stranicu
    forClient = (req: express.Request, res: express.Response) => {
        const username = String(req.params['username'] ?? '')

        UserM.findOne({ username: username }).then((user) => {
            if (!user || !user.institution_id) {
                res.status(404).json({ message: 'Institution not found.' })
                return
            }
            const institutionId = user.institution_id

            return this.closeExpired(institutionId)
                .then(() => ProcurementM.find({ client_institution_id: institutionId }).sort({ opened_at: -1 }))
                .then((procurements) => this.withPrinterNames(procurements))
                .then((enriched) => res.json(enriched))

        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // Nabavke na koje stamparija jos moze da se javi
    openForPrinter = (req: express.Request, res: express.Response) => {
        this.institutionOf(String(req.params['username'] ?? '')).then((institutionId) => {
            if (!institutionId) {
                res.status(404).json({ message: 'Print shop not found.' })
                return
            }

            return ProcurementM.find({
                status: ProcurementStatus.OPEN,
                closes_at: { $gt: new Date() }
            }).sort({ closes_at: 1 }).then((procurements) => {

                const wantedNames = procurements.flatMap((one) =>
                    one.requested_items.map((item) => item.product_name))

                return Promise.all([
                    ProductM.find({ institution_id: institutionId, name: { $in: wantedNames } }),
                    InstitutionM.find({ _id: { $in: procurements.map((one) => one.client_institution_id) } })
                ]).then(([products, institutions]) => {

                    const rows = procurements.map((procurement) => {
                        const client = institutions.find((one) => one._id === procurement.client_institution_id)

                        // Jedna stavka ponude po trazenom proizvodu, uparena po nazivu
                        const offerLines = procurement.requested_items.map((item) => {
                            const product = products.find((one) => one.name === item.product_name)
                            return {
                                product_name: item.product_name,
                                quantity: item.quantity,
                                product_code: product?.code ?? '',
                                unit_price: product?.unit_price ?? 0,
                                stock_quantity: product?.stock_quantity ?? 0,
                                enough: !!product && (product.stock_quantity ?? 0) >= (item.quantity ?? 0)
                            }
                        })

                        return {
                            procurement_id: procurement.procurement_id,
                            opened_at: procurement.opened_at,
                            closes_at: procurement.closes_at,
                            client_name: client?.name ?? '',
                            requested_items: procurement.requested_items,
                            offer_lines: offerLines,
                            can_supply: offerLines.every((line) => line.enough),
                            already_bid: procurement.bids.some((bid) => bid.institution_id === institutionId)
                        }
                    })

                    res.json(rows)
                })
            })

        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // Cene dolaze od stamparije, a kolicine iz same nabavke, da ponuda ne moze da izmeni ono sto je trazeno
    submitBid = (req: express.Request, res: express.Response) => {
        const procurementId = Number(req.params['procurementId'])
        const username = req.body.username
        const prices = req.body.prices ?? {}

        if (!Number.isInteger(procurementId)) {
            return res.status(404).json({ message: 'Public procurement not found.' })
        }

        Promise.all([
            this.institutionOf(username),
            ProcurementM.findOne({ procurement_id: procurementId })
        ]).then(([institutionId, procurement]) => {
            if (!institutionId) {
                res.status(404).json({ message: 'Print shop not found.' })
                return
            }
            if (!procurement) {
                res.status(404).json({ message: 'Public procurement not found.' })
                return
            }
            if (procurement.status !== ProcurementStatus.OPEN || procurement.closes_at! <= new Date()) {
                res.status(400).json({ message: 'The bidding for this public procurement is closed.' })
                return
            }
            if (procurement.bids.some((bid) => bid.institution_id === institutionId)) {
                res.status(400).json({ message: 'This print shop has already sent an offer for this public procurement.' })
                return
            }

            return ProductM.find({ institution_id: institutionId }).then((products) => {
                const items = []

                for (const requested of procurement.requested_items) {
                    const product = products.find((one) => one.name === requested.product_name)
                    const quantity = requested.quantity ?? 0

                    if (!product) {
                        res.status(400).json({ message: `This print shop does not offer ${requested.product_name}.` })
                        return
                    }
                    if ((product.stock_quantity ?? 0) < quantity) {
                        res.status(400).json({ message: `Not enough ${requested.product_name} on stock: ${quantity} needed, ${product.stock_quantity} available.` })
                        return
                    }

                    const unitPrice = Number(prices[requested.product_name!])
                    if (!(unitPrice > 0)) {
                        res.status(400).json({ message: `Enter a price greater than zero for ${requested.product_name}.` })
                        return
                    }

                    items.push({
                        product_code: product.code,
                        product_name: product.name,
                        quantity: quantity,
                        unit_price: unitPrice,
                        line_total: unitPrice * quantity
                    })
                }

                const total = items.reduce((sum, item) => sum + item.line_total, 0)

                return ProcurementM.updateOne({ procurement_id: procurementId }, {
                    $push: {
                        bids: {
                            institution_id: institutionId,
                            submitted_by: username,
                            items: items,
                            total_amount: total,
                            submitted_at: new Date()
                        }
                    }
                }).then(() => {
                    res.json({ message: `Offer of ${total} RSD sent for public procurement ${procurementId}.` })
                })
            })

        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // ---------------------------------------------------------------- helpers -

    // Stamparija u kojoj zaposleni radi, null za sve ostale
    private institutionOf = (username: string): Promise<string | null> => {
        return UserM.findOne({ username: username }).then((user) => {
            if (user?.type !== UserType.PRINTER) {
                return null
            }
            return user.institution_id ?? null
        })
    }

    // Zatvara sve nabavke ove ustanove kojima je isteklo vreme za licitaciju
    private closeExpired = (institutionId: string): Promise<void> => {
        return ProcurementM.find({
            client_institution_id: institutionId,
            status: ProcurementStatus.OPEN,
            closes_at: { $lte: new Date() }
        }).then((expired) => {
            // Jedna po jedna, da se dve nabavke ne bore oko istog stanja na lageru
            return expired.reduce(
                (chain, procurement) => chain.then(() => this.award(procurement)),
                Promise.resolve()
            )
        })
    }

    // "Pobednik" je najjeftinija ponuda medju stamparijama koje imaju dovoljno svakog trazenog proizvoda na stanju
    private award = (procurement: any): Promise<void> => {
        const bids = procurement.bids ?? []

        if (bids.length === 0) {
            procurement.status = ProcurementStatus.FAILED
            return procurement.save().then(() => undefined)
        }

        // Od najjeftinije, da pobedi prva ponuda koja stvarno moze da se isporuci
        const ranked = [...bids].sort((a, b) => a.total_amount - b.total_amount)

        return this.firstDeliverable(ranked, 0).then((winner) => {
            if (!winner) {
                procurement.status = ProcurementStatus.FAILED
                return procurement.save().then(() => undefined)
            }

            return this.invoiceWinner(procurement, winner).then((invoiceId) => {
                procurement.status = ProcurementStatus.AWARDED
                procurement.winner_institution_id = winner.institution_id
                procurement.invoice_id = invoiceId
                return procurement.save().then(() => undefined)
            })
        })
    }

    // Ide kroz ponude od najjeftinije i vraca prvu ciju isporuku stamparija jos moze da pokrije
    private firstDeliverable = (ranked: any[], index: number): Promise<any | null> => {
        if (index >= ranked.length) {
            return Promise.resolve(null)
        }

        const bid = ranked[index]
        return ProductM.find({ code: { $in: bid.items.map((item: any) => item.product_code) } })
            .then((products) => {
                const canDeliver = bid.items.every((item: any) => {
                    const product = products.find((candidate) => candidate.code === item.product_code)
                    return product !== undefined && (product.stock_quantity ?? 0) >= item.quantity
                })

                return canDeliver ? bid : this.firstDeliverable(ranked, index + 1)
            })
    }

    // Pobednicka ponuda postaje faktura, odmah u statusu "u stampi"
    private invoiceWinner = (procurement: any, bid: any): Promise<number> => {
        return nextSequence('invoice').then((invoiceId) => {
            return new OrderM({
                invoice_id: invoiceId,
                client_username: procurement.opened_by,
                client_institution_id: procurement.client_institution_id,
                printer_institution_id: bid.institution_id,
                items: bid.items.map((item: any) => ({
                    product_code: item.product_code,
                    product_name: item.product_name,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    extra_price_per_piece: 0,
                    line_total: item.line_total
                })),
                total_amount: bid.total_amount,
                status: OrderStatus.IN_PRINTING,
                procurement_id: procurement.procurement_id
            }).save().then(() => {
                const takeFromStock = bid.items.map((item: any) => ProductM.updateOne(
                    { code: item.product_code },
                    { $inc: { stock_quantity: -item.quantity } }
                ))
                return Promise.all(takeFromStock).then(() => invoiceId)
            })
        })
    }

    // Ponuda cuva samo ustanovu koja ju je poslala, pa se nazivi dovlace jednom za ceo spisak
    private withPrinterNames = (procurements: any[]): Promise<any[]> => {
        const institutionIds = procurements.flatMap((procurement) => [
            ...procurement.bids.map((bid: any) => bid.institution_id),
            procurement.winner_institution_id
        ]).filter((id) => id)

        return InstitutionM.find({ _id: { $in: institutionIds } }).then((institutions) => {
            const nameOf = (id: string) => institutions.find((one) => one._id === id)?.name ?? '';

            return procurements.map((procurement) => ({
                ...procurement.toObject(),
                winner_name: nameOf(procurement.winner_institution_id),
                bids: procurement.bids.map((bid: any) => ({
                    ...bid.toObject(),
                    printer_name: nameOf(bid.institution_id)
                }))
            }))
        })
    }
}
