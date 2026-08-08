import { Router } from "express";
import * as authController from "../controllers/authController"; // Импортируем все функции как один объект
import { authMiddleware } from "../middlewares/authMiddleware";
import { validateRequest } from "../middlewares/validation";

import {
  registerSchema,
  loginSchema,
  refreshSchema,
  changePasswordSchema,
} from "../validators/authValidator";
// Сразу объявляем и экспортируем именованный роутер
export const authRoutes = Router();

// Открытые маршруты — передаем функции напрямую, это на 100% безопасно!
authRoutes.post(
  "/register",
  validateRequest({ body: registerSchema }),
  authController.register,
);
authRoutes.post(
  "/login",
  validateRequest({ body: loginSchema }),
  authController.login,
);
authRoutes.post(
  "/refresh",
  validateRequest({ body: refreshSchema }),
  authController.refresh,
);

// Защищенные маршруты (Требуют валидный Access Token в заголовке Bearer)
authRoutes.post(
  "/logout",
  validateRequest({ body: refreshSchema }),
  authMiddleware,
  authController.logout,
);
authRoutes.get("/me", authMiddleware, authController.me);
authRoutes.post(
  "/change-password",
  authMiddleware,
  validateRequest({ body: changePasswordSchema }),
  authController.changePassword,
);
