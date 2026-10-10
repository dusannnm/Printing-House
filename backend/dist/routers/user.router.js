"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const user_controller_1 = require("../controllers/user.controller");
const validation_1 = require("../constants/validation");
// Slike se cuvaju u backend/uploads. Vremenska oznaka ispred originalnog imena sprecava da dva korisnika sa "photo.jpg" prepisu jedan drugom sliku
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => cb(null, path_1.default.join(__dirname, '..', '..', 'uploads')),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
// Slika 250x250 je par kilobajta, pa ovaj limit sluzi samo protiv zloupotrebe
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const upload = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: MAX_IMAGE_BYTES },
    // Odbijen fajl ostavlja req.file prazan, sto kontroler prijavljuje kao los zahtev
    fileFilter: (req, file, cb) => {
        cb(null, validation_1.IMAGE_EXTENSIONS.includes(path_1.default.extname(file.originalname).toLowerCase()));
    }
});
// Multer za prevelik fajl prosledjuje gresku umesto da ga sacuva. Ovako se greska prevodi u oblik { message }
const receiveImage = (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ message: 'Picture must be smaller than 2 MB.' });
        }
        next();
    });
};
const UserRouter = express_1.default.Router();
UserRouter.route("/login").post((req, res) => new user_controller_1.UserController().login(req, res));
UserRouter.route("/admin-login").post((req, res) => new user_controller_1.UserController().adminLogin(req, res));
UserRouter.route("/register").post((req, res) => new user_controller_1.UserController().register(req, res));
UserRouter.route("/printer-count").get((req, res) => new user_controller_1.UserController().countPrinters(req, res));
UserRouter.route("/profile").put((req, res) => new user_controller_1.UserController().updateProfile(req, res));
// Slanje slike u dva koraka: prvo se cuva fajl, pa se njegovo ime upisuje na nalog
UserRouter.route("/upload-image").post(receiveImage, (req, res) => new user_controller_1.UserController().uploadProfileImage(req, res));
UserRouter.route("/profile-image").put((req, res) => new user_controller_1.UserController().setProfileImage(req, res));
UserRouter.route("/").get((req, res) => new user_controller_1.UserController().getAll(req, res));
UserRouter.route("/pending").get((req, res) => new user_controller_1.UserController().pending(req, res));
UserRouter.route("/:username/status").put((req, res) => new user_controller_1.UserController().decide(req, res));
// Poslednje, da ":username" ne proguta fiksne putanje iznad
UserRouter.route("/:username").get((req, res) => new user_controller_1.UserController().getOne(req, res));
UserRouter.route("/:username").delete((req, res) => new user_controller_1.UserController().remove(req, res));
exports.default = UserRouter;
