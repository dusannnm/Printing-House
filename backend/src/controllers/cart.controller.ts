import express from 'express'
import CartM from '../models/cart'
import ProductM from '../models/product'
import InstitutionM from '../models/institution'
import UserM from '../models/user'
import OrderM from '../models/order'
import ProcurementM from '../models/procurement'
import { nextSequence } from '../models/counter'
import { OrderStatus } from '../constants/order-status'
import { BIDDING_DURATION_MS, ProcurementStatus } from '../constants/procurement-status'
import { UserType } from '../constants/user-type'
import { MAX_PRINT_TEXT } from '../constants/validation'

// Stavka korpe sa cenama izracunatim iz proizvoda na koji pokazuje
interface CartLine {
    index: number
    product_code: string
    product_name: string
    quantity: number
    color: string
    print_type: string
    print_text: string
    unit_price: number
    extra_price_per_piece: number
    line_total: number
}

// Sve sto se trazi od jedne stamparije - jedna grupa postaje jedna faktura
interface CartGroup {
    institution_id: string
    printer_name: string
    printer_city: string
    items: CartLine[]
    group_total: number
}

export class CartController {

    //   groups - pripremljeni proizvodi po stampariji, za client_individual
    //   requested_items - nazivi i kolicine, ono sto trazi client_legal i sto objavljuje nabavka
    getCart = (req: express.Request, res: express.Response) => {
        const username = String(req.params['username'] ?? '')

        CartM.findOne({ client_username: username }).then((cart) => {
            const items = cart?.items ?? []

            return this.buildGroups(items).then((groups) => {
                res.json({ groups: groups, requested_items: this.toRequestedItems(items) })
            })
        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    addItem = (req: express.Request, res: express.Response) => {
        const username = req.body.username
        const code = req.body.product_code
        const quantity = Number(req.body.quantity)

        if (!username || !code) {
            return res.status(400).json({ message: 'Client and product are required.' })
        }
        if (!Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({ message: 'Quantity must be a whole number greater than zero.' })
        }

        Promise.all([
            UserM.findOne({ username: username }),
            ProductM.findOne({ code: code })
        ]).then(([user, product]) => {
            if (!user) {
                res.status(404).json({ message: 'Client not found.' })
                return
            }
            if (!product) {
                res.status(404).json({ message: 'Product not found.' })
                return
            }
            // client_legal  ne kupuje proizvod izabrane stamparije, nego objavljuje nabavku
            if (user.type === UserType.CLIENT_LEGAL) {
                res.status(400).json({ message: 'A legal entity asks for products by name, not from one print shop.' })
                return
            }

            const problem = this.checkChoices(product, req.body)
            if (problem) {
                res.status(400).json({ message: problem })
                return
            }

            return CartM.findOne({ client_username: username }).then((cart) => {

                // I ono sto vec ceka u korpi ulazi u racun, inace bi isti proizvod mogao da se doda preko raspolozive kolicine
                const alreadyInCart = (cart?.items ?? [])
                    .filter((item) => item.product_code === code)
                    .reduce((sum, item) => sum + (item.quantity ?? 0), 0)

                if (alreadyInCart + quantity > (product.stock_quantity ?? 0)) {
                    res.status(400).json({ message: 'Not enough products currently in stock.' })
                    return
                }

                const item = {
                    product_name: product.name,
                    quantity: quantity,
                    product_code: code,
                    institution_id: product.institution_id,
                    color: req.body.color,
                    print_type: req.body.print_type ?? '',
                    print_text: req.body.print_text ?? ''
                }

                return CartM.findOneAndUpdate(
                    { client_username: username },
                    { $push: { items: item } },
                    { upsert: true }        // prva stavka pravi korpu
                ).then(() => {
                    res.json({ message: 'Product added to the cart.' })
                })
            })

        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // Dovoljni su naziv i kolicina; koja stamparija isporucuje odlucuje licitacija
    addRequest = (req: express.Request, res: express.Response) => {
        const username = req.body.username
        const productName = req.body.product_name
        const quantity = Number(req.body.quantity)

        if (!username || !productName) {
            return res.status(400).json({ message: 'Client and product are required.' })
        }
        if (!Number.isInteger(quantity) || quantity < 1) {
            return res.status(400).json({ message: 'Quantity must be a whole number greater than zero.' })
        }

        Promise.all([
            UserM.findOne({ username: username }),
            ProductM.find({ name: productName, stock_quantity: { $gt: 0 } })
        ]).then(([user, offered]) => {
            if (!user) {
                res.status(404).json({ message: 'Client not found.' })
                return
            }
            if (user.type !== UserType.CLIENT_LEGAL) {
                res.status(400).json({ message: 'Only a legal entity asks for products by name.' })
                return
            }
            if (offered.length === 0) {
                res.status(404).json({ message: 'No print shop currently offers that product.' })
                return
            }

            // Celu nabavku isporucuje jedna stamparija, pa zahtev ne sme biti veci od najvece kolicine koju drzi neka pojedinacna stamparija
            const bestStock = Math.max(...offered.map((product) => product.stock_quantity ?? 0))

            return CartM.findOne({ client_username: username }).then((cart) => {
                const existing = (cart?.items ?? []).find((item) => item.product_name === productName)
                const wanted = (existing?.quantity ?? 0) + quantity

                if (wanted > bestStock) {
                    res.status(400).json({ message: `No print shop has ${wanted} pieces of that product on stock. The largest amount available from one shop is ${bestStock}.` })
                    return
                }

                // Jedna stavka po nazivu proizvoda, da zahtev bude obican spisak
                const update = existing
                    ? { $set: { 'items.$[line].quantity': wanted } }
                    : { $push: { items: { product_name: productName, quantity: quantity } } }
                const options = existing
                    ? { arrayFilters: [{ 'line.product_name': productName }] }
                    : { upsert: true }

                return CartM.updateOne({ client_username: username }, update, options).then(() => {
                    res.json({ message: `${productName} added to the request.` })
                })
            })

        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // Stavka se bira po poziciji, jer korpa vraca upravo nju za svaki red
    removeItem = (req: express.Request, res: express.Response) => {
        const username = String(req.params['username'] ?? '')
        const index = Number(req.params['index'])

        if (!Number.isInteger(index) || index < 0) {
            return res.status(400).json({ message: 'Unknown cart line.' })
        }

        CartM.findOne({ client_username: username }).then((cart) => {
            if (!cart || index >= cart.items.length) {
                res.status(404).json({ message: 'Unknown cart line.' })
                return
            }

            cart.items.splice(index, 1)
            return cart.save().then(() => {
                res.json({ message: 'Product removed from the cart.' })
            })

        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // client_individual dobija po jednu fakturu za svaku stampariju, a client_legal umesto toga objavljuje javnu nabavku
    confirm = (req: express.Request, res: express.Response) => {
        const username = req.body.username

        if (!username) {
            return res.status(400).json({ message: 'Client is required.' })
        }

        Promise.all([
            UserM.findOne({ username: username }),
            CartM.findOne({ client_username: username })
        ]).then(([user, cart]) => {
            const items = cart?.items ?? []

            if (!user) {
                res.status(400).json({ message: 'Client not found.' })
                return
            }
            if (items.length === 0) {
                res.status(400).json({ message: 'Your cart is empty.' })
                return
            }

            if (user.type === UserType.CLIENT_LEGAL) {
                return this.openProcurement(user, this.toRequestedItems(items)).then((procurementId) => {
                    return this.emptyCart(username).then(() => {
                        res.json({
                            message: `Public procurement ${procurementId} was published. Print shops can send offers for the next 10 minutes.`,
                            procurement_id: procurementId
                        })
                    })
                })
            }

            return this.buildGroups(items).then((groups) => {
                // Stanje se proverava ponovo: neko drugi je mogao da kupi poslednje komade izmedju dodavanja u korpu i potvrde porudzbine
                return this.checkStockAgain(groups).then((problem) => {
                    if (problem) {
                        res.status(400).json({ message: problem })
                        return
                    }

                    return Promise.all(groups.map((group) => this.createInvoice(user, group)))
                        .then((invoiceIds) => {
                            return this.emptyCart(username).then(() => {
                                res.json({
                                    message: invoiceIds.length === 1
                                        ? 'Order confirmed. One invoice was created.'
                                        : `Order confirmed. ${invoiceIds.length} invoices were created, one per print shop.`,
                                    invoice_ids: invoiceIds
                                })
                            })
                        })
                })
            })

        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // ---------------------------------------------------------------- helpers -

    private emptyCart = (username: string) => {
        return CartM.updateOne({ client_username: username }, { $set: { items: [] } })
    }

    // Nazivi i kolicine koje objavljuje nabavka. Korpa client_legal je vec u tom obliku, u ostalim slucajevima se stavke sabiraju
    private toRequestedItems = (items: any[]) => {
        const wanted = new Map<string, number>()
        items.forEach((item) => {
            wanted.set(item.product_name, (wanted.get(item.product_name) ?? 0) + item.quantity)
        })
        return [...wanted].map(([product_name, quantity]) => ({ product_name, quantity }))
    }

    // Zahtev se objavljuje kao poziv za ponude umesto da se odmah kupi
    private openProcurement = (user: any, requestedItems: any[]): Promise<number> => {
        return nextSequence('procurement').then((procurementId) => {
            return new ProcurementM({
                procurement_id: procurementId,
                client_institution_id: user.institution_id,
                opened_by: user.username,
                closes_at: new Date(Date.now() + BIDDING_DURATION_MS),
                requested_items: requestedItems,
                bids: [],
                status: ProcurementStatus.OPEN
            }).save().then(() => procurementId)
        })
    }

    // Racuna cenu svake pripremljene stavke i grupise ih po stampariji
    // Stavke koje nose samo naziv se preskacu - one su od client_legal i jos nemaju ni stampariju ni cenu
    private buildGroups = (items: any[]): Promise<CartGroup[]> => {
        const prepared = items.filter((item) => item.product_code)
        if (prepared.length === 0) {
            return Promise.resolve([])
        }

        return Promise.all([
            ProductM.find({ code: { $in: prepared.map((item) => item.product_code) } }),
            InstitutionM.find({ _id: { $in: prepared.map((item) => item.institution_id) } })
        ]).then(([products, institutions]) => {

            const groups = new Map<string, CartGroup>()

            items.forEach((item, index) => {
                const product = products.find((candidate) => candidate.code === item.product_code)
                if (!product) {
                    return          // stavka zahteva, ili je stamparija obrisala proizvod
                }

                const service = (product.print_services ?? [])
                    .find((candidate) => candidate.print_type === item.print_type)
                const extra = service?.extra_price_per_piece ?? 0
                const quantity = item.quantity ?? 0

                const line: CartLine = {
                    index: index,
                    product_code: product.code!,
                    product_name: product.name!,
                    quantity: quantity,
                    color: item.color ?? '',
                    print_type: item.print_type ?? '',
                    print_text: item.print_text ?? '',
                    unit_price: product.unit_price!,
                    extra_price_per_piece: extra,
                    line_total: (product.unit_price! + extra) * quantity
                }

                const institutionId = item.institution_id!
                if (!groups.has(institutionId)) {
                    const institution = institutions.find((candidate) => candidate._id === institutionId)
                    groups.set(institutionId, {
                        institution_id: institutionId,
                        printer_name: institution?.name ?? '',
                        printer_city: institution?.city ?? '',
                        items: [],
                        group_total: 0
                    })
                }

                const group = groups.get(institutionId)!
                group.items.push(line)
                group.group_total += line.line_total
            })

            return [...groups.values()]
        })
    }

    // Sabira koliko korpa trazi od svakog proizvoda i uporedjuje sa stanjem
    private checkStockAgain = (groups: CartGroup[]): Promise<string | null> => {
        const wanted = new Map<string, number>()
        groups.forEach((group) => group.items.forEach((line) => {
            wanted.set(line.product_code, (wanted.get(line.product_code) ?? 0) + line.quantity)
        }))

        return ProductM.find({ code: { $in: [...wanted.keys()] } }).then((products) => {
            for (const product of products) {
                if (wanted.get(product.code!)! > (product.stock_quantity ?? 0)) {
                    return `Not enough products currently in stock: ${product.name}.`
                }
            }
            return null
        })
    }

    // Jedna grupa stavki postaje jedna faktura, a poruceni komadi odmah odlaze sa stanja
    private createInvoice = (user: any, group: CartGroup): Promise<number> => {
        return nextSequence('invoice').then((invoiceId) => {
            const order = new OrderM({
                invoice_id: invoiceId,
                client_username: user.username,
                client_institution_id: user.institution_id,
                printer_institution_id: group.institution_id,
                items: group.items.map((line) => ({
                    product_code: line.product_code,
                    product_name: line.product_name,
                    quantity: line.quantity,
                    color: line.color,
                    print_type: line.print_type,
                    print_text: line.print_text,
                    unit_price: line.unit_price,
                    extra_price_per_piece: line.extra_price_per_piece,
                    line_total: line.line_total
                })),
                total_amount: group.group_total,
                status: OrderStatus.ORDERED
            })

            return order.save().then(() => {
                const takeFromStock = group.items.map((line) => ProductM.updateOne(
                    { code: line.product_code },
                    { $inc: { stock_quantity: -line.quantity } }
                ))
                return Promise.all(takeFromStock).then(() => invoiceId)
            })
        })
    }

    // Boja i vrsta stampe moraju da budu one koje stamparija stvarno nudi za ovaj proizvod
    // Browser nudi samo ispravne, ali zahtev moze da stigne i mimo njega
    private checkChoices = (product: any, body: any): string | null => {
        const printType = body.print_type ?? ''
        const offered = product.print_services ?? []

        if (offered.length > 0 && !printType) {
            return 'Choose a type of print.'
        }
        if (printType && !offered.some((service: any) => service.print_type === printType)) {
            return 'That type of print is not offered for this product.'
        }
        if (printType && !body.print_text) {
            return 'Enter the text that should be printed.'
        }
        if (String(body.print_text ?? '').length > MAX_PRINT_TEXT) {
            return `The text to be printed can be at most ${MAX_PRINT_TEXT} characters long.`
        }

        // Proizvod bez drugih boja se nudi u beloj
        const colors = (product.colors ?? []).length > 0 ? product.colors : ['White']
        if (!colors.includes(body.color)) {
            return 'That colour is not offered for this product.'
        }

        return null
    }
}
