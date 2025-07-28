import { Router } from "express";
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from "../controllers/categories.controller";
import { authenticateUser } from "../middlewares/auth";
import { validate } from "../middlewares/validate";
import { idParamSchema } from "../schemas/auth.schema";
import {
  createCategorySchema,
  updateCategorySchema,
} from "../schemas/category.schema";
import { paginationBodySchema } from "../schemas/pagination.schema";

const CategoryRouter: Router = Router();

CategoryRouter.post(
  "/create",
  authenticateUser,
  validate({ body: createCategorySchema }),
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
  validate({ body: updateCategorySchema, params: idParamSchema }),
  updateCategory
);

CategoryRouter.delete(
  "/delete/:id",
  authenticateUser,
  validate({ params: idParamSchema }),
  deleteCategory
);

export { CategoryRouter };
