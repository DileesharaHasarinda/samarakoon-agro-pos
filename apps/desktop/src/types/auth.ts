export type UserRole = "admin" | "cashier";

export interface AuthUser {
  id: number;
  name: string;
  username: string;
  email: string | null;
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
  token_type: string;
  user: AuthUser;
}

export interface CurrentUserResponse {
  user: AuthUser;
}

export interface LogoutResponse {
  message: string;
}

export interface ValidationErrors {
  [field: string]: string[] | undefined;
}
