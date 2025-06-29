import { Router } from "express";
import {
  createCategory,
  getCategories,
} from "../controllers/categoriesController";
import { authenticateUser } from "../middlewares/auth";

const CategoryRouter: Router = Router();

CategoryRouter.post("/create", authenticateUser, createCategory);

CategoryRouter.get("/", authenticateUser, getCategories);

export default CategoryRouter;
