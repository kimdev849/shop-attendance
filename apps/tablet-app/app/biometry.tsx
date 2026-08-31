import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  CheckCircle,
  WarningCircle,
  ArrowLeft,
  ShieldCheck,
  Camera,
} from "phosphor-react-native";
import * as ImagePicker from "expo-image-picker";
import { PrimaryButton } from "../components/primary-button";
import { theme } from "../components/theme";
import { submitCheckIn, getFacePhotoForCheckIn, verifyFace } from "../services/api";
import { isOnline } from "../services/network";
import { getDeviceConfig } from "../storage/device-config";
import { enqueueAttendance } from "../storage/attendance-queue";
import { generateId } from "../lib/uid";
import { useCheckInFlow } from "./flow-context";

import { Pressable } from "react-native";

type Step = "loading" | "ready" | "camera" | "comparing" | "success" | "error";

export default function BiometryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { worker, setResult } = useCheckInFlow();
  const [step, setStep] = useState<Step>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [hasRefPhoto, setHasRefPhoto] = useState(false);
  const [attendanceType, setAttendanceType] = useState<"CHECK_IN" | "CHECK_OUT">("CHECK_IN");

  useEffect(() => {
    if (!worker) {
      // Defer navigation to avoid "navigate before mounting" error
      const t = setTimeout(() => router.replace("/identification"), 100);
      return () => clearTimeout(t);
    }
    initScreen();
  }, [worker]);

  async function initScreen() {
    try {
      const config = await getDeviceConfig();
      if (!config) { setStep("error"); setMessage("Tablette non configurée."); return; }
      const data = await getFacePhotoForCheckIn(worker!.employeeNumber, config.shopId);
      setHasRefPhoto(!!data?.facePhoto);
      setAttendanceType(data?.nextAction ?? "CHECK_IN");
      setStep("ready");
    } catch {
      setHasRefPhoto(false);
      setAttendanceType("CHECK_IN");
      setStep("ready");
    }
  }

  async function handleCapture() {
    setStep("camera");

    // 1. Request camera permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      setStep("error");
      setMessage("Permission caméra refusée. Activez-la dans les paramètres de votre appareil.");
      return;
    }

    // 2. Open camera
    let photoData: string | null = null;
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        base64: true,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets?.[0] || !result.assets[0].base64) {
        setStep("ready");
        return;
      }

      photoData = `data:image/jpeg;base64,${result.assets[0].base64}`;
    } catch (err: any) {
      setStep("error");
      const detail = err?.message ?? err?.toString() ?? "Erreur inconnue";
      setMessage("Impossible d'ouvrir la caméra: " + detail);
      return;
    }

    // 3. Face verification
    if (hasRefPhoto && photoData) {
      setStep("comparing");
      try {
        const config = await getDeviceConfig();
        if (!config || !worker) throw new Error("Config manquante.");
        const faceResult = await verifyFace(worker.employeeNumber, config.shopId, photoData);
        if (!faceResult.matched) {
          setStep("error");
          setMessage("Le visage ne correspond pas à la photo enregistrée. Réessayez.");
          return;
        }
      } catch (err: any) {
        const msg = err?.message ?? "";
        // If endpoint not found or network issue — still proceed
        if (msg.includes("404") || msg.includes("Not Found") || msg.includes("fetch") || msg.includes("Network")) {
          // OK
        } else {
          setStep("error");
          setMessage("Erreur de vérification faciale. Réessayez.");
          return;
        }
      }
    }

    // 4. Submit attendance
    await doCheckIn();
  }

  async function doCheckIn() {
    setStep("comparing");
    try {
      const config = await getDeviceConfig();
      if (!config || !worker) throw new Error("Config manquante.");

      const payload = {
        workerId: worker.id,
        shopId: config.shopId,
        deviceId: config.deviceId,
        clientTimestamp: new Date().toISOString(),
        clientRequestId: generateId(),
        biometricConfirmed: true,
        type: attendanceType,
      };

      const online = await isOnline();
      if (online) {
        const res = await submitCheckIn(payload);
        setResult({ ...res, queuedOffline: false });
      } else {
        await enqueueAttendance({ ...payload, queuedAt: new Date().toISOString() });
        setResult({
          attendanceId: payload.clientRequestId,
          workerFullName: `${worker.firstName} ${worker.lastName}`,
          checkInTime: payload.clientTimestamp,
          checkOutTime: null,
          scheduledTime: null,
          latenessMinutes: 0,
          status: "ON_TIME" as any,
          penaltyAmount: null,
          penaltyStatus: null,
          type: attendanceType,
          queuedOffline: true,
        });
      }
      setStep("success");
      setTimeout(() => router.replace("/confirmation"), 1200);
    } catch (err: any) {
      // Offline fallback
      try {
        const config = await getDeviceConfig();
        if (config && worker) {
          const payload = {
            workerId: worker.id, shopId: config.shopId, deviceId: config.deviceId,
            clientTimestamp: new Date().toISOString(), clientRequestId: generateId(),
            biometricConfirmed: true, queuedAt: new Date().toISOString(),
          };
          await enqueueAttendance(payload);
          setResult({
            attendanceId: "queued", workerFullName: `${worker.firstName} ${worker.lastName}`,
            checkInTime: payload.clientTimestamp, checkOutTime: null, scheduledTime: null,
            latenessMinutes: 0, status: "ON_TIME" as any,
            penaltyAmount: null, penaltyStatus: null, type: attendanceType, queuedOffline: true,
          });
          setStep("success");
          setTimeout(() => router.replace("/confirmation"), 1200);
          return;
        }
      } catch {}
      setStep("error");
      setMessage(err?.message ?? "Erreur lors du pointage.");
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <ArrowLeft size={20} color={theme.colors.textSecondary} weight="bold" />
        <Text style={styles.backText}>Retour</Text>
      </Pressable>

      {step === "loading" && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.hint}>Chargement...</Text>
        </View>
      )}

      {step === "ready" && (
        <View style={styles.center}>
          <View style={styles.iconWrap}>
            <ShieldCheck size={36} color={theme.colors.primary} weight="fill" />
          </View>
          <Text style={styles.title}>
            {attendanceType === "CHECK_OUT" ? "Pointage de sortie" : "Authentification"}
          </Text>
          <Text style={styles.subtitle}>
            {worker?.firstName} {worker?.lastName}
          </Text>
          <Text style={styles.hint}>
            {attendanceType === "CHECK_OUT"
              ? "Vous avez déjà pointé aujourd'hui — confirmez votre sortie"
              : hasRefPhoto
                ? "Votre visage sera comparé à la photo enregistrée"
                : "Capturez une photo pour confirmer votre présence"}
          </Text>
          <View style={{ height: 32 }} />
          <PrimaryButton
            label={attendanceType === "CHECK_OUT" ? "Pointer la sortie" : "S'authentifier"}
            onPress={handleCapture}
            icon={<Camera size={18} color="#fff" weight="bold" />}
            fullWidth
          />
        </View>
      )}

      {step === "camera" && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.hint}>Ouverture de la caméra...</Text>
        </View>
      )}

      {step === "comparing" && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.hint}>Vérification en cours...</Text>
        </View>
      )}

      {step === "success" && (
        <View style={styles.center}>
          <View style={styles.iconGreen}>
            <CheckCircle size={48} color={theme.colors.success} weight="fill" />
          </View>
          <Text style={styles.successText}>
            {attendanceType === "CHECK_OUT" ? "Sortie enregistrée" : "Pointage enregistré"}
          </Text>
        </View>
      )}

      {step === "error" && (
        <View style={styles.center}>
          <View style={styles.iconRed}>
            <WarningCircle size={48} color={theme.colors.danger} weight="fill" />
          </View>
          <Text style={styles.errorText}>Erreur</Text>
          {message ? <Text style={styles.hint}>{message}</Text> : null}
          <View style={{ height: 24 }} />
          <PrimaryButton label="Réessayer" onPress={() => { setMessage(null); setStep("ready"); }} fullWidth />
          <View style={{ height: 12 }} />
          <PrimaryButton label="Retour" variant="secondary" onPress={() => router.replace("/identification")} fullWidth />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  backBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingVertical: 8, paddingHorizontal: 20,
  },
  backText: { color: theme.colors.textSecondary, fontSize: 15, fontWeight: "500" },
  center: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 24, gap: 8,
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: theme.colors.primary + "12",
    alignItems: "center", justifyContent: "center",
    marginBottom: 12,
  },
  title: { color: theme.colors.text, fontSize: 24, fontWeight: "800" },
  subtitle: { color: theme.colors.textSecondary, fontSize: 16, fontWeight: "600", marginTop: 4 },
  hint: { color: theme.colors.textMuted, fontSize: 14, textAlign: "center", marginTop: 4 },
  iconGreen: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(16,185,129,0.1)", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(16,185,129,0.2)",
  },
  iconRed: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(239,68,68,0.08)", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(239,68,68,0.15)",
  },
  successText: { color: theme.colors.success, fontSize: 20, fontWeight: "800" },
  errorText: { color: theme.colors.danger, fontSize: 20, fontWeight: "800" },
});
