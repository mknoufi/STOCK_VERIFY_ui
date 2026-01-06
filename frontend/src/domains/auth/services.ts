/**
 * Auth Domain - Services
 *
 * Re-exports auth-related services from the main API layer.
 * Types are defined in ./types.ts to avoid conflicts.
 */

export { authApi } from '../../services/api/authApi';
export { authService } from '../../services/auth';
export { verifyPin, registerUser } from '../../services/api/api';
