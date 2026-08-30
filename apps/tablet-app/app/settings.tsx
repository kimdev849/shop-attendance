import { useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import {
  GearSix,
  FloppyDisk,
  ArrowsClockwise,
  House,
  WifiHigh,
  DeviceMobile,
  ArrowLeft,
} from "phosphor-react-native";
import { ScreenContainer } from "../components/screen-container";
import { PrimaryButton } from "../components/primary-button";
import { theme } from "../components/theme";
import {
  getDeviceConfig,
  setDeviceConfig,
  DeviceConfig,
} from "../storage/device-config";
import { queueSize } from "../storage/attendance-queue";
import { flushQueue } from "../services/sync-manager";

export default function SettingsScreen() {
  const router = useRouter();
  const [apiUrl, setApiUrl] = useState(
    process.env.EXPO_PUBLIC_API_URL ??
      "https://shop-attendance-api.onrender.com",
  );
  const [shopId, setShopId] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [pending, setPending] = useState(0);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getDeviceConfig().then((config) => {
      if (config) {
        setApiUrl(config.apiUrl);
        setShopId(config.shopId);
        setDeviceId(config.deviceId);
        setDeviceName(config.deviceName);
      }
    });
    queueSize().then(setPending);
  }, []);

  async function handleSave() {
    const config: DeviceConfig = { apiUrl, shopId, deviceId, deviceName };
    await setDeviceConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <ScreenContainer>
      <Pressable style={styles.backButton} onPress={() => router.replace("/")}>
        <ArrowLeft size={20} color={theme.colors.textMuted} weight="bold" />
        <Text style={styles.backText}>Accueil</Text>
      </Pressable>

      <ScrollView
        style={{ width: "100%", maxWidth: 420 }}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 50 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <GearSix size={24} color={theme.colors.primaryLight} weight="bold" />
          </View>
          <Text style={styles.title}>Configuration</Text>
          <Text style={styles.subtitle}>
            Renseignez ces informations une seule fois, en les copiant depuis la
            page "Appareils" du dashboard admin.
          </Text>
        </View>

        {/* Connection section */}
        <View style={styles.sectionLabel}>
          <WifiHigh size={14} color={theme.colors.textMuted} weight="bold" />
          <Text style={styles.sectionLabelText}>Connexion</Text>
        </View>

        <View style={styles.card}>
          <Field
            label="URL de l'API"
            value={apiUrl}
            onChangeText={setApiUrl}
            placeholder="https://api.exemple.com"
          />
        </View>

        {/* Device section */}
        <View style={[styles.sectionLabel, { marginTop: 20 }]}>
          <DeviceMobile size={14} color={theme.colors.textMuted} weight="bold" />
          <Text style={styles.sectionLabelText}>Appareil</Text>
        </View>

        <View style={styles.card}>
          <Field
            label="ID du shop"
            value={shopId}
            onChangeText={setShopId}
            placeholder="uuid du shop"
          />
          <Field
            label="ID de l'appareil"
            value={deviceId}
            onChangeText={setDeviceId}
            placeholder="TABLET-SHP-CENTRE"
          />
          <Field
            label="Nom affiche"
            value={deviceName}
            onChangeText={setDeviceName}
            placeholder="Shop Centre"
          />
        </View>

        <View style={{ height: 20 }} />
        <PrimaryButton
          label={saved ? "Enregistre" : "Enregistrer"}
          onPress={handleSave}
          icon={<FloppyDisk size={18} color="#fff" weight="bold" />}
          fullWidth
        />

        {/* Sync section */}
        <View style={[styles.sectionLabel, { marginTop: 24 }]}>
          <ArrowsClockwise size={14} color={theme.colors.textMuted} weight="bold" />
          <Text style={styles.sectionLabelText}>Synchronisation</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.syncRow}>
            <View>
              <Text style={styles.syncTitle}>File d'attente</Text>
              <Text style={styles.syncSubtitle}>
                {pending} pointage(s) en attente
              </Text>
            </View>
            <View
              style={[
                styles.syncBadge,
                pending > 0 && styles.syncBadgeActive,
              ]}
            >
              <Text
                style={[
                  styles.syncBadgeText,
                  pending > 0 && styles.syncBadgeTextActive,
                ]}
              >
                {pending}
              </Text>
            </View>
          </View>
          <View style={{ height: 12 }} />
          <PrimaryButton
            label="Synchroniser maintenant"
            variant="secondary"
            onPress={async () => {
              await flushQueue();
              setPending(await queueSize());
            }}
            icon={
              <ArrowsClockwise size={16} color={theme.colors.textSecondary} weight="bold" />
            }
            fullWidth
          />
        </View>

        <View style={{ height: 16 }} />
        <PrimaryButton
          label="Retour a l'accueil"
          variant="secondary"
          onPress={() => router.replace("/")}
          icon={
            <House size={16} color={theme.colors.textSecondary} weight="bold" />
          }
          fullWidth
        />
      </ScrollView>
    </ScreenContainer>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: "absolute",
    top: 16,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 8,
    zIndex: 10,
  },
  backText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 14,
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionLabelText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: theme.colors.input,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: theme.colors.text,
  },
  syncRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  syncTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  syncSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  syncBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  syncBadgeActive: {
    backgroundColor: "rgba(245,158,11,0.15)",
    borderColor: "rgba(245,158,11,0.3)",
  },
  syncBadgeText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: "700",
  },
  syncBadgeTextActive: {
    color: theme.colors.warning,
  },
});
