import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Configuration locale de l'appareil (appairage tablette <-> shop).
 * L'admin configure le shop et le nom via l'écran Paramètres.
 * L'identifiant matériel (deviceIdentifier) est auto-généré par le serveur.
 */
export interface DeviceConfig {
  apiUrl: string;
  shopId: string;
  deviceId: string;
  deviceName: string;
  shopName: string;
}

const STORAGE_KEY = "@shopattendance/device-config";

export async function getDeviceConfig(): Promise<DeviceConfig | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DeviceConfig;
  } catch {
    return null;
  }
}

export async function setDeviceConfig(config: DeviceConfig): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export async function clearDeviceConfig(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
