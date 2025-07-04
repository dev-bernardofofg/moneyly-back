import { Router } from "express";
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from "../controllers/categoriesController";
import { authenticateUser } from "../middlewares/auth";

const CategoryRouter: Router = Router();

CategoryRouter.post("/create", authenticateUser, createCategory);

CategoryRouter.get("/", authenticateUser, getCategories);

CategoryRouter.put("/update/:id", authenticateUser, updateCategory);

CategoryRouter.delete("/delete/:id", authenticateUser, deleteCategory);

export default CategoryRouter;
