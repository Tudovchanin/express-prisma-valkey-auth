# ==========================================
# Этап 1: Сборка приложения (Build Stage)
# ==========================================
FROM node:24.18.1-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .
RUN npm run build

# ==========================================
# Этап 2: Финальный продакшн-образ (Runner Stage)
# ==========================================
FROM node:24.18.1-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# РЕШЕНИЕ ПРОБЛЕМЫ ПРАВ NPX: Указываем npm использовать кэш внутри домашней папки /app
ENV NPM_CONFIG_CACHE=/app/.npm

COPY package*.json ./

# Устанавливаем только prod-зависимости и вычищаем кэш
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# Копируем результаты сборки и сгенерированный Prisma Client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# БЕЗОПАСНОСТЬ: Меняем владельца папки приложения (включая созданный кэш .npm) на пользователя 'node'
RUN chown -R node:node /app

# БЕЗОПАСНОСТЬ: Переключаем контейнер на работу от имени не-root пользователя
USER node

EXPOSE 3000

# Теперь npx выполнится без ошибок доступа к кэшу!
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
