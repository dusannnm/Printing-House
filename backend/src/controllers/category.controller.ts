import express from 'express'
import CategoryM from '../models/category'
import ProductM from '../models/product'
import { MAX_NAME } from '../constants/validation'

export class CategoryController {

    // Stamparija bira iz ovih kategorija pri dodavanju proizvoda, ne pravi svoje
    getAll = (req: express.Request, res: express.Response) => {
        CategoryM.find({}).sort({ name: 1 }).then((categories) => {
            res.json(categories)
        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    addCategory = (req: express.Request, res: express.Response) => {
        const name = String(req.body.name ?? '').trim()

        if (!name) {
            return res.status(400).json({ message: 'Name the category.' })
        }
        if (name.length > MAX_NAME) {
            return res.status(400).json({ message: `A category name can be at most ${MAX_NAME} characters long.` })
        }

        CategoryM.findOne({ name: name }).then((existing) => {
            if (existing) {
                res.status(400).json({ message: `A category named "${name}" already exists.` })
                return
            }

            return new CategoryM({ name: name, subcategories: [] }).save().then(() => {
                res.json({ message: `Category "${name}" was added.` })
            })

        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // Proizvod pamti kategoriju po nazivu, pa preimenovanje mora da prodje i kroz proizvode
    renameCategory = (req: express.Request, res: express.Response) => {
        const name = String(req.params['name'] ?? '')
        const newName = String(req.body.new_name ?? '').trim()

        if (!newName) {
            return res.status(400).json({ message: 'Name the category.' })
        }
        if (name.length > MAX_NAME) {
            return res.status(400).json({ message: `A category name can be at most ${MAX_NAME} characters long.` })
        }

        Promise.all([
            CategoryM.findOne({ name: name }),
            CategoryM.findOne({ name: newName })
        ]).then(([category, clash]) => {
            if (!category) {
                res.status(404).json({ message: 'Category not found.' })
                return
            }
            if (clash && clash.name !== name) {
                res.status(400).json({ message: `A category named "${newName}" already exists.` })
                return
            }

            return Promise.all([
                CategoryM.updateOne({ name: name }, { name: newName }),
                ProductM.updateMany({ category: name }, { category: newName })
            ]).then(([, products]) => {
                res.json({
                    message: `Category renamed to "${newName}". ${products.modifiedCount} product(s) moved with it.`
                })
            })

        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // Kategorija sa postojecim proizvodima se ne brise, kako proizvodi pokazivali na nepostojecu
    removeCategory = (req: express.Request, res: express.Response) => {
        const name = String(req.params['name'] ?? '')

        Promise.all([
            CategoryM.findOne({ name: name }),
            ProductM.countDocuments({ category: name })
        ]).then(([category, products]) => {
            if (!category) {
                res.status(404).json({ message: 'Category not found.' })
                return
            }
            if (products > 0) {
                res.status(400).json({ message: `"${name}" still holds ${products} product(s) and cannot be deleted.` })
                return
            }

            return CategoryM.deleteOne({ name: name }).then(() => {
                res.json({ message: `Category "${name}" was deleted.` })
            })

        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // ---------------------------------------------------------------------------

    addSubcategory = (req: express.Request, res: express.Response) => {
        const name = String(req.params['name'] ?? '')
        const subcategory = String(req.body.name ?? '').trim()

        if (!subcategory) {
            return res.status(400).json({ message: 'Name the subcategory.' })
        }
        if (subcategory.length > MAX_NAME) {
            return res.status(400).json({ message: `A subcategory name can be at most ${MAX_NAME} characters long.` })
        }

        CategoryM.findOne({ name: name }).then((category) => {
            if (!category) {
                res.status(404).json({ message: 'Category not found.' })
                return
            }
            if (category.subcategories.some((one) => one.name === subcategory)) {
                res.status(400).json({ message: `"${name}" already has a subcategory named "${subcategory}".` })
                return
            }

            category.subcategories.push({ name: subcategory })
            return category.save().then(() => {
                res.json({ message: `Subcategory "${subcategory}" was added to "${name}".` })
            })

        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    renameSubcategory = (req: express.Request, res: express.Response) => {
        const name = String(req.params['name'] ?? '')
        const subcategory = String(req.params['subcategory'] ?? '')
        const newName = String(req.body.new_name ?? '').trim()

        if (!newName) {
            return res.status(400).json({ message: 'Name the subcategory.' })
        }
        if (newName.length > MAX_NAME) {
            return res.status(400).json({ message: `A subcategory name can be at most ${MAX_NAME} characters long.` })
        }

        CategoryM.findOne({ name: name }).then((category) => {
            if (!category) {
                res.status(404).json({ message: 'Category not found.' })
                return
            }

            const existing = category.subcategories.find((one) => one.name === subcategory)
            if (!existing) {
                res.status(404).json({ message: 'Subcategory not found.' })
                return
            }
            if (category.subcategories.some((one) => one.name === newName)) {
                res.status(400).json({ message: `"${name}" already has a subcategory named "${newName}".` })
                return
            }

            existing.name = newName
            return Promise.all([
                category.save(),
                ProductM.updateMany({ category: name, subcategory: subcategory }, { subcategory: newName })
            ]).then(([, products]) => {
                res.json({
                    message: `Subcategory renamed to "${newName}". ${products.modifiedCount} product(s) moved with it.`
                })
            })

        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    removeSubcategory = (req: express.Request, res: express.Response) => {
        const name = String(req.params['name'] ?? '')
        const subcategory = String(req.params['subcategory'] ?? '')

        Promise.all([
            CategoryM.findOne({ name: name }),
            ProductM.countDocuments({ category: name, subcategory: subcategory })
        ]).then(([category, products]) => {
            if (!category) {
                res.status(404).json({ message: 'Category not found.' })
                return
            }
            if (!category.subcategories.some((one) => one.name === subcategory)) {
                res.status(404).json({ message: 'Subcategory not found.' })
                return
            }
            if (products > 0) {
                res.status(400).json({ message: `"${subcategory}" still holds ${products} product(s) and cannot be deleted.` })
                return
            }

            category.subcategories = category.subcategories
                .filter((one) => one.name !== subcategory) as typeof category.subcategories

            return category.save().then(() => {
                res.json({ message: `Subcategory "${subcategory}" was deleted.` })
            })

        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }
}
