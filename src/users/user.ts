export interface UserResponse {
  id: number;
  email: string;
}

export interface AuthResponse extends UserResponse {
  accessToken: string;
}

export interface JwtUser {
  id: number;
  email: string;
}
