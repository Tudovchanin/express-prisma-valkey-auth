import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  // Заменяем z.url() на z.string(), чтобы localhost не ломал валидацию
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://localhost:6379'), 
  JWT_SECRET: z.string().min(1),
  ACCESS_TOKEN_EXPIRES_IN: z.string().min(1),
  REFRESH_TOKEN_EXPIRES_IN: z.string().min(1),
  BCRYPT_SALT_ROUNDS: z.coerce.number().default(10),
  MAX_LOGIN_ATTEMPTS: z.coerce.number().default(5),
  LOGIN_BLOCK_DURATION: z.coerce.number().default(15),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Ошибка валидации переменных окружения:', parsed.error.format());
  process.exit(1);
}

export const ENV = parsed.data;
