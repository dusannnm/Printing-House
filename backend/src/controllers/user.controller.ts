import express from 'express'
import bcrypt from 'bcryptjs'
import UserM from '../models/user'
import InstitutionM from '../models/institution'
import CartM from '../models/cart'
import { UserStatus } from '../constants/user-status'
import { INSTITUTION_TYPES, REGISTRABLE_TYPES, USER_TYPE_LABELS, UserType } from '../constants/user-type'
import fs from 'fs'
import { imageSize } from 'image-size'
import {
    DEFAULT_PROFILE_IMAGE, EMAIL_REGEX, MAX_ADDRESS, MAX_EMAIL, MAX_NAME, MAX_USERNAME,
    PASSWORD_REGEX, PASSWORD_RULE, PHONE_REGEX, PROFILE_IMAGE_MAX_PX, PROFILE_IMAGE_MIN_PX,
    REGISTRATION_NUMBER_REGEX, TAX_ID_REGEX
} from '../constants/validation'

export class UserController {

    login = (req: express.Request, res: express.Response) => this.signIn(req, res, false)

    // Admin forma je na svojoj ruti i nije povezana ni sa jedne javne stranice
    adminLogin = (req: express.Request, res: express.Response) => this.signIn(req, res, true)

    // Zajednicko telo obe forme; adminForm odredjuje koja je koriscena
    private signIn = (req: express.Request, res: express.Response, adminForm: boolean) => {
        const username = req.body.username
        const password = req.body.password

        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password are required.' })
        }

