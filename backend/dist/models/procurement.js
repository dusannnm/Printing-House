"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const procurement_status_1 = require("../constants/procurement-status");
// Proizvodi se traze po nazivu, jer svaka stamparija koja drzi proizvod pod tim
// nazivom moze da konkurise
const requestedItemSchema = new mongoose_1.default.Schema({
    product_name: { type: String, required: true },
    quantity: { type: Number, required: true }
}, { _id: false, versionKey: false });
const bidItemSchema = new mongoose_1.default.Schema({
    product_code: { type: String, required: true },
    product_name: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit_price: { type: Number, required: true },
    line_total: { type: Number, required: true }
}, { _id: false, versionKey: false });
// Svaka stamparija salje tacno jednu ponudu, za sve trazene proizvode
const bidSchema = new mongoose_1.default.Schema({
    institution_id: { type: String, required: true },
    submitted_by: { type: String, required: true }, // zaposleni koji je poslao ponudu
    items: [bidItemSchema],
    total_amount: { type: Number, required: true },
    submitted_at: { type: Date, default: Date.now }
}, { _id: false, versionKey: false });
const procurementSchema = new mongoose_1.default.Schema({
    procurement_id: { type: Number, required: true },
    // Nabavka pripada ustanovi koja ju je objavila, pa je prati bilo koji njen zaposleni
    client_institution_id: { type: String, required: true },
    opened_by: { type: String, required: true }, // zaposleni koji ju je objavio
    opened_at: { type: Date, default: Date.now },
    closes_at: { type: Date, required: true },
    requested_items: [requestedItemSchema],
    bids: [bidSchema],
    status: { type: Number, default: procurement_status_1.ProcurementStatus.OPEN }, // ProcurementStatus
    winner_institution_id: String,
    invoice_id: Number // faktura napravljena za pobednicku ponudu
}, { versionKey: false });
const ProcurementM = mongoose_1.default.model('ProcurementM', procurementSchema, 'procurements');
exports.default = ProcurementM;
