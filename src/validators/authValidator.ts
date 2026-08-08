import { z } from 'zod';


export const registerSchema = z.object({
  email: z
    .string()
    .pipe(z.email('Неверный формат email')),

  password: z
    .string()
    .min(8, 'Минимум 8 символов')
    .regex(/[a-zA-Z]/, 'Должна быть хотя бы одна буква')
    .regex(/[0-9]/, 'Должна быть хотя бы одна цифра'),
  
  name: z
    .string()
    .min(2, 'Минимум 2 символа')
    .max(50, 'Максимум 50 символов')
    .regex(/^[a-zA-Za-яА-Я\s]+$/, 'Только буквы и пробелы'),
});

export const loginSchema = z.object({
  email: z.string().pipe(z.email('Неверный формат email')),
  password: z.string().min(1, 'Пароль обязателен'),
});

/**
 * Дополнительные схемы для авторизации
 */
export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh токен обязателен'),
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Старый пароль обязателен'),
  newPassword: z
    .string()
    .min(8, 'Минимум 8 символов')
    .regex(/[a-zA-Z]/, 'Должна быть хотя бы одна буква')
    .regex(/[0-9]/, 'Должна быть хотя бы одна цифра'),
});


