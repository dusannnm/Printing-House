/*
 * Creates and fills the printingHouse2026 database.
 *
 * This script is NOT part of the Express application - the project requires the
 * collections to exist independently of it. Run it once before the first start:
 *
 *     cd backend && npm run seed
 *
 * Running it again drops the database and rebuilds it from scratch.
 */

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const URL = 'mongodb://127.0.0.1:27017';
const DB_NAME = 'printingHouse2026';

// Every demo account uses the same password, which satisfies the required rule
// (8-12 characters, starts with a letter, one uppercase, one digit, one special).
const DEMO_PASSWORD = 'Pia#2026';
const ADMIN_PASSWORD = 'Admin#2026';

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();
const daysAgo = (days) => new Date(now - days * DAY);

// UserStatus / UserType / OrderStatus mirrored from backend/src/constants.
const PENDING = 0, ACTIVE = 1, REJECTED = 2;
const CLIENT_INDIVIDUAL = 'client_individual', CLIENT_LEGAL = 'client_legal',
      PRINTER = 'printer', ADMIN = 'admin';
const ORDERED = 0, IN_PRINTING = 2, DELIVERED = 3, RECEIVED = 4;

const COLLECTIONS = ['users', 'institutions', 'categories', 'products', 'carts', 'orders', 'procurements', 'counters'];

// ------------------------------------------------------------- institutions
// The maticni broj is the primary key: it is the legal identifier of the company
// and is unique by law, so every reference to an institution stays readable.
const institutions = [
    {
        _id: '17324501', name: 'Copy Studio Kumanovska', address: 'Kumanovska 14', city: 'Beograd',
        tax_id: '104556789', type: PRINTER
    },
    {
        _id: '20114873', name: 'Print Plus doo', address: 'Bulevar oslobođenja 88', city: 'Novi Sad',
        tax_id: '107889455', type: PRINTER
    },
    {
        _id: '21556908', name: 'Grafika Centar', address: 'Voždova 3', city: 'Niš',
        tax_id: '111203344', type: PRINTER
    },
    {
        _id: '20553178', name: 'Printex', address: 'Cara Dušana 45', city: 'Subotica',
        tax_id: '108772341', type: PRINTER
    },
    {
        _id: '22908114', name: 'Brza Štampa', address: 'Kralja Petra 21', city: 'Kragujevac',
        tax_id: '113445677', type: PRINTER
    },
    {
        _id: '20887431', name: 'Tehno Korp doo', address: 'Milutina Milankovića 7', city: 'Beograd',
        tax_id: '106334219', type: CLIENT_LEGAL
    },
    {
        _id: '17009822', name: 'Gradska bolnica', address: 'Zvečanska 9', city: 'Beograd',
        tax_id: '100455321', type: CLIENT_LEGAL
    }
];

// ---------------------------------------------------------------- categories
// The three predefined categories and their subcategories, exactly as the
// assignment lists them.
const categories = [
    {
        name: 'Štampa malih formata',
        subcategories: ['Olovke', 'Vizit karte', 'Flajeri', 'Zahvalnice', 'Pozivnice', 'Fascikle']
            .map(name => ({ name }))
    },
    {
        name: 'Štampa velikih formata',
        subcategories: ['Posteri', 'Rollup-ovi', 'Fototapete'].map(name => ({ name }))
    },
    {
        name: 'Kreativne štampe',
        subcategories: ['Šolje', 'Štampa na majicama', 'Štampa na duksevima', 'Štampa na cegerima']
            .map(name => ({ name }))
    }
];

// --------------------------------------------------------------------- users
// institution_id is the maticni broj of the company the account works for, and is
// deliberately shared: copystudio + copystudio2 are two employees of one print
// shop, and tehnokorp + tehnokorp2 are two employees of one legal entity.
function person(username, name, surname, phone, type, status, institution_id) {
    return {
        username, name, surname, phone,
        email: `${username}@example.com`,
        profile_image: 'default_profile_image.jpg',
        type, status, institution_id,
        registered_at: daysAgo(120)
    };
}

