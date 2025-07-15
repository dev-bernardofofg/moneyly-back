import { Router } from "express";
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from "../controllers/categoriesController";
import { authenticateUser } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { idParamSchema } from "../schemas/authSchema";
import {
  categorySchema,
  categoryUpdateSchema,
} from "../schemas/categorySchema";
import { paginationBodySchema } from "../schemas/paginationSchema";

const CategoryRouter: Router = Router();

CategoryRouter.post(
  "/create",
  authenticateUser,
  validate({ body: categorySchema }),
  createCategory
);

CategoryRouter.post(
  "/",
  authenticateUser,
  validate({ body: paginationBodySchema }),
  getCategories
);

CategoryRouter.put(
  "/update/:id",
  authenticateUser,
  validate({ body: categoryUpdateSchema, params: idParamSchema }),
  updateCategory
);

CategoryRouter.delete(
  "/delete/:id",
  authenticateUser,
  validate({ params: idParamSchema }),
  deleteCategory
);

export default CategoryRouter;
