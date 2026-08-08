export const ERROR_CODES = {
  VALIDATION: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  INTERNAL: 'INTERNAL_SERVER_ERROR'
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];


export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCode,
    message: string
  ) {
    // Записываем сообщение в базовый класс Error
    super(message);

    // Восстанавливаем цепочку прототипов для корректной работы instanceof в ES6+
    Object.setPrototypeOf(this, new.target.prototype);

    // Фиксируем стек-трейс для Winston, исключая сам конструктор из логов
    Error.captureStackTrace(this, this.constructor);
  }
}
