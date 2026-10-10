"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderController = void 0;
const order_1 = __importDefault(require("../models/order"));
const user_1 = __importDefault(require("../models/user"));
const product_1 = __importDefault(require("../models/product"));
const institution_1 = __importDefault(require("../models/institution"));
const order_status_1 = require("../constants/order-status");
const user_type_1 = require("../constants/user-type");
class OrderController {
    constructor() {
        // client_individual vidi svoje fakture, a client_legal sve sto je ustanova porucila, bez obzira koji zaposleni je porucio
        this.forClient = (req, res) => {
            const username = String(req.params['username'] ?? '');
            this.ownerFilter(username).then((owner) => {
                if (!owner) {
                    res.status(404).json({ message: 'User not found.' });
                    return;
                }
                return order_1.default.aggregate([
                    { $match: owner },
                    // Naziv i grad stamparije stoje na ustanovi, a ne na fakturi
                    {
                        $lookup: {
                            from: 'institutions',
                            localField: 'printer_institution_id',
                            foreignField: '_id',
                            as: 'printer'
                        }
                    },
                    {
                        $addFields: {
                            printer_name: { $first: '$printer.name' },
                            printer_city: { $first: '$printer.city' }
                        }
                    },
                    { $sort: { ordered_at: -1 } }, // najnovije prvo, pre nego sto tabela sortira
                    {
                        $project: {
                            _id: 0,
                            invoice_id: 1, client_username: 1, client_institution_id: 1,
                            printer_institution_id: 1, printer_name: 1, printer_city: 1,
                            items: 1, total_amount: 1, status: 1,
                            procurement_id: 1, ordered_at: 1, delivered_at: 1, received_at: 1
                        }
                    }
                ]).then((orders) => {
                    res.json(orders);
                });
            }).catch((err) => {
                console.error(err);
                res.status(500).json({ message: 'Server error, please try again.' });
            });
        };
        // Arhiva nabraja proizvode, ne fakture
        this.archive = (req, res) => {
            const username = String(req.params['username'] ?? '');
            this.ownerFilter(username).then((owner) => {
                if (!owner) {
                    res.status(404).json({ message: 'User not found.' });
                    return;
                }
                return order_1.default.find({
                    ...owner,
                    status: { $in: [order_status_1.OrderStatus.DELIVERED, order_status_1.OrderStatus.RECEIVED] }
                }).then((orders) => {
                    const codes = orders.flatMap((order) => order.items.map((item) => item.product_code));
                    const institutionIds = orders.map((order) => order.printer_institution_id);
                    return Promise.all([
                        product_1.default.find({ code: { $in: codes } }),
                        institution_1.default.find({ _id: { $in: institutionIds } })
                    ]).then(([products, institutions]) => {
                        const rows = orders.flatMap((order) => order.items.map((item) => {
                            const product = products.find((one) => one.code === item.product_code);
                            const printer = institutions.find((one) => one._id === order.printer_institution_id);
                            // Reakcija i komentar se vezu za osobu, ne za ustanovu, pa dvoje kolega ocenjuju proizvod odvojeno
                            const myReaction = (product?.reactions ?? [])
                                .find((reaction) => reaction.username === username);
                            return {
                                invoice_id: order.invoice_id,
                                status: order.status,
                                ordered_at: order.ordered_at,
                                product_code: item.product_code,
                                product_name: item.product_name,
                                quantity: item.quantity,
                                printer_name: printer?.name ?? '',
                                printer_city: printer?.city ?? '',
                                my_reaction: myReaction?.value ?? 0,
                                has_commented: (product?.comments ?? [])
                                    .some((comment) => comment.username === username)
                            };
                        }));
                        // Podrazumevano po datumu porucivanja, ostale kolone se sortiraju u pregledacu
                        rows.sort((first, second) => new Date(second.ordered_at).getTime() - new Date(first.ordered_at).getTime());
                        res.json(rows);
                    });
                });
            }).catch((err) => {
                console.error(err);
                res.status(500).json({ message: 'Server error, please try again.' });
            });
        };
        // Status pripada celoj fakturi, pa svi proizvodi na njoj postaju primljeni odjednom
        this.markReceived = (req, res) => {
            const invoiceId = Number(req.params['invoiceId']);
            const username = req.body.username;
            if (!Number.isInteger(invoiceId) || !username) {
                return res.status(400).json({ message: 'Invoice and client are required.' });
            }
            this.ownerFilter(username).then((owner) => {
                if (!owner) {
                    res.status(404).json({ message: 'User not found.' });
                    return;
                }
                return order_1.default.findOne({ ...owner, invoice_id: invoiceId }).then((order) => {
                    if (!order) {
                        res.status(404).json({ message: 'Invoice not found.' });
                        return;
                    }
                    if (order.status !== order_status_1.OrderStatus.DELIVERED) {
                        res.status(400).json({ message: 'Only a delivered invoice can be marked as received.' });
                        return;
                    }
                    order.status = order_status_1.OrderStatus.RECEIVED;
                    order.received_at = new Date();
                    return order.save().then(() => {
                        res.json({ message: `Invoice ${invoiceId} marked as received.` });
                    });
                });
            }).catch((err) => {
                console.error(err);
                res.status(500).json({ message: 'Server error, please try again.' });
            });
        };
        // Fakture upucene stampariji u kojoj zaposleni radi. Deli ih cela stamparija, svi zaposleni vide
        this.forPrinter = (req, res) => {
            this.institutionOf(String(req.params['username'] ?? '')).then((institutionId) => {
                if (!institutionId) {
                    res.status(404).json({ message: 'Print shop not found.' });
                    return;
                }
                return order_1.default.find({ printer_institution_id: institutionId })
                    .sort({ ordered_at: -1 })
                    .then((orders) => this.withClientNames(orders))
                    .then((rows) => res.json(rows));
            }).catch((err) => {
                console.error(err);
                res.status(500).json({ message: 'Server error, please try again.' });
            });
        };
        // poruceno -> u stampi -> isporuceno; dalje stamparija ne moze, prijem potvrdjuje samo klijent
        this.advance = (req, res) => {
            const invoiceId = Number(req.params['invoiceId']);
            const username = req.body.username;
            if (!Number.isInteger(invoiceId)) {
                return res.status(400).json({ message: 'Invoice not found.' });
            }
            Promise.all([
                this.institutionOf(username),
                order_1.default.findOne({ invoice_id: invoiceId })
            ]).then(([institutionId, order]) => {
                if (!order) {
                    res.status(404).json({ message: 'Invoice not found.' });
                    return;
                }
                if (!institutionId || order.printer_institution_id !== institutionId) {
                    res.status(403).json({ message: 'That invoice belongs to another print shop.' });
                    return;
                }
                // Status kog nema u tabeli stamparija ne sme da pomera
                const nextStatus = order_status_1.PRINTER_TRANSITIONS[order.status];
                if (nextStatus === undefined) {
                    res.status(400).json({ message: 'This invoice cannot be moved any further by the print shop.' });
                    return;
                }
                // Datum isporuke se upisuje samo pri prelasku u "isporuceno"
                const change = {
                    status: nextStatus,
                    handled_by: username,
                    ...(nextStatus === order_status_1.OrderStatus.DELIVERED ? { delivered_at: new Date() } : {})
                };
                return order_1.default.updateOne({ invoice_id: invoiceId }, change).then(() => {
                    res.json({
                        message: nextStatus === order_status_1.OrderStatus.IN_PRINTING
                            ? `Invoice ${invoiceId} is now in printing.`
                            : `Invoice ${invoiceId} is delivered. The client confirms when it arrives.`
                    });
                });
            }).catch((err) => {
                console.error(err);
                res.status(500).json({ message: 'Server error, please try again.' });
            });
        };
        // Komadi se vracaju na stanje, a faktura ostaje obelezena kao ponistena zbog istorije
        this.cancel = (req, res) => {
            const invoiceId = Number(req.params['invoiceId']);
            const username = req.body.username;
            if (!Number.isInteger(invoiceId) || !username) {
                return res.status(400).json({ message: 'Invoice not found.' });
            }
            this.ownerFilter(username).then((owner) => {
                if (!owner) {
                    res.status(404).json({ message: 'User not found.' });
                    return;
                }
                return order_1.default.findOne({ ...owner, invoice_id: invoiceId }).then((order) => {
                    if (!order) {
                        res.status(404).json({ message: 'Invoice not found.' });
                        return;
                    }
                    // Ponistava se samo "poruceno" - kad stampa krene, rad stamparije je vec utrosen
                    if (order.status !== order_status_1.OrderStatus.ORDERED) {
                        res.status(400).json({ message: 'Only an order that has not gone into printing yet can be cancelled.' });
                        return;
                    }
                    const putBackOnStock = order.items.map((item) => product_1.default.updateOne({ code: item.product_code }, { $inc: { stock_quantity: item.quantity ?? 0 } }));
                    return Promise.all(putBackOnStock).then(() => {
                        return order_1.default.updateOne({ invoice_id: invoiceId }, { status: order_status_1.OrderStatus.CANCELLED });
                    }).then(() => {
                        res.json({ message: `Invoice ${invoiceId} was cancelled and the products went back on stock.` });
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
        // Faktura cuva samo username, pa se ovde dovlaci ime firme ili osobe koja je porucila
        this.withClientNames = (orders) => {
            return Promise.all([
                user_1.default.find({ username: { $in: orders.map((order) => order.client_username) } }),
                institution_1.default.find({ _id: { $in: orders.map((order) => order.client_institution_id).filter(Boolean) } })
            ]).then(([users, institutions]) => {
                return orders.map((order) => {
                    const client = users.find((one) => one.username === order.client_username);
                    const institution = institutions.find((one) => one._id === order.client_institution_id);
                    return {
                        ...order.toObject(),
                        client_display: institution
                            ? institution.name
                            : `${client?.name ?? ''} ${client?.surname ?? ''}`.trim() || order.client_username,
                        client_is_institution: !!institution
                    };
                });
            });
        };
        // Fakture za nalog username: individualnom klijentu samo njegove, pravnom licu one koje deli sa kolegama
        this.ownerFilter = (username) => {
            return user_1.default.findOne({ username: username }).then((user) => {
                if (!user) {
                    return null;
                }
                return user.institution_id
                    ? { client_institution_id: user.institution_id }
                    : { client_username: username };
            });
        };
    }
}
exports.OrderController = OrderController;
