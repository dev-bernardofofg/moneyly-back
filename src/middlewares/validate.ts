import { NextFunction, Request, Response } from "express";
import { ZodError, ZodSchema } from "zod";

export interface ValidationConfig {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

export const validate = (config: ValidationConfig) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate body
      if (config.body) {
        console.log("🔍 Debug - validate middleware - body before:", req.body);
        req.body = config.body.parse(req.body);
        console.log("🔍 Debug - validate middleware - body after:", req.body);
      }

      // Validate params
      if (config.params) {
        req.params = config.params.parse(req.params);
      }

      // Validate query
      if (config.query) {
        req.query = config.query.parse(req.query);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(error); // Pass to error handler
      } else {
        next(error);
      }
    }
  };
};

// Convenience functions for common validations
export const validateBody = (schema: ZodSchema) => {
  return validate({ body: schema });
};

export const validateParams = (schema: ZodSchema) => {
  return validate({ params: schema });
};

export const validateQuery = (schema: ZodSchema) => {
  return validate({ query: schema });
};

export const validateBodyAndParams = (
  bodySchema: ZodSchema,
  paramsSchema: ZodSchema
) => {
  return validate({ body: bodySchema, params: paramsSchema });
};
