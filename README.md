# Printing House

Web platform for print shops, built as the project for the course **Internet Applications Programming (srb. PIA - Programiranje internet aplikacija)**,
School of Electrical Engineering, University of Belgrade, 2025/26.

Print shops publish their products and the types of print they offer. Clients search those products,
prepare them with a chosen colour, type of print and text, and order them; every print shop in a cart
becomes its own invoice. Legal entities don't order directly: confirming their cart publishes a public
procurement that every print shop may bid on for ten minutes, and the lowest offer that can actually be
delivered wins. An administrator approves registrations, manages accounts and categories, and sees
statistics.

## Technologies

| Part | Stack |
|---|---|
| Frontend | Angular 20 (standalone components, template-driven forms, `@if` / `@for`), TypeScript, Chart.js 4 |
| Backend | Node.js 22, Express 5, TypeScript, Mongoose 9 |
| Database | MongoDB (`printingHouse2026`) |
| Pictures | multer (upload), image-size (dimension check), served from `backend/uploads` |
| Passwords | bcryptjs |

Every library, with version and download link, is listed in [lib.txt](lib.txt).

## Requirements

- **Node.js v22.21.0** (includes npm)
- **MongoDB Community Server 7+**, running on the default `mongodb://127.0.0.1:27017`
- A browser; the app was checked in Chrome, Firefox and Edge

## Running the project

MongoDB has to be running first. On Windows: `net start MongoDB`.

**1. Backend** (first terminal)

```
cd backend
npm install
npm run seed      # creates and fills the printingHouse2026 database
npm run build     # compiles src/ into dist/
npm start         # http://localhost:4000
```

**2. Frontend** (second terminal)

```
cd frontend
npm install
npm start         # http://localhost:4200
```

Then open <http://localhost:4200>.

`npm run seed` can be run again at any time: it drops the database and rebuilds it, which is the
quickest way back to a known state.

## Demo accounts

Every account below uses the password **`Pia#2026`**, except the administrator.

| Role | Username | Password | Note |
|---|---|---|---|
| Administrator | `admin` | `Admin#2026` | signs in on a separate route: `/admin-login` |
| Print shop | `copystudio` | `Pia#2026` | Copy Studio Kumanovska, Beograd |
| Print shop, same shop | `copystudio2` | `Pia#2026` | shares the catalogue, stock and orders with `copystudio` |
| Print shop | `printplus`, `grafikacentar`, `printex` | `Pia#2026` | Novi Sad, Niš, Subotica |
| Print shop, not approved | `brzastampa` | `Pia#2026` | shows the "waiting for approval" message |
| Client, individual | `marko`, `jelena` | `Pia#2026` | `marko` has invoices in several statuses |
| Client, individual | `stefan` (waiting), `nenad` (rejected) | `Pia#2026` | show both refusal messages |
| Client, legal entity | `tehnokorp`, `tehnokorp2` | `Pia#2026` | Tehno Korp doo; they share invoices and procurements |
| Client, legal entity, not approved | `bolnica` | `Pia#2026` | |

## What the seed creates

- **7 institutions**: 5 print shops and 2 legal entities, identified by matični broj and PIB
- **14 accounts** across all four roles, including one waiting and one rejected registration
- **3 categories** with 13 subcategories, exactly the ones listed in the assignment
- **16 products** at 4 print shops, several sharing a name so that name-based search and bidding are
  meaningful, and one product deliberately out of stock
- **8 invoices** (1001–1008) covering Ordered, In printing, Delivered and Received, including two that
  belong to a legal entity but were placed by different employees
- Likes and comments on several products, so the home page TOP 5 and the rating chart have data

## Structure

```
backend/
  db/seed.js                     creates the collections, indexes and demo data (runs outside the app)
  src/
    server.ts                    cors, express.json, one Mongoose connection, /uploads, routers
    routers/<resource>.router.ts one router per resource (+ multer setup for pictures)
    controllers/<resource>.controller.ts
    models/<resource>.ts         Mongoose schemas, exported as <Name>M
    constants/                   statuses, user types, validation rules
  uploads/                       profile and product pictures, served at /uploads
frontend/
  src/app/
    app.routes.ts                flat route list, every private route behind a guard
    components/public/           home (+ login card), register, admin login, product details
    components/client/           profile, search, details, preparation, cart, archive, procurements
    components/printer/          profile, products and services, stock, ordered products, bidding
    components/admin/            users, registration requests, categories, statistics
    components/headers/          one menu per role + footer
    services/<resource>-service.ts   one service per backend resource
    models/, constants/, guards/
```

