"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsController = void 0;
const order_1 = __importDefault(require("../models/order"));
const product_1 = __importDefault(require("../models/product"));
const order_status_1 = require("../constants/order-status");
const DAY = 24 * 60 * 60 * 1000;
class StatsController {
    constructor() {
        // Koje stamparije su najvise prodale u zadnja tri meseca.
        this.revenue = (req, res) => {
            const from = new Date(Date.now() - 90 * DAY);
            order_1.default.aggregate([
                {
                    $match: {
                        ordered_at: { $gte: from },
                        status: { $ne: order_status_1.OrderStatus.CANCELLED }
                    }
                },
                {
                    $group: {
                        _id: '$printer_institution_id',
                        total: { $sum: '$total_amount' },
                        invoices: { $sum: 1 }
                    }
                },
                {
                    $lookup: {
                        from: 'institutions',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'printer'
                    }
                },
                { $sort: { total: -1 } },
                {
                    $project: {
                        _id: 0,
                        institution_id: '$_id',
                        printer_name: { $first: '$printer.name' },
                        printer_city: { $first: '$printer.city' },
                        total: 1,
                        invoices: 1
                    }
                }
            ]).then((rows) => {
                res.json({ from: from, rows: rows });
            }).catch((err) => {
                console.error(err);
                res.status(500).json({ message: 'Server error, please try again.' });
            });
        };
        // Najporucivaniji proizvodi u zadnjih mesec dana, po broju komada i po udelu tih komada u svemu porucenom
        this.topProducts = (req, res) => {
            const from = new Date(Date.now() - 30 * DAY);
            order_1.default.aggregate([
                {
                    $match: {
                        ordered_at: { $gte: from },
                        status: { $ne: order_status_1.OrderStatus.CANCELLED }
                    }
                },
                // Stavka po stavka, da bi se sabrale kolicine po proizvodu
                { $unwind: '$items' },
                {
                    $group: {
                        _id: '$items.product_name',
                        quantity: { $sum: '$items.quantity' }
                    }
                },
                { $sort: { quantity: -1 } },
                { $project: { _id: 0, product_name: '$_id', quantity: 1 } }
            ]).then((rows) => {
                const total = rows.reduce((sum, row) => sum + row.quantity, 0);
                const withShare = rows.map((row) => ({
                    ...row,
                    share: total === 0 ? 0 : Math.round((row.quantity / total) * 1000) / 10
                }));
                res.json({ from: from, total: total, rows: withShare });
            }).catch((err) => {
                console.error(err);
                res.status(500).json({ message: 'Server error, please try again.' });
            });
        };
        // kretanje ocene proizvoda kroz vreme; like +1, dislike -1
        this.ratings = (req, res) => {
            product_1.default.find({ 'reactions.0': { $exists: true } }, { code: 1, name: 1, reactions: 1 })
                .then((products) => {
                const series = products.map((product) => {
                    const inOrder = [...product.reactions]
                        .sort((first, second) => first.date.getTime() - second.date.getTime());
                    // Jedna tacka po danu: ocena kakva je bila na kraju tog dana
                    const byDay = new Map();
                    let score = 0;
                    inOrder.forEach((reaction) => {
                        score += reaction.value ?? 0;
                        byDay.set(reaction.date.toISOString().substring(0, 10), score);
                    });
                    return {
                        code: product.code,
                        name: product.name,
                        points: [...byDay].map(([date, value]) => ({ date, score: value }))
                    };
                });
                // Prvo proizvodi sa najvise reakcija, da se grafik otvori sa onim zanimljivijim
                series.sort((first, second) => second.points.length - first.points.length);
                res.json(series);
            }).catch((err) => {
                console.error(err);
                res.status(500).json({ message: 'Server error, please try again.' });
            });
        };
    }
}
exports.StatsController = StatsController;
