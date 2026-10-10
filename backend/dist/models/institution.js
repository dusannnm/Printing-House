"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
// Firma - stamparija ili pravno lice koje kupuje od nje. Vise naloga moze da pripada
// istoj ustanovi, pa dva zaposlena jedne stamparije dele proizvode, stanje i porudzbine.
// Maticni broj je primarni kljuc jer je zakonski jedinstven, pa je svaka referenca na
// ustanovu citljiv string
const institutionSchema = new mongoose_1.default.Schema({
    _id: String, // maticni broj, tacno 8 cifara
    name: { type: String, required: true },
    address: { type: String, required: true },
    city: { type: String, required: true },
    tax_id: { type: String, required: true }, // PIB, 9 cifara, jedinstven
    type: { type: String, required: true } // UserType.PRINTER ili UserType.CLIENT_LEGAL
}, { versionKey: false });
const InstitutionM = mongoose_1.default.model('InstitutionM', institutionSchema, 'institutions');
exports.default = InstitutionM;
