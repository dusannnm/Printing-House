import express from 'express'
import multer from 'multer'
import path from 'path'
import { UserController } from '../controllers/user.controller'
import { IMAGE_EXTENSIONS } from '../constants/validation'

// Slike se cuvaju u backend/uploads. Vremenska oznaka ispred originalnog imena sprecava da dva korisnika sa "photo.jpg" prepisu jedan drugom sliku
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '..', '..', 'uploads')),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
})

// Slika 250x250 je par kilobajta, pa ovaj limit sluzi samo protiv zloupotrebe
const MAX_IMAGE_BYTES = 2 * 1024 * 1024

const upload = multer({
    storage: storage,
    limits: { fileSize: MAX_IMAGE_BYTES },
    // Odbijen fajl ostavlja req.file prazan, sto kontroler prijavljuje kao los zahtev
    fileFilter: (req, file, cb) => {
        cb(null, IMAGE_EXTENSIONS.includes(path.extname(file.originalname).toLowerCase()))
    }
})

// Multer za prevelik fajl prosledjuje gresku umesto da ga sacuva. Ovako se greska prevodi u oblik { message }
const receiveImage = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    upload.single('image')(req, res, (err) => {
        if (err) {
            return res.status(400).json({ message: 'Picture must be smaller than 2 MB.' })
        }
        next()
    })
}

const UserRouter = express.Router()

UserRouter.route("/login").post((req, res) => new UserController().login(req, res));
UserRouter.route("/admin-login").post((req, res) => new UserController().adminLogin(req, res));
UserRouter.route("/register").post((req, res) => new UserController().register(req, res));
UserRouter.route("/printer-count").get((req, res) => new UserController().countPrinters(req, res));

UserRouter.route("/profile").put((req, res) => new UserController().updateProfile(req, res));

// Slanje slike u dva koraka: prvo se cuva fajl, pa se njegovo ime upisuje na nalog
UserRouter.route("/upload-image").post(receiveImage, (req, res) => new UserController().uploadProfileImage(req, res));
UserRouter.route("/profile-image").put((req, res) => new UserController().setProfileImage(req, res));

UserRouter.route("/").get((req, res) => new UserController().getAll(req, res));
UserRouter.route("/pending").get((req, res) => new UserController().pending(req, res));
UserRouter.route("/:username/status").put((req, res) => new UserController().decide(req, res));

// Poslednje, da ":username" ne proguta fiksne putanje iznad
UserRouter.route("/:username").get((req, res) => new UserController().getOne(req, res));
UserRouter.route("/:username").delete((req, res) => new UserController().remove(req, res));

export default UserRouter
