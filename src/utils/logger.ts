import winston from 'winston';
import { ENV } from '../config/env';

// Базовый формат логирования для production (структурированный JSON)
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }), // Автоматический перехват stack trace для ошибок
  winston.format.json() // Стандартный формат для агрегаторов логов (Loki, ELK)
);

export const logger = winston.createLogger({
  level: ENV.NODE_ENV === 'development' ? 'debug' : 'info',
  format: logFormat,
  transports: [
    // В Docker-среде логи выводятся исключительно в stdout/stderr.
    // Сбором и ротацией файлов занимается инфраструктура оркестрации.
    new winston.transports.Console() 
  ],
});

// Конфигурация окружения для локальной разработки (development)
if (ENV.NODE_ENV !== 'production') {
  logger.clear(); // Сброс базового console-транспорта для переопределения формата
  
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), // Цветовое кодирование уровней логов в CLI
        winston.format.printf((info) => {
          // Явное приведение к Record для корректной компиляции в strict-режиме TypeScript
          const { timestamp, level, message, stack, ...meta } = info as Record<string, any>;
          
          // Форматирование дополнительных метаданных, переданных в логгер
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          
          return `[${timestamp}] ${level}: ${stack || message}${metaStr}`;
        })
      ),
    })
  );

  // Дублирование логов в локальные файлы для удобства отладки
  logger.add(new winston.transports.File({ filename: 'logs/error.log', level: 'error' }));
  logger.add(new winston.transports.File({ filename: 'logs/combined.log' }));
}
