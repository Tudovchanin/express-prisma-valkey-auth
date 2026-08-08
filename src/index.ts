import express from "express";
import { ENV } from "./config/env";
import { logger } from "./utils/logger";
import { rateLimiterMiddleware } from "./middlewares/rateLimiter";
import { errorHandler } from "./middlewares/errorHandler";
import { authRoutes } from "./routes/authRoutes";

const app = express();

// Сетевые настройки (Включаем доверие к Nginx-прокси для корректного чтения IP)
app.set("trust proxy", true);

// Глобальные встроенные мидлвары (Парсер входящего JSON-тела)
app.use(express.json());

// Безопасность (Rate Limiter на 100 запросов в минуту для всех путей приложения)
app.use(rateLimiterMiddleware);

// Подключение маршрутов (Роуты авторизации со сквозным префиксом /api/auth по ТЗ)
app.use("/api/auth", authRoutes);

// Обработка несуществующих эндпоинтов (Кастомный 404 ответ)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Маршрут ${req.originalUrl} не найден на сервере`,
    },
  });
});

// Подключение вашего централизованного обработчика ошибок (AppError, ZodError, 500)
app.use(errorHandler);

// Инициализация сетевого порта и запуск процесса Node.js
const PORT = ENV.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`🚀 Сервер успешно запущен в режиме [${ENV.NODE_ENV}] на порту ${PORT}`);
});

export default app;
