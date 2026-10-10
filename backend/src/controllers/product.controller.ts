import express from 'express'
import ProductM from '../models/product'
import InstitutionM from '../models/institution'
import UserM from '../models/user'
import OrderM from '../models/order'
import CategoryM from '../models/category'
import { OrderStatus } from '../constants/order-status'
import {
    MAX_COMMENT, MAX_DESCRIPTION, MAX_NAME, MAX_PRICE, MAX_PRINT_SIZE_MM, MAX_STOCK,
    MIN_PRICE, PRODUCT_CODE_REGEX
} from '../constants/validation'

export class ProductController {

    // Pet proizvoda sa najvise lajkova, za pocetnu stranicu
    top5 = (req: express.Request, res: express.Response) => {
        ProductM.aggregate([
            ...this.withReactionCounts(),
            // Kod istog broja lajkova azbucno, da redosled ne skace
            { $sort: { likes: -1, name: 1 } },
            { $limit: 5 },
            ...this.withPrinter(),
            { $project: this.listFields() }
        ]).then((products) => {
            res.json(products)
        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // Proizvod za javnu stranicu detalja
    details = (req: express.Request, res: express.Response) => {
        ProductM.aggregate([
            { $match: { code: req.params['code'] } },
            ...this.withReactionCounts(),
            ...this.withPrinter(),
            { $project: this.listFields() }
        ]).then((products) => {
            if (products.length === 0) {
                return res.status(404).json({ message: 'Product not found.' })
            }
            res.json(products[0])
        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // Prosireni podaci koje vidi prijavljen klijent
    extendedDetails = (req: express.Request, res: express.Response) => {
        ProductM.aggregate([
            { $match: { code: req.params['code'] } },
            ...this.withReactionCounts(),
            ...this.withPrinter(),
            {
                $project: {
                    ...this.listFields(),
                    description: 1, unit_price: 1, stock_quantity: 1,
                    colors: 1, print_services: 1,
                    printer_address: 1,
                    // Pet najnovijih komentara svih klijenata
                    comments: { $slice: [{ $sortArray: { input: '$comments', sortBy: { date: -1 } } }, 5] }
                }
            }
        ]).then((products) => {
            if (products.length === 0) {
                return res.status(404).json({ message: 'Product not found.' })
            }
            res.json(products[0])
        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // Pretraga za pravno lice, trazi proizvode po nazivu 
    // Nabavka ide svima, pa je isti naziv kod tri stamparije jedna stavka
    searchByName = (req: express.Request, res: express.Response) => {
        const name = this.queryText(req.query['name'])
        const category = this.queryText(req.query['category'])

        const match: any = { stock_quantity: { $gt: 0 } }
        if (name) {
            match.name = { $regex: this.namePattern(name), $options: 'i' }
        }
        if (category) {
            match.category = category
        }

        ProductM.aggregate([
            { $match: match },
            {
                $group: {
                    _id: '$name',
                    category: { $first: '$category' },
                    shops: { $sum: 1 },
                    // Celu nabavku isporucuje jedna stamparija, pa je bitna najveca kolicina koju drzi pojedinacna stamparija
                    best_stock: { $max: '$stock_quantity' }
                }
            },
            { $sort: { _id: 1 } },
            { $project: { _id: 0, product_name: '$_id', category: 1, shops: 1, best_stock: 1 } }
        ]).then((products) => {
            res.json(products)
        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // Sve stamparije koje nude proizvod pod ovim nazivom, od najjeftinije
    // Pravno lice tako vidi ko bi mogao da se javi i po kojoj ceni (prave cene daju tek ponude)
    offersByName = (req: express.Request, res: express.Response) => {
        ProductM.aggregate([
            { $match: { name: String(req.params['name'] ?? ''), stock_quantity: { $gt: 0 } } },
            ...this.withReactionCounts(),
            ...this.withPrinter(),
            { $sort: { unit_price: 1 } },
            {
                $project: {
                    ...this.listFields(),
                    description: 1, unit_price: 1, stock_quantity: 1,
                    colors: 1, print_services: 1, printer_address: 1,
                    // Detalji za svaki proizvod, korisno pri biranju stamparije
                    comments: { $slice: [{ $sortArray: { input: '$comments', sortBy: { date: -1 } } }, 5] }
                }
            }
        ]).then((products) => {
            if (products.length === 0) {
                return res.status(404).json({ message: 'No print shop currently offers that product.' })
            }
            res.json(products)
        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // Ceo katalog jedne stamparije, ukljucujuci i rasprodate proizvode da bi ih dopunila
    forPrinter = (req: express.Request, res: express.Response) => {
        this.institutionOf(String(req.params['username'] ?? '')).then((institutionId) => {
            if (!institutionId) {
                res.status(404).json({ message: 'Print shop not found.' })
                return
            }

            return ProductM.find({ institution_id: institutionId }).sort({ name: 1 }).then((products) => {
                res.json(products)
            })
        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // Usluge stampe se kace na proizvod naknadno
    add = (req: express.Request, res: express.Response) => {
        const body = req.body

        this.institutionOf(body.username).then((institutionId) => {
            if (!institutionId) {
                res.status(404).json({ message: 'Print shop not found.' })
                return
            }

            return Promise.all([
                ProductM.findOne({ code: body.code }),
                CategoryM.findOne({ name: body.category })
            ]).then(([existing, category]) => {

                const problem = this.checkProduct(body, existing, category)
                if (problem) {
                    res.status(400).json({ message: problem })
                    return
                }

                return new ProductM({
                    code: body.code.trim(),
                    name: body.name.trim(),
                    description: body.description ?? '',
                    category: body.category,
                    subcategory: body.subcategory ?? '',
                    unit_price: Number(body.unit_price),
                    stock_quantity: Number(body.stock_quantity),
                    colors: this.toColors(body.colors),
                    institution_id: institutionId,
                    added_by: body.username,      // koji zaposleni ga je uneo
                    print_services: [],
                    reactions: [],
                    comments: []
                }).save().then(() => {
                    res.json({ message: `${body.name} was added to the catalogue.` })
                })
            })

        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // Stanje menja samo stamparija koja poseduje proizvod; provera ovde osim u pregledacu
    updateStock = (req: express.Request, res: express.Response) => {
        const code = String(req.params['code'] ?? '')
        const quantity = Number(req.body.stock_quantity)

        if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_STOCK) {
            return res.status(400).json({ message: `Quantity on stock must be a whole number between 0 and ${MAX_STOCK}.` })
        }

        Promise.all([
            this.institutionOf(req.body.username),
            ProductM.findOne({ code: code })
        ]).then(([institutionId, product]) => {
            if (!product) {
                res.status(404).json({ message: 'Product not found.' })
                return
            }
            if (!institutionId || product.institution_id !== institutionId) {
                res.status(403).json({ message: 'That product belongs to another print shop.' })
                return
            }

            return ProductM.updateOne({ code: code }, { stock_quantity: quantity }).then(() => {
                res.json({
                    message: quantity === 0
                        ? `${product.name} is out of stock and no longer appears in the search.`
                        : `${product.name}: ${quantity} on stock.`
                })
            })

        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // Vrsta stampe za proizvod, sa dimenzijom u koju staje i doplatom po komadu
    addService = (req: express.Request, res: express.Response) => {
        const code = String(req.params['code'] ?? '')
        const body = req.body

        ProductM.findOne({ code: code }).then((product) => {
            if (!product) {
                res.status(404).json({ message: 'Product not found.' })
                return
            }

            const problem = this.checkService(body, product)
            if (problem) {
                res.status(400).json({ message: problem })
                return
            }

            // Identifikator mora da bude jedinstven samo unutar ovog proizvoda
            const serviceId = `${code}-S${(product.print_services?.length ?? 0) + 1}`

            return ProductM.updateOne({ code: code }, {
                $push: {
                    print_services: {
                        service_id: serviceId,
                        print_type: body.print_type.trim(),
                        extra_price_per_piece: Number(body.extra_price_per_piece),
                        max_width_mm: Number(body.max_width_mm),
                        max_height_mm: Number(body.max_height_mm)
                    }
                }
            }).then(() => {
                res.json({ message: `${body.print_type} was added to ${product.name}.` })
            })

        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    removeService = (req: express.Request, res: express.Response) => {
        const code = String(req.params['code'] ?? '')
        const serviceId = String(req.params['serviceId'] ?? '')

        ProductM.updateOne(
            { code: code },
            { $pull: { print_services: { service_id: serviceId } } }
        ).then((result) => {
            if (result.modifiedCount === 0) {
                return res.status(404).json({ message: 'That type of print is not offered for this product.' })
            }
            res.json({ message: 'Type of print removed.' })
        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // Prvi korak slanja slike, multer je fajl vec sacuvao
    uploadImage = (req: express.Request, res: express.Response) => {
        if (!req.file) {
            return res.status(400).json({ message: 'Picture must be a JPG, PNG or GIF file smaller than 2 MB.' })
        }
        res.json({ message: 'Picture uploaded.', filename: req.file.filename })
    }

    // Drugi korak: ime sacuvanog fajla se upisuje na proizvod
    setImage = (req: express.Request, res: express.Response) => {
        const code = String(req.params['code'] ?? '')
        const filename = req.body.filename

        if (!filename) {
            return res.status(400).json({ message: 'File name is required.' })
        }

        ProductM.updateOne({ code: code }, { main_image: filename }).then((result) => {
            if (result.matchedCount === 0) {
                return res.status(404).json({ message: 'Product not found.' })
            }
            res.json({ message: 'Product picture saved.' })
        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // Ocenjuje samo jednom, klijent koji je proizvod stvarno primio; ponovno slanje menja prethodnu ocenu
    react = (req: express.Request, res: express.Response) => {
        const code = String(req.params['code'] ?? '')
        const username = req.body.username
        const value = Number(req.body.value)

        if (!username || (value !== 1 && value !== -1)) {
            return res.status(400).json({ message: 'A rating is either a like or a dislike.' })
        }

        this.checkReceived(username, code).then((problem) => {
            if (problem) {
                res.status(problem.status).json({ message: problem.message })
                return
            }

            // Zamenjuje raniju reakciju, da se klijent racuna samo jednom
            return ProductM.updateOne(
                { code: code },
                { $pull: { reactions: { username: username } } }
            ).then(() => ProductM.updateOne(
                { code: code },
                { $push: { reactions: { username: username, value: value, date: new Date() } } }
            )).then(() => {
                res.json({ message: value === 1 ? 'You liked this product.' : 'You disliked this product.' })
            })

        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // Komentar na primljen proizvod, klijent sme da ostavi vise njih
    comment = (req: express.Request, res: express.Response) => {
        const code = String(req.params['code'] ?? '')
        const username = req.body.username
        const text = (req.body.text ?? '').trim()

        if (!username || !text) {
            return res.status(400).json({ message: 'Write the text of the comment.' })
        }
        if (text.length > 500) {
            return res.status(400).json({ message: 'A comment can be at most 500 characters long.' })
        }

        this.checkReceived(username, code).then((problem) => {
            if (problem) {
                res.status(problem.status).json({ message: problem.message })
                return
            }

            return ProductM.updateOne(
                { code: code },
                { $push: { comments: { username: username, text: text, date: new Date() } } }
            ).then(() => {
                res.json({ message: 'Comment saved.' })
            })

        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // Za dve padajuce liste forme za pretragu
    searchOptions = (req: express.Request, res: express.Response) => {
        const inStock = { stock_quantity: { $gt: 0 } }

        Promise.all([
            ProductM.distinct('category', inStock),
            ProductM.distinct('institution_id', inStock)
        ]).then(([categories, institutionIds]) => {
            return InstitutionM.distinct('city', { _id: { $in: institutionIds } }).then((cities) => {
                res.json({
                    categories: categories.sort(),
                    cities: cities.sort()
                })
            })
        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // Svaki parametar je opcionalan, a rasprodati proizvodi se nikad ne nude
    search = (req: express.Request, res: express.Response) => {
        const name = this.queryText(req.query['name'])
        const category = this.queryText(req.query['category'])
        const city = this.queryText(req.query['city'])

        // Match samo sa proizvodima koje stamparije jos imaju na stanju
        const match: any = { stock_quantity: { $gt: 0 } }
        if (name) {
            match.name = { $regex: this.namePattern(name), $options: 'i' }   // dovoljan je deo naziva
        }
        if (category) {
            match.category = category
        }

        ProductM.aggregate([
            { $match: match },
            ...this.withReactionCounts(),
            ...this.withPrinter(),
            // Grad stoji na stampariji, pa moze da se filtrira tek posle spajanja
            ...(city ? [{ $match: { printer_city: city } }] : []),
            { $sort: { name: 1 } },
            { $project: this.listFields() }
        ]).then((products) => {
            res.json(products)
        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // ---------------------------------------------------------------- helpers -

    // Lajkovi se ne cuvaju kao brojaci nego se broje iz niza reakcija, pa se jedan klijent nikad ne racuna dvaput
    private withReactionCounts = () => [
        {
            $addFields: {
                likes: { $size: { $filter: { input: '$reactions', as: 'r', cond: { $eq: ['$$r.value', 1] } } } },
                dislikes: { $size: { $filter: { input: '$reactions', as: 'r', cond: { $eq: ['$$r.value', -1] } } } }
            }
        }
    ]

    // Spaja stampariju koja nudi proizvod
    // $lookup  vraca niz, pa ga $first svodi na jednu ustanovu
    private withPrinter = () => [
        {
            $lookup: {
                from: 'institutions',
                localField: 'institution_id',
                foreignField: '_id',
                as: 'printer'
            }
        },
        {
            $addFields: {
                printer_name: { $first: '$printer.name' },
                printer_city: { $first: '$printer.city' },
                printer_address: { $first: '$printer.address' }
            }
        }
    ]

    // Cena, opis i usluge stampe se namerno izostavljaju; neprijavljen posetilac ih ne vidi
    private listFields = () => ({
        _id: 0,
        code: 1, name: 1, category: 1, subcategory: 1, main_image: 1,
        likes: 1, dislikes: 1,
        institution_id: 1, printer_name: 1, printer_city: 1
    })

    // Proizvod uvek pripada stampariji, pa se ustanova uzima sa naloga, a ne iz zahteva
    private institutionOf = (username: string): Promise<string | null> => {
        return UserM.findOne({ username: username })
            .then((user) => user?.institution_id ?? null)
    }

    private checkProduct = (body: any, existing: any, category: any): string | null => {
        for (const field of ['code', 'name', 'category']) {
            if (!body[field] || !String(body[field]).trim()) {
                return 'Code, name and category are required.'
            }
        }
        // Sifra ide u adresu, pa sme da ima samo slova, cifre i crticu
        if (!PRODUCT_CODE_REGEX.test(String(body.code).trim())) {
            return 'Code can only contain letters, digits and dashes, and at most 20 of them.'
        }
        if (existing) {
            return `A product with the code ${body.code} already exists. Codes are unique across the whole system.`
        }
        if (!category) {
            return 'Choose one of the existing categories.'
        }
        if (String(body.name).trim().length > MAX_NAME) {
            return `Product name can be at most ${MAX_NAME} characters long.`
        }
        if (String(body.description ?? '').length > MAX_DESCRIPTION) {
            return `Description can be at most ${MAX_DESCRIPTION} characters long.`
        }
        // Potkategorija je opcionalna, ali ako je data mora da pripada toj kategoriji
        if (body.subcategory && !category.subcategories.some((one: any) => one.name === body.subcategory)) {
            return `${body.subcategory} is not a subcategory of ${body.category}.`
        }

        const price = Number(body.unit_price)
        if (!Number.isFinite(price) || price < MIN_PRICE || price > MAX_PRICE) {
            return `Unit price must be between ${MIN_PRICE} and ${MAX_PRICE} RSD.`
        }

        const stock = Number(body.stock_quantity)
        if (!Number.isInteger(stock) || stock < 0 || stock > MAX_STOCK) {
            return `Quantity on stock must be a whole number between 0 and ${MAX_STOCK}.`
        }

        return null
    }

    private checkService = (body: any, product: any): string | null => {
        if (!body.print_type || !String(body.print_type).trim()) {
            return 'Name the type of print.'
        }
        if ((product.print_services ?? []).some((one: any) => one.print_type === String(body.print_type).trim())) {
            return 'That type of print is already offered for this product.'
        }

        if (String(body.print_type).trim().length > MAX_NAME) {
            return `The name of the type of print can be at most ${MAX_NAME} characters long.`
        }

        const extra = Number(body.extra_price_per_piece)
        if (!Number.isFinite(extra) || extra < 0 || extra > MAX_PRICE) {
            return `Extra price per piece must be between 0 and ${MAX_PRICE} RSD.`
        }

        for (const field of ['max_width_mm', 'max_height_mm']) {
            const size = Number(body[field])
            if (!Number.isFinite(size) || size <= 0 || size > MAX_PRINT_SIZE_MM) {
                return `Maximum width and height must be between 1 and ${MAX_PRINT_SIZE_MM} mm.`
            }
        }

        return null
    }

    // Boje stizu kao jedan red teksta, jer ih forma tako trazi
    private toColors = (colors: any): string[] => {
        if (Array.isArray(colors)) {
            return colors
        }
        return String(colors ?? '')
            .split(',')
            .map((color) => color.trim())
            .filter((color) => color.length > 0)
    }

    // Ocenjuje se i komentarise samo proizvod koji je stigao do klijenta
    // Kod client_legal to je faktura njegove ustanove, jer je cela firma primila robu, ali sama ocena ostaje vezana za osobu
    private checkReceived = (username: string, code: string): Promise<{ status: number, message: string } | null> => {
        return UserM.findOne({ username: username }).then((user) => {
            if (!user) {
                return { status: 404, message: 'User not found.' }
            }

            const owner = user.institution_id
                ? { client_institution_id: user.institution_id }
                : { client_username: username }

            return OrderM.findOne({
                ...owner,
                status: OrderStatus.RECEIVED,
                'items.product_code': code
            }).then((order) => order
                ? null
                : { status: 403, message: 'You can only rate a product you have received.' })
        })
    }

    //Parametar ne mora biti string, ali se svodi na njega, pa se ostatak pretrage radi samo sa tekstom
    private queryText = (value: unknown): string => {
        const single = Array.isArray(value) ? value[0] : value
        return typeof single === 'string' ? single.trim() : ''
    }

    // Uneti tekst ulazi u regularni izraz, pa znaci koji regexu nesto znace moraju prvo da izgube to znacenje
    private escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    // Nasa slova koja klijent ne moze uvek da otkuca
    private static readonly LETTER_GROUPS = ['cčć', 'sš', 'zž', 'dđ']

    // Pravi sablon po kom se trazi naziv proizvoda
    private namePattern = (text: string) => {
        return this.escapeRegex(text).replace(/[a-zA-ZčćšžđČĆŠŽĐ]/g, (letter) => {
            const group = ProductController.LETTER_GROUPS
                .find((one) => one.includes(letter.toLowerCase()))
            return group ? `[${group}]` : letter
        })
    }
}