const users = [
    {
        username: 'admin',
        name: 'Sistem', surname: 'Administrator', phone: '+381 11 3218 300',
        email: 'admin@printinghouse.rs',
        profile_image: 'default_profile_image.jpg',
        type: ADMIN, status: ACTIVE, institution_id: null,
        registered_at: daysAgo(200)
    },

    // --- print shop staff ----------------------------------------------------
    person('copystudio', 'Nikola', 'Petrović', '+381 11 244 1122', PRINTER, ACTIVE, '17324501'),
    person('copystudio2', 'Milica', 'Savić', '+381 11 244 1123', PRINTER, ACTIVE, '17324501'),   // same shop
    person('printplus', 'Ivana', 'Marić', '+381 21 552 330', PRINTER, ACTIVE, '20114873'),
    person('grafikacentar', 'Dušan', 'Ilić', '+381 18 523 771', PRINTER, ACTIVE, '21556908'),
    person('printex', 'Jelena', 'Đorđević', '+381 24 553 118', PRINTER, ACTIVE, '20553178'),
    person('brzastampa', 'Milan', 'Jović', '+381 34 331 900', PRINTER, PENDING, '22908114'),

    // --- individual clients --------------------------------------------------
    person('marko', 'Marko', 'Nikolić', '+381 64 1234 567', CLIENT_INDIVIDUAL, ACTIVE, null),
    person('jelena', 'Jelena', 'Stanković', '+381 63 7654 321', CLIENT_INDIVIDUAL, ACTIVE, null),
    person('stefan', 'Stefan', 'Vuković', '+381 60 4455 667', CLIENT_INDIVIDUAL, PENDING, null),
    person('nenad', 'Nenad', 'Đukić', '+381 62 1112 223', CLIENT_INDIVIDUAL, REJECTED, null),

    // --- legal entity staff --------------------------------------------------
    person('tehnokorp', 'Ana', 'Popović', '+381 11 770 8899', CLIENT_LEGAL, ACTIVE, '20887431'),
    person('tehnokorp2', 'Vesna', 'Lukić', '+381 11 770 8890', CLIENT_LEGAL, ACTIVE, '20887431'),  // same company
    person('bolnica', 'Dragana', 'Kostić', '+381 11 361 0044', CLIENT_LEGAL, PENDING, '17009822')
];

// ------------------------------------------------------------------ products
function service(service_id, print_type, extra_price_per_piece, max_width_mm, max_height_mm) {
    return { service_id, print_type, extra_price_per_piece, max_width_mm, max_height_mm };
}

