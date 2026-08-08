

import "../express.d.ts";
import { Request, Response, NextFunction } from "express";
import { AppError, ERROR_CODES } from "../utils/appError";
import { tokenService, valkeyService } from "../services"; 

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(401, ERROR_CODES.UNAUTHORIZED, "Токен авторизации отсутствует");
    }

    const accessToken = authHeader.split(" ")[1];

    const isBad = await valkeyService.isAccessTokenBlacklisted(accessToken);
    if (isBad) {
      throw new AppError(401, ERROR_CODES.UNAUTHORIZED, "Токен больше не действителен");
    }

    const payload = tokenService.verifyAccess(accessToken);

    req.user = {
      id: payload.userId,
    };

    next();
  } catch (error) {
    next(error);
  }
};
