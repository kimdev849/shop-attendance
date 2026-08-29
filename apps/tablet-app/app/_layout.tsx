import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CheckInFlowProvider } from "./flow-context";
import { flushQueue } from "../services/sync-manager";
import { subscribeToConnectivity, isOnline } from "../services/network";
import { fetchWorkerRoster } from "../services/api";
import { getDeviceConfig } from "../storage/device-config";
import { setCachedRoster } from "../storage/worker-cache";

/**
 * Rafraîchit le cache local du roster (matricule -> workerId) pendant que la
 * tablette est en ligne, pour que l'identification reste possible hors
 * connexion (voir storage/worker-cache.ts et app/identification.tsx).
 */
async function refreshRosterCache() {
  const config = await getDeviceConfig();
  if (!config) return;
  if (!(await isOnline())) return;
  try {
    const roster = await fetchWorkerRoster(config.shopId);
    await setCachedRoster(roster);
  } catch {
    // Pas grave: le cache existant (potentiellement périmé) reste utilisable.
  }
}

/**
 * Layout racine: démarre la synchronisation en tâche de fond (README §11).
 * Déclenchée: au lancement, au retour au premier plan, et à chaque
 * reconnexion réseau détectée. Un échec de synchronisation est silencieux
 * pour l'utilisateur (les pointages restent en file, rien n'est perdu).
 */
export default function RootLayout() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    flushQueue();
    refreshRosterCache();

    intervalRef.current = setInterval(() => {
      flushQueue();
      refreshRosterCache();
    }, 60_000);

    const unsubscribeConnectivity = subscribeToConnectivity((online) => {
      if (online) {
        flushQueue();
        refreshRosterCache();
      }
    });

    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        flushQueue();
        refreshRosterCache();
      }
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      unsubscribeConnectivity();
      appStateSub.remove();
    };
  }, []);

  return (
    <SafeAreaProvider>
      <CheckInFlowProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </CheckInFlowProvider>
    </SafeAreaProvider>
  );
}
