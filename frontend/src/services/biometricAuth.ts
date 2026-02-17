import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export class BiometricAuthService {
  private static instance: BiometricAuthService;
  private readonly PIN_KEY = 'user_pin';
  private readonly BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

  private constructor() {}

  static getInstance(): BiometricAuthService {
    if (!BiometricAuthService.instance) {
      BiometricAuthService.instance = new BiometricAuthService();
    }
    return BiometricAuthService.instance;
  }

  async checkHardwareAvailability(): Promise<boolean> {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  }

  async checkBiometricsEnrolled(): Promise<boolean> {
    return await LocalAuthentication.isEnrolledAsync();
  }

  async savePinWithBiometrics(pin: string): Promise<boolean> {
    try {
      await SecureStore.setItemAsync(this.PIN_KEY, pin);
      return true;
    } catch (error) {
      console.error('Error saving PIN:', error);
      return false;
    }
  }

  async getBiometricPin(): Promise<string | null> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access your PIN',
        fallbackLabel: 'Use Passcode',
      });

      if (result.success) {
        return await SecureStore.getItemAsync(this.PIN_KEY);
      }
      return null;
    } catch (error) {
      console.error('Error getting PIN:', error);
      return null;
    }
  }

  async clearBiometricPin(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(this.PIN_KEY);
    } catch (error) {
      console.error('Error clearing PIN:', error);
    }
  }
}
