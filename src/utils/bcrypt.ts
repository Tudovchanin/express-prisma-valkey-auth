import bcrypt from "bcrypt";
import { ENV } from "../config/env";

/**
 * Хеширует чистый текстовый пароль с использованием соли из ENV.
 */
export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, ENV.BCRYPT_SALT_ROUNDS);
};

/**
 * Сравнивает чистый текстовый пароль с хэшем из базы данных.
 */
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};
