export interface UserResponse {
  id: number;
  phone: string;
  hasPassword: boolean;
}

export interface AuthResponse extends UserResponse {
  accessToken: string;
  refreshToken: string;
}

export interface JwtUser {
  id: number;
  phone: string;
}

export interface JwtPayload {
  sub: number;
  phone: string;
  type: 'access' | 'refresh';
  jti?: string;
}
