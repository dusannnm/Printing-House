import mongoose from "mongoose";

// Daje fakturama i nabavkama kratke redne brojeve umesto sirovog Mongo _id-a
const counterSchema = new mongoose.Schema({
    _id: String,                            // 'invoice' ili 'procurement'
    seq: { type: Number, default: 0 }
}, { versionKey: false });

const CounterM = mongoose.model('CounterM', counterSchema, 'counters');
export default CounterM;

// Rezervise i vraca sledeci broj brojaca u jednom atomicnom koraku
export function nextSequence(name: string): Promise<number> {
    return CounterM.findByIdAndUpdate(
        name,
        { $inc: { seq: 1 } },
        { returnDocument: 'after', upsert: true }
    ).then((counter) => counter!.seq!);
}
