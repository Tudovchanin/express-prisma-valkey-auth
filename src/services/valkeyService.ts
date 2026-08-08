import ms, { StringValue } from "ms";
import { ENV } from "../config/env";

import { valkey, KEYS } from "../config/valkey";

export type ValkeyRepo = {
  // Базовые CRUD операции (Чтение, Запись, Удаление)
  get: (key: string) => Promise<string | null>;
  setEx: (key: string, value: string, ttlSeconds: number) => Promise<void>;
  del: (key: string) => Promise<boolean>;

  /**
   * Получает все элементы Set-множества (массив токенов юзера).
   */
  smembers: (key: string) => Promise<string[]>;


  // Работа со счетчиками и временем жизни
  incr: (key: string) => Promise<number>;
  expire: (key: string, ttlSeconds: number) => Promise<number>;

  // Сложные атомарные пакеты (Бизнес-логика)
  setRefreshTokenPipeline: (
    tokenKey: string,
    sessionKey: string,
    userIdStr: string,
    ttlSeconds: number,
    token: string,
  ) => Promise<void>;

  updateRefreshTokenPipeline: (params: {
    oldTokenKey: string;
    newTokenKey: string;
    sessionKey: string;
    oldToken: string;
    newToken: string;
    userIdStr: string;
    ttlSeconds: number;
  }) => Promise<void>;

  clearAttemptsPipeline: (
    attemptsKey: string,
    blockedKey: string,
  ) => Promise<void>;

  invalidateAllSessionsPipeline: (params: {
    sessionKey: string;
    tokens: string[];
  }) => Promise<void>;
};

export class ValkeyService {
  constructor(private repoValkey: ValkeyRepo) {}
  /**
   * СОХРАНЕНИЕ СЕССИИ (Refresh-токен в оперативную память)
   * Метод пакует данные для атомарного пайплайна
   */
  async setRefreshToken(token: string, userId: number): Promise<void> {
    const ttlSeconds = Math.floor(
      ms(ENV.REFRESH_TOKEN_EXPIRES_IN as StringValue) / 1000,
    );

    // Генерируем системные ключи через утилиту KEYS из нашего конфига
    const tokenKey = KEYS.refreshToken(token); // auth:refresh:${token}
    const sessionKey = KEYS.userSession(userId); // auth:session:user:${userId}
    const userIdStr = userId.toString(); // Valkey принимает только строки

    await this.repoValkey.setRefreshTokenPipeline(
      tokenKey,
      sessionKey,
      userIdStr,
      ttlSeconds,
      token,
    );
  }

  /**
   * Получает ID пользователя по его Refresh-токену из кэша.
   * Если сессии нет (сделан логаут или она протухла), вернет null.
   */
  async getUserIdByRefreshToken(token: string): Promise<number | null> {
    // Вызываем базовый метод get репозитория
    const userIdStr = await this.repoValkey.get(KEYS.refreshToken(token));

    // Если ключа в базе нет, возвращаем null
    if (!userIdStr) return null;

    // Превращаем строку обратно в число, так как в MySQL ID у нас числовой
    return parseInt(userIdStr, 10);
  }

  /**
   * Включает жесткую блокировку по email на 15 минут, когда попыток стало >= 5
   */
  async blockLogin(email: string): Promise<void> {
    const durationSeconds = ENV.LOGIN_BLOCK_DURATION * 60;
    await this.repoValkey.setEx(KEYS.loginBlocked(email), "1", durationSeconds);
  }
  /**
   * Проверяет, заблокирован ли email прямо сейчас (Ранний возврат для Login)
   */
  async isLoginBlocked(email: string): Promise<boolean> {
    const blocked = await this.repoValkey.get(KEYS.loginBlocked(email));
    return !!blocked; // Превращаем строку "1" или null в чистый флаг true/false
  }

  /**
   * Накручивает счетчик промахов на +1 при неверном пароле.
   * При первом промахе автоматически включает таймер на 15 минут.
   */
  async incrementLoginAttempts(email: string): Promise<number> {
    const key = KEYS.loginAttempts(email);
    const attempts = await this.repoValkey.incr(key);

    // Переводим 15 минут из ENV в секунды для команды EXPIRE (15 * 60 = 900)
    const ttlSeconds = ENV.LOGIN_BLOCK_DURATION * 60;

    if (attempts === 1) {
      await this.repoValkey.expire(key, ttlSeconds);
    }
    return attempts;
  }

  /**
   * Сбрасывает брутфорс-историю (Стирает счетчик и блок через атомарный pipeline)
   */
  async clearLoginAttempts(email: string): Promise<void> {
    await this.repoValkey.clearAttemptsPipeline(
      KEYS.loginAttempts(email),
      KEYS.loginBlocked(email),
    );
  }

  /**
   * АТОМАРНОЕ ОБНОВЛЕНИЕ СЕССИИ В КЭШЕ
   * Перенаправляет ключи в пайплайн репозитория для атомарного обновления токенов.
   */
  async updateRefreshTokenInCache(
    oldToken: string,
    newToken: string,
    userId: number,
  ): Promise<void> {
    const ttlSeconds = Math.floor(
      ms(ENV.REFRESH_TOKEN_EXPIRES_IN as StringValue) / 1000,
    );

    // Вызываем настроенный пайплайн
    await this.repoValkey.updateRefreshTokenPipeline({
      oldTokenKey: KEYS.refreshToken(oldToken),
      newTokenKey: KEYS.refreshToken(newToken),
      sessionKey: KEYS.userSession(userId),
      oldToken,
      newToken,
      userIdStr: userId.toString(),
      ttlSeconds,
    });
  }

  /**
   * Удаляет сессию конкретного Refresh-токена из оперативной памяти Valkey при логауте или обновлении.
   */
  async deleteRefreshToken(token: string): Promise<boolean> {
    return await this.repoValkey.del(KEYS.refreshToken(token));
  }

  /**
   * Проверяет, находится ли Access-токен в черном списке (после логаута или смены пароля).
   */
  async isAccessTokenBlacklisted(token: string): Promise<boolean> {
    const blacklisted = await this.repoValkey.get(KEYS.blacklist(token));
    return !!blacklisted;
  }

    /**
   * Инвалидирует абсолютно все активные сессии пользователя в кэше.
   * Находит токены через Set-коллекцию и удаляет их за один сетевой проход.
   */
  async invalidateAllUserSessions(userId: number): Promise<void> {
    const sessionKey = KEYS.userSession(userId);
    
    const tokens = await this.repoValkey.smembers(sessionKey);
    
    // Если активных сессий нет, сразу выходим из метода
    if (tokens.length === 0) return;

    // 2. Передаем данные в пайплайн репозитория для атомарного массового удаления
    await this.repoValkey.invalidateAllSessionsPipeline({
      sessionKey,
      tokens,
    });
  }

}
