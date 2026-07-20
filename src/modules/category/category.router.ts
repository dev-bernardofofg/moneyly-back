import { Router } from 'express';
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from './category.controller';
import { authenticateUser } from '@modules/auth/middlewares/auth';
import { validate } from '@core/middlewares/validate';
import { idParamSchema } from '@core/schemas/id-param.schema';
import { createCategorySchema, updateCategorySchema } from './schemas/category.schema';
import { paginationQuerySchema } from '@core/schemas/pagination.schema';

const CategoryRouter: Router = Router();

CategoryRouter.post(
  '/create',
  authenticateUser,
  validate({ body: createCategorySchema }),
  createCategory
);

CategoryRouter.get(
  '/',
  authenticateUser,
  validate({ query: paginationQuerySchema }),
  getCategories
);

CategoryRouter.put(
  '/update/:id',
  authenticateUser,
  validate({ body: updateCategorySchema, params: idParamSchema }),
  updateCategory
);

CategoryRouter.delete(
  '/delete/:id',
  authenticateUser,
  validate({ params: idParamSchema }),
  deleteCategory
);

export { CategoryRouter };
