"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryController = void 0;
const category_1 = __importDefault(require("../models/category"));
const product_1 = __importDefault(require("../models/product"));
const validation_1 = require("../constants/validation");
class CategoryController {
    constructor() {
        // Stamparija bira iz ovih kategorija pri dodavanju proizvoda, ne pravi svoje
        this.getAll = (req, res) => {
            category_1.default.find({}).sort({ name: 1 }).then((categories) => {
                res.json(categories);
            }).catch((err) => {
                console.error(err);
                res.status(500).json({ message: 'Server error, please try again.' });
            });
        };
        this.addCategory = (req, res) => {
            const name = String(req.body.name ?? '').trim();
            if (!name) {
                return res.status(400).json({ message: 'Name the category.' });
            }
            if (name.length > validation_1.MAX_NAME) {
                return res.status(400).json({ message: `A category name can be at most ${validation_1.MAX_NAME} characters long.` });
            }
            category_1.default.findOne({ name: name }).then((existing) => {
                if (existing) {
                    res.status(400).json({ message: `A category named "${name}" already exists.` });
                    return;
                }
                return new category_1.default({ name: name, subcategories: [] }).save().then(() => {
                    res.json({ message: `Category "${name}" was added.` });
                });
            }).catch((err) => {
                console.error(err);
                res.status(500).json({ message: 'Server error, please try again.' });
            });
        };
        // Proizvod pamti kategoriju po nazivu, pa preimenovanje mora da prodje i kroz proizvode
        this.renameCategory = (req, res) => {
            const name = String(req.params['name'] ?? '');
            const newName = String(req.body.new_name ?? '').trim();
            if (!newName) {
                return res.status(400).json({ message: 'Name the category.' });
            }
            if (name.length > validation_1.MAX_NAME) {
                return res.status(400).json({ message: `A category name can be at most ${validation_1.MAX_NAME} characters long.` });
            }
            Promise.all([
                category_1.default.findOne({ name: name }),
                category_1.default.findOne({ name: newName })
            ]).then(([category, clash]) => {
                if (!category) {
                    res.status(404).json({ message: 'Category not found.' });
                    return;
                }
                if (clash && clash.name !== name) {
                    res.status(400).json({ message: `A category named "${newName}" already exists.` });
                    return;
                }
                return Promise.all([
                    category_1.default.updateOne({ name: name }, { name: newName }),
                    product_1.default.updateMany({ category: name }, { category: newName })
                ]).then(([, products]) => {
                    res.json({
                        message: `Category renamed to "${newName}". ${products.modifiedCount} product(s) moved with it.`
                    });
                });
            }).catch((err) => {
                console.error(err);
                res.status(500).json({ message: 'Server error, please try again.' });
            });
        };
        // Kategorija sa postojecim proizvodima se ne brise, kako proizvodi pokazivali na nepostojecu
        this.removeCategory = (req, res) => {
            const name = String(req.params['name'] ?? '');
            Promise.all([
                category_1.default.findOne({ name: name }),
                product_1.default.countDocuments({ category: name })
            ]).then(([category, products]) => {
                if (!category) {
                    res.status(404).json({ message: 'Category not found.' });
                    return;
                }
                if (products > 0) {
                    res.status(400).json({ message: `"${name}" still holds ${products} product(s) and cannot be deleted.` });
                    return;
                }
                return category_1.default.deleteOne({ name: name }).then(() => {
                    res.json({ message: `Category "${name}" was deleted.` });
                });
            }).catch((err) => {
                console.error(err);
                res.status(500).json({ message: 'Server error, please try again.' });
            });
        };
        // ---------------------------------------------------------------------------
        this.addSubcategory = (req, res) => {
            const name = String(req.params['name'] ?? '');
            const subcategory = String(req.body.name ?? '').trim();
            if (!subcategory) {
                return res.status(400).json({ message: 'Name the subcategory.' });
            }
            if (subcategory.length > validation_1.MAX_NAME) {
                return res.status(400).json({ message: `A subcategory name can be at most ${validation_1.MAX_NAME} characters long.` });
            }
            category_1.default.findOne({ name: name }).then((category) => {
                if (!category) {
                    res.status(404).json({ message: 'Category not found.' });
                    return;
                }
                if (category.subcategories.some((one) => one.name === subcategory)) {
                    res.status(400).json({ message: `"${name}" already has a subcategory named "${subcategory}".` });
                    return;
                }
                category.subcategories.push({ name: subcategory });
                return category.save().then(() => {
                    res.json({ message: `Subcategory "${subcategory}" was added to "${name}".` });
                });
            }).catch((err) => {
                console.error(err);
                res.status(500).json({ message: 'Server error, please try again.' });
            });
        };
        this.renameSubcategory = (req, res) => {
            const name = String(req.params['name'] ?? '');
            const subcategory = String(req.params['subcategory'] ?? '');
            const newName = String(req.body.new_name ?? '').trim();
            if (!newName) {
                return res.status(400).json({ message: 'Name the subcategory.' });
            }
            if (newName.length > validation_1.MAX_NAME) {
                return res.status(400).json({ message: `A subcategory name can be at most ${validation_1.MAX_NAME} characters long.` });
            }
            category_1.default.findOne({ name: name }).then((category) => {
                if (!category) {
                    res.status(404).json({ message: 'Category not found.' });
                    return;
                }
                const existing = category.subcategories.find((one) => one.name === subcategory);
                if (!existing) {
                    res.status(404).json({ message: 'Subcategory not found.' });
                    return;
                }
                if (category.subcategories.some((one) => one.name === newName)) {
                    res.status(400).json({ message: `"${name}" already has a subcategory named "${newName}".` });
                    return;
                }
                existing.name = newName;
                return Promise.all([
                    category.save(),
                    product_1.default.updateMany({ category: name, subcategory: subcategory }, { subcategory: newName })
                ]).then(([, products]) => {
                    res.json({
                        message: `Subcategory renamed to "${newName}". ${products.modifiedCount} product(s) moved with it.`
                    });
                });
            }).catch((err) => {
                console.error(err);
                res.status(500).json({ message: 'Server error, please try again.' });
            });
        };
        this.removeSubcategory = (req, res) => {
            const name = String(req.params['name'] ?? '');
            const subcategory = String(req.params['subcategory'] ?? '');
            Promise.all([
                category_1.default.findOne({ name: name }),
                product_1.default.countDocuments({ category: name, subcategory: subcategory })
            ]).then(([category, products]) => {
                if (!category) {
                    res.status(404).json({ message: 'Category not found.' });
                    return;
                }
                if (!category.subcategories.some((one) => one.name === subcategory)) {
                    res.status(404).json({ message: 'Subcategory not found.' });
                    return;
                }
                if (products > 0) {
                    res.status(400).json({ message: `"${subcategory}" still holds ${products} product(s) and cannot be deleted.` });
                    return;
                }
                category.subcategories = category.subcategories
                    .filter((one) => one.name !== subcategory);
                return category.save().then(() => {
                    res.json({ message: `Subcategory "${subcategory}" was deleted.` });
                });
            }).catch((err) => {
                console.error(err);
                res.status(500).json({ message: 'Server error, please try again.' });
            });
        };
    }
}
exports.CategoryController = CategoryController;
