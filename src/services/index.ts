import { authRepo } from "../repositories/prismaRepository";
import { valkeyRepo } from "../repositories/valkeyRepository";

import { TokenService } from "./tokenService";
import { ValkeyService } from "./valkeyService";
import { AuthService } from "./authService";

export const tokenService = new TokenService();

export const valkeyService = new ValkeyService(valkeyRepo);

export const authService = new AuthService(authRepo, tokenService, valkeyService);