// Codes are unique across the whole system, so one code always identifies one
// product. Several shops deliberately sell a product under the same name, which is
// what makes searching by name and bidding for a public procurement meaningful.
const products = [
    // --- Copy Studio Kumanovska, entered by both of its employees -------------
    {
        code: 'CS-001', name: 'Pamučna polo majica', institution_id: '17324501', added_by: 'copystudio',
        description: 'Kvalitetna pamučna polo majica 180g/m2, pogodna za brendiranje i korporativne uniforme.',
        category: 'Kreativne štampe', subcategory: 'Štampa na majicama',
        unit_price: 1200, stock_quantity: 150,
        colors: ['Bela', 'Crna', 'Tamno plava', 'Siva'],
        print_services: [
            service('USL-01', 'Direktna štampa na tekstil (DTG)', 350, 300, 400),
            service('USL-02', 'Preslikač (sito preslikač)', 200, 280, 350)
        ]
    },
    {
        code: 'CS-002', name: 'Keramička šolja 330ml', institution_id: '17324501', added_by: 'copystudio2',
        description: 'Bela keramička šolja visokog sjaja, idealna za sublimacionu štampu visoke rezolucije.',
        category: 'Kreativne štampe', subcategory: 'Šolje',
        unit_price: 320, stock_quantity: 500,
        colors: ['Bela'],
        print_services: [service('USL-03', 'Sublimaciona štampa', 150, 200, 85)]
    },
    {
        code: 'CS-003', name: 'Hemijska olovka', institution_id: '17324501', added_by: 'copystudio2',
        description: 'Metalna hemijska olovka mat završne obrade, sa graviranjem ili tampon štampom na telu.',
        category: 'Štampa malih formata', subcategory: 'Olovke',
        unit_price: 95, stock_quantity: 2000,
        colors: ['Crna', 'Srebrna', 'Plava'],
        print_services: [
            service('USL-04', 'Tampon štampa', 25, 45, 8),
            service('USL-05', 'Lasersko graviranje', 60, 50, 10)
        ]
    },
    {
        code: 'CS-004', name: 'Vizit karte 90x50mm', institution_id: '17324501', added_by: 'copystudio',
        description: 'Obostrane vizit karte na mat kartonu 350g, pakovanje od 100 komada.',
        category: 'Štampa malih formata', subcategory: 'Vizit karte',
        unit_price: 1800, stock_quantity: 0,          // out of stock: must not appear in search
        colors: ['Bela'],
        print_services: [service('USL-06', 'Digitalna ofset štampa', 0, 90, 50)]
    },

    // --- Print Plus doo -------------------------------------------------------
    {
        code: 'PP-001', name: 'Pamučna polo majica', institution_id: '20114873', added_by: 'printplus',
        description: 'Mekana polo majica od češljanog pamuka, ojačana kragna, unisex kroj.',
        category: 'Kreativne štampe', subcategory: 'Štampa na majicama',
        unit_price: 1100, stock_quantity: 90,
        colors: ['Bela', 'Crna', 'Crvena'],
        print_services: [service('USL-07', 'Direktna štampa na tekstil (DTG)', 380, 300, 400)]
    },
    {
        code: 'PP-002', name: 'Keramička šolja 330ml', institution_id: '20114873', added_by: 'printplus',
        description: 'Klasična keramička šolja sa širokom drškom, sublimacioni premaz otporan na mašinsko pranje.',
        category: 'Kreativne štampe', subcategory: 'Šolje',
        unit_price: 350, stock_quantity: 240,
        colors: ['Bela', 'Crna'],
        print_services: [service('USL-08', 'Sublimaciona štampa', 130, 200, 85)]
    },
    {
        code: 'PP-003', name: 'Roll-up baner 85x200cm', institution_id: '20114873', added_by: 'printplus',
        description: 'Lagan aluminijumski mehanizam sa torbom i štampom na kvalitetnom baner platnu.',
        category: 'Štampa velikih formata', subcategory: 'Rollup-ovi',
        unit_price: 4500, stock_quantity: 20,
        colors: ['Bela', 'Crna'],
        print_services: [service('USL-09', 'Eko-solventna štampa visoke rezolucije', 800, 850, 2000)]
    },
    {
        code: 'PP-004', name: 'Poster B1', institution_id: '20114873', added_by: 'printplus',
        description: 'Poster formata B1 na premazanom papiru 150g, žive boje, za unutrašnju upotrebu.',
        category: 'Štampa velikih formata', subcategory: 'Posteri',
        unit_price: 650, stock_quantity: 300,
        colors: ['Bela'],
        print_services: [service('USL-10', 'Štampa velikog formata', 120, 707, 1000)]
    },

    // --- Grafika Centar -------------------------------------------------------
    {
        code: 'GC-001', name: 'Pamučna polo majica', institution_id: '21556908', added_by: 'grafikacentar',
        description: 'Polo majica od pike pamuka sa tri dugmeta, dostupna i u proširenim veličinama.',
        category: 'Kreativne štampe', subcategory: 'Štampa na majicama',
        unit_price: 1350, stock_quantity: 60,
        colors: ['Bela', 'Tamno plava'],
        print_services: [service('USL-11', 'Preslikač (sito preslikač)', 220, 280, 350)]
    },
    {
        code: 'GC-002', name: 'Pamučna ceger torba', institution_id: '21556908', added_by: 'grafikacentar',
        description: 'Ceger torba od prirodnog pamuka sa dugim ručkama, 140g/m2, za višekratnu upotrebu.',
        category: 'Kreativne štampe', subcategory: 'Štampa na cegerima',
        unit_price: 480, stock_quantity: 320,
        colors: ['Natur', 'Crna'],
        print_services: [service('USL-12', 'Sito štampa', 190, 250, 300)]
    },
    {
        code: 'GC-003', name: 'Flajer A5', institution_id: '21556908', added_by: 'grafikacentar',
        description: 'Flajer A5 u punom koloru na sjajnom papiru 130g, pakovanje od 250 komada.',
        category: 'Štampa malih formata', subcategory: 'Flajeri',
        unit_price: 2200, stock_quantity: 75,
        colors: ['Bela'],
        print_services: [service('USL-13', 'Digitalna ofset štampa', 0, 148, 210)]
    },
    {
        code: 'GC-004', name: 'Keramička šolja 330ml', institution_id: '21556908', added_by: 'grafikacentar',
        description: 'Čvrsta keramička šolja sa mat spoljnim premazom, pogodna za štampu preko cele površine.',
        category: 'Kreativne štampe', subcategory: 'Šolje',
        unit_price: 300, stock_quantity: 180,
        colors: ['Bela'],
        print_services: [service('USL-14', 'Sublimaciona štampa', 170, 200, 85)]
    },

    // --- Printex --------------------------------------------------------------
    {
        code: 'PX-001', name: 'Pamučna polo majica', institution_id: '20553178', added_by: 'printex',
        description: 'Polo majica od dvostruko češljanog pamuka 200g/m2, sa bočnim šlicevima.',
        category: 'Kreativne štampe', subcategory: 'Štampa na majicama',
        unit_price: 1050, stock_quantity: 120,
        colors: ['Bela', 'Crna', 'Maslinasto zelena'],
        print_services: [
            service('USL-15', 'Direktna štampa na tekstil (DTG)', 320, 300, 400),
            service('USL-16', 'Vez', 450, 120, 120)
        ]
    },
    {
        code: 'PX-002', name: 'Duks sa kapuljačom', institution_id: '20553178', added_by: 'printex',
        description: 'Duks sa kapuljačom i kengur džepom, postavljen iznutra, 280g/m2.',
        category: 'Kreativne štampe', subcategory: 'Štampa na duksevima',
        unit_price: 2400, stock_quantity: 85,
        colors: ['Crna', 'Siva', 'Bordo'],
        print_services: [service('USL-17', 'Direktna štampa na tekstil (DTG)', 400, 300, 350)]
    },
    {
        code: 'PX-003', name: 'Fototapeta 3x2m', institution_id: '20553178', added_by: 'printex',
        description: 'Samolepljiva fototapeta na mat foliji, štampa bez mirisa, za zidove u enterijeru.',
        category: 'Štampa velikih formata', subcategory: 'Fototapete',
        unit_price: 7800, stock_quantity: 12,
        colors: ['Bela'],
        print_services: [service('USL-18', 'Eko-solventna štampa visoke rezolucije', 1200, 3000, 2000)]
    },
    {
        code: 'PX-004', name: 'Pozivnica A6', institution_id: '20553178', added_by: 'printex',
        description: 'Pozivnica A6 na reljefnom papiru 300g, pakovanje od 50 komada sa kovertama.',
        category: 'Štampa malih formata', subcategory: 'Pozivnice',
        unit_price: 1450, stock_quantity: 200,
        colors: ['Bela', 'Krem'],
        print_services: [service('USL-19', 'Digitalna ofset štampa', 0, 105, 148)]
    }
];