        UserM.findOne({ username: username }).then((user) => {

            // Nepoznat username, pogresna lozinka i nalog sa druge forme daju isti odgovor, da se nista o nalogu ne oda
            const isAdmin = user?.type === UserType.ADMIN

            if (!user || isAdmin !== adminForm || !bcrypt.compareSync(password, user.password!)) {
                res.status(400).json({ message: 'Wrong username or password.' })
                return
            }

            if (user.status === UserStatus.PENDING) {
                res.status(403).json({ message: 'Your registration is still waiting for the administrator to approve it.' })
                return
            }

            if (user.status === UserStatus.REJECTED) {
                res.status(403).json({ message: 'Your registration request was rejected.' })
                return
            }

            return this.respondWithUser(res, user)

        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // Svi nalozi, za admina; ustanova se pridruzuje, hash lozinke se izostavlja
    getAll = (req: express.Request, res: express.Response) => {
        UserM.aggregate([
            {
                $lookup: {
                    from: 'institutions',
                    localField: 'institution_id',
                    foreignField: '_id',
                    as: 'institution'
                }
            },
            { $addFields: { institution: { $first: '$institution' } } },
            { $project: { password: 0 } },
            { $sort: { type: 1, username: 1 } }
        ]).then((users) => {
            res.json(users)
        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // Zahtevi koji cekaju odluku
    // Uz svaki ide ustanova za koju se prijavljuje, jer je maticni broj javan podatak - admin jedino odobrava
    pending = (req: express.Request, res: express.Response) => {
        UserM.find({ status: UserStatus.PENDING }).sort({ registered_at: 1 }).then((requests) => {
            // Type guard je ono cime TypeScript zna da praznih vise nema
            const institutionIds = requests
                .map((one) => one.institution_id)
                .filter((id): id is string => !!id)

            return Promise.all([
                InstitutionM.find({ _id: { $in: institutionIds } }),
                UserM.find({ institution_id: { $in: institutionIds }, status: UserStatus.ACTIVE })
            ]).then(([institutions, members]) => {

                const rows = requests.map((request) => {
                    const { password: hash, ...safeUser } = request.toObject()

                    return {
                        ...safeUser,
                        institution: institutions.find((one) => one._id === request.institution_id),
                        // Prazno znaci da bi ovaj nalog bio prvi u svojoj ustanovi
                        colleagues: members
                            .filter((one) => one.institution_id === request.institution_id)
                            .map((one) => one.username)
                    }
                })

                res.json(rows)
            })

        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // Odlucuje se samo o zahtevu koji jos ceka, pa odluka ne moze da padne dvaput
    decide = (req: express.Request, res: express.Response) => {
        const username = String(req.params['username'] ?? '')
        const status = Number(req.body.status)

        if (status !== UserStatus.ACTIVE && status !== UserStatus.REJECTED) {
            return res.status(400).json({ message: 'A registration request can only be accepted or rejected.' })
        }

        UserM.findOne({ username: username }).then((user) => {
            if (!user) {
                res.status(404).json({ message: 'User not found.' })
                return
            }
            if (user.status !== UserStatus.PENDING) {
                res.status(400).json({ message: 'That registration request has already been decided.' })
                return
            }

            return UserM.updateOne({ username: username }, { status: status }).then(() => {
                res.json({
                    message: status === UserStatus.ACTIVE
                        ? `${username} was accepted and can now sign in.`
                        : `The registration request of ${username} was rejected.`
                })
            })

        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // Brise nalog zajedno sa korpom. Ono sto je nalog vec uradio (fakture, uneti proizvodi, komentari) ostaje zbog istorije drugih korisnika
    remove = (req: express.Request, res: express.Response) => {
        const username = String(req.params['username'] ?? '')

        UserM.findOne({ username: username }).then((user) => {
            if (!user) {
                res.status(404).json({ message: 'User not found.' })
                return
            }

            // Mora da ostane bar jedan admin, inace niko vise ne bi mogao da upravlja sistemom
            if (user.type === UserType.ADMIN) {
                return UserM.countDocuments({ type: UserType.ADMIN }).then((administrators) => {
                    if (administrators <= 1) {
                        res.status(400).json({ message: 'The last administrator cannot be deleted.' })
                        return
                    }
                    return this.deleteAccount(username, res)
                })
            }

            return this.deleteAccount(username, res)

        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // Broji se po ustanovama, a ne po nalozima, jer jedna stamparija moze da ima vise zaposlenih sa sopstvenom prijavom
    countPrinters = (req: express.Request, res: express.Response) => {
        UserM.distinct('institution_id', { type: UserType.PRINTER, status: UserStatus.ACTIVE })
            .then((institutionIds) => res.json({ count: institutionIds.length }))
            .catch((err) => {
                console.error(err)
                res.status(500).json({ message: 'Server error, please try again.' })
            })
    }

    // Nalog je upotrebljiv tek kad ga admin odobri, pa se uvek cuva sa statusom PENDING
    register = (req: express.Request, res: express.Response) => {
        const body = req.body

        const problem = this.checkRegistration(body)
        if (problem) {
            return res.status(400).json({ message: problem })
        }

        // Username i e-mail su jedinstveni za svaki nalog. Podaci o ustanovi se proveravaju posebno, oni se dele
        UserM.findOne({ $or: [{ username: body.username }, { email: body.email }] }).then((existing) => {
            if (existing) {
                const taken = existing.username === body.username
                    ? 'That username is already taken.'
                    : 'That e-mail address already has an account.'
                res.status(400).json({ message: taken })
                return
            }

            if (!INSTITUTION_TYPES.includes(body.type)) {
                return this.saveUser(res, body, undefined)
            }

            // Ili se pridruzuje ustanovi sa ovim maticnim brojem, ili se ona pravi ako je ovo prvi nalog te firme
            return this.resolveInstitution(body).then((outcome) => {
                if (outcome.problem) {
                    res.status(400).json({ message: outcome.problem })
                    return
                }
                return this.saveUser(res, body, outcome.institutionId)
            })

        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    getOne = (req: express.Request, res: express.Response) => {
        UserM.findOne({ username: req.params['username'] }).then((user) => {
            if (!user) {
                res.status(404).json({ message: 'User not found.' })
                return
            }
            return this.respondWithUser(res, user)
        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // Username, tip i status ne mogu da se menjaju - ne citaju se iz tela zahteva
    updateProfile = (req: express.Request, res: express.Response) => {
        const body = req.body

        const problem = this.checkProfile(body)
        if (problem) {
            return res.status(400).json({ message: problem })
        }

        // E-mail ostaje jedinstven, ali nalog sme da zadrzi svoj
        UserM.findOne({ email: body.email, username: { $ne: body.username } }).then((taken) => {
            if (taken) {
                res.status(400).json({ message: 'That e-mail address already has an account.' })
                return
            }

            return UserM.findOneAndUpdate(
                { username: body.username },
                { name: body.name, surname: body.surname, phone: body.phone, email: body.email },
                { returnDocument: 'after' }
            ).then((user) => {
                if (!user) {
                    res.status(404).json({ message: 'User not found.' })
                    return
                }

                // Podatke o ustanovi dele sve kolege, pa maticni broj i PIB ostaju fiksni, menjaju se samo adresa i grad
                if (!user.institution_id) {
                    return this.respondWithUser(res, user)
                }

                return InstitutionM.findByIdAndUpdate(user.institution_id, {
                    name: body.institution_name,
                    address: body.address,
                    city: body.city
                }).then(() => this.respondWithUser(res, user))
            })

        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // Prvi korak slanja slike; multer je fajl vec sacuvao, pa ostaje samo da se javi ime pod kojim je snimljen
    uploadProfileImage = (req: express.Request, res: express.Response) => {
        if (!req.file) {
            return res.status(400).json({ message: 'Picture must be a JPG, PNG or GIF file.' })
        }

        // Jos jedna provera slike sa serverske strane
        const size = imageSize(fs.readFileSync(req.file.path))

        if (size.width < PROFILE_IMAGE_MIN_PX || size.height < PROFILE_IMAGE_MIN_PX
            || size.width > PROFILE_IMAGE_MAX_PX || size.height > PROFILE_IMAGE_MAX_PX) {

            fs.unlinkSync(req.file.path)      // a refused picture is not left on disk
            return res.status(400).json({
                message: `Profile picture must be between ${PROFILE_IMAGE_MIN_PX}x${PROFILE_IMAGE_MIN_PX} and ${PROFILE_IMAGE_MAX_PX}x${PROFILE_IMAGE_MAX_PX} pixels (this one is ${size.width}x${size.height}).`
            })
        }

        res.json({ message: 'Picture uploaded.', filename: req.file.filename })
    }

    // Drugi korak: ime sacuvanog fajla se upisuje na nalog
    setProfileImage = (req: express.Request, res: express.Response) => {
        const username = req.body.username
        const filename = req.body.filename

        if (!username || !filename) {
            return res.status(400).json({ message: 'Username and file name are required.' })
        }

        UserM.findOneAndUpdate({ username: username }, { profile_image: filename }).then((user) => {
            if (!user) {
                return res.status(404).json({ message: 'User not found.' })
            }
            res.json({ message: 'Profile picture saved.' })
        }).catch((err) => {
            console.error(err)
            res.status(500).json({ message: 'Server error, please try again.' })
        })
    }

    // ---------------------------------------------------------------- helpers -

    // Korpa je licna, pa odlazi sa nalogom; nista drugo ne odlazi
    private deleteAccount = (username: string, res: express.Response) => {
        return Promise.all([
            UserM.deleteOne({ username: username }),
            CartM.deleteOne({ client_username: username })
        ]).then(() => {
            res.json({ message: `Account ${username} was deleted.` })
        })
    }

    // Nalazi ustanovu novog naloga, a pravi je ako je ovo prvi zaposleni te firme
    private resolveInstitution = (body: any): Promise<{ problem?: string, institutionId?: string }> => {
        return InstitutionM.findById(body.registration_number).then((institution) => {

            if (institution) {
                // Pri pridruzivanju postojecoj firmi maticni broj i PIB moraju da se slazu
                // Stampariji se ne moze pristupiti kao pravnom licu ni obrnuto
                if (institution.tax_id !== body.tax_id) {
                    return { problem: `Registration number ${body.registration_number} belongs to "${institution.name}", but the tax identification number does not match it.` }
                }
                if (institution.type !== body.type) {
                    // Kaze koju opciju treba izabrati, ne samo da je ova pogresna
                    return { problem: `Registration number ${body.registration_number} belongs to "${institution.name}", which is registered as "${USER_TYPE_LABELS[institution.type!]}". Choose that as the type of account to join it.` }
                }
                return { institutionId: institution._id! }
            }

            // Nova firma: njen PIB ne sme vec da pripada nekoj drugoj
            return InstitutionM.findOne({ tax_id: body.tax_id }).then((sameTaxId) => {
                if (sameTaxId) {
                    return { problem: `That tax identification number already belongs to "${sameTaxId.name}".` }
                }

                return new InstitutionM({
                    _id: body.registration_number,
                    name: body.institution_name,
                    address: body.address,
                    city: body.city,
                    tax_id: body.tax_id,
                    type: body.type
                }).save().then((created) => ({ institutionId: created._id! }))
            })
        })
    }

    private saveUser = (res: express.Response, body: any, institutionId: string | undefined) => {
        return new UserM({
            username: body.username,
            password: bcrypt.hashSync(body.password, 10),
            name: body.name,
            surname: body.surname,
            phone: body.phone,
            email: body.email,
            profile_image: DEFAULT_PROFILE_IMAGE,   // zamenjuje se poslatom slikom, ako je ima
            type: body.type,
            status: UserStatus.PENDING,             // nikad se ne uzima iz pregledaca
            institution_id: institutionId
        }).save().then(() => {
            res.json({ message: 'Registration request sent. The administrator has to approve it before you can log in.' })
        })
    }

    // Vraca nalog bez hash-a lozinke i sa popunjenom ustanovom, da stranice odmah mogu da prikazu naziv firme
    private respondWithUser = (res: express.Response, user: any) => {
        const { password: hash, ...safeUser } = user.toObject()

        if (!safeUser.institution_id) {
            res.json(safeUser)
            return
        }

        return InstitutionM.findById(safeUser.institution_id).then((institution) => {
            res.json({ ...safeUser, institution: institution })
        })
    }

    // Lozinka nije deo forme za profil, pa se ovde ne proverava
    private checkProfile = (body: any): string | null => {
        for (const field of ['username', 'name', 'surname', 'phone', 'email']) {
            if (!body[field]) {
                return 'Name, surname, contact telephone and e-mail address are required.'
            }
        }
        if (!EMAIL_REGEX.test(body.email)) {
            return 'E-mail address is not valid.'
        }
        if (!PHONE_REGEX.test(body.phone)) {
            return 'Contact telephone is not valid.'
        }

        return this.checkLengths(body)
    }

    // Proverava duzine svih polja
    private checkLengths = (body: any): string | null => {
        const limits: [string, number, string][] = [
            ['username', MAX_USERNAME, 'Username'],
            ['name', MAX_NAME, 'Name'],
            ['surname', MAX_NAME, 'Surname'],
            ['email', MAX_EMAIL, 'E-mail address'],
            ['institution_name', MAX_NAME, 'Institution name'],
            ['address', MAX_ADDRESS, 'Address'],
            ['city', MAX_NAME, 'City']
        ]

        for (const [field, limit, label] of limits) {
            if (String(body[field] ?? '').length > limit) {
                return `${label} can be at most ${limit} characters long.`
            }
        }
        return null
    }

    // Vraca prvi pronadjeni problem ili null
    // Browser proverava ista pravila, ali se ovde ponavljaju jer browser moze da se zaobidje
    private checkRegistration = (body: any): string | null => {
        for (const field of ['username', 'password', 'name', 'surname', 'phone', 'email', 'type']) {
            if (!body[field]) {
                return 'All fields except the profile picture are required.'
            }
        }

        if (!REGISTRABLE_TYPES.includes(body.type)) {
            return 'Unknown type of account.'
        }
        if (!PASSWORD_REGEX.test(body.password)) {
            return PASSWORD_RULE
        }
        if (!EMAIL_REGEX.test(body.email)) {
            return 'E-mail address is not valid.'
        }
        if (!PHONE_REGEX.test(body.phone)) {
            return 'Contact telephone is not valid.'
        }

        // Pravna lica i stamparije opisuju ustanovu iza naloga
        if (INSTITUTION_TYPES.includes(body.type)) {
            if (!body.institution_name || !body.address || !body.city) {
                return 'Institution name, address and city are required.'
            }
            if (!REGISTRATION_NUMBER_REGEX.test(body.registration_number ?? '')) {
                return 'Registration number must have exactly 8 digits.'
            }
            if (!TAX_ID_REGEX.test(body.tax_id ?? '')) {
                return 'Tax identification number must have 9 digits and cannot start with a zero.'
            }
        }

        return this.checkLengths(body)
    }
}
