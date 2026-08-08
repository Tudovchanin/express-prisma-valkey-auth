import { valkey, KEYS } from "../config/valkey";
import type { ValkeyRepo } from "../services/valkeyService";

export const valkeyRepo: ValkeyRepo = {
  async get(key) {
    return await valkey.get(key);
  },
  
  async smembers(key) {
    // Нативный метод ioredis для получения всех элементов множества Set
    return await valkey.smembers(key);
  },

  async setEx(key, value, ttlSeconds) {
    await valkey.set(key, value, "EX", ttlSeconds);
  },

  async del(key) {
    const result = await valkey.del(key);
    return result > 0;
  },

  async incr(key) {
    return await valkey.incr(key);
  },

  async expire(key, ttlSeconds) {
    return await valkey.expire(key, ttlSeconds);
  },

  async setRefreshTokenPipeline(
    tokenKey,
    sessionKey,
    userIdStr,
    ttlSeconds,
    token,
  ) {
    await valkey
      .pipeline()
      .set(tokenKey, userIdStr, "EX", ttlSeconds) // Создает ключ токена со значением ID юзера
      .sadd(sessionKey, token) // Создает Set-множество (если его нет) и добавляет туда строку токена сессии
      .expire(sessionKey, ttlSeconds) // Продлевает жизнь самому Set-списку сессий
      .exec(); // Выполняет всё за один сетевой проход
  },

  async updateRefreshTokenPipeline({
    oldTokenKey,
    newTokenKey,
    sessionKey,
    oldToken,
    newToken,
    userIdStr,
    ttlSeconds,
  }) {
    await valkey
      .pipeline()
      .del(oldTokenKey) // 1. Удаляем старый токен из базы
      .set(newTokenKey, userIdStr, "EX", ttlSeconds) // 2. Записываем новый токен с TTL
      .sadd(sessionKey, newToken) // 3. Добавляем новый токен в Set-коллекцию пользователя
      .srem(sessionKey, oldToken) // 4. Удаляем старый токен из Set-коллекции пользователя
      .expire(sessionKey, ttlSeconds) // 5. Обновляем TTL самой коллекции
      .exec(); // Выполняем всё атомарно за один проход
  },

  async clearAttemptsPipeline(attemptsKey, blockedKey) {
    await valkey
      .pipeline()
      .del(attemptsKey) // Стираем счетчик ошибок
      .del(blockedKey) // На всякий случай снимаем блокировку
      .exec(); // Выполняем пакет атомарно
  },

  async invalidateAllSessionsPipeline({ sessionKey, tokens }) {
    const pipeline = valkey.pipeline();

    // Перебираем массив токенов и добавляем команды удаления в пайплайн
    tokens.forEach((token) => {
      pipeline.del(KEYS.refreshToken(token));
    });

    // Удаляем саму Set-коллекцию списка сессий пользователя
    pipeline.del(sessionKey);

    // Стреляем в Valkey один раз за весь цикл
    await pipeline.exec();
  },
};
