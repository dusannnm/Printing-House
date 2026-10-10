"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const product_controller_1 = require("../controllers/product.controller");
const validation_1 = require("../constants/validation");
// Vremenska oznaka ispred originalnog imena sprecava koliziju dva istoimena fajla
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => cb(null, path_1.default.join(__dirname, '..', '..', 'uploads')),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const upload = (0, multer_1.default)({
    storage: storage,
    limits: { fileSize: MAX_IMAGE_BYTES },
    fileFilter: (req, file, cb) => {
        cb(null, validation_1.IMAGE_EXTENSIONS.includes(path_1.default.extname(file.originalname).toLowerCase()));
    }
});
// Multer za prevelik fajl prosledjuje gresku umesto da ga sacuva, pa se ona prevodi u isti { message } oblik koji koriste ostale rute
const receiveImage = (req, res, next) => {
    upload.single('image')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ message: 'Picture must be smaller than 2 MB.' });
        }
        next();
    });
};
const ProductRouter = express_1.default.Router();
ProductRouter.route("/top5").get((req, res) => new product_controller_1.ProductController().top5(req, res));
ProductRouter.route("/search").get((req, res) => new product_controller_1.ProductController().search(req, res));
ProductRouter.route("/search-by-name").get((req, res) => new product_controller_1.ProductController().searchByName(req, res));
ProductRouter.route("/search-options").get((req, res) => new product_controller_1.ProductController().searchOptions(req, res));
ProductRouter.route("/printer/:username").get((req, res) => new product_controller_1.ProductController().forPrinter(req, res));
ProductRouter.route("/").post((req, res) => new product_controller_1.ProductController().add(req, res));
// Slanje slike u dva koraka: prvo se cuva fajl, pa se njegovo ime upisuje na proizvod
ProductRouter.route("/upload-image").post(receiveImage, (req, res) => new product_controller_1.ProductController().uploadImage(req, res));
// Sve stamparije koje nude proizvod pod ovim nazivom, za pravno lice
ProductRouter.route("/by-name/:name").get((req, res) => new product_controller_1.ProductController().offersByName(req, res));
// Samo za proizvod koji je klijent stvarno primio
ProductRouter.route("/:code/reaction").post((req, res) => new product_controller_1.ProductController().react(req, res));
ProductRouter.route("/:code/comment").post((req, res) => new product_controller_1.ProductController().comment(req, res));
ProductRouter.route("/:code/stock").put((req, res) => new product_controller_1.ProductController().updateStock(req, res));
ProductRouter.route("/:code/service").post((req, res) => new product_controller_1.ProductController().addService(req, res));
ProductRouter.route("/:code/service/:serviceId").delete((req, res) => new product_controller_1.ProductController().removeService(req, res));
ProductRouter.route("/:code/image").put((req, res) => new product_controller_1.ProductController().setImage(req, res));
// Ono sto vidi prijavljen klijent: cena, opis, boje i vrste stampe
ProductRouter.route("/:code/extended").get((req, res) => new product_controller_1.ProductController().extendedDetails(req, res));
// Poslednja, da ":code" ne proguta fiksne putanje iznad
ProductRouter.route("/:code").get((req, res) => new product_controller_1.ProductController().details(req, res));
exports.default = ProductRouter;
