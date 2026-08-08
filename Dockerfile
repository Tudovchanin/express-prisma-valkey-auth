FROM node:24.18.1-alpine

WORKDIR /app

# Установка зависимостей
COPY package*.json ./
RUN npm ci --only=production

# Генерация Prisma Client
COPY prisma ./prisma/
RUN npx prisma generate

# Копирование исходников
COPY . .

# Миграции при старте
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
