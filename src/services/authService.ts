import bcrypt from "bcrypt";
import ms, { StringValue } from "ms";
import { ENV } from "../config/env";
import { AppError, ERROR_CODES } from "../utils/appError";
import { hashPassword, comparePassword } from "../utils/bcrypt";

import type {
  RegisterInput,
  UserBase,
  AuthResponse,
  UserWithPassword,
  LoginInput,
  ChangePasswordInput,
  LogoutInput
} from "../types/user";
import type { TokenService } from "./tokenService";
import type { ValkeyService } from "./valkeyService";

export type AuthRepo = {
  findById: (id: number) => Promise<UserBase | null>;
  findByEmail: (email: string) => Promise<UserBase | null>;
  findPasswordById: (id: number) => Promise<string | null>;
  findForAuth: (email: string) => Promise<UserWithPassword | null>;

  create: (data: RegisterInput) => Promise<UserBase>;
  saveRefreshToken: (
    userId: number,
    token: string,
    expiresAt: Date,
  ) => Promise<void>;

  updateRefreshToken: (params: {
    oldToken: string;
    newToken: string;
    expiresAt: Date;
  }) => Promise<void>;
  updatePasswordAndClearSessions: (params: {
    userId: number;
    password: string;
  }) => Promise<void>;

  deleteRefreshToken: (token: string) => Promise<void>;
};

export class AuthService {
  constructor(
    private repoAuth: AuthRepo,
    private tokenService: TokenService,
    private valkeyService: ValkeyService,
  ) {}