<!-- ## Design decisions worth knowing

- **An institution can have several accounts.** A print shop's employees share its catalogue, stock and
  orders; a legal entity's employees share its invoices and procurements. The matični broj is the
  institution's primary key, and a new account joins an existing institution when the matični broj and
  PIB match. The cart stays personal.
- **The server decides what belongs to whom.** A request carries only a username; the server resolves the
  institution from the account, so a client can't claim someone else's products or invoices.
- **Validation lives in one place per side.** `backend/src/constants/validation.ts` holds the password
  rule, the formats and the limits; the frontend mirrors that file, so the same rule is checked in the
  browser and again on the server.
- **Public and private data are separated by projection.** Public endpoints never project price,
  description or print services, so hiding them in the template isn't what protects them.
- **Pictures are uploaded in two steps**: the file is saved first and the stored filename is then written
  onto the account or product. The database holds filenames, not image data.
- **Prices are copied onto the invoice** when an order is confirmed, so later price changes never alter
  an old invoice.
- **Invoice and procurement numbers come from a `counters` collection** incremented atomically, which is
  what makes them short and readable.
- **Procurements close lazily.** As footnote 6 of the assignment allows, there is no timer, WebSocket or
  background job: when the firm next opens its procurement page, expired calls are resolved, the lowest
  deliverable offer wins, and an invoice is created in status "In printing".
- **The database is created independently of the app**, by `db/seed.js`, which also creates the unique
  indexes. The app connects with `autoIndex: false` so it never creates anything itself.
- **Search ignores diacritics**: `solja`, `SOLJA` and `šolja` all find *Keramička šolja*. -->

## REST API

| Resource | Main endpoints |
|---|---|
| `/users` | `login`, `admin-login`, `register`, `printer-count`, `profile`, `upload-image`, `profile-image`, list, `pending`, `:username/status`, `:username` |
| `/products` | `top5`, `search`, `search-options`, `search-by-name`, `by-name/:name`, `:code`, `:code/extended`, `printer/:username`, add, `:code/stock`, `:code/service`, `:code/image`, `:code/reaction`, `:code/comment` |
| `/orders` | `client/:username`, `archive/:username`, `printer/:username`, `:id/advance`, `:id/received`, `:id/cancel` |
| `/carts` | `:username`, `add`, `request`, `confirm`, `:username/item/:index` |
| `/procurements` | `client/:username`, `open/:username`, `:id/bid` |
| `/categories` | categories and subcategories: list, add, rename, delete |
| `/stats` | `revenue`, `top-products`, `ratings` |

Every response carries a `message` key for statuses and errors; 400 for bad input, 403 for a forbidden
action, 404 for something missing, 500 for a server error.

<!-- ## Implemented features

**Publicly visible**
- Number of registered print shops and TOP 5 products by likes
- Search by name, category and city, with alphabetical sorting on the column header; sold-out products
  are never offered
- Product details with the print shop, city, likes and dislikes

**Client**
- Profile with picture, and a sortable table of all invoices with their statuses
- Cancelling an order that hasn't gone into printing, which returns the pieces to stock
- Search, extended details (description, price, colours, types of print with sizes and extra prices)
- Product preparation with type of print, text and quantity, then ADD TO CART / RESET / BACK
- Cart grouped by print shop; confirming creates one invoice per shop
- Product archive: confirming receipt, one like or dislike per product, and comments
- Legal entities: name-based search, public procurement, and the offers they received

**Print shop**
- Profile with picture, and the shared print shop data
- Adding products into the predefined categories, with pictures, and the types of print per product
- Updating stock
- Moving invoices Ordered → In printing → Delivered
- Bidding on open public procurements, one offer per shop

**Administrator**
- Viewing, editing and deleting every account, with the last administrator protected
- A separate table of registration requests, with accept and reject
- Categories and subcategories: adding, renaming (products move along) and deleting
- Statistics as charts: turnover per print shop over the last quarter (bar), most ordered products of the
  last month with their share (pie), and product rating over time (line) with products switchable

## Not implemented

These are the optional parts of the assignment that were left out: forgotten password, the gallery with
extra thumbnails remembered in a cookie, the map in product details, rendering the print over the product
picture, the PDF invoice sent by e-mail, the online payment service, importing stock from a JSON file, and
the PDF report of procurement offers. -->

## Author

Dušan Milivojević, Programiranje internet aplikacija, 2025/26.
