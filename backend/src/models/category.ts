import mongoose from "mongoose";

// Potkategorija se prepoznaje po nazivu, jedinstvenom unutar jedne kategorije
const subcategorySchema = new mongoose.Schema({
    name: { type: String, required: true }
}, { _id: false, versionKey: false });

const categorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    subcategories: [subcategorySchema]
}, { versionKey: false });

const CategoryM = mongoose.model('CategoryM', categorySchema, 'categories');
export default CategoryM;
