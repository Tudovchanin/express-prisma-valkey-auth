import { AuthService } from "./authService";
import { AppError } from "../utils/appError";

// 1. СОЗДАЕМ ЗАГЛУШКИ (МОКИ)
// Unit-тесты проверяют только логику самого сервиса, не подключаясь к реальным базам данных.
// Поэтому вместо настоящих репозиториев мы передаем "пустышки" (jest.fn() — это функция-шпион, которая умеет имитировать ответы базы).
const mockAuthRepo = {
  findById: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  saveRefreshToken: jest.fn(),
  findForAuth: jest.fn(),
  updateRefreshToken: jest.fn(),
  deleteRefreshToken: jest.fn(),
  findPasswordById: jest.fn(),
  updatePasswordAndClearSessions: jest.fn(),
};

const mockTokenService = {
  generateTokens: jest.fn(),
  verifyAccess: jest.fn(),
  verifyRefresh: jest.fn(),
};

const mockValkeyService = {
  setRefreshToken: jest.fn(),
  getUserIdByRefreshToken: jest.fn(),
  deleteRefreshToken: jest.fn(),
  isAccessTokenBlacklisted: jest.fn(),
  blockLogin: jest.fn(),
  isLoginBlocked: jest.fn(),
  incrementLoginAttempts: jest.fn(),
  clearLoginAttempts: jest.fn(),
  updateRefreshTokenInCache: jest.fn(),
  invalidateAllUserSessions: jest.fn(),
};

// 2. ГРУППИРУЕМ ТЕСТЫ
// describe — это папка-контейнер для тестов. Помогает красиво разбить отчет Jest в консоли.
describe("AuthService - Unit Tests", () => {
  let authService: AuthService;

  // beforeEach — этот блок выполняется автоматически ПЕРЕД каждым отдельным тестом `it`
  beforeEach(() => {
    // Очищаем историю вызовов шпионов, чтобы прошлые тесты не влияли на новые
    jest.clearAllMocks();
    
    // Инициализируем наш тестируемый сервис и подсовываем ему созданные заглушки
    authService = new AuthService(
      mockAuthRepo as any,
      mockTokenService as any,
      mockValkeyService as any
    );
  });

  describe("register", () => {
    // Входные тестовые данные, которые мы будем передавать в метод register
    const registerInput = {
      email: "test@example.com",
      name: "Влад",
      password: "Password123",
    };

    // `it` (или `test`) — это описание конкретного сценария, который мы проверяем
    it("должен успешно зарегистрировать пользователя и вернуть пару токенов", async () => {
      
      // Шаг А: Программируем заглушки (Объясняем им, что они должны вернуть при вызове)
      mockAuthRepo.findByEmail.mockResolvedValue(null); // Имитируем, что в базе MySQL такого email нет (он свободен)
      
      mockAuthRepo.create.mockResolvedValue({
        id: 1,
        email: registerInput.email,
        name: registerInput.name,
        createdAt: new Date(),
      }); // Имитируем успешную запись нового пользователя в MySQL и возврат его данных
      
      mockTokenService.generateTokens.mockReturnValue({
        accessToken: "mock-access",
        refreshToken: "mock-refresh",
      }); // Имитируем генерацию пары JWT токенов

      // Шаг Б: Запускаем сам тестируемый метод сервиса
      const result = await authService.register(registerInput);

      // Шаг В: Проверяем результаты выполнения (expect — это утверждение "я ожидаю, что...")
      // ИСПРАВЛЕНО: Проверяем поля прямо на верхнем уровне вашего плоского объекта ответа
      expect(result.id).toBe(1); // Я ожидаю, что id в ответе равен 1
      expect(result.accessToken).toBe("mock-access"); // Я ожидаю, что access токен совпадает с заглушкой
      expect(result.refreshToken).toBe("mock-refresh"); // Я ожидаю, что refresh токен совпадает с заглушкой

      // Шаг Г: Проверяем "поведение" (Что наш сервис действительно вызвал нужные методы баз данных)
      expect(mockAuthRepo.findByEmail).toHaveBeenCalledWith(registerInput.email); // Проверяем, искал ли сервис юзера по email
      expect(mockAuthRepo.create).toHaveBeenCalled(); // Проверяем, была ли вызвана команда создания юзера
      expect(mockValkeyService.setRefreshToken).toHaveBeenCalledWith("mock-refresh", 1); // Проверяем, записался ли токен в кэш Valkey
      expect(mockAuthRepo.saveRefreshToken).toHaveBeenCalledWith(1, "mock-refresh", expect.any(Date)); // Проверяем запись токена в MySQL
    });

    it("должен выбросить AppError 409, если такой email уже существует", async () => {
      // Шаг А: Программируем заглушку на негативный сценарий
      // Имитируем, что при поиске по email база MySQL нашла существующего пользователя (email занят)
      mockAuthRepo.findByEmail.mockResolvedValue({ id: 1, email: registerInput.email });

      // Шаг Б: Проверяем, что метод падает с ошибкой
      // rejects.toThrow(AppError) говорит Jest: "Этот метод обязан выбросить ошибку класса AppError, иначе завали тест"
      await expect(authService.register(registerInput)).rejects.toThrow(AppError);
      
      // Шаг В: Ловим ошибку вручную, чтобы детально проверить её статус и код по ТЗ
      try {
        await authService.register(registerInput);
      } catch (error: any) {
        expect(error.statusCode).toBe(409); // Проверяем HTTP статус конфликта по ТЗ
        expect(error.code).toBe("CONFLICT"); // Проверяем строковый код ошибки для фронтенда по ТЗ
      }
    });
  });
});
