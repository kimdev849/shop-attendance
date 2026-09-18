import { Platform } from "react-native";

let NetInfo: any = null;
if (Platform.OS !== "web") {
  NetInfo = require("@react-native-community/netinfo").default;
}

/**
 * État de connectivité de l'appareil (wifi/données) via NetInfo — SANS requête
 * vers l'API et donc sans timeout. Attention : renvoie `true` même pendant le
 * cold start du service Render Free (30-60 s). Pour un envoi critique, utiliser
 * `waitForServerReady()` (services/api.ts) qui sonde réellement le serveur.
 */
export async function isOnline(): Promise<boolean> {
  if (Platform.OS === "web") {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  }
  const state = await NetInfo.fetch();
  return Boolean(state.isConnected && state.isInternetReachable !== false);
}

/** S'abonne aux changements de connectivité. Retourne une fonction de désinscription. */
export function subscribeToConnectivity(callback: (online: boolean) => void): () => void {
  if (Platform.OS === "web") {
    const onOnline = () => callback(true);
    const onOffline = () => callback(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }
  const unsubscribe = NetInfo.addEventListener((state: any) => {
    callback(Boolean(state.isConnected && state.isInternetReachable !== false));
  });
  return unsubscribe;
}
