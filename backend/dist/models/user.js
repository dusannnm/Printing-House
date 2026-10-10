"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const user_status_1 = require("../constants/user-status");
const validation_1 = require("../constants/validation");
const userSchema = new mongoose_1.default.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true }, // bcrypt hash, nikad lozinka u cistom tekstu
    name: { type: String, required: true },
    surname: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    profile_image: { type: String, default: validation_1.DEFAULT_PROFILE_IMAGE },
    type: { type: String, required: true }, // UserType
    status: { type: Number, default: user_status_1.UserStatus.PENDING }, // UserStatus
    // Zaposleni u stampariji i u pravnom licu pripadaju ustanovi, i vise naloga moze
    // da deli istu. Prazno za individualne klijente i admina
    institution_id: String, // InstitutionM._id, maticni broj
    registered_at: { type: Date, default: Date.now }
}, { versionKey: false });
const UserM = mongoose_1.default.model('UserM', userSchema, 'users');
exports.default = UserM;
