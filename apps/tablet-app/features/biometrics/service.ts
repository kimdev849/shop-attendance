/**
 * Biometrics feature service for tablet app.
 * Handles local biometric verification (Face ID).
 */
import * as LocalAuthentication from "expo-local-authentication";

export interface BiometricResult {
  success: boolean;
  error?: string;
}

export const biometricsService = {
  /**
   * Check if biometric authentication is available on the device.
   */
  async isAvailable(): Promise<boolean> {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return compatible && enrolled;
  },

  /**
   * Trigger biometric authentication.
   */
  async authenticate(promptMessage: string = "Vérification biométrique"): Promise<BiometricResult> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: "Annuler",
        disableDeviceFallback: false,
      });
      return { success: result.success };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get available biometric types.
   */
  async getAvailableTypes(): Promise<LocalAuthentication.AuthenticationType[]> {
    return LocalAuthentication.supportedAuthenticationTypesAsync();
  },
};
