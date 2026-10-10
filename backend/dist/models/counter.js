"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.nextSequence = nextSequence;
const mongoose_1 = __importDefault(require("mongoose"));
// Daje fakturama i nabavkama kratke redne brojeve umesto sirovog Mongo _id-a
const counterSchema = new mongoose_1.default.Schema({
    _id: String, // 'invoice' ili 'procurement'
    seq: { type: Number, default: 0 }
}, { versionKey: false });
const CounterM = mongoose_1.default.model('CounterM', counterSchema, 'counters');
exports.default = CounterM;
// Rezervise i vraca sledeci broj brojaca u jednom atomicnom koraku
function nextSequence(name) {
    return CounterM.findByIdAndUpdate(name, { $inc: { seq: 1 } }, { returnDocument: 'after', upsert: true }).then((counter) => counter.seq);
}
