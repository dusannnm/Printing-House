"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const stats_controller_1 = require("../controllers/stats.controller");
const StatsRouter = express_1.default.Router();
StatsRouter.route("/revenue").get((req, res) => new stats_controller_1.StatsController().revenue(req, res));
StatsRouter.route("/top-products").get((req, res) => new stats_controller_1.StatsController().topProducts(req, res));
StatsRouter.route("/ratings").get((req, res) => new stats_controller_1.StatsController().ratings(req, res));
exports.default = StatsRouter;
