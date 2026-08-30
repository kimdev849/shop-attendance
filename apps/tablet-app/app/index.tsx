import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { ScreenContainer } from "../components/screen-container";
import { PrimaryButton } from "../components/primary-button";
import { theme } from "../components/theme";
import {
  ShieldCheck,
  WifiX,
  CaretRight,
} from "phosphor-react-native";
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

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(20)).current;

  useFocusEffect(
    useCallback(() => {
      reset();
      getDeviceConfig().then(setConfig);
      queueSize().then(setPendingCount);
      isOnline().then(setOnline);

      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cardTranslateY, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }, [reset]),
  );

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(interval);
  }, []);

  if (!config) {
    return (
      <ScreenContainer>
        <View style={styles.setupCard}>
          <View style={styles.setupIconCircle}>
            <ShieldCheck size={32} color={theme.colors.primary} weight="bold" />
          </View>
          <Text style={styles.setupTitle}>Tablette non configurée</Text>
          <Text style={styles.setupSubtitle}>
            Sélectionnez le shop et donnez un nom{"\n"}à cette tablette pour commencer.
          </Text>
          <View style={{ height: 24 }} />
          <PrimaryButton
            label="Configurer cette tablette"
            onPress={() => router.push("/settings")}
            icon={<CaretRight size={18} color="#fff" weight="bold" />}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {/* Logo + Brand */}
      <View style={styles.heroSection}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Image
            source={require("../assets/icon.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>
        <Text style={styles.brand}>STAFFGO</Text>
        <View style={styles.taglineRow}>
          <View style={styles.dot} />
          <Text style={styles.tagline}>Pointage et presence</Text>
          <View style={styles.dot} />
        </View>
      </View>

      {/* Shop info card */}
      <Animated.View
        style={[
          styles.shopCard,
          {
            opacity: cardOpacity,
            transform: [{ translateY: cardTranslateY }],
          },
        ]}
      >
        <Text style={styles.shopLabel}>POINT DE VENTE</Text>
        <Text style={styles.shopName}>{config.shopName || config.deviceName}</Text>
        <View style={styles.divider} />
        <Text style={styles.clock}>
          {now.toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
          })}
        </Text>
      </Animated.View>

      {/* CTA */}
      <View style={{ height: 28 }} />
      <PrimaryButton
        label="Commencer le pointage"
        onPress={() => router.push("/identification")}
        fullWidth
      />

      {/* Footer status */}
      <View style={styles.footer}>
        {!online && (
          <View style={styles.statusPill}>
            <WifiX size={14} color={theme.colors.warning} weight="bold" />
            <Text style={styles.statusText}>Hors ligne</Text>
          </View>
        )}
        {pendingCount > 0 && (
          <Text style={styles.pendingText}>
            {pendingCount} pointage(s) en attente de sync
          </Text>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heroSection: {
    alignItems: "center",
    marginBottom: 32,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    marginBottom: 12,
  },
  brand: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 8,
  },
  taglineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.primaryLight,
  },
  tagline: {
    color: theme.colors.textMuted,
    fontSize: 13,
    letterSpacing: 0.5,
  },
  shopCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radiusLg,
    paddingVertical: 24,
    paddingHorizontal: 32,
    alignItems: "center",
    width: "100%",
    maxWidth: 380,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow,
  },
  shopLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.5,
  },
  shopName: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "700",
    marginTop: 6,
  },
  divider: {
    width: 32,
    height: 2,
    backgroundColor: theme.colors.border,
    marginVertical: 14,
    borderRadius: 1,
  },
  clock: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textTransform: "capitalize",
  },
  footer: {
    position: "absolute",
    bottom: 24,
    alignItems: "center",
    gap: 6,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(245,158,11,0.1)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.2)",
  },
  statusText: {
    color: theme.colors.warning,
    fontSize: 12,
    fontWeight: "600",
  },
  pendingText: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  /* Setup card */
  setupCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radiusLg,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: "center",
    width: "100%",
    maxWidth: 380,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow,
  },
  setupIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  setupTitle: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  setupSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});
