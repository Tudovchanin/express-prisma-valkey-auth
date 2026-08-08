import { prisma } from "../config/database";
import type { AuthRepo } from "../services/authService";

export const authRepo: AuthRepo = {
  async findById(id) {
    return await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, createdAt: true }, // Без пароля!
    });
  },

  async findByEmail(email) {
    return await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, createdAt: true },
    });
  },

  async create(data) {
    return await prisma.user.create({
      data,
      select: { id: true, email: true, name: true, createdAt: true },
    });
  },

  async saveRefreshToken(userId, token, expiresAt) {
    await prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });
  },

  async findForAuth(email) {
    return await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        password: true,
      },
    });
  },

  async findPasswordById(id) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { password: true }, // Вытаскиваем строго поле password
    });
    return user ? user.password : null;
  },

  async updateRefreshToken({ oldToken, newToken, expiresAt }) {
    await prisma.refreshToken.update({
      where: {
        token: oldToken,
      },
      data: {
        token: newToken,
        expiresAt: expiresAt,
      },
    });
  },

   async updatePasswordAndClearSessions({ userId, password }) {
    
    await prisma.$transaction([

      prisma.user.update({
        where: { id: userId },
        data: { password: password },
      }),
      prisma.refreshToken.deleteMany({
        where: { userId: userId },
      }),
    ]);
  },

  async deleteRefreshToken(token) {
    await prisma.refreshToken.delete({
      where: {
        token,
      },
    });
  },
};
