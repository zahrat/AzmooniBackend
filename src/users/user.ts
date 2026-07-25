export interface UserResponse {
  id: number;
  email: string;
}

export interface AuthResponse extends UserResponse {
  accessToken: string;
  refreshToken: string;
}

export interface JwtUser {
  id: number;
  email: string;
}

export interface JwtPayload {
  sub: number;
  email: string;
  type: 'access' | 'refresh';
  jti?: string;
}