  /**
   * РЕГИСТРАЦИЯ ПОЛЬЗОВАТЕЛЯ
   * Проверяет уникальность email, хеширует пароль через bcrypt,
   * создает запись в БД и инициализирует сессию в гибридном хранилище.
   */
  async register(data: RegisterInput): Promise<AuthResponse> {
    const { email, password, name } = data;
    const existingUser = await this.repoAuth.findByEmail(email);
    if (existingUser) {
      throw new AppError(409, ERROR_CODES.CONFLICT, "Email уже занят");
    }
    const passwordHash = await hashPassword(password);
    const newUser = await this.repoAuth.create({
      email,
      name,
      password: passwordHash,
    });
    const tokens = this.tokenService.generateTokens({ userId: newUser.id });

    const refreshTtlMs = ms(ENV.REFRESH_TOKEN_EXPIRES_IN as StringValue);
    const expiresAt = new Date(Date.now() + refreshTtlMs);

    await this.repoAuth.saveRefreshToken(
      newUser.id,
      tokens.refreshToken,
      expiresAt,
    );

    await this.valkeyService.setRefreshToken(tokens.refreshToken, newUser.id);

    return {
      user: newUser,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * АВТОРИЗАЦИЯ (LOGIN) С ЗАЩИТОЙ ОТ БРУТФОРСА
   * Реализует ранний возврат при блокировке, атомарный сброс попыток при успехе
   * и ступенчатую блокировку аккаунта на 15 минут при 5 неудачных попытках.
   */
  async login(data: LoginInput): Promise<AuthResponse> {
    const { email, password } = data;

    const isBlocked = await this.valkeyService.isLoginBlocked(email);
    if (isBlocked) {
      throw new AppError(
        429,
        ERROR_CODES.TOO_MANY_REQUESTS,
        "Слишком много неудачных попыток. Доступ заблокирован на 15 минут.",
      );
    }
    const user = await this.repoAuth.findForAuth(email);

    try {
      if (!user) {
        throw new Error("AUTH_FAILED");
      }

      const isPasswordValid = await comparePassword(password, user.password);

      if (!isPasswordValid) {
        throw new Error("AUTH_FAILED");
      }

      await this.valkeyService.clearLoginAttempts(email);

      const tokens = this.tokenService.generateTokens({ userId: user.id });

      const refreshTtlMs = ms(ENV.REFRESH_TOKEN_EXPIRES_IN as StringValue);
      const expiresAt = new Date(Date.now() + refreshTtlMs);

      await this.repoAuth.saveRefreshToken(
        user.id,
        tokens.refreshToken,
        expiresAt,
      );

      await this.valkeyService.setRefreshToken(tokens.refreshToken, user.id);

      const { password: _pass, ...cleanUser } = user;

      return {
        user: cleanUser,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      const attempts = await this.valkeyService.incrementLoginAttempts(email);

      if (attempts >= ENV.MAX_LOGIN_ATTEMPTS) {
        await this.valkeyService.blockLogin(email);
        throw new AppError(
          429,
          ERROR_CODES.TOO_MANY_REQUESTS,
          "Слишком много неудачных попыток. Доступ заблокирован на 15 минут.",
        );
      }

      throw new AppError(
        401,
        ERROR_CODES.UNAUTHORIZED,
        "Неверный email или пароль",
      );
    }
  }

  /**
   * ОБНОВЛЕНИЕ ПАРЫ ТОКЕНОВ (REFRESH)
   */
  async refresh(oldRefreshToken: string): Promise<AuthResponse> {
    const payload = this.tokenService.verifyRefresh(oldRefreshToken);

    const userId =
      await this.valkeyService.getUserIdByRefreshToken(oldRefreshToken);
    if (!userId) {
      throw new AppError(
        401,
        ERROR_CODES.UNAUTHORIZED,
        "Сессия не найдена или устарела",
      );
    }
    const user = await this.getUserOrThrow(userId);

    const tokens = this.tokenService.generateTokens({ userId: user.id });
    const refreshTtlMs = ms(ENV.REFRESH_TOKEN_EXPIRES_IN as StringValue);
    const expiresAt = new Date(Date.now() + refreshTtlMs);

    await this.repoAuth.updateRefreshToken({
      oldToken: oldRefreshToken,
      newToken: tokens.refreshToken,
      expiresAt: expiresAt,
    });

    await this.valkeyService.deleteRefreshToken(oldRefreshToken);
    await this.valkeyService.setRefreshToken(tokens.refreshToken, user.id);

    return {
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Находит пользователя в бд по ID или выбрасывает ошибку 404.
   */
  async getUserOrThrow(userId: number): Promise<UserBase> {
    const user = await this.repoAuth.findById(userId);
    if (!user) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Пользователь не найден");
    }
    return user;
  }

  /**
   * ВЫХОД ИЗ СИСТЕМЫ (LOGOUT)
   * Удаляет сессию пользователя из гибридного хранилища (MySQL и Valkey).
   */
  async logout({ refreshToken, accessToken }: LogoutInput): Promise<void> {
    this.tokenService.verifyRefresh(refreshToken);

    // добавляем в черный список accessToken(если не истек)
    await this.valkeyService.blacklistAccessToken(accessToken);

    //  Удаляем токен из быстрого кэша Valkey
    await this.valkeyService.deleteRefreshToken(refreshToken);

    // Удаляем сессию из постоянной базы данных MySQL (Prisma)
    await this.repoAuth.deleteRefreshToken(refreshToken);
  }

  /**
   * СМЕНА ПАРОЛЯ С ПОЛНОЙ ИНВАЛИДАЦИЕЙ СЕССИЙ НА ВСЕХ УСТРОЙСТВАХ
   */
  async changePassword(
    userId: number,
    accessToken: string,
    data: ChangePasswordInput,
  ): Promise<void> {
    const { oldPassword, newPassword } = data;

    const currentPasswordHash = await this.repoAuth.findPasswordById(userId);
    if (!currentPasswordHash) {
      throw new AppError(404, ERROR_CODES.NOT_FOUND, "Пользователь не найден");
    }

    const isOldPasswordValid = await comparePassword(
      oldPassword,
      currentPasswordHash,
    );
    if (!isOldPasswordValid) {
      throw new AppError(400, ERROR_CODES.VALIDATION, "Неверный старый пароль");
    }

    const newPasswordHash = await hashPassword(newPassword);

    // добавляем в черный список accessToken(если не истек)
    await this.valkeyService.blacklistAccessToken(accessToken);

    // Мгновенно выкидываем пользователя со всех устройств в кэше Valkey (пайплайн)
    await this.valkeyService.invalidateAllUserSessions(userId);

    // Фиксируем изменения в MySQL и чистим таблицу сессий через транзакцию
    await this.repoAuth.updatePasswordAndClearSessions({
      userId,
      password: newPasswordHash,
    });
  }
}
