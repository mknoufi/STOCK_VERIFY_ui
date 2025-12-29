import { z } from "zod";
import { UserSchema, LoginResponseSchema } from "../../types/schemas";

// Re-export Zod schemas
export { UserSchema, LoginResponseSchema } from "../../types/schemas";

// Inferred types
export type User = z.infer<typeof UserSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export interface UserSettings {
  theme: string;
  font_size: number;
  primary_color: string;
  haptic_enabled: boolean;
  sound_enabled: boolean;
  auto_sync_enabled: boolean;
  language: string;
  updated_at: string | null;
}

export interface ChangePinResponse {
  status: string;
  message: string;
  data: {
    changed_at: string;
  };
}

export interface ChangePasswordResponse {
  status: string;
  message: string;
  data: {
    changed_at: string;
  };
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface PinCredentials {
  username: string;
  pin: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
