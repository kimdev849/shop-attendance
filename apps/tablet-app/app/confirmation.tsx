import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { CheckCircle2, Clock, CloudOff } from "lucide-react-native";
import { ScreenContainer } from "../components/screen-container";
import { PrimaryButton } from "../components/primary-button";
import { theme } from "../components/theme";
import { useCheckInFlow } from "./flow-context";

const AUTO_RETURN_MS = 8000;

export default function ConfirmationScreen() {
  const router = useRouter();
  const { result, reset } = useCheckInFlow();

  useEffect(() => {
    if (!result) {
      router.replace("/");
      return;
    }
    const timeout = setTimeout(() => {
      reset();
      router.replace("/");
    }, AUTO_RETURN_MS);
    return () => clearTimeout(timeout);
  }, [result]);

  if (!result) return null;

  const isLate = result.status === "LATE";
  const checkInTime = new Date(result.checkInTime);
  const timeLabel = checkInTime.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <ScreenContainer>
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: isLate ? "rgba(224,166,47,0.15)" : "rgba(47,165,146,0.15)" },
        ]}
      >
        {isLate ? (
          <Clock size={72} color={theme.colors.warning} />
        ) : (
          <CheckCircle2 size={72} color={theme.colors.success} />
        )}
      </View>

      <Text style={styles.title}>Pointage enregistré</Text>
      <Text style={styles.name}>{result.workerFullName}</Text>

      <View style={{ height: theme.spacing(2) }} />
      <Text style={styles.detail}>Arrivée : {timeLabel}</Text>

      <View style={{ height: theme.spacing(2) }} />
      <Text style={[styles.status, { color: isLate ? theme.colors.warning : theme.colors.success }]}>
        {isLate ? "EN RETARD" : "À L'HEURE"}
      </Text>

      {isLate && result.latenessMinutes > 0 && (
        <Text style={styles.detail}>Retard : {result.latenessMinutes} minute(s)</Text>
      )}

      {isLate && result.penaltyAmount ? (
        <View style={styles.penaltyBox}>
          <Text style={styles.penaltyLabel}>Pénalité calculée</Text>
          <Text style={styles.penaltyAmount}>{result.penaltyAmount.toLocaleString("fr-FR")} FCFA</Text>
          <Text style={styles.penaltyStatus}>En attente de validation</Text>
        </View>
      ) : null}

      {result.queuedOffline && (
        <View style={styles.offlineNotice}>
          <CloudOff size={16} color={theme.colors.textMuted} />
          <Text style={styles.offlineText}>
            Enregistré localement — sera synchronisé dès que la connexion sera rétablie.
          </Text>
        </View>
      )}

      <View style={{ height: theme.spacing(4) }} />
      <Text style={styles.bye}>Bonne journée !</Text>

      <View style={{ height: theme.spacing(4) }} />
      <PrimaryButton
        label="Terminer"
        variant="secondary"
        onPress={() => {
          reset();
          router.replace("/");
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing(3),
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "600",
  },
  name: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: "700",
    marginTop: theme.spacing(1),
  },
  detail: {
    color: theme.colors.textMuted,
    fontSize: 16,
  },
  status: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 1,
  },
  penaltyBox: {
    marginTop: theme.spacing(2),
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    paddingVertical: theme.spacing(2),
    paddingHorizontal: theme.spacing(4),
    alignItems: "center",
  },
  penaltyLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  penaltyAmount: {
    color: theme.colors.warning,
    fontSize: 22,
    fontWeight: "700",
    marginTop: 2,
  },
  penaltyStatus: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  offlineNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: theme.spacing(2),
    maxWidth: 380,
  },
  offlineText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    flexShrink: 1,
  },
  bye: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: "300",
  },
});
