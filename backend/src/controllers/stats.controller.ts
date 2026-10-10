import express from 'express'
import OrderM from '../models/order'
import ProductM from '../models/product'
import { OrderStatus } from '../constants/order-status'

const DAY = 24 * 60 * 60 * 1000

export class StatsController {

    // Koje stamparije su najvise prodale u zadnja tri meseca.
    revenue = (req: express.Request, res: express.Response) => {
        const from = new Date(Date.now() - 90 * DAY)

        OrderM.aggregate([
            {
                $match: {
                    ordered_at: { $gte: from },
                    status: { $ne: OrderStatus.CANCELLED }
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
            res.json({ from: from, rows: rows })
        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // Najporucivaniji proizvodi u zadnjih mesec dana, po broju komada i po udelu tih komada u svemu porucenom
    topProducts = (req: express.Request, res: express.Response) => {
        const from = new Date(Date.now() - 30 * DAY)

        OrderM.aggregate([
            {
                $match: {
                    ordered_at: { $gte: from },
                    status: { $ne: OrderStatus.CANCELLED }
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

            const total = rows.reduce((sum, row) => sum + row.quantity, 0)
            const withShare = rows.map((row) => ({
                ...row,
                share: total === 0 ? 0 : Math.round((row.quantity / total) * 1000) / 10
            }))

            res.json({ from: from, total: total, rows: withShare })

        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // kretanje ocene proizvoda kroz vreme; like +1, dislike -1
    ratings = (req: express.Request, res: express.Response) => {
        ProductM.find({ 'reactions.0': { $exists: true } }, { code: 1, name: 1, reactions: 1 })
            .then((products) => {

                const series = products.map((product) => {
                    const inOrder = [...product.reactions]
                        .sort((first, second) => first.date!.getTime() - second.date!.getTime())

                    // Jedna tacka po danu: ocena kakva je bila na kraju tog dana
                    const byDay = new Map<string, number>()
                    let score = 0
                    inOrder.forEach((reaction) => {
                        score += reaction.value ?? 0
                        byDay.set(reaction.date!.toISOString().substring(0, 10), score)
                    })

                    return {
                        code: product.code,
                        name: product.name,
                        points: [...byDay].map(([date, value]) => ({ date, score: value }))
                    }
                })

                // Prvo proizvodi sa najvise reakcija, da se grafik otvori sa onim zanimljivijim
                series.sort((first, second) => second.points.length - first.points.length)
                res.json(series)

            }).catch((err) => {
                console.error(err)
                res.status(500).json({ message: 'Server error, please try again.' })
            })
    }
}
