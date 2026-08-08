import { Request, Response, NextFunction } from "express";
import { AppError, ERROR_CODES } from "../utils/appError";
import { valkey, KEYS } from "../config/valkey"; // Импортируем синглтон и KEYS

export const rateLimiterMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {

    // Получаем IP-адрес: req.ip — для реального Docker/Nginx, remoteAddress — страховка для тестов Jest
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    
    const key = KEYS.rateLimit(ip);

    const currentRequests = await valkey.incr(key);

    if (currentRequests === 1) {
      await valkey.expire(key, 60);
    }

    if (currentRequests > 100) {
      throw new AppError(
        429,
        ERROR_CODES.TOO_MANY_REQUESTS,
        "Слишком много запросов с вашего IP. Пожалуйста, подождите минуту.",
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};
