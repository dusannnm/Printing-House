"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const procurement_controller_1 = require("../controllers/procurement.controller");
const ProcurementRouter = express_1.default.Router();
ProcurementRouter.route("/client/:username").get((req, res) => new procurement_controller_1.ProcurementController().forClient(req, res));
ProcurementRouter.route("/open/:username").get((req, res) => new procurement_controller_1.ProcurementController().openForPrinter(req, res));
ProcurementRouter.route("/:procurementId/bid").post((req, res) => new procurement_controller_1.ProcurementController().submitBid(req, res));
exports.default = ProcurementRouter;
