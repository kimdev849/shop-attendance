import { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
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

const PIN_LENGTH = 4;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function PasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { worker } = useCheckInFlow();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  async function handleVerify() {
    if (!worker || pin.length < PIN_LENGTH) return;
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
      // Shake animation
      setShake(true);
      setPin("");
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  }

  function handlePinChange(text: string) {
    // Only allow digits
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, PIN_LENGTH);
    setPin(cleaned);
    setError(null);

    // Auto-submit when full
    if (cleaned.length === PIN_LENGTH) {
      setTimeout(() => {
        setPin(cleaned);
        // Trigger verify
      }, 200);
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
        {/* Back button */}
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={theme.colors.textSecondary} weight="bold" />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>

        {/* Content */}
        <View style={styles.content}>
          {/* Avatar */}
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarInitials}>
              {worker.firstName.charAt(0)}{worker.lastName.charAt(0)}
            </Text>
          </View>

          {/* Worker name */}
          <Text style={styles.workerName}>
            {worker.firstName} {worker.lastName}
          </Text>
          <Text style={styles.workerNumber}>{worker.employeeNumber}</Text>

          {/* Divider */}
          <View style={styles.divider} />

          {/* PIN icon */}
          <View style={styles.iconWrap}>
            <Fingerprint size={28} color={theme.colors.primary} weight="fill" />
          </View>

          {/* Title */}
          <Text style={styles.title}>Code PIN</Text>
          <Text style={styles.subtitle}>
            Entrez votre code à {PIN_LENGTH} chiffres
          </Text>

          {/* PIN dots */}
          <View style={[styles.dotsRow, shake && styles.dotsShake]}>
            {Array.from({ length: PIN_LENGTH }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < pin.length && styles.dotFilled,
                  error && styles.dotError,
                ]}
              >
                {i < pin.length && <View style={styles.dotInner} />}
              </View>
            ))}
          </View>

          {/* Error */}
          {error && (
            <View style={styles.errorBox}>
              <WarningCircle size={16} color="#ef4444" weight="fill" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Hidden input for keyboard */}
          <TextInput
            value={pin}
            onChangeText={handlePinChange}
            keyboardType="number-pad"
            maxLength={PIN_LENGTH}
            autoFocus
            style={styles.hiddenInput}
            onSubmitEditing={handleVerify}
          />

          {/* Number pad */}
          <View style={styles.numpad}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Pressable
                key={num}
                style={({ pressed }) => [styles.numKey, pressed && styles.numKeyPressed]}
                onPress={() => handlePinChange(pin + String(num))}
              >
                <Text style={styles.numText}>{num}</Text>
              </Pressable>
            ))}
            <View style={styles.numKey} />
            <Pressable
              style={({ pressed }) => [styles.numKey, pressed && styles.numKeyPressed]}
              onPress={() => handlePinChange(pin + "0")}
            >
              <Text style={styles.numText}>0</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.numKey, pressed && styles.numKeyPressed]}
              onPress={() => setPin(pin.slice(0, -1))}
            >
              <Text style={styles.numText}>⌫</Text>
            </Pressable>
          </View>

          {/* Submit */}
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={theme.colors.primary} size="large" />
              <Text style={styles.loadingText}>Vérification...</Text>
            </View>
          ) : (
            <PrimaryButton
              label="Valider"
              onPress={handleVerify}
              disabled={pin.length < PIN_LENGTH}
              fullWidth
            />
          )}
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
    paddingTop: 12,
  },
  // Avatar
  avatarLarge: {
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
  avatarInitials: {
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
  // Icon + title
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
  // PIN dots
  dotsRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 32,
    marginBottom: 24,
  },
  dotsShake: {
    // @ts-ignore
    animation: "shake 0.5s",
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  dotFilled: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + "15",
  },
  dotError: {
    borderColor: "#ef4444",
  },
  dotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  // Error
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239,68,68,0.08)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.15)",
    marginBottom: 8,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
    flex: 1,
    textAlign: "center",
  },
  // Hidden input
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
  },
  // Numpad
  numpad: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
    width: SCREEN_WIDTH * 0.75,
    maxWidth: 300,
    marginBottom: 24,
  },
  numKey: {
    width: 72,
    height: 56,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  numKeyPressed: {
    opacity: 0.6,
    backgroundColor: theme.colors.surfaceAlt,
  },
  numText: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "600",
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
  // Empty state
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