// Likes, dislikes and comments, so the home page TOP 5 and the details page have
// data. tehnokorp and tehnokorp2 react separately even though they share a company.
const reactionPlan = {
    'CS-001': [['marko', 1, 40], ['jelena', 1, 25], ['tehnokorp', 1, 12], ['nenad', -1, 8]],
    'CS-002': [['marko', 1, 30], ['jelena', 1, 18], ['tehnokorp2', 1, 5]],
    'PP-003': [['tehnokorp', 1, 22], ['marko', 1, 9]],
    'GC-002': [['jelena', 1, 15], ['marko', -1, 6]],
    'CS-003': [['marko', 1, 3]],
    'PP-001': [['jelena', 1, 20], ['tehnokorp', -1, 11]],
    'PX-001': [['marko', 1, 14], ['jelena', 1, 7]],
    'PX-002': [['tehnokorp2', 1, 4]]
};

const commentPlan = {
    'CS-001': [
        ['marko', 'Štampa je oštra, a materijal je ostao čvrst i posle pranja.', 40],
        ['jelena', 'Naručila sam dvadeset komada za tim, sve veličine su bile tačno kako je opisano.', 25],
        ['tehnokorp', 'Isporuka je stigla dva dana pre dogovorenog roka.', 12]
    ],
    'CS-002': [
        ['marko', 'Boje su žive, ništa nije izbledelo u mašini za sudove.', 30],
        ['tehnokorp2', 'Naručivali smo ih dva puta za kancelariju.', 18]
    ],
    'PP-003': [['tehnokorp', 'Mehanizam je lagan, a torba olakšava nošenje.', 22]],
    'PX-001': [
        ['marko', 'Najbolji odnos cene i kvaliteta koji sam našao.', 14],
        ['jelena', 'Vez je uredan, konci nigde ne vise.', 7]
    ]
};

