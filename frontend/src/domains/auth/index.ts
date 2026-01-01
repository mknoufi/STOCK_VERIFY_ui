/**
 * Auth Domain - Index
 *
 * Central export point for all auth domain functionality.
 */

// Types (canonical source)
export {
  User,
  LoginResponse,
  UserSettings,
  ChangePinResponse,
  ChangePasswordResponse,
  LoginCredentials,
  PinCredentials,
  AuthState,
  UserSchema,
  LoginResponseSchema,
} from "./types";

// Services
export { authApi, authService, verifyPin, registerUser } from "./services";
