import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  WarningCircle,
  Fingerprint,
} from "phosphor-react-native";
import { ScreenContainer } from "../components/screen-container";
import { PrimaryButton } from "../components/primary-button";
import { theme } from "../components/theme";
import { getDeviceConfig } from "../storage/device-config";
import { verifyWorkerPin } from "../services/api";
import { useCheckInFlow } from "./flow-context";

export default function PasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { worker } = useCheckInFlow();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVerify() {
    if (!worker || pin.trim().length < 4) return;
    setError(null);
    setLoading(true);

    try {
      const config = await getDeviceConfig();
      if (!config) {
        setError("Tablette non configurée.");
        return;
      }
      await verifyWorkerPin(worker.employeeNumber, config.shopId, pin.trim());
      router.push("/biometry");
    } catch (err: any) {
      const msg = err?.message ?? "Code PIN incorrect.";
      if (msg.includes("Aucun mot de passe")) {
        setError("Aucun code PIN défini. Contactez votre responsable.");
      } else if (msg.includes("incorrect")) {
        setError("Code PIN incorrect. Réessayez.");
      } else {
        setError(msg);
      }
      setPin("");
    } finally {
      setLoading(false);
    }
  }

  if (!worker) {
    return (
      <ScreenContainer>
        <View style={styles.centerWrap}>
          <Text style={styles.emptyText}>Aucun collaborateur sélectionné.</Text>
          <View style={{ height: 16 }} />
          <PrimaryButton
            label="Retour"
            variant="secondary"
            onPress={() => router.replace("/identification")}
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
        {/* Back */}
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={theme.colors.textSecondary} weight="bold" />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>

        {/* Content */}
        <View style={styles.content}>
          {/* Avatar */}
          <View style={styles.avatar}>
            <Text style={styles.initials}>
              {worker.firstName.charAt(0)}{worker.lastName.charAt(0)}
            </Text>
          </View>

          <Text style={styles.workerName}>
            {worker.firstName} {worker.lastName}
          </Text>
          <Text style={styles.workerNumber}>{worker.employeeNumber}</Text>

          <View style={styles.divider} />

          {/* Icon */}
          <View style={styles.iconWrap}>
            <Fingerprint size={28} color={theme.colors.primary} weight="fill" />
          </View>

          <Text style={styles.title}>Code PIN</Text>
          <Text style={styles.subtitle}>
            Saisissez votre code à 4 chiffres
          </Text>

          {/* PIN input */}
          <View style={styles.inputWrap}>
            <TextInput
              value={pin}
              onChangeText={(t) => {
                setPin(t.replace(/[^0-9]/g, "").slice(0, 6));
                setError(null);
              }}
              placeholder="••••"
              placeholderTextColor={theme.colors.textMuted}
              secureTextEntry
              autoFocus
              keyboardType="number-pad"
              maxLength={6}
              style={styles.input}
              onSubmitEditing={handleVerify}
            />
          </View>

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <WarningCircle size={16} color="#ef4444" weight="fill" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Hint */}
          <Text style={styles.hint}>
            Demandez votre code à votre responsable
          </Text>

          <View style={{ flex: 1 }} />

          {/* Submit — en bas, facile à cliquer */}
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={theme.colors.primary} size="large" />
              <Text style={styles.loadingText}>Vérification...</Text>
            </View>
          ) : (
            <PrimaryButton
              label="Valider"
              onPress={handleVerify}
              disabled={pin.trim().length < 4}
              fullWidth
            />
          )}

          <View style={{ height: insets.bottom + 16 }} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  backText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: "500",
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  // Avatar
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primary + "18",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: theme.colors.primary + "30",
  },
  initials: {
    color: theme.colors.primary,
    fontSize: 24,
    fontWeight: "800",
  },
  workerName: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  workerNumber: {
    color: theme.colors.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: theme.colors.border,
    borderRadius: 1,
    marginVertical: 20,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary + "12",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    marginTop: 6,
  },
  // PIN input
  inputWrap: {
    width: "100%",
    maxWidth: 280,
    marginTop: 28,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingVertical: 18,
    paddingHorizontal: 20,
    fontSize: 28,
    color: theme.colors.text,
    textAlign: "center",
    letterSpacing: 12,
    fontWeight: "600",
  },
  // Error
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    backgroundColor: "rgba(239,68,68,0.08)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.15)",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
    flex: 1,
    textAlign: "center",
  },
  hint: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: 16,
    textAlign: "center",
  },
  // Loading
  loadingWrap: {
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  // Empty
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 15,
    textAlign: "center",
  },
});