// -------------------------------------------------------------------- orders
// Invoice lines are built from the seeded products, so prices always add up.
function buildOrder(invoice_id, client, printerId, items, status, orderedDaysAgo, handledBy) {
    const lines = items.map(([code, quantity, print_type, print_text]) => {
        const product = products.find(p => p.code === code);
        const printService = product.print_services.find(s => s.print_type === print_type);
        const extra = printService ? printService.extra_price_per_piece : 0;
        return {
            product_code: product.code,
            product_name: product.name,
            quantity,
            color: product.colors[0],
            print_type,
            print_text,
            unit_price: product.unit_price,
            extra_price_per_piece: extra,
            line_total: (product.unit_price + extra) * quantity
        };
    });

    const order = {
        invoice_id,
        client_username: client.username,
        client_institution_id: client.institution_id,
        printer_institution_id: printerId,
        handled_by: handledBy,
        items: lines,
        total_amount: lines.reduce((sum, line) => sum + line.line_total, 0),
        status,
        procurement_id: null,
        ordered_at: daysAgo(orderedDaysAgo),
        delivered_at: null,
        received_at: null
    };
    if (status >= DELIVERED) order.delivered_at = daysAgo(orderedDaysAgo - 3);
    if (status === RECEIVED) order.received_at = daysAgo(orderedDaysAgo - 5);
    return order;
}

