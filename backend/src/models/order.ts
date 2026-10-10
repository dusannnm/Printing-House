import mongoose from "mongoose";
import { OrderStatus } from "../constants/order-status";

// Stavka fakture. Cene se prepisuju sa proizvoda u trenutku porucivanja, pa kasnija
// izmena cene ne menja staru fakturu
const orderItemSchema = new mongoose.Schema({
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
const orderSchema = new mongoose.Schema({
    invoice_id: { type: Number, required: true },

    // Ko je kupio. Individualnom klijentu faktura pripada licno, a kod pravnog lica
    // ustanovi, pa je vide svi njeni zaposleni
    client_username: { type: String, required: true },
    client_institution_id: String,                          // prazno za individualne klijente

    printer_institution_id: { type: String, required: true },
    handled_by: String,            // zaposleni koji je poslednji pomerio porudzbinu

    items: [orderItemSchema],
    total_amount: { type: Number, required: true },
    status: { type: Number, default: OrderStatus.ORDERED },   // OrderStatus
    procurement_id: Number,        // samo za porudzbine dobijene preko javne nabavke
    ordered_at: { type: Date, default: Date.now },
    delivered_at: Date,
    received_at: Date
}, { versionKey: false });

const OrderM = mongoose.model('OrderM', orderSchema, 'orders');
export default OrderM;
