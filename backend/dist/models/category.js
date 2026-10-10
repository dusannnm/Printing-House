"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
// Potkategorija se prepoznaje po nazivu, jedinstvenom unutar jedne kategorije
const subcategorySchema = new mongoose_1.default.Schema({
    name: { type: String, required: true }
}, { _id: false, versionKey: false });
const categorySchema = new mongoose_1.default.Schema({
    name: { type: String, required: true },
    subcategories: [subcategorySchema]
}, { versionKey: false });
const CategoryM = mongoose_1.default.model('CategoryM', categorySchema, 'categories');
exports.default = CategoryM;
