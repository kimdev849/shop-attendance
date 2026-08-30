import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import {
  User,
  WarningCircle,
  ArrowLeft,
} from "phosphor-react-native";
import { ScreenContainer } from "../components/screen-container";
import { PrimaryButton } from "../components/primary-button";
import { theme } from "../components/theme";
import { getDeviceConfig } from "../storage/device-config";
import { findInCachedRoster } from "../storage/worker-cache";
import { lookupWorkerByEmployeeNumber } from "../services/api";
import { isOnline } from "../services/network";
import { useCheckInFlow } from "./flow-context";

export default function IdentificationScreen() {
  const router = useRouter();
  const { setWorker } = useCheckInFlow();
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    setError(null);
    if (!employeeNumber.trim()) return;
    setLoading(true);

    try {
      const config = await getDeviceConfig();
      if (!config) {
        setError("Tablette non configuree. Contactez votre administrateur.");
        return;
      }

      const trimmed = employeeNumber.trim();
      const online = await isOnline();

      if (online) {
        const worker = await lookupWorkerByEmployeeNumber(trimmed, config.shopId);
        if (!worker) {
          setError("Matricule inconnu pour ce shop. Verifiez et reessayez.");
          return;
        }
        setWorker(worker);
        router.push("/password");
        return;
      }

      const cached = await findInCachedRoster(trimmed);
      if (!cached) {
        setError(
          "Matricule introuvable dans le cache local. Reconnectez la tablette au moins une fois.",
        );
        return;
      }
      setWorker(cached);
      router.push("/password");
    } catch (err: any) {
      setError(err?.message ?? "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <ArrowLeft size={20} color={theme.colors.textMuted} weight="bold" />
        <Text style={styles.backText}>Retour</Text>
      </Pressable>

      <View style={styles.iconCircle}>
        <User size={30} color={theme.colors.primaryLight} weight="bold" />
      </View>

      <Text style={styles.title}>Identifiant employe</Text>
      <Text style={styles.subtitle}>
        Saisissez votre matricule pour commencer
      </Text>

      <View style={{ height: 28 }} />

      <View style={styles.inputCard}>
        <TextInput
          value={employeeNumber}
          onChangeText={(t) => {
            setEmployeeNumber(t);
            setError(null);
          }}
          placeholder="EMP-1000"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
          autoFocus
          style={styles.input}
          onSubmitEditing={handleContinue}
        />
      </View>

      {error && (
        <View style={styles.errorBox}>
          <WarningCircle size={16} color={theme.colors.danger} weight="fill" />
          <Text style={styles.error}>{error}</Text>
        </View>
      )}

      <View style={{ height: 28 }} />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={theme.colors.primary} size="large" />
          <Text style={styles.loadingText}>Recherche en cours...</Text>
        </View>
      ) : (
        <PrimaryButton
          label="Continuer"
          onPress={handleContinue}
          disabled={!employeeNumber.trim()}
          fullWidth
        />
      )}
    </ScreenContainer>
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
  },
  backText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
  },
  inputCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: theme.colors.input,
    borderRadius: theme.radius,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  input: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    fontSize: 22,
    color: theme.colors.text,
    textAlign: "center",
    letterSpacing: 3,
    fontWeight: "600",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    backgroundColor: "rgba(239,68,68,0.08)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    maxWidth: 360,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.15)",
  },
  error: {
    color: theme.colors.danger,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  loadingWrap: {
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
});
