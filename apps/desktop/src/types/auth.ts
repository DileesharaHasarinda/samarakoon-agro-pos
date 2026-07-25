export type UserRole = "admin" | "cashier";

export interface AuthUser {
  id: number;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  last_login_at: string | null;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  token_type: "Bearer";
  user: AuthUser;
}

export interface CurrentUserResponse {
  user: AuthUser;
}
