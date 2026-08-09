
import { Request, Response, NextFunction } from "express";
import { authService } from "../services"; // Наш готовый синглтон сервиса

/**
 * РЕГИСТРАЦИЯ (POST /api/auth/register)
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await authService.register(req.body);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error); // Ошибка улетает в глобальный errorHandler
  }
};

/**
 * АВТОРИЗАЦИЯ (POST /api/auth/login)
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const result = await authService.login(req.body);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ОБНОВЛЕНИЕ ТОКЕНОВ (POST /api/auth/refresh)
 */
export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refresh(refreshToken);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ВЫХОД ИЗ СИСТЕМЫ (POST /api/auth/logout)
 */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { refreshToken } = req.body;
     const authHeader = req.headers.authorization!;
    const accessToken = authHeader.split(" ")[1];
    await authService.logout({ refreshToken, accessToken });

    res.status(200).json({
      success: true,
      message: "Успешный выход из системы",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ (GET /api/auth/me)
 */
export const me = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id; // Расширенный тип Express отлично работает
    const user = await authService.getUserOrThrow(userId);

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * СМЕНА ПАРОЛЯ (POST /api/auth/change-password)
 */
export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const authHeader = req.headers.authorization!;
    const accessToken = authHeader.split(" ")[1];

    await authService.changePassword(userId, accessToken, req.body);

    res.status(200).json({
      success: true,
      message: "Пароль успешно изменен. Сессии на всех устройствах сброшены.",
    });
  } catch (error) {
    next(error);
  }
};
