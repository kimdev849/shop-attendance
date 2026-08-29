import { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { ShieldCheck, WifiOff } from "lucide-react-native";
import { ScreenContainer } from "../components/screen-container";
import { PrimaryButton } from "../components/primary-button";
import { theme } from "../components/theme";
import { getDeviceConfig, DeviceConfig } from "../storage/device-config";
import { queueSize } from "../storage/attendance-queue";
import { isOnline } from "../services/network";
import { useCheckInFlow } from "./flow-context";

export default function HomeScreen() {
  const router = useRouter();
  const { reset } = useCheckInFlow();
  const [config, setConfig] = useState<DeviceConfig | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [online, setOnline] = useState(true);
  const [now, setNow] = useState(new Date());

  useFocusEffect(
    useCallback(() => {
      reset();
      getDeviceConfig().then(setConfig);
      queueSize().then(setPendingCount);
      isOnline().then(setOnline);
    }, [reset]),
  );

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(interval);
  }, []);

  if (!config) {
    return (
      <ScreenContainer>
        <ShieldCheck size={56} color={theme.colors.textMuted} />
        <Text style={styles.title}>Tablette non configurée</Text>
        <Text style={styles.subtitle}>
          Renseignez le shop et l'identifiant de cet appareil avant la première utilisation.
        </Text>
        <View style={{ height: theme.spacing(3) }} />
        <PrimaryButton label="Configurer cette tablette" onPress={() => router.push("/settings")} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Text style={styles.brand}>SHOP ATTENDANCE</Text>
      <Text style={styles.shopName}>{config.deviceName}</Text>
      <Text style={styles.clock}>
        {now.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "long" })}
      </Text>

      <View style={{ height: theme.spacing(5) }} />
      <Text style={styles.welcome}>Bienvenue</Text>
      <View style={{ height: theme.spacing(4) }} />

      <PrimaryButton label="Commencer le pointage" onPress={() => router.push("/identification")} />

      <View style={styles.footer}>
        {!online && (
          <View style={styles.statusPill}>
            <WifiOff size={14} color={theme.colors.warning} />
            <Text style={styles.statusText}>Mode hors ligne</Text>
          </View>
        )}
        {pendingCount > 0 && (
          <Text style={styles.pendingText}>{pendingCount} pointage(s) en attente de synchronisation</Text>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  brand: {
    color: theme.colors.textMuted,
    fontSize: 14,
    letterSpacing: 4,
    fontWeight: "600",
  },
  shopName: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: "700",
    marginTop: theme.spacing(1),
  },
  clock: {
    color: theme.colors.textMuted,
    fontSize: 14,
    marginTop: theme.spacing(1),
    textTransform: "capitalize",
  },
  welcome: {
    color: theme.colors.text,
    fontSize: 36,
    fontWeight: "300",
  },
  footer: {
    position: "absolute",
    bottom: theme.spacing(4),
    alignItems: "center",
    gap: theme.spacing(1),
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: theme.colors.surfaceAlt,
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1),
    borderRadius: 999,
  },
  statusText: {
    color: theme.colors.warning,
    fontSize: 13,
    fontWeight: "600",
  },
  pendingText: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "700",
    marginTop: theme.spacing(2),
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 15,
    textAlign: "center",
    marginTop: theme.spacing(1),
    maxWidth: 420,
  },
});
