/**
 * Authentication related types
 */

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthUser {
  id: string;
  email: string;
  created_at: string;
}

export interface AuthError {
  message: string;
  status?: number;
}

export interface AuthResponse {
  user: AuthUser | null;
  error: AuthError | null;
}
