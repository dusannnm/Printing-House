"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cart_controller_1 = require("../controllers/cart.controller");
const CartRouter = express_1.default.Router();
CartRouter.route("/add").post((req, res) => new cart_controller_1.CartController().addItem(req, res));
CartRouter.route("/request").post((req, res) => new cart_controller_1.CartController().addRequest(req, res));
CartRouter.route("/confirm").post((req, res) => new cart_controller_1.CartController().confirm(req, res));
CartRouter.route("/:username/item/:index").delete((req, res) => new cart_controller_1.CartController().removeItem(req, res));
// Poslednja, da ":username" ne proguta fiksne putanje iznad
CartRouter.route("/:username").get((req, res) => new cart_controller_1.CartController().getCart(req, res));
exports.default = CartRouter;