async function seed() {
    const client = new MongoClient(URL);
    await client.connect();

    // Rebuild from scratch so the script can be run again at any time.
    await client.db(DB_NAME).dropDatabase();
    const db = client.db(DB_NAME);

    // Collections are created explicitly, not implicitly by the first write.
    for (const name of COLLECTIONS) {
        await db.createCollection(name);
    }

    // Unique indexes belong to the database, not to the application (autoIndex is
    // off). The institution keeps the unique maticni broj and PIB; a user account
    // does not, because several accounts may share one institution.
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('users').createIndex({ institution_id: 1 });
    await db.collection('institutions').createIndex({ tax_id: 1 }, { unique: true });
    await db.collection('categories').createIndex({ name: 1 }, { unique: true });
    await db.collection('products').createIndex({ code: 1 }, { unique: true });
    await db.collection('products').createIndex({ institution_id: 1 });
    await db.collection('carts').createIndex({ client_username: 1 }, { unique: true });
    await db.collection('orders').createIndex({ invoice_id: 1 }, { unique: true });
    await db.collection('orders').createIndex({ client_username: 1 });
    await db.collection('orders').createIndex({ client_institution_id: 1 });
    await db.collection('orders').createIndex({ printer_institution_id: 1 });
    await db.collection('procurements').createIndex({ procurement_id: 1 }, { unique: true });

    await db.collection('institutions').insertMany(institutions);

    // --- users, with every password stored as a bcrypt hash ------------------
    await db.collection('users').insertMany(users.map(user => ({
        ...user,
        password: bcrypt.hashSync(user.type === ADMIN ? ADMIN_PASSWORD : DEMO_PASSWORD, 10)
    })));

    await db.collection('categories').insertMany(categories);

    // --- products, with their reactions and comments attached ----------------
    await db.collection('products').insertMany(products.map(product => ({
        subcategory: null,
        colors: [],
        main_image: 'default_product_image.jpg',
        print_services: [],
        ...product,
        reactions: (reactionPlan[product.code] || [])
            .map(([username, value, days]) => ({ username, value, date: daysAgo(days) })),
        comments: (commentPlan[product.code] || [])
            .map(([username, text, days]) => ({ username, text, date: daysAgo(days) }))
    })));

    // --- orders across every status, so each screen has something to show ----
    const userOf = (username) => users.find(u => u.username === username);

    const orders = [
        buildOrder(1001, userOf('marko'), '17324501',
            [['CS-001', 5, 'Direktna štampa na tekstil (DTG)', 'Tim Alfa'],
             ['CS-002', 10, 'Sublimaciona štampa', 'Najbolji tata']],
            RECEIVED, 45, 'copystudio'),
        buildOrder(1002, userOf('jelena'), '20114873',
            [['PP-003', 2, 'Eko-solventna štampa visoke rezolucije', 'Letnja akcija']],
            RECEIVED, 32, 'printplus'),
        buildOrder(1003, userOf('marko'), '21556908',
            [['GC-002', 25, 'Sito štampa', 'Eko torba']],
            DELIVERED, 12, 'grafikacentar'),
        buildOrder(1004, userOf('jelena'), '17324501',
            [['CS-003', 100, 'Tampon štampa', 'Konferencija 2026']],
            IN_PRINTING, 6, 'copystudio2'),
        buildOrder(1005, userOf('marko'), '20114873',
            [['PP-004', 8, 'Štampa velikog formata', 'Dan otvorenih vrata']],
            ORDERED, 2, null),
        // Placed by Ana, but it belongs to Tehno Korp - Vesna sees it too.
        buildOrder(1006, userOf('tehnokorp'), '17324501',
            [['CS-001', 30, 'Preslikač (sito preslikač)', 'Tehno Korp']],
            RECEIVED, 70, 'copystudio'),
        // Placed by Vesna for the same company.
        buildOrder(1007, userOf('tehnokorp2'), '21556908',
            [['GC-003', 4, 'Digitalna ofset štampa', 'Dan otvorenih vrata']],
            DELIVERED, 20, 'grafikacentar'),
        // The newest print shop already has its first client.
        buildOrder(1008, userOf('jelena'), '20553178',
            [['PX-002', 15, 'Direktna štampa na tekstil (DTG)', 'Zimska kolekcija']],
            IN_PRINTING, 4, 'printex')
    ];
    await db.collection('orders').insertMany(orders);

    // Carts stay personal: one per user account, not per institution.
    await db.collection('carts').insertMany(
        ['marko', 'jelena', 'tehnokorp', 'tehnokorp2'].map(client_username => ({ client_username, items: [] }))
    );

    // Counters continue after the numbers used above.
    await db.collection('counters').insertMany([
        { _id: 'invoice', seq: 1008 },
        { _id: 'procurement', seq: 0 }
    ]);

    console.log(`Database "${DB_NAME}" created.`);
    for (const name of COLLECTIONS) {
        console.log(`  ${name}: ${await db.collection(name).countDocuments()} documents`);
    }
    console.log(`\nLogin as admin: admin / ${ADMIN_PASSWORD}`);
    console.log(`Every other demo account uses: ${DEMO_PASSWORD}`);
    console.log(`\nShared institutions:`);
    console.log(`  copystudio + copystudio2 -> Copy Studio Kumanovska (17324501)`);
    console.log(`  tehnokorp  + tehnokorp2  -> Tehno Korp doo (20887431)`);

    await client.close();
}

seed().catch(err => {
    console.error('Seeding failed:', err);
    process.exit(1);
});
