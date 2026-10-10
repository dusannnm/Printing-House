"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const order_status_1 = require("../constants/order-status");
// Stavka fakture. Cene se prepisuju sa proizvoda u trenutku porucivanja, pa kasnija
// izmena cene ne menja staru fakturu
const orderItemSchema = new mongoose_1.default.Schema({
    product_code: { type: String, required: true },
    product_name: { type: String, required: true },
    quantity: { type: Number, required: true },
    color: String,
    print_type: String,
    print_text: String,
    unit_price: { type: Number, required: true },
    extra_price_per_piece: { type: Number, default: 0 },
    line_total: { type: Number, required: true }
}, { _id: false, versionKey: false });
// Jedna faktura pripada tacno jednoj stampariji - korpa sa proizvodima iz tri
// stamparije daje tri porudzbine
const orderSchema = new mongoose_1.default.Schema({
    invoice_id: { type: Number, required: true },
    // Ko je kupio. Individualnom klijentu faktura pripada licno, a kod pravnog lica
    // ustanovi, pa je vide svi njeni zaposleni
    client_username: { type: String, required: true },
    client_institution_id: String, // prazno za individualne klijente
    printer_institution_id: { type: String, required: true },
    handled_by: String, // zaposleni koji je poslednji pomerio porudzbinu
    items: [orderItemSchema],
    total_amount: { type: Number, required: true },
    status: { type: Number, default: order_status_1.OrderStatus.ORDERED }, // OrderStatus
    procurement_id: Number, // samo za porudzbine dobijene preko javne nabavke
    ordered_at: { type: Date, default: Date.now },
    delivered_at: Date,
    received_at: Date
}, { versionKey: false });
const OrderM = mongoose_1.default.model('OrderM', orderSchema, 'orders');
exports.default = OrderM;
