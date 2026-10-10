import express from 'express'
import multer from 'multer'
import path from 'path'
import { ProductController } from '../controllers/product.controller'
import { IMAGE_EXTENSIONS } from '../constants/validation'

// Vremenska oznaka ispred originalnog imena sprecava koliziju dva istoimena fajla
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', '..', 'uploads')),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
})

const MAX_IMAGE_BYTES = 2 * 1024 * 1024

const upload = multer({
    storage: storage,
    limits: { fileSize: MAX_IMAGE_BYTES },
    fileFilter: (req, file, cb) => {
        cb(null, IMAGE_EXTENSIONS.includes(path.extname(file.originalname).toLowerCase()))
    }
})

// Multer za prevelik fajl prosledjuje gresku umesto da ga sacuva, pa se ona prevodi u isti { message } oblik koji koriste ostale rute
const receiveImage = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    upload.single('image')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ message: 'Picture must be smaller than 2 MB.' })
        }
        next()
    })
}

const ProductRouter = express.Router()

ProductRouter.route("/top5").get((req, res) => new ProductController().top5(req, res));
ProductRouter.route("/search").get((req, res) => new ProductController().search(req, res));
ProductRouter.route("/search-by-name").get((req, res) => new ProductController().searchByName(req, res));
ProductRouter.route("/search-options").get((req, res) => new ProductController().searchOptions(req, res));

ProductRouter.route("/printer/:username").get((req, res) => new ProductController().forPrinter(req, res));
ProductRouter.route("/").post((req, res) => new ProductController().add(req, res));

// Slanje slike u dva koraka: prvo se cuva fajl, pa se njegovo ime upisuje na proizvod
ProductRouter.route("/upload-image").post(receiveImage, (req, res) => new ProductController().uploadImage(req, res));

// Sve stamparije koje nude proizvod pod ovim nazivom, za pravno lice
ProductRouter.route("/by-name/:name").get((req, res) => new ProductController().offersByName(req, res));

// Samo za proizvod koji je klijent stvarno primio
ProductRouter.route("/:code/reaction").post((req, res) => new ProductController().react(req, res));
ProductRouter.route("/:code/comment").post((req, res) => new ProductController().comment(req, res));

ProductRouter.route("/:code/stock").put((req, res) => new ProductController().updateStock(req, res));
ProductRouter.route("/:code/service").post((req, res) => new ProductController().addService(req, res));
ProductRouter.route("/:code/service/:serviceId").delete((req, res) => new ProductController().removeService(req, res));
ProductRouter.route("/:code/image").put((req, res) => new ProductController().setImage(req, res));

// Ono sto vidi prijavljen klijent: cena, opis, boje i vrste stampe
ProductRouter.route("/:code/extended").get((req, res) => new ProductController().extendedDetails(req, res));

// Poslednja, da ":code" ne proguta fiksne putanje iznad
ProductRouter.route("/:code").get((req, res) => new ProductController().details(req, res));

export default ProductRouter
