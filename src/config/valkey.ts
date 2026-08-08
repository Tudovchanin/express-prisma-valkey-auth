import Redis from 'ioredis';
import { ENV } from './env';
import { logger } from '../utils/logger';

// Корректная и чистая типизация глобального инстанса для ioredis
declare global {
  var valkeyInstance: Redis | undefined;
}

// Конфигурация
export const VALKEY_CONFIG = {
  url: ENV.REDIS_URL || 'redis://localhost:6379',
  prefix: 'auth:'
};

let client: Redis;


if (globalThis.valkeyInstance) {
  client = globalThis.valkeyInstance;
} else {
  client = new Redis(VALKEY_CONFIG.url, {
    keyPrefix: VALKEY_CONFIG.prefix, // Встроенный префикс ioredis для изоляции ключей в БД
    maxRetriesPerRequest: null,      // Защита от падения бэкенда при перезапуске Docker-контейнера
  });

  // Навешиваем обработчики событий СТРОГО один раз при создании инстанса
  client.on('connect', (): void => {
    logger.info('⚡ Valkey (Redis) подключен успешно');
  });

  client.on('error', (err: Error): void => {
    logger.error('❌ Ошибка подключения к Valkey:', err);
  });

  // Сохраняем ссылку в глобальный объект для среды разработки (dev mode)
  if (ENV.NODE_ENV !== 'production') {
    globalThis.valkeyInstance = client;
  }
}

//  Экспортируем готовый и настроенный клиент
export const valkey = client;

//  Функции генерации ключей СТРОГО по скриншоту ТЗ (без хардкода префиксов в строках)
export const KEYS = {
   // Ограничение запросов по IP (Добавлено!)
  rateLimit: (ip: string) => `ratelimit:${ip}`,

  // Ограничение попыток входа
  loginAttempts: (email: string) => `login:attempts:${email}`,

  // Блокировка после 5 неудачных попыток
  loginBlocked: (email: string) => `login:blocked:${email}`,

  // Сессия пользователя (string | number для совместимости со схемой Prisma)
  userSession: (userId: number | string) => `session:user:${userId}`,

  // Refresh токен
  refreshToken: (token: string) => `refresh:${token}`,

  // Черный список access токенов
  blacklist: (token: string) => `blacklist:${token}`
};
