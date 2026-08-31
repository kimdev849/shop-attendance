import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  CheckCircle,
  Clock,
  CloudSlash,
} from "phosphor-react-native";
import { ScreenContainer } from "../components/screen-container";
import { PrimaryButton } from "../components/primary-button";
import { theme } from "../components/theme";
import { useCheckInFlow } from "./flow-context";

const AUTO_RETURN_MS = 8000;

export default function ConfirmationScreen() {
  const router = useRouter();
  const { result, reset } = useCheckInFlow();

  const iconScale = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (!result) {
      router.replace("/");
      return;
    }

    Animated.sequence([
      Animated.spring(iconScale, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(cardTranslateY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    const timeout = setTimeout(() => {
      reset();
      router.replace("/");
    }, AUTO_RETURN_MS);
    return () => clearTimeout(timeout);
  }, [result]);

  if (!result) return null;

  const isLate = result.status === "LATE";
  const isCheckOut = result.type === "CHECK_OUT";
  const checkInTime = new Date(result.checkInTime);
  const timeLabel = checkInTime.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const checkOutTime = result.checkOutTime ? new Date(result.checkOutTime) : null;
  const checkOutLabel = checkOutTime?.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }) ?? null;

  return (
    <ScreenContainer>
      {/* Animated status icon */}
      <Animated.View
        style={[
          styles.iconCircle,
          {
            backgroundColor: isLate
              ? "rgba(245,158,11,0.08)"
              : "rgba(16,185,129,0.08)",
            borderColor: isLate
              ? "rgba(245,158,11,0.2)"
              : "rgba(16,185,129,0.2)",
            transform: [{ scale: iconScale }],
          },
        ]}
      >
        {isLate ? (
          <Clock size={48} color={theme.colors.warning} weight="fill" />
        ) : (
          <CheckCircle size={48} color={theme.colors.success} weight="fill" />
        )}
      </Animated.View>

      <Text style={styles.title}>{isCheckOut ? "Sortie enregistree" : "Pointage enregistre"}</Text>

      <Text style={styles.workerName}>{result.workerFullName}</Text>

      {/* Info card */}
      <Animated.View
        style={[
          styles.infoCard,
          { opacity: cardOpacity, transform: [{ translateY: cardTranslateY }] },
        ]}
      >
        <Text style={styles.infoLabel}>{isCheckOut ? "HEURE DE SORTIE" : "HEURE D'ARRIVEE"}</Text>
        <Text style={styles.infoTime}>{isCheckOut && checkOutLabel ? checkOutLabel : timeLabel}</Text>

        <View style={styles.divider} />

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: isLate
                ? "rgba(245,158,11,0.1)"
                : "rgba(16,185,129,0.1)",
              borderColor: isLate
                ? "rgba(245,158,11,0.25)"
                : "rgba(16,185,129,0.25)",
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color: isLate ? theme.colors.warning : theme.colors.success,
              },
            ]}
          >
            {isLate ? "EN RETARD" : "A L'HEURE"}
          </Text>
        </View>

        {isLate && result.latenessMinutes > 0 && (
          <Text style={styles.lateDetail}>
            Retard : {result.latenessMinutes} min
          </Text>
        )}
      </Animated.View>

      {isLate && result.penaltyAmount ? (
        <View style={styles.penaltyCard}>
          <Text style={styles.penaltyLabel}>PENALITE CALCULEE</Text>
          <Text style={styles.penaltyAmount}>
            {result.penaltyAmount.toLocaleString("fr-FR")} FCFA
          </Text>
          <Text style={styles.penaltyStatus}>En attente de validation</Text>
        </View>
      ) : null}

      {result.queuedOffline && (
        <View style={styles.offlineNotice}>
          <CloudSlash size={14} color={theme.colors.textMuted} weight="bold" />
          <Text style={styles.offlineText}>
            Sera synchronise des la reconnexion
          </Text>
        </View>
      )}

      <View style={{ flex: 1 }} />        <Text style={styles.bye}>{isCheckOut ? "Bonne soiree" : "Bonne journee"}</Text>

      <View style={{ height: 14 }} />
      <PrimaryButton
        label="Terminer"
        variant="secondary"
        onPress={() => {
          reset();
          router.replace("/");
        }}
        fullWidth
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    marginBottom: 16,
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  workerName: {
    color: theme.colors.textMuted,
    fontSize: 15,
    marginTop: 6,
    textAlign: "center",
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radiusLg,
    paddingVertical: 24,
    paddingHorizontal: 32,
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
    marginTop: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow,
  },
  infoLabel: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.5,
  },
  infoTime: {
    color: theme.colors.text,
    fontSize: 40,
    fontWeight: "800",
    marginTop: 6,
  },
  divider: {
    width: 32,
    height: 2,
    backgroundColor: theme.colors.border,
    marginVertical: 14,
    borderRadius: 1,
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
  },
  lateDetail: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: 8,
  },
  penaltyCard: {
    marginTop: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  penaltyLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  penaltyAmount: {
    color: theme.colors.warning,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 4,
  },
  penaltyStatus: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  offlineNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  offlineText: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  bye: {
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "500",
    textAlign: "center",
  },
});
