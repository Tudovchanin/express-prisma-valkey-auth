import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import type { ParsedQs } from "qs";

interface RequestValidationSchema {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
}

export const validateRequest = (schemas: RequestValidationSchema) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (schemas.query) {
        req.query = (await schemas.query.parseAsync(req.query)) as ParsedQs;
      }
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      next();
    } catch (error) {
      // Все ошибки (включая ZodError) просто пробрасываем в глобальный errorHandler
      next(error);
    }
  };
};
