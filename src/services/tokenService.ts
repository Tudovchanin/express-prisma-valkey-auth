import jwt from "jsonwebtoken";
import { SignOptions } from "jsonwebtoken";
import { ENV } from "../config/env";
import { AppError, ERROR_CODES } from "../utils/appError";
import type {
  AccessTokenPayload,
  RefreshTokenPayload,
  TokenPair,
} from "../types/token";

export class TokenService {
  constructor() {}

  /**
   * Генерирует сразу ПАРУ токенов (Access + Refresh) для успешного входа или регистрации.
   * Берет настройки секретов и времени жизни строго из вашего ENV.
   */
  generateTokens(payload: AccessTokenPayload & RefreshTokenPayload): TokenPair {
    const accessToken = jwt.sign(payload, ENV.JWT_SECRET, {
      expiresIn: ENV.ACCESS_TOKEN_EXPIRES_IN as SignOptions["expiresIn"], // "15m" по ТЗ
    });

    const refreshToken = jwt.sign(payload, ENV.JWT_SECRET, {
      expiresIn: ENV.REFRESH_TOKEN_EXPIRES_IN as SignOptions["expiresIn"], // "7d" по ТЗ
    });

    return { accessToken, refreshToken };
  }

  /**
   * Валидирует Access-токен на целостность подписи и срок действия.
   * Выбрасывает AppError 401, если токен поврежден или просрочен.
   */
  verifyAccess(token: string): AccessTokenPayload {
    try {
      return jwt.verify(token, ENV.JWT_SECRET) as AccessTokenPayload;
    } catch (error) {
      throw new AppError(
        401,
        ERROR_CODES.UNAUTHORIZED,
        "Невалидный или истекший Access токен",
      );
    }
  }

  /**
   * Валидирует Refresh-токен на целостность подписи и срок действия.
   * Выбрасывает AppError 401, если токен поврежден или просрочен.
   */
  verifyRefresh(token: string): RefreshTokenPayload {
    try {
      return jwt.verify(token, ENV.JWT_SECRET) as RefreshTokenPayload;
    } catch (error) {
      throw new AppError(
        401,
        ERROR_CODES.UNAUTHORIZED,
        "Сессия истекла, авторизуйтесь повторно",
      );
    }
  }
}
