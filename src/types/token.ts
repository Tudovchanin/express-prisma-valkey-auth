

export type AccessTokenPayload = {
  userId: number;
};

export type RefreshTokenPayload = {
  userId: number;
}

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

