"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const user_1 = __importDefault(require("../models/user"));
const institution_1 = __importDefault(require("../models/institution"));
const cart_1 = __importDefault(require("../models/cart"));
const user_status_1 = require("../constants/user-status");
const user_type_1 = require("../constants/user-type");
const fs_1 = __importDefault(require("fs"));
const image_size_1 = require("image-size");
const validation_1 = require("../constants/validation");
class UserController {
    constructor() {
        this.login = (req, res) => this.signIn(req, res, false);
        // Admin forma je na svojoj ruti i nije povezana ni sa jedne javne stranice
        this.adminLogin = (req, res) => this.signIn(req, res, true);
        // Zajednicko telo obe forme; adminForm odredjuje koja je koriscena
        this.signIn = (req, res, adminForm) => {
            const username = req.body.username;
            const password = req.body.password;
            if (!username || !password) {
                return res.status(400).json({ message: 'Username and password are required.' });
            }
            user_1.default.findOne({ username: username }).then((user) => {
                // Nepoznat username, pogresna lozinka i nalog sa druge forme daju isti odgovor, da se nista o nalogu ne oda
                const isAdmin = user?.type === user_type_1.UserType.ADMIN;
                if (!user || isAdmin !== adminForm || !bcryptjs_1.default.compareSync(password, user.password)) {
                    res.status(400).json({ message: 'Wrong username or password.' });
                    return;
                }
                if (user.status === user_status_1.UserStatus.PENDING) {
                    res.status(403).json({ message: 'Your registration is still waiting for the administrator to approve it.' });
                    return;
                }
                if (user.status === user_status_1.UserStatus.REJECTED) {
                    res.status(403).json({ message: 'Your registration request was rejected.' });
                    return;
                }
                return this.respondWithUser(res, user);
            }).catch((err) => {
                console.error(err);
                res.status(500).json({ message: 'Server error, please try again.' });
            });
        };
        // Svi nalozi, za admina; ustanova se pridruzuje, hash lozinke se izostavlja
        this.getAll = (req, res) => {
            user_1.default.aggregate([
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
                res.json(users);
            }).catch((err) => {
                console.error(err);
                res.status(500).json({ message: 'Server error, please try again.' });
            });
        };
        // Zahtevi koji cekaju odluku
        // Uz svaki ide ustanova za koju se prijavljuje, jer je maticni broj javan podatak - admin jedino odobrava
        this.pending = (req, res) => {
            user_1.default.find({ status: user_status_1.UserStatus.PENDING }).sort({ registered_at: 1 }).then((requests) => {
                // Type guard je ono cime TypeScript zna da praznih vise nema
                const institutionIds = requests
                    .map((one) => one.institution_id)
                    .filter((id) => !!id);
                return Promise.all([
                    institution_1.default.find({ _id: { $in: institutionIds } }),
                    user_1.default.find({ institution_id: { $in: institutionIds }, status: user_status_1.UserStatus.ACTIVE })
                ]).then(([institutions, members]) => {
                    const rows = requests.map((request) => {
                        const { password: hash, ...safeUser } = request.toObject();
                        return {
                            ...safeUser,
                            institution: institutions.find((one) => one._id === request.institution_id),
                            // Prazno znaci da bi ovaj nalog bio prvi u svojoj ustanovi
                            colleagues: members
                                .filter((one) => one.institution_id === request.institution_id)
                                .map((one) => one.username)
                        };
                    });
                    res.json(rows);
                });
            }).catch((err) => {
                console.error(err);
                res.status(500).json({ message: 'Server error, please try again.' });
            });
        };
        // Odlucuje se samo o zahtevu koji jos ceka, pa odluka ne moze da padne dvaput
        this.decide = (req, res) => {
            const username = String(req.params['username'] ?? '');
            const status = Number(req.body.status);
            if (status !== user_status_1.UserStatus.ACTIVE && status !== user_status_1.UserStatus.REJECTED) {
                return res.status(400).json({ message: 'A registration request can only be accepted or rejected.' });
            }
            user_1.default.findOne({ username: username }).then((user) => {
                if (!user) {
                    res.status(404).json({ message: 'User not found.' });
                    return;
                }
                if (user.status !== user_status_1.UserStatus.PENDING) {
                    res.status(400).json({ message: 'That registration request has already been decided.' });
                    return;
                }
                return user_1.default.updateOne({ username: username }, { status: status }).then(() => {
                    res.json({
                        message: status === user_status_1.UserStatus.ACTIVE
                            ? `${username} was accepted and can now sign in.`
                            : `The registration request of ${username} was rejected.`
                    });
                });
            }).catch((err) => {
                console.error(err);
                res.status(500).json({ message: 'Server error, please try again.' });
            });
        };
        // Brise nalog zajedno sa korpom. Ono sto je nalog vec uradio (fakture, uneti proizvodi, komentari) ostaje zbog istorije drugih korisnika
        this.remove = (req, res) => {
            const username = String(req.params['username'] ?? '');
            user_1.default.findOne({ username: username }).then((user) => {
                if (!user) {
                    res.status(404).json({ message: 'User not found.' });
                    return;
                }
                // Mora da ostane bar jedan admin, inace niko vise ne bi mogao da upravlja sistemom
                if (user.type === user_type_1.UserType.ADMIN) {
                    return user_1.default.countDocuments({ type: user_type_1.UserType.ADMIN }).then((administrators) => {
                        if (administrators <= 1) {
                            res.status(400).json({ message: 'The last administrator cannot be deleted.' });
                            return;
                        }
                        return this.deleteAccount(username, res);
                    });
                }
                return this.deleteAccount(username, res);
            }).catch((err) => {
                console.error(err);
                res.status(500).json({ message: 'Server error, please try again.' });
            });
        };
        // Broji se po ustanovama, a ne po nalozima, jer jedna stamparija moze da ima vise zaposlenih sa sopstvenom prijavom
        this.countPrinters = (req, res) => {
            user_1.default.distinct('institution_id', { type: user_type_1.UserType.PRINTER, status: user_status_1.UserStatus.ACTIVE })
                .then((institutionIds) => res.json({ count: institutionIds.length }))
                .catch((err) => {
                console.error(err);
                res.status(500).json({ message: 'Server error, please try again.' });
            });
        };
        // Nalog je upotrebljiv tek kad ga admin odobri, pa se uvek cuva sa statusom PENDING
        this.register = (req, res) => {
            const body = req.body;
            const problem = this.checkRegistration(body);
            if (problem) {
                return res.status(400).json({ message: problem });
            }
            // Username i e-mail su jedinstveni za svaki nalog. Podaci o ustanovi se proveravaju posebno, oni se dele
            user_1.default.findOne({ $or: [{ username: body.username }, { email: body.email }] }).then((existing) => {
                if (existing) {
                    const taken = existing.username === body.username
                        ? 'That username is already taken.'
                        : 'That e-mail address already has an account.';
                    res.status(400).json({ message: taken });
                    return;
                }
                if (!user_type_1.INSTITUTION_TYPES.includes(body.type)) {
                    return this.saveUser(res, body, undefined);
                }
                // Ili se pridruzuje ustanovi sa ovim maticnim brojem, ili se ona pravi ako je ovo prvi nalog te firme
                return this.resolveInstitution(body).then((outcome) => {
                    if (outcome.problem) {
                        res.status(400).json({ message: outcome.problem });
                        return;
                    }
                    return this.saveUser(res, body, outcome.institutionId);
                });
            }).catch((err) => {
                console.error(err);
                res.status(500).json({ message: 'Server error, please try again.' });
            });
        };
        this.getOne = (req, res) => {
            user_1.default.findOne({ username: req.params['username'] }).then((user) => {
                if (!user) {
                    res.status(404).json({ message: 'User not found.' });
                    return;
                }
                return this.respondWithUser(res, user);
            }).catch((err) => {
                console.error(err);
                res.status(500).json({ message: 'Server error, please try again.' });
            });
        };
        // Username, tip i status ne mogu da se menjaju - ne citaju se iz tela zahteva
        this.updateProfile = (req, res) => {
            const body = req.body;
            const problem = this.checkProfile(body);
            if (problem) {
                return res.status(400).json({ message: problem });
            }
            // E-mail ostaje jedinstven, ali nalog sme da zadrzi svoj
            user_1.default.findOne({ email: body.email, username: { $ne: body.username } }).then((taken) => {
                if (taken) {
                    res.status(400).json({ message: 'That e-mail address already has an account.' });
                    return;
                }
                return user_1.default.findOneAndUpdate({ username: body.username }, { name: body.name, surname: body.surname, phone: body.phone, email: body.email }, { returnDocument: 'after' }).then((user) => {
                    if (!user) {
                        res.status(404).json({ message: 'User not found.' });
                        return;
                    }
                    // Podatke o ustanovi dele sve kolege, pa maticni broj i PIB ostaju fiksni, menjaju se samo adresa i grad
                    if (!user.institution_id) {
                        return this.respondWithUser(res, user);
                    }
                    return institution_1.default.findByIdAndUpdate(user.institution_id, {
                        name: body.institution_name,
                        address: body.address,
                        city: body.city
                    }).then(() => this.respondWithUser(res, user));
                });
            }).catch((err) => {
                console.error(err);
                res.status(500).json({ message: 'Server error, please try again.' });
            });
        };
        // Prvi korak slanja slike; multer je fajl vec sacuvao, pa ostaje samo da se javi ime pod kojim je snimljen
        this.uploadProfileImage = (req, res) => {
            if (!req.file) {
                return res.status(400).json({ message: 'Picture must be a JPG, PNG or GIF file.' });
            }
            // Jos jedna provera slike sa serverske strane
            const size = (0, image_size_1.imageSize)(fs_1.default.readFileSync(req.file.path));
            if (size.width < validation_1.PROFILE_IMAGE_MIN_PX || size.height < validation_1.PROFILE_IMAGE_MIN_PX
                || size.width > validation_1.PROFILE_IMAGE_MAX_PX || size.height > validation_1.PROFILE_IMAGE_MAX_PX) {
                fs_1.default.unlinkSync(req.file.path); // a refused picture is not left on disk
                return res.status(400).json({
                    message: `Profile picture must be between ${validation_1.PROFILE_IMAGE_MIN_PX}x${validation_1.PROFILE_IMAGE_MIN_PX} and ${validation_1.PROFILE_IMAGE_MAX_PX}x${validation_1.PROFILE_IMAGE_MAX_PX} pixels (this one is ${size.width}x${size.height}).`
                });
            }
            res.json({ message: 'Picture uploaded.', filename: req.file.filename });
        };
        // Drugi korak: ime sacuvanog fajla se upisuje na nalog
        this.setProfileImage = (req, res) => {
            const username = req.body.username;
            const filename = req.body.filename;
            if (!username || !filename) {
                return res.status(400).json({ message: 'Username and file name are required.' });
            }
            user_1.default.findOneAndUpdate({ username: username }, { profile_image: filename }).then((user) => {
                if (!user) {
                    return res.status(404).json({ message: 'User not found.' });
                }
                res.json({ message: 'Profile picture saved.' });
            }).catch((err) => {
                console.error(err);
                res.status(500).json({ message: 'Server error, please try again.' });
            });
        };
        // ---------------------------------------------------------------- helpers -
        // Korpa je licna, pa odlazi sa nalogom; nista drugo ne odlazi
        this.deleteAccount = (username, res) => {
            return Promise.all([
                user_1.default.deleteOne({ username: username }),
                cart_1.default.deleteOne({ client_username: username })
            ]).then(() => {
                res.json({ message: `Account ${username} was deleted.` });
            });
        };
        // Nalazi ustanovu novog naloga, a pravi je ako je ovo prvi zaposleni te firme
        this.resolveInstitution = (body) => {
            return institution_1.default.findById(body.registration_number).then((institution) => {
                if (institution) {
                    // Pri pridruzivanju postojecoj firmi maticni broj i PIB moraju da se slazu
                    // Stampariji se ne moze pristupiti kao pravnom licu ni obrnuto
                    if (institution.tax_id !== body.tax_id) {
                        return { problem: `Registration number ${body.registration_number} belongs to "${institution.name}", but the tax identification number does not match it.` };
                    }
                    if (institution.type !== body.type) {
                        // Kaze koju opciju treba izabrati, ne samo da je ova pogresna
                        return { problem: `Registration number ${body.registration_number} belongs to "${institution.name}", which is registered as "${user_type_1.USER_TYPE_LABELS[institution.type]}". Choose that as the type of account to join it.` };
                    }
                    return { institutionId: institution._id };
                }
                // Nova firma: njen PIB ne sme vec da pripada nekoj drugoj
                return institution_1.default.findOne({ tax_id: body.tax_id }).then((sameTaxId) => {
                    if (sameTaxId) {
                        return { problem: `That tax identification number already belongs to "${sameTaxId.name}".` };
                    }
                    return new institution_1.default({
                        _id: body.registration_number,
                        name: body.institution_name,
                        address: body.address,
                        city: body.city,
                        tax_id: body.tax_id,
                        type: body.type
                    }).save().then((created) => ({ institutionId: created._id }));
                });
            });
        };
        this.saveUser = (res, body, institutionId) => {
            return new user_1.default({
                username: body.username,
                password: bcryptjs_1.default.hashSync(body.password, 10),
                name: body.name,
                surname: body.surname,
                phone: body.phone,
                email: body.email,
                profile_image: validation_1.DEFAULT_PROFILE_IMAGE, // zamenjuje se poslatom slikom, ako je ima
                type: body.type,
                status: user_status_1.UserStatus.PENDING, // nikad se ne uzima iz pregledaca
                institution_id: institutionId
            }).save().then(() => {
                res.json({ message: 'Registration request sent. The administrator has to approve it before you can log in.' });
            });
        };
        // Vraca nalog bez hash-a lozinke i sa popunjenom ustanovom, da stranice odmah mogu da prikazu naziv firme
        this.respondWithUser = (res, user) => {
            const { password: hash, ...safeUser } = user.toObject();
            if (!safeUser.institution_id) {
                res.json(safeUser);
                return;
            }
            return institution_1.default.findById(safeUser.institution_id).then((institution) => {
                res.json({ ...safeUser, institution: institution });
            });
        };
        // Lozinka nije deo forme za profil, pa se ovde ne proverava
        this.checkProfile = (body) => {
            for (const field of ['username', 'name', 'surname', 'phone', 'email']) {
                if (!body[field]) {
                    return 'Name, surname, contact telephone and e-mail address are required.';
                }
            }
            if (!validation_1.EMAIL_REGEX.test(body.email)) {
                return 'E-mail address is not valid.';
            }
            if (!validation_1.PHONE_REGEX.test(body.phone)) {
                return 'Contact telephone is not valid.';
            }
            return this.checkLengths(body);
        };
        // Proverava duzine svih polja
        this.checkLengths = (body) => {
            const limits = [
                ['username', validation_1.MAX_USERNAME, 'Username'],
                ['name', validation_1.MAX_NAME, 'Name'],
                ['surname', validation_1.MAX_NAME, 'Surname'],
                ['email', validation_1.MAX_EMAIL, 'E-mail address'],
                ['institution_name', validation_1.MAX_NAME, 'Institution name'],
                ['address', validation_1.MAX_ADDRESS, 'Address'],
                ['city', validation_1.MAX_NAME, 'City']
            ];
            for (const [field, limit, label] of limits) {
                if (String(body[field] ?? '').length > limit) {
                    return `${label} can be at most ${limit} characters long.`;
                }
            }
            return null;
        };
        // Vraca prvi pronadjeni problem ili null
        // Browser proverava ista pravila, ali se ovde ponavljaju jer browser moze da se zaobidje
        this.checkRegistration = (body) => {
            for (const field of ['username', 'password', 'name', 'surname', 'phone', 'email', 'type']) {
                if (!body[field]) {
                    return 'All fields except the profile picture are required.';
                }
            }
            if (!user_type_1.REGISTRABLE_TYPES.includes(body.type)) {
                return 'Unknown type of account.';
            }
            if (!validation_1.PASSWORD_REGEX.test(body.password)) {
                return validation_1.PASSWORD_RULE;
            }
            if (!validation_1.EMAIL_REGEX.test(body.email)) {
                return 'E-mail address is not valid.';
            }
            if (!validation_1.PHONE_REGEX.test(body.phone)) {
                return 'Contact telephone is not valid.';
            }
            // Pravna lica i stamparije opisuju ustanovu iza naloga
            if (user_type_1.INSTITUTION_TYPES.includes(body.type)) {
                if (!body.institution_name || !body.address || !body.city) {
                    return 'Institution name, address and city are required.';
                }
                if (!validation_1.REGISTRATION_NUMBER_REGEX.test(body.registration_number ?? '')) {
                    return 'Registration number must have exactly 8 digits.';
                }
                if (!validation_1.TAX_ID_REGEX.test(body.tax_id ?? '')) {
                    return 'Tax identification number must have 9 digits and cannot start with a zero.';
                }
            }
            return this.checkLengths(body);
        };
    }
}
exports.UserController = UserController;
