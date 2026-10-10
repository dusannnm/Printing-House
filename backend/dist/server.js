"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const mongoose_1 = __importDefault(require("mongoose"));
const user_router_1 = __importDefault(require("./routers/user.router"));
const product_router_1 = __importDefault(require("./routers/product.router"));
const order_router_1 = __importDefault(require("./routers/order.router"));
const cart_router_1 = __importDefault(require("./routers/cart.router"));
const procurement_router_1 = __importDefault(require("./routers/procurement.router"));
const category_router_1 = __importDefault(require("./routers/category.router"));
const stats_router_1 = __importDefault(require("./routers/stats.router"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Poslate slike profila i proizvoda idu direktno sa diska
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "..", "uploads")));
// autoIndex je iskljucen da bi indekse pravio db/seed.js
mongoose_1.default.connect('mongodb://127.0.0.1:27017/printingHouse2026', { autoIndex: false })
    .catch((err) => console.error("Mongoose connection error:", err));
const connection = mongoose_1.default.connection;
connection.once("open", () => {
    console.log("DB connection done");
});
const router = express_1.default.Router();
router.use("/users", user_router_1.default);
router.use("/products", product_router_1.default);
router.use("/orders", order_router_1.default);
router.use("/carts", cart_router_1.default);
router.use("/procurements", procurement_router_1.default);
router.use("/categories", category_router_1.default);
router.use("/stats", stats_router_1.default);
app.use("/", router);
app.listen(4000, () => console.log("Express running on port 4000!"));
