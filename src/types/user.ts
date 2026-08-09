import { z } from "zod";
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
} from "../validators/authValidator";

export type UserBase = {
  id: number;
  email: string;
  name: string;
  createdAt: Date;
};
export type UserWithPassword = UserBase & {
  password: string;
};

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type LogoutInput = {
  refreshToken: string;
  accessToken: string;
};

export type AuthResponse = {
  user: UserBase;
  accessToken: string;
  refreshToken: string;
};

export type ApiSuccessResponse<T> = {
  success: true;
  data: T;
};
