"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
// Stavka korpe ima dva oblika. Individualni klijent priprema konkretan proizvod
// konkretne stamparije, pa nosi sifru, stampariju, boju i vrstu stampe. Pravno lice
// trazi proizvod po nazivu, jer njegova korpa postaje javna nabavka na koju se javlja
// bilo koja stamparija, pa nosi samo naziv i kolicinu
const cartItemSchema = new mongoose_1.default.Schema({
    product_name: { type: String, required: true },
    quantity: { type: Number, required: true },
    product_code: String, // samo pripremljeni proizvodi
    institution_id: String,
    color: String,
    print_type: String,
    print_text: String
}, { _id: false, versionKey: false });
// Tacno jedan dokument korpe po klijentu
const cartSchema = new mongoose_1.default.Schema({
    client_username: { type: String, required: true },
    items: [cartItemSchema]
}, { versionKey: false });
const CartM = mongoose_1.default.model('CartM', cartSchema, 'carts');
exports.default = CartM;
