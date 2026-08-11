import express from "express";
import helmet from "helmet";
import cors from "cors";
import { ENV } from "./config/env";
import { logger } from "./utils/logger";
import { rateLimiterMiddleware } from "./middlewares/rateLimiter";
import { errorHandler } from "./middlewares/errorHandler";
import { authRoutes } from "./routes/authRoutes";

const app = express();

// Сетевые настройки (Включаем доверие к Nginx-прокси для корректного чтения IP)
app.set("trust proxy", true);


// ПОДКЛЮЧАЕМ HELMET: защита HTTP-заголовков.
// Под капотом он настраивает 15 middleware, которые:
// - Удаляют заголовок 'X-Powered-By: Express' (чтобы хакеры не знали стек).
// - Включают 'X-Frame-Options: DENY' (защита от кликджекинга / встраивания в iframe).
// - Настраивают политики CSP (Content Security Policy) против XSS-атак.
// - Принудительно включают зашифрованный HTTPS (строгий заголовок HSTS).
app.use(helmet());


// ПОДКЛЮЧАЕМ CORS: Настройка разрешенных источников для фронтенда
// В продакшене сюда передается точный URL Vue/Nuxt приложения из .env
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000", 
  credentials: true // Разрешает передавать куки и JWT-токены между фронтом и беком
}));


// Глобальные встроенные мидлвары (Парсер входящего JSON-тела)
app.use(express.json({ limit: "100kb" }));

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
