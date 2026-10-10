import express from 'express'
import { StatsController } from '../controllers/stats.controller'

const StatsRouter = express.Router()

StatsRouter.route("/revenue").get((req, res) => new StatsController().revenue(req, res));
StatsRouter.route("/top-products").get((req, res) => new StatsController().topProducts(req, res));
StatsRouter.route("/ratings").get((req, res) => new StatsController().ratings(req, res));

export default StatsRouter
