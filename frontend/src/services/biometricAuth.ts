// Stub implementation to avoid missing dependency issues in CI/dev environments
// import * as LocalAuthentication from "expo-local-authentication";
// import * as SecureStore from "expo-secure-store";

const BIOMETRIC_PIN_KEY = "biometric_pin";

export class BiometricAuthService {
  private static instance: BiometricAuthService;

  private constructor() {}

  public static getInstance(): BiometricAuthService {
    if (!BiometricAuthService.instance) {
      BiometricAuthService.instance = new BiometricAuthService();
    }
    return BiometricAuthService.instance;
  }

  public async checkHardwareAvailability(): Promise<boolean> {
    console.warn("BiometricAuthService: Stubbed checkHardwareAvailability");
    return false;
  }

  public async checkBiometricsEnrolled(): Promise<boolean> {
    console.warn("BiometricAuthService: Stubbed checkBiometricsEnrolled");
    return false;
  }

  public async savePinWithBiometrics(pin: string): Promise<boolean> {
    console.warn("BiometricAuthService: Stubbed savePinWithBiometrics");
    // In a real stub, we might want to simulate success, but false is safer for now
    return false;
  }

  public async getBiometricPin(): Promise<string | null> {
    console.warn("BiometricAuthService: Stubbed getBiometricPin");
    return null;
  }

  public async clearBiometricPin(): Promise<void> {
    console.warn("BiometricAuthService: Stubbed clearBiometricPin");
  }
}
