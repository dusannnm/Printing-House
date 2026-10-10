"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const category_controller_1 = require("../controllers/category.controller");
const CategoryRouter = express_1.default.Router();
CategoryRouter.route("/").get((req, res) => new category_controller_1.CategoryController().getAll(req, res));
CategoryRouter.route("/").post((req, res) => new category_controller_1.CategoryController().addCategory(req, res));
CategoryRouter.route("/:name/subcategory").post((req, res) => new category_controller_1.CategoryController().addSubcategory(req, res));
CategoryRouter.route("/:name/subcategory/:subcategory").put((req, res) => new category_controller_1.CategoryController().renameSubcategory(req, res));
CategoryRouter.route("/:name/subcategory/:subcategory").delete((req, res) => new category_controller_1.CategoryController().removeSubcategory(req, res));
CategoryRouter.route("/:name").put((req, res) => new category_controller_1.CategoryController().renameCategory(req, res));
CategoryRouter.route("/:name").delete((req, res) => new category_controller_1.CategoryController().removeCategory(req, res));
exports.default = CategoryRouter;
