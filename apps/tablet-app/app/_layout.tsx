import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "../components/error-boundary";
import { CheckInFlowProvider } from "./flow-context";
import { theme } from "../components/theme";
import { flushQueue } from "../services/sync-manager";
import { subscribeToConnectivity, isOnline } from "../services/network";
import { fetchWorkerRoster } from "../services/api";
import { getDeviceConfig } from "../storage/device-config";
import { setCachedRoster } from "../storage/worker-cache";

async function refreshRosterCache() {
  try {
    const config = await getDeviceConfig();
    if (!config) return;
    if (!(await isOnline())) return;
    const roster = await fetchWorkerRoster(config.shopId);
    await setCachedRoster(roster);
  } catch {
    // Cache existant reste utilisable
  }
}

export default function RootLayout() {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Appels initiaux — ne pas bloquer le layout
    flushQueue().catch(() => {});
    refreshRosterCache();

    // Sync periodique toutes les 60s
    intervalRef.current = setInterval(() => {
      flushQueue().catch(() => {});
      refreshRosterCache();
    }, 60_000);

    // Ecoute la connectivité réseau
    let unsubscribeConnectivity: (() => void) | null = null;
    try {
      unsubscribeConnectivity = subscribeToConnectivity((online) => {
        if (online) {
          flushQueue().catch(() => {});
          refreshRosterCache();
        }
      });
    } catch {
      // NetInfo peut etre indisponible sur certains appareils
    }

    // Re-sync quand l'app revient au premier plan
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        flushQueue().catch(() => {});
        refreshRosterCache();
      }
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      unsubscribeConnectivity?.();
      appStateSub.remove();
    };
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <CheckInFlowProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: "slide_from_right",
              contentStyle: { backgroundColor: theme.colors.background },
            }}
          />
        </CheckInFlowProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
