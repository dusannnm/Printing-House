import express from 'express'
import { CategoryController } from '../controllers/category.controller'

const CategoryRouter = express.Router()

CategoryRouter.route("/").get((req, res) => new CategoryController().getAll(req, res));
CategoryRouter.route("/").post((req, res) => new CategoryController().addCategory(req, res));

CategoryRouter.route("/:name/subcategory").post((req, res) => new CategoryController().addSubcategory(req, res));
CategoryRouter.route("/:name/subcategory/:subcategory").put((req, res) => new CategoryController().renameSubcategory(req, res));
CategoryRouter.route("/:name/subcategory/:subcategory").delete((req, res) => new CategoryController().removeSubcategory(req, res));

CategoryRouter.route("/:name").put((req, res) => new CategoryController().renameCategory(req, res));
CategoryRouter.route("/:name").delete((req, res) => new CategoryController().removeCategory(req, res));

export default CategoryRouter
