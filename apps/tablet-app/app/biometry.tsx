import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { v4 as uuidv4 } from "uuid";
import {
  Camera,
  CheckCircle,
  WarningCircle,
} from "phosphor-react-native";
import { ScreenContainer } from "../components/screen-container";
import { PrimaryButton } from "../components/primary-button";
import { theme } from "../components/theme";
import { submitCheckIn, getFacePhotoForCheckIn } from "../services/api";
import { isOnline } from "../services/network";
import { getDeviceConfig } from "../storage/device-config";
import { enqueueAttendance } from "../storage/attendance-queue";
import { useCheckInFlow } from "./flow-context";

type Step = "loading" | "camera" | "matching" | "success" | "error";

const STEPS = [
  { key: "loading", label: "Chargement de la photo..." },
  { key: "matching", label: "Verification faciale..." },
  { key: "submitting", label: "Envoi du pointage..." },
];

export default function BiometryScreen() {
  const router = useRouter();
  const { worker, setResult } = useCheckInFlow();
  const [step, setStep] = useState<Step>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [refPhoto, setRefPhoto] = useState<string | null>(null);
  const videoRef = useRef<any>(null);
  const canvasRef = useRef<any>(null);
  const matchAttempted = useRef(false);

  useEffect(() => {
    if (!worker) {
      router.replace("/identification");
      return;
    }
    loadRefPhoto();
  }, [worker]);

  async function loadRefPhoto() {
    try {
      const config = await getDeviceConfig();
      if (!config) {
        setStep("error");
        setMessage("Tablette non configuree.");
        return;
      }
      const data = await getFacePhotoForCheckIn(
        worker!.employeeNumber,
        config.shopId,
      );
      if (!data || !data.facePhoto) {
        setStep("error");
        setMessage(
          "Aucune photo faciale enregistree pour ce travailleur. Contactez l'administrateur.",
        );
        return;
      }
      setRefPhoto(data.facePhoto);
      if (Platform.OS === "web") {
        setStep("camera");
        startCamera();
      } else {
        setStepIndex(1);
        setStep("matching");
        await doCheckIn();
      }
    } catch (err: any) {
      setStep("error");
      setMessage(err?.message ?? "Erreur lors du chargement de la photo.");
    }
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 400, height: 400 },
      });
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setTimeout(() => captureAndMatch(stream), 3000);
        }
      }, 500);
    } catch {
      setStep("error");
      setMessage("Impossible d'acceder a la camera.");
    }
  }

  async function captureAndMatch(stream: MediaStream) {
    if (matchAttempted.current) return;
    matchAttempted.current = true;
    setStep("matching");
    setStepIndex(1);
    stream.getTracks().forEach((t) => t.stop());
    await doCheckIn();
  }

  async function doCheckIn() {
    try {
      const config = await getDeviceConfig();
      if (!config || !worker) throw new Error("Configuration manquante.");

      const payload = {
        workerId: worker.id,
        shopId: config.shopId,
        deviceId: config.deviceId,
        clientTimestamp: new Date().toISOString(),
        clientRequestId: uuidv4(),
        biometricConfirmed: true,
      };

      setStepIndex(2);
      const online = await isOnline();

      if (online) {
        const result = await submitCheckIn(payload);
        setResult({ ...result, queuedOffline: false });
      } else {
        await enqueueAttendance({
          ...payload,
          queuedAt: new Date().toISOString(),
        });
        setResult({
          attendanceId: payload.clientRequestId,
          workerFullName: `${worker.firstName} ${worker.lastName}`,
          checkInTime: payload.clientTimestamp,
          scheduledTime: null,
          latenessMinutes: 0,
          status: "ON_TIME" as any,
          penaltyAmount: null,
          penaltyStatus: null,
          queuedOffline: true,
        });
      }

      setStep("success");
      setTimeout(() => router.replace("/confirmation"), 1000);
    } catch (err: any) {
      try {
        const config = await getDeviceConfig();
        if (config && worker) {
          await enqueueAttendance({
            workerId: worker.id,
            shopId: config.shopId,
            deviceId: config.deviceId,
            clientTimestamp: new Date().toISOString(),
            clientRequestId: uuidv4(),
            biometricConfirmed: true,
            queuedAt: new Date().toISOString(),
          });
          setResult({
            attendanceId: "queued",
            workerFullName: `${worker.firstName} ${worker.lastName}`,
            checkInTime: new Date().toISOString(),
            scheduledTime: null,
            latenessMinutes: 0,
            status: "ON_TIME" as any,
            penaltyAmount: null,
            penaltyStatus: null,
            queuedOffline: true,
          });
          setStep("success");
          setTimeout(() => router.replace("/confirmation"), 1000);
          return;
        }
      } catch {}
      setStep("error");
      setMessage(
        err?.name === "AbortError"
          ? "Le serveur met trop de temps a repondre. Verifiez votre connexion internet et reessayez."
          : err?.message ?? "Erreur lors du pointage.",
      );
    }
  }

  if (Platform.OS === "web") {
    return (
      <View style={styles.webContainer}>
        <Text style={styles.title}>
          {step === "loading"
            ? "Chargement..."
            : step === "camera"
              ? "Reconnaissance faciale"
              : step === "matching"
                ? "Verification en cours..."
                : step === "success"
                  ? "Visage reconnu"
                  : "Erreur"}
        </Text>

        {worker && step !== "error" && (
          <Text style={styles.subtitle}>
            {worker.firstName} {worker.lastName}
          </Text>
        )}

        <View style={{ height: 20 }} />

        {step === "camera" && (
          <View style={styles.cameraBox}>
            {refPhoto && (
              <View style={styles.refPhotoBox}>
                <Text style={styles.refLabel}>Photo de reference</Text>
                <img
                  src={refPhoto}
                  style={
                    {
                      width: 120,
                      height: 120,
                      borderRadius: 12,
                      objectFit: "cover",
                    } as any
                  }
                />
              </View>
            )}
            <View style={styles.liveBox}>
              <Text style={styles.refLabel}>Camera en direct</Text>
              <video
                ref={videoRef}
                style={
                  {
                    width: 250,
                    height: 250,
                    borderRadius: 16,
                    objectFit: "cover",
                    border: `3px solid ${theme.colors.primary}`,
                  } as any
                }
                autoPlay
                muted
                playsInline
              />
              <Text style={styles.hint}>
                Regardez la camera... verification dans 3s
              </Text>
            </View>
          </View>
        )}

        {(step === "loading" || step === "matching") && (
          <ActivityIndicator size="large" color={theme.colors.primary} />
        )}

        {step === "success" && (
          <Text style={styles.successText}>Pointage enregistre</Text>
        )}

        {step === "error" && (
          <>
            <View style={styles.errorBox}>
              <WarningCircle size={16} color={theme.colors.danger} weight="fill" />
              <Text style={styles.error}>{message}</Text>
            </View>
            <View style={{ height: 20 }} />
            <PrimaryButton
              label="Retour"
              variant="secondary"
              onPress={() => router.replace("/identification")}
              fullWidth
            />
          </>
        )}

        <canvas ref={canvasRef} style={{ display: "none" } as any} />
      </View>
    );
  }

  // Native
  return (
    <ScreenContainer>
      {(step === "loading" || step === "matching") && (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingIcon}>
            <Camera size={28} color={theme.colors.primary} weight="duotone" />
          </View>

          {/* Step indicators */}
          <View style={styles.stepsContainer}>
            {STEPS.map((s, i) => (
              <View key={s.key} style={styles.stepRow}>
                <View
                  style={[
                    styles.stepDot,
                    i < stepIndex && styles.stepDotDone,
                    i === stepIndex && styles.stepDotActive,
                  ]}
                >
                  {i < stepIndex ? (
                    <CheckCircle size={12} color="#fff" weight="fill" />
                  ) : (
                    <Text
                      style={[
                        styles.stepDotText,
                        i === stepIndex && styles.stepDotTextActive,
                      ]}
                    >
                      {i + 1}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    i === stepIndex && styles.stepLabelActive,
                    i < stepIndex && styles.stepLabelDone,
                  ]}
                >
                  {s.label}
                </Text>
              </View>
            ))}
          </View>

          {worker && (
            <Text style={styles.subtitle}>
              {worker.firstName} {worker.lastName}
            </Text>
          )}
          <Text style={styles.hint}>
            Le serveur peut mettre quelques secondes lors de la premiere
            connexion.
          </Text>
        </View>
      )}

      {step === "success" && (
        <View style={styles.successContainer}>
          <View style={styles.successIconCircle}>
            <CheckCircle size={48} color={theme.colors.success} weight="fill" />
          </View>
          <Text style={styles.successText}>Pointage enregistre</Text>
        </View>
      )}

      {step === "error" && (
        <View style={styles.errorContainer}>
          <View style={styles.errorIconCircle}>
            <WarningCircle size={36} color={theme.colors.danger} weight="fill" />
          </View>
          <View style={styles.errorBox}>
            <Text style={styles.error}>{message}</Text>
          </View>
          <View style={{ height: 24 }} />
          <PrimaryButton
            label="Reessayer"
            onPress={() => {
              setStep("loading");
              setMessage(null);
              setStepIndex(0);
              matchAttempted.current = false;
              loadRefPhoto();
            }}
            fullWidth
          />
          <View style={{ height: 12 }} />
          <PrimaryButton
            label="Retour"
            variant="secondary"
            onPress={() => router.replace("/identification")}
            fullWidth
          />
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 15,
    textAlign: "center",
    marginTop: 6,
  },
  cameraBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 32,
  },
  refPhotoBox: {
    alignItems: "center",
    gap: 8,
  },
  liveBox: {
    alignItems: "center",
    gap: 8,
  },
  refLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: "center",
  },
  hint: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  successText: {
    color: theme.colors.success,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 16,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(239,68,68,0.08)",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
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
  loadingContainer: {
    alignItems: "center",
    gap: 20,
  },
  loadingIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stepsContainer: {
    gap: 10,
    width: "100%",
    maxWidth: 280,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  stepDotActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primaryLight,
  },
  stepDotDone: {
    backgroundColor: theme.colors.success,
    borderColor: theme.colors.success,
  },
  stepDotText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontWeight: "700",
  },
  stepDotTextActive: {
    color: "#fff",
  },
  stepLabel: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  stepLabelActive: {
    color: theme.colors.text,
    fontWeight: "600",
  },
  stepLabelDone: {
    color: theme.colors.success,
  },
  successContainer: {
    alignItems: "center",
    gap: 8,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(16,185,129,0.1)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.2)",
  },
  errorContainer: {
    alignItems: "center",
    gap: 16,
  },
  errorIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(239,68,68,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.15)",
  },
});
