import { useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { Pressable } from "react-native";
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
        setError("Tablette non configurée. Contactez votre administrateur.");
        return;
      }

      const trimmed = employeeNumber.trim();
      const online = await isOnline();

      if (online) {
        const worker = await lookupWorkerByEmployeeNumber(trimmed, config.shopId);
        if (!worker) {
          setError("Matricule inconnu pour ce shop. Vérifiez et réessayez.");
          return;
        }
        setWorker(worker);
        router.push("/password");
        return;
      }

      // Hors ligne: on résout le matricule via le cache local du roster,
      // rafraîchi périodiquement pendant que la tablette est en ligne
      // (voir app/_layout.tsx). Cela garantit un workerId valide même sans
      // réseau, au lieu de bloquer le pointage.
      const cached = await findInCachedRoster(trimmed);
      if (!cached) {
        setError(
          "Matricule introuvable dans le cache local hors ligne. Reconnectez la tablette au moins une fois pour synchroniser la liste des travailleurs.",
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
        <ArrowLeft size={22} color={theme.colors.textMuted} />
      </Pressable>

      <Text style={styles.title}>Identifiant employé</Text>

      <View style={styles.inputWrapper}>
        <TextInput
          value={employeeNumber}
          onChangeText={setEmployeeNumber}
          placeholder="EMP-1000"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="characters"
          autoCorrect={false}
          style={styles.input}
          onSubmitEditing={handleContinue}
        />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={{ height: theme.spacing(3) }} />

      {loading ? (
        <ActivityIndicator color={theme.colors.text} size="large" />
      ) : (
        <PrimaryButton label="Continuer" onPress={handleContinue} disabled={!employeeNumber.trim()} />
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
  title: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: "600",
    marginBottom: theme.spacing(3),
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
    fontSize: 24,
    color: theme.colors.text,
    textAlign: "center",
    letterSpacing: 2,
  },
  error: {
    color: theme.colors.danger,
    marginTop: theme.spacing(2),
    fontSize: 15,
    textAlign: "center",
  },
});
