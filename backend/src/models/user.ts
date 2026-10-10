import mongoose from "mongoose";
import { UserStatus } from "../constants/user-status";
import { DEFAULT_PROFILE_IMAGE } from "../constants/validation";

const userSchema = new mongoose.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },   // bcrypt hash, nikad lozinka u cistom tekstu
    name: { type: String, required: true },
    surname: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    profile_image: { type: String, default: DEFAULT_PROFILE_IMAGE },
    type: { type: String, required: true },                    // UserType
    status: { type: Number, default: UserStatus.PENDING },     // UserStatus

    // Zaposleni u stampariji i u pravnom licu pripadaju ustanovi, i vise naloga moze
    // da deli istu. Prazno za individualne klijente i admina
    institution_id: String,                        // InstitutionM._id, maticni broj

    registered_at: { type: Date, default: Date.now }
}, { versionKey: false });

const UserM = mongoose.model('UserM', userSchema, 'users');
export default UserM;
