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
  LockSimple,
  WarningCircle,
  ArrowLeft,
} from "phosphor-react-native";
import { ScreenContainer } from "../components/screen-container";
import { PrimaryButton } from "../components/primary-button";
import { theme } from "../components/theme";
import { getDeviceConfig } from "../storage/device-config";
import { verifyWorkerPin } from "../services/api";
import { useCheckInFlow } from "./flow-context";

export default function PasswordScreen() {
  const router = useRouter();
  const { worker } = useCheckInFlow();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify() {
    if (!worker || !pin.trim()) return;
    setError(null);
    setLoading(true);

    try {
      const config = await getDeviceConfig();
      if (!config) {
        setError("Tablette non configuree.");
        return;
      }

      await verifyWorkerPin(worker.employeeNumber, config.shopId, pin);
      router.push("/biometry");
    } catch (err: any) {
      setError(err?.message ?? "Mot de passe incorrect.");
    } finally {
      setLoading(false);
    }
  }

  if (!worker) {
    return (
      <ScreenContainer>
        <Text style={styles.error}>Aucun travailleur selectionne.</Text>
        <View style={{ height: 16 }} />
        <PrimaryButton
          label="Retour"
          variant="secondary"
          onPress={() => router.replace("/identification")}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <ArrowLeft size={20} color={theme.colors.textMuted} weight="bold" />
        <Text style={styles.backText}>Retour</Text>
      </Pressable>

      {/* Worker badge */}
      <View style={styles.workerBadge}>
        <View style={styles.workerAvatar}>
          <User size={22} color={theme.colors.primaryLight} weight="bold" />
        </View>
        <View style={styles.workerInfo}>
          <Text style={styles.workerName}>
            {worker.firstName} {worker.lastName}
          </Text>
          <Text style={styles.workerNumber}>{worker.employeeNumber}</Text>
        </View>
      </View>

      <View style={{ height: 28 }} />

      <View style={styles.iconCircle}>
        <LockSimple size={26} color={theme.colors.primaryLight} weight="bold" />
      </View>

      <Text style={styles.title}>Mot de passe</Text>
      <Text style={styles.subtitle}>
        Entrez votre code PIN pour confirmer
      </Text>

      <View style={{ height: 24 }} />

      <View style={styles.inputCard}>
        <TextInput
          value={pin}
          onChangeText={(t) => {
            setPin(t);
            setError(null);
          }}
          placeholder="\u2022\u2022\u2022\u2022"
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry
          autoFocus
          style={styles.input}
          onSubmitEditing={handleVerify}
          keyboardType="number-pad"
          maxLength={8}
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
          <Text style={styles.loadingText}>Verification...</Text>
        </View>
      ) : (
        <PrimaryButton
          label="Valider"
          onPress={handleVerify}
          disabled={pin.length < 4}
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
  workerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    width: "100%",
    maxWidth: 360,
    ...theme.shadow,
  },
  workerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  workerInfo: {
    marginLeft: 14,
  },
  workerName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  workerNumber: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 14,
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
  },
  inputCard: {
    width: "100%",
    maxWidth: 320,
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
    letterSpacing: 8,
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
    maxWidth: 320,
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
