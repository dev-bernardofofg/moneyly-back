import { Router } from 'express';
import { createCompany, deleteCompany, getCompanies, updateCompany } from './company.controller';
import { authenticateUser } from '../auth/middlewares/auth';
import { validateBody, validateParams } from '../../core/middlewares/validate';
import { idParamSchema } from '../../core/schemas/id-param.schema';
import { createCompanySchema, updateCompanySchema } from './schemas/company.schema';

const CompanyRouter: Router = Router();

CompanyRouter.use(authenticateUser);

CompanyRouter.post('/', validateBody(createCompanySchema), createCompany);
CompanyRouter.get('/', getCompanies);
CompanyRouter.put(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateCompanySchema),
  updateCompany
);
CompanyRouter.delete('/:id', validateParams(idParamSchema), deleteCompany);

export default CompanyRouter;
