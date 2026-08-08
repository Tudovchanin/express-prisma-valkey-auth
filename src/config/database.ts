import { PrismaClient, Prisma } from '@prisma/client';
import { ENV } from './env';
import { logger } from '../utils/logger'; 

// 1. Корректная и чистая типизация глобального инстанса для Prisma Client с событиями
declare global {
  var prismaInstance: PrismaClient<
    Prisma.PrismaClientOptions,
    'query' | 'info' | 'warn' | 'error'
  > | undefined;
}

// 2. Объявляем переменную для экспорта
let client: PrismaClient<Prisma.PrismaClientOptions, 'query' | 'info' | 'warn' | 'error'>;

// 3. Логика синглтона: разделяем создание нового клиента и переиспользование старого
if (globalThis.prismaInstance) {
  client = globalThis.prismaInstance;
} else {
  // Этот блок выполнится СТРОГО ОДИН РАЗ за всё время жизни процесса Node.js
  client = new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'info' },
      { emit: 'event', level: 'warn' },
      { emit: 'event', level: 'error' },
    ],
  });

  // Навешиваем обработчики событий СТРОГО внутри блока создания инстанса
  if (ENV.NODE_ENV === 'development') {
    client.$on('query', (e: Prisma.QueryEvent): void => {
      logger.debug({
        message: `Prisma Query: ${e.query}`,
        params: e.params,
        duration: `${e.duration}ms`
      });
    });
  }

  client.$on('info', (e: Prisma.LogEvent): void => {
    logger.info({ message: `Prisma Info: ${e.message}` });
  });

  client.$on('warn', (e: Prisma.LogEvent): void => {
    logger.warn({ message: `Prisma Warn: ${e.message}` });
  });

  client.$on('error', (e: Prisma.LogEvent): void => {
    logger.error({ message: `Prisma Error: ${e.message}` });
  });

  // Сохраняем в глобальный объект для дева
  if (ENV.NODE_ENV !== 'production') {
    globalThis.prismaInstance = client;
  }
}

// 4. Экспортируем готовый и настроенный клиент
export const prisma = client;
