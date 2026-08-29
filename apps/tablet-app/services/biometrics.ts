import { Platform } from "react-native";

let LocalAuthentication: typeof import("expo-local-authentication") | null = null;
if (Platform.OS !== "web") {
  LocalAuthentication = require("expo-local-authentication");
}

export interface BiometricCheckResult {
  available: boolean;
  reason?: string;
}

/**
 * Vérifie que l'appareil dispose d'un capteur biométrique fonctionnel et
 * qu'au moins une empreinte/visage y est enrôlé.
 * Sur web: la biométrie est indisponible, on saute l'étape.
 */
export async function checkBiometricAvailability(): Promise<BiometricCheckResult> {
  if (Platform.OS === "web" || !LocalAuthentication) {
    return { available: true }; // skip on web — auto-pass
  }

  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) {
    return { available: false, reason: "Cet appareil ne dispose pas de capteur biométrique." };
  }

  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  if (!isEnrolled) {
    return {
      available: false,
      reason: "Aucune empreinte ou visage n'est enregistré sur cet appareil. Configurez la biométrie dans les réglages Android avant de continuer.",
    };
  }

  return { available: true };
}

/**
 * Déclenche la vérification biométrique native.
 * Sur web: retourne true directement (pas de capteur biométrique).
 */
export async function authenticateBiometrically(promptMessage: string): Promise<boolean> {
  if (Platform.OS === "web" || !LocalAuthentication) {
    return true; // auto-pass on web for testing
  }

  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: "Annuler",
    disableDeviceFallback: false,
  });
  return result.success;
}
