import express from 'express'
import { OrderController } from '../controllers/order.controller'

const OrderRouter = express.Router()

OrderRouter.route("/client/:username").get((req, res) => new OrderController().forClient(req, res));
OrderRouter.route("/archive/:username").get((req, res) => new OrderController().archive(req, res));
OrderRouter.route("/printer/:username").get((req, res) => new OrderController().forPrinter(req, res));
OrderRouter.route("/:invoiceId/received").put((req, res) => new OrderController().markReceived(req, res));
OrderRouter.route("/:invoiceId/advance").put((req, res) => new OrderController().advance(req, res));
OrderRouter.route("/:invoiceId/cancel").put((req, res) => new OrderController().cancel(req, res));

export default OrderRouter
