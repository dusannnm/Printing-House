import express from 'express'
import { ProcurementController } from '../controllers/procurement.controller'

const ProcurementRouter = express.Router()

ProcurementRouter.route("/client/:username").get((req, res) => new ProcurementController().forClient(req, res));
ProcurementRouter.route("/open/:username").get((req, res) => new ProcurementController().openForPrinter(req, res));
ProcurementRouter.route("/:procurementId/bid").post((req, res) => new ProcurementController().submitBid(req, res));

export default ProcurementRouter
