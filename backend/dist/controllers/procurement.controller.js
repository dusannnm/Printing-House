"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcurementController = void 0;
const procurement_1 = __importDefault(require("../models/procurement"));
const product_1 = __importDefault(require("../models/product"));
const institution_1 = __importDefault(require("../models/institution"));
const user_1 = __importDefault(require("../models/user"));
const order_1 = __importDefault(require("../models/order"));
const counter_1 = require("../models/counter");
const order_status_1 = require("../constants/order-status");
const procurement_status_1 = require("../constants/procurement-status");
const user_type_1 = require("../constants/user-type");
class ProcurementController {
    constructor() {
        // Nabavke ustanove u kojoj nalog username radi. 
        // Pre slanja spiska zatvaraju se one kojima je isteklo vreme za licitaciju, provera se radi kad se ustanova koja je objavila nabavku vrati na stranicu
        this.forClient = (req, res) => {
            const username = String(req.params['username'] ?? '');
            user_1.default.findOne({ username: username }).then((user) => {
                if (!user || !user.institution_id) {
                    res.status(404).json({ message: 'Institution not found.' });
                    return;
                }
                const institutionId = user.institution_id;
                return this.closeExpired(institutionId)
                    .then(() => procurement_1.default.find({ client_institution_id: institutionId }).sort({ opened_at: -1 }))
                    .then((procurements) => this.withPrinterNames(procurements))
                    .then((enriched) => res.json(enriched));
            }).catch((err) => {
                console.error(err);
                res.status(500).json({ message: 'Server error, please try again.' });
            });
        };
        // Nabavke na koje stamparija jos moze da se javi
        this.openForPrinter = (req, res) => {
            this.institutionOf(String(req.params['username'] ?? '')).then((institutionId) => {
                if (!institutionId) {
                    res.status(404).json({ message: 'Print shop not found.' });
                    return;
                }
                return procurement_1.default.find({
                    status: procurement_status_1.ProcurementStatus.OPEN,
                    closes_at: { $gt: new Date() }
                }).sort({ closes_at: 1 }).then((procurements) => {
                    const wantedNames = procurements.flatMap((one) => one.requested_items.map((item) => item.product_name));
                    return Promise.all([
                        product_1.default.find({ institution_id: institutionId, name: { $in: wantedNames } }),
                        institution_1.default.find({ _id: { $in: procurements.map((one) => one.client_institution_id) } })
                    ]).then(([products, institutions]) => {
                        const rows = procurements.map((procurement) => {
                            const client = institutions.find((one) => one._id === procurement.client_institution_id);
                            // Jedna stavka ponude po trazenom proizvodu, uparena po nazivu
                            const offerLines = procurement.requested_items.map((item) => {
                                const product = products.find((one) => one.name === item.product_name);
                                return {
                                    product_name: item.product_name,
                                    quantity: item.quantity,
                                    product_code: product?.code ?? '',
                                    unit_price: product?.unit_price ?? 0,
                                    stock_quantity: product?.stock_quantity ?? 0,
                                    enough: !!product && (product.stock_quantity ?? 0) >= (item.quantity ?? 0)
                                };
                            });
                            return {
                                procurement_id: procurement.procurement_id,
                                opened_at: procurement.opened_at,
                                closes_at: procurement.closes_at,
                                client_name: client?.name ?? '',
                                requested_items: procurement.requested_items,
                                offer_lines: offerLines,
                                can_supply: offerLines.every((line) => line.enough),
                                already_bid: procurement.bids.some((bid) => bid.institution_id === institutionId)
                            };
                        });
                        res.json(rows);
                    });
                });
            }).catch((err) => {
                console.error(err);
                res.status(500).json({ message: 'Server error, please try again.' });
            });
        };
        // Cene dolaze od stamparije, a kolicine iz same nabavke, da ponuda ne moze da izmeni ono sto je trazeno
        this.submitBid = (req, res) => {
            const procurementId = Number(req.params['procurementId']);
            const username = req.body.username;
            const prices = req.body.prices ?? {};
            if (!Number.isInteger(procurementId)) {
                return res.status(404).json({ message: 'Public procurement not found.' });
            }
            Promise.all([
                this.institutionOf(username),
                procurement_1.default.findOne({ procurement_id: procurementId })
            ]).then(([institutionId, procurement]) => {
                if (!institutionId) {
                    res.status(404).json({ message: 'Print shop not found.' });
                    return;
                }
                if (!procurement) {
                    res.status(404).json({ message: 'Public procurement not found.' });
                    return;
                }
                if (procurement.status !== procurement_status_1.ProcurementStatus.OPEN || procurement.closes_at <= new Date()) {
                    res.status(400).json({ message: 'The bidding for this public procurement is closed.' });
                    return;
                }
                if (procurement.bids.some((bid) => bid.institution_id === institutionId)) {
                    res.status(400).json({ message: 'This print shop has already sent an offer for this public procurement.' });
                    return;
                }
                return product_1.default.find({ institution_id: institutionId }).then((products) => {
                    const items = [];
                    for (const requested of procurement.requested_items) {
                        const product = products.find((one) => one.name === requested.product_name);
                        const quantity = requested.quantity ?? 0;
                        if (!product) {
                            res.status(400).json({ message: `This print shop does not offer ${requested.product_name}.` });
                            return;
                        }
                        if ((product.stock_quantity ?? 0) < quantity) {
                            res.status(400).json({ message: `Not enough ${requested.product_name} on stock: ${quantity} needed, ${product.stock_quantity} available.` });
                            return;
                        }
                        const unitPrice = Number(prices[requested.product_name]);
                        if (!(unitPrice > 0)) {
                            res.status(400).json({ message: `Enter a price greater than zero for ${requested.product_name}.` });
                            return;
                        }
                        items.push({
                            product_code: product.code,
                            product_name: product.name,
                            quantity: quantity,
                            unit_price: unitPrice,
                            line_total: unitPrice * quantity
                        });
                    }
                    const total = items.reduce((sum, item) => sum + item.line_total, 0);
                    return procurement_1.default.updateOne({ procurement_id: procurementId }, {
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
                        res.json({ message: `Offer of ${total} RSD sent for public procurement ${procurementId}.` });
                    });
                });
            }).catch((err) => {
                console.error(err);
                res.status(500).json({ message: 'Server error, please try again.' });
            });
        };
        // ---------------------------------------------------------------- helpers -
        // Stamparija u kojoj zaposleni radi, null za sve ostale
        this.institutionOf = (username) => {
            return user_1.default.findOne({ username: username }).then((user) => {
                if (user?.type !== user_type_1.UserType.PRINTER) {
                    return null;
                }
                return user.institution_id ?? null;
            });
        };
        // Zatvara sve nabavke ove ustanove kojima je isteklo vreme za licitaciju
        this.closeExpired = (institutionId) => {
            return procurement_1.default.find({
                client_institution_id: institutionId,
                status: procurement_status_1.ProcurementStatus.OPEN,
                closes_at: { $lte: new Date() }
            }).then((expired) => {
                // Jedna po jedna, da se dve nabavke ne bore oko istog stanja na lageru
                return expired.reduce((chain, procurement) => chain.then(() => this.award(procurement)), Promise.resolve());
            });
        };
        // "Pobednik" je najjeftinija ponuda medju stamparijama koje imaju dovoljno svakog trazenog proizvoda na stanju
        this.award = (procurement) => {
            const bids = procurement.bids ?? [];
            if (bids.length === 0) {
                procurement.status = procurement_status_1.ProcurementStatus.FAILED;
                return procurement.save().then(() => undefined);
            }
            // Od najjeftinije, da pobedi prva ponuda koja stvarno moze da se isporuci
            const ranked = [...bids].sort((a, b) => a.total_amount - b.total_amount);
            return this.firstDeliverable(ranked, 0).then((winner) => {
                if (!winner) {
                    procurement.status = procurement_status_1.ProcurementStatus.FAILED;
                    return procurement.save().then(() => undefined);
                }
                return this.invoiceWinner(procurement, winner).then((invoiceId) => {
                    procurement.status = procurement_status_1.ProcurementStatus.AWARDED;
                    procurement.winner_institution_id = winner.institution_id;
                    procurement.invoice_id = invoiceId;
                    return procurement.save().then(() => undefined);
                });
            });
        };
        // Ide kroz ponude od najjeftinije i vraca prvu ciju isporuku stamparija jos moze da pokrije
        this.firstDeliverable = (ranked, index) => {
            if (index >= ranked.length) {
                return Promise.resolve(null);
            }
            const bid = ranked[index];
            return product_1.default.find({ code: { $in: bid.items.map((item) => item.product_code) } })
                .then((products) => {
                const canDeliver = bid.items.every((item) => {
                    const product = products.find((candidate) => candidate.code === item.product_code);
                    return product !== undefined && (product.stock_quantity ?? 0) >= item.quantity;
                });
                return canDeliver ? bid : this.firstDeliverable(ranked, index + 1);
            });
        };
        // Pobednicka ponuda postaje faktura, odmah u statusu "u stampi"
        this.invoiceWinner = (procurement, bid) => {
            return (0, counter_1.nextSequence)('invoice').then((invoiceId) => {
                return new order_1.default({
                    invoice_id: invoiceId,
                    client_username: procurement.opened_by,
                    client_institution_id: procurement.client_institution_id,
                    printer_institution_id: bid.institution_id,
                    items: bid.items.map((item) => ({
                        product_code: item.product_code,
                        product_name: item.product_name,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        extra_price_per_piece: 0,
                        line_total: item.line_total
                    })),
                    total_amount: bid.total_amount,
                    status: order_status_1.OrderStatus.IN_PRINTING,
                    procurement_id: procurement.procurement_id
                }).save().then(() => {
                    const takeFromStock = bid.items.map((item) => product_1.default.updateOne({ code: item.product_code }, { $inc: { stock_quantity: -item.quantity } }));
                    return Promise.all(takeFromStock).then(() => invoiceId);
                });
            });
        };
        // Ponuda cuva samo ustanovu koja ju je poslala, pa se nazivi dovlace jednom za ceo spisak
        this.withPrinterNames = (procurements) => {
            const institutionIds = procurements.flatMap((procurement) => [
                ...procurement.bids.map((bid) => bid.institution_id),
                procurement.winner_institution_id
            ]).filter((id) => id);
            return institution_1.default.find({ _id: { $in: institutionIds } }).then((institutions) => {
                const nameOf = (id) => institutions.find((one) => one._id === id)?.name ?? '';
                return procurements.map((procurement) => ({
                    ...procurement.toObject(),
                    winner_name: nameOf(procurement.winner_institution_id),
                    bids: procurement.bids.map((bid) => ({
                        ...bid.toObject(),
                        printer_name: nameOf(bid.institution_id)
                    }))
                }));
            });
        };
    }
}
exports.ProcurementController = ProcurementController;
