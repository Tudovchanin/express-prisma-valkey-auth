import { Request, Response, NextFunction } from 'express';
import { AppError, ERROR_CODES } from '../utils/appError';
import { logger } from '../utils/logger';
import { ZodError } from 'zod';

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction 
): void => {
  
  //  Перехват контролируемых бизнес-ошибок (AppError)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message
      }
    });
    return;
  }

  //  Перехват ошибок валидации Zod
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: ERROR_CODES.VALIDATION,
        message: 'Неверный формат входных данных',
        details: err.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
    return;
  }

  //  Перехват непредвиденных системных сбоев 
  // Безопасно приводим типы для логгера Winston, страхуясь от строк и null 
  const errorMessage = err instanceof Error ? err.message : String(err);
  const errorStack = err instanceof Error ? err.stack : undefined;

  logger.error('Unhandled System Error:', {
    message: errorMessage,
    stack: errorStack,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    success: false,
    error: {
      code: ERROR_CODES.INTERNAL,
      message: 'Внутренняя ошибка сервера'
    }
  });
};
