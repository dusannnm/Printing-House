import express from 'express'
import { CartController } from '../controllers/cart.controller'

const CartRouter = express.Router()

CartRouter.route("/add").post((req, res) => new CartController().addItem(req, res));
CartRouter.route("/request").post((req, res) => new CartController().addRequest(req, res));
CartRouter.route("/confirm").post((req, res) => new CartController().confirm(req, res));
CartRouter.route("/:username/item/:index").delete((req, res) => new CartController().removeItem(req, res));

// Poslednja, da ":username" ne proguta fiksne putanje iznad
CartRouter.route("/:username").get((req, res) => new CartController().getCart(req, res));

export default CartRouter
