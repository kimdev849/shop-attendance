import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "../components/screen-container";
import { PrimaryButton } from "../components/primary-button";
import { theme } from "../components/theme";
import { getDeviceConfig, setDeviceConfig, DeviceConfig } from "../storage/device-config";
import { queueSize } from "../storage/attendance-queue";
import { flushQueue } from "../services/sync-manager";

/**
 * Écran d'appairage, à utiliser UNE SEULE FOIS par un administrateur avant
 * la mise en service d'une tablette dans un shop (README §"Configuration de
 * la tablette"). Renseigne l'URL de l'API, l'ID du shop et l'ID de
 * l'appareil tel qu'enregistrés côté dashboard admin (page "Appareils").
 */
export default function SettingsScreen() {
  const router = useRouter();
  const [apiUrl, setApiUrl] = useState(process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001");
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
      <ScrollView style={{ width: "100%", maxWidth: 480 }} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.title}>Configuration de la tablette</Text>
        <Text style={styles.subtitle}>
          Renseignez ces informations une seule fois, en les copiant depuis la page "Appareils" du
          dashboard admin après avoir enregistré cette tablette.
        </Text>

        <Field label="URL de l'API" value={apiUrl} onChangeText={setApiUrl} placeholder="https://api.exemple.com" />
        <Field label="ID du shop (copiez depuis la page Shops du dashboard admin)" value={shopId} onChangeText={setShopId} placeholder="uuid du shop" />
        <Field label="ID de l'appareil (copiez depuis la page Appareils — colonne Identifiant)" value={deviceId} onChangeText={setDeviceId} placeholder="TABLET-SHP-CENTRE" />
        <Field label="Nom affiché" value={deviceName} onChangeText={setDeviceName} placeholder="Tablette Shop Centre" />

        {shopId ? (
          <View style={styles.configInfo}>
            <Text style={styles.configLabel}>Shop ID actuel :</Text>
            <Text style={styles.configValue} selectable>{shopId}</Text>
          </View>
        ) : null}

        <View style={{ height: theme.spacing(2) }} />
        <PrimaryButton label={saved ? "Enregistré ✓" : "Enregistrer"} onPress={handleSave} />

        <View style={{ height: theme.spacing(3) }} />
        <Text style={styles.queueInfo}>{pending} pointage(s) en attente de synchronisation.</Text>
        <PrimaryButton
          label="Forcer la synchronisation"
          variant="secondary"
          onPress={async () => {
            await flushQueue();
            setPending(await queueSize());
          }}
        />

        <View style={{ height: theme.spacing(3) }} />
        <PrimaryButton label="Retour à l'accueil" variant="secondary" onPress={() => router.replace("/")} />
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
  title: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "700",
    marginBottom: theme.spacing(1),
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginBottom: theme.spacing(3),
  },
  field: {
    marginBottom: theme.spacing(2),
  },
  label: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingVertical: theme.spacing(1.5),
    paddingHorizontal: theme.spacing(2),
    fontSize: 15,
    color: theme.colors.text,
  },
  queueInfo: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginBottom: theme.spacing(1.5),
    textAlign: "center",
  },
  configInfo: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: theme.spacing(1.5),
    marginBottom: theme.spacing(1),
  },
  configLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
  },
  configValue: {
    color: theme.colors.primary,
    fontSize: 12,
    fontFamily: "monospace",
    marginTop: 2,
  },
});
