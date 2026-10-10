"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const order_controller_1 = require("../controllers/order.controller");
const OrderRouter = express_1.default.Router();
OrderRouter.route("/client/:username").get((req, res) => new order_controller_1.OrderController().forClient(req, res));
OrderRouter.route("/archive/:username").get((req, res) => new order_controller_1.OrderController().archive(req, res));
OrderRouter.route("/printer/:username").get((req, res) => new order_controller_1.OrderController().forPrinter(req, res));
OrderRouter.route("/:invoiceId/received").put((req, res) => new order_controller_1.OrderController().markReceived(req, res));
OrderRouter.route("/:invoiceId/advance").put((req, res) => new order_controller_1.OrderController().advance(req, res));
OrderRouter.route("/:invoiceId/cancel").put((req, res) => new order_controller_1.OrderController().cancel(req, res));
exports.default = OrderRouter;
