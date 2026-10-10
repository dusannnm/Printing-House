"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const validation_1 = require("../constants/validation");
// Vrsta stampe koja moze da se odradi na ovom proizvodu (DTG, sublimacija, transfer...)
const printServiceSchema = new mongoose_1.default.Schema({
    service_id: String,
    print_type: { type: String, required: true },
    extra_price_per_piece: { type: Number, default: 0 },
    max_width_mm: Number,
    max_height_mm: Number
}, { _id: false, versionKey: false });
// Jedan lajk (+1) ili dislajk (-1). Cuvaju se kao dokumenti umesto kao dva brojaca,
// cime se sprecava druga reakcija istog klijenta, a datum daje x osu grafiku ocena
const reactionSchema = new mongoose_1.default.Schema({
    username: { type: String, required: true },
    value: { type: Number, required: true },
    date: { type: Date, default: Date.now }
}, { _id: false, versionKey: false });
const commentSchema = new mongoose_1.default.Schema({
    username: { type: String, required: true },
    text: { type: String, required: true },
    date: { type: Date, default: Date.now }
}, { _id: false, versionKey: false });
const productSchema = new mongoose_1.default.Schema({
    code: { type: String, required: true },
    name: { type: String, required: true },
    description: String,
    category: { type: String, required: true },
    subcategory: String,
    unit_price: { type: Number, required: true },
    stock_quantity: { type: Number, default: 0 },
    colors: [String],
    main_image: { type: String, default: validation_1.DEFAULT_PRODUCT_IMAGE },
    // Proizvod pripada stampariji, a ne zaposlenom koji ga je uneo, pa svi nalozi te
    // stamparije vide i uredjuju isti katalog
    institution_id: { type: String, required: true },
    added_by: String,
    print_services: [printServiceSchema],
    reactions: [reactionSchema],
    comments: [commentSchema]
}, { versionKey: false });
const ProductM = mongoose_1.default.model('ProductM', productSchema, 'products');
exports.default = ProductM;
