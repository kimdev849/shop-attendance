import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, Lock } from "lucide-react-native";
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
        <PrimaryButton label="Retour" variant="secondary" onPress={() => router.replace("/identification")} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <ArrowLeft size={22} color={theme.colors.textMuted} />
      </Pressable>

      <View style={styles.iconCircle}>
        <Lock size={48} color={theme.colors.primary} />
      </View>

      <Text style={styles.title}>Verification du mot de passe</Text>
      <Text style={styles.subtitle}>
        {worker.firstName} {worker.lastName} ({worker.employeeNumber})
      </Text>

      <View style={{ height: theme.spacing(2) }} />

      <View style={styles.inputWrapper}>
        <TextInput
          value={pin}
          onChangeText={setPin}
          placeholder="Mot de passe"
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry
          autoFocus
          style={styles.input}
          onSubmitEditing={handleVerify}
        />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={{ height: theme.spacing(3) }} />

      {loading ? (
        <ActivityIndicator color={theme.colors.text} size="large" />
      ) : (
        <PrimaryButton label="Valider" onPress={handleVerify} disabled={pin.length < 4} />
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: "absolute",
    top: theme.spacing(3),
    left: theme.spacing(3),
    padding: theme.spacing(1),
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing(2),
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 15,
    textAlign: "center",
    marginTop: theme.spacing(1),
  },
  inputWrapper: {
    width: "100%",
    maxWidth: 420,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderRadius: theme.radius,
    paddingVertical: theme.spacing(2.5),
    paddingHorizontal: theme.spacing(3),
    fontSize: 20,
    color: theme.colors.text,
    textAlign: "center",
  },
  error: {
    color: theme.colors.danger,
    marginTop: theme.spacing(2),
    fontSize: 14,
    textAlign: "center",
    maxWidth: 420,
  },
});
