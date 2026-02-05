import * as LocalAuthentication from 'expo-local-authentication';
import { secureStorage } from './storage/secureStorage';
import { Platform } from 'react-native';

const BIOMETRIC_PIN_KEY = "biometric_pin_v1";

export class BiometricAuthService {
  private static instance: BiometricAuthService;

  private constructor() {}

  static getInstance(): BiometricAuthService {
    if (!BiometricAuthService.instance) {
      BiometricAuthService.instance = new BiometricAuthService();
    }
    return BiometricAuthService.instance;
  }

  async checkHardwareAvailability(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') return false; // Web not supported for expo-local-auth usually
      return await LocalAuthentication.hasHardwareAsync();
    } catch (error) {
      console.warn("Biometric hardware check failed", error);
      return false;
    }
  }

  async checkBiometricsEnrolled(): Promise<boolean> {
    try {
      if (Platform.OS === 'web') return false;
      const result = await LocalAuthentication.isEnrolledAsync();
      return result;
    } catch (error) {
      console.warn("Biometric enrollment check failed", error);
      return false;
    }
  }

  async savePinWithBiometrics(pin: string): Promise<boolean> {
    if (Platform.OS === 'web') return false;

    // We authenticate first to ensure user is present before saving
    const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to enable biometric login',
        fallbackLabel: 'Use PIN',
    });

    if (authResult.success) {
        try {
            // Ideally we would use keychain services with biometric access control here
            // For now, we store the PIN in SecureStore, assuming device security
            await secureStorage.setItem(BIOMETRIC_PIN_KEY, pin);
            return true;
        } catch (error) {
            console.error("Failed to save biometric PIN", error);
            return false;
        }
    }
    return false;
  }

  async getBiometricPin(): Promise<string | null> {
    if (Platform.OS === 'web') return null;

    try {
        // Authenticate the user
        const authResult = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Login with Biometrics',
            fallbackLabel: 'Use PIN',
        });

        if (authResult.success) {
            // If authentication successful, retrieve the PIN
            return await secureStorage.getItem(BIOMETRIC_PIN_KEY);
        }
        return null;
    } catch (error) {
        console.error("Biometric retrieval error", error);
        return null;
    }
  }

  async clearBiometricPin(): Promise<void> {
      await secureStorage.removeItem(BIOMETRIC_PIN_KEY);
  }
}
