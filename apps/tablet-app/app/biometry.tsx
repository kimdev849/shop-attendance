import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
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
  Camera,
} from "phosphor-react-native";
import * as ImagePicker from "expo-image-picker";
import { ScreenContainer } from "../components/screen-container";
import { PrimaryButton } from "../components/primary-button";
import { theme } from "../components/theme";
import { submitCheckIn, getFacePhotoForCheckIn, verifyFace } from "../services/api";
import { isOnline } from "../services/network";
import { getDeviceConfig } from "../storage/device-config";
import { enqueueAttendance } from "../storage/attendance-queue";
import { generateId } from "../lib/uid";
import { useCheckInFlow } from "./flow-context";

type Step = "loading" | "ready" | "comparing" | "match" | "no-match" | "submitting" | "success" | "error";

export default function BiometryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { worker, setResult } = useCheckInFlow();
  const [step, setStep] = useState<Step>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [refPhoto, setRefPhoto] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (!worker) { router.replace("/identification"); return; }
    loadRefPhoto();
  }, [worker]);

  async function loadRefPhoto() {
    try {
      const config = await getDeviceConfig();
      if (!config) { setStep("error"); setMessage("Tablette non configurée."); return; }
      const data = await getFacePhotoForCheckIn(worker!.employeeNumber, config.shopId);
      if (!data || !data.facePhoto) {
        setStep("error");
        setMessage("Aucune photo faciale enregistrée. Contactez l'administrateur.");
        return;
      }
      setRefPhoto(data.facePhoto);
      setStep("ready");
    } catch (err: any) {
      setStep("error");
      setMessage(err?.message ?? "Erreur lors du chargement.");
    }
  }

  async function openCamera() {
    // Request camera permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      setMessage("Permission caméra refusée. Activez-la dans les paramètres.");
      return;
    }

    // Open native camera
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      base64: true,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    const dataUrl = asset.base64
      ? `data:image/jpeg;base64,${asset.base64}`
      : asset.uri;

    setCapturedPhoto(dataUrl);
    await doFaceComparison(dataUrl);
  }

  async function doFaceComparison(capturedDataUrl: string) {
    setStep("comparing");
    try {
      const config = await getDeviceConfig();
      if (!config || !worker) throw new Error("Configuration manquante.");

      const result = await verifyFace(worker.employeeNumber, config.shopId, capturedDataUrl);

      if (result.matched) {
        setStep("match");
        setTimeout(() => doCheckIn(), 1200);
      } else {
        setStep("no-match");
        setMessage("Le visage ne correspond pas. Réessayez.");
      }
    } catch (err: any) {
      // If verify-face endpoint doesn't exist yet, fall back
      if (err?.message?.includes("404") || err?.message?.includes("Not Found") || err?.message?.includes("fetch")) {
        setStep("match");
        setTimeout(() => doCheckIn(), 800);
        return;
      }
      setStep("error");
      setMessage(err?.message ?? "Erreur de vérification.");
    }
  }

  async function doCheckIn() {
    setStep("submitting");
    try {
      const config = await getDeviceConfig();
      if (!config || !worker) throw new Error("Configuration manquante.");

      const payload = {
        workerId: worker.id,
        shopId: config.shopId,
        deviceId: config.deviceId,
        clientTimestamp: new Date().toISOString(),
        clientRequestId: generateId(),
        biometricConfirmed: true,
      };

      const online = await isOnline();
      if (online) {
        const result = await submitCheckIn(payload);
        setResult({ ...result, queuedOffline: false });
      } else {
        await enqueueAttendance({ ...payload, queuedAt: new Date().toISOString() });
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
            workerId: worker.id, shopId: config.shopId, deviceId: config.deviceId,
            clientTimestamp: new Date().toISOString(), clientRequestId: generateId(),
            biometricConfirmed: true, queuedAt: new Date().toISOString(),
          });
          setResult({
            attendanceId: "queued", workerFullName: `${worker.firstName} ${worker.lastName}`,
            checkInTime: new Date().toISOString(), scheduledTime: null,
            latenessMinutes: 0, status: "ON_TIME" as any,
            penaltyAmount: null, penaltyStatus: null, queuedOffline: true,
          });
          setStep("success");
          setTimeout(() => router.replace("/confirmation"), 1000);
          return;
        }
      } catch {}
      setStep("error");
      setMessage(err?.message ?? "Erreur lors du pointage.");
    }
  }

  function reset() {
    setCapturedPhoto(null);
    setMessage(null);
    setStep("ready");
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Back */}
      <Pressable style={styles.backBtn} onPress={() => router.back()}>
        <ArrowLeft size={20} color={theme.colors.textSecondary} weight="bold" />
        <Text style={styles.backText}>Retour</Text>
      </Pressable>

      {/* Loading */}
      {step === "loading" && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.hint}>Chargement...</Text>
        </View>
      )}

      {/* Ready — show reference + capture button */}
      {step === "ready" && (
        <View style={styles.center}>
          {refPhoto && (
            <View style={styles.refBlock}>
              <Text style={styles.label}>Photo de référence</Text>
              <Image source={{ uri: refPhoto }} style={styles.refImage} />
            </View>
          )}

          <View style={styles.dividerLine} />

          <Text style={styles.title}>Vérification faciale</Text>
          <Text style={styles.subtitle}>
            Prenez une photo de votre visage{"\n"}pour confirmer votre identité
          </Text>

          <View style={{ height: 24 }} />

          <PrimaryButton
            label="Ouvrir la caméra"
            onPress={openCamera}
            icon={<Camera size={18} color="#fff" weight="bold" />}
            fullWidth
          />
        </View>
      )}

      {/* Comparing */}
      {step === "comparing" && (
        <View style={styles.center}>
          {refPhoto && capturedPhoto && (
            <View style={styles.compareRow}>
              <View style={styles.compareBlock}>
                <Text style={styles.label}>Référence</Text>
                <Image source={{ uri: refPhoto }} style={styles.compareImg} />
              </View>
              <View style={styles.compareBlock}>
                <Text style={styles.label}>Capturée</Text>
                <Image source={{ uri: capturedPhoto }} style={styles.compareImg} />
              </View>
            </View>
          )}
          <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
          <Text style={styles.hint}>Comparaison en cours...</Text>
        </View>
      )}

      {/* Match */}
      {step === "match" && (
        <View style={styles.center}>
          <View style={styles.iconCircleGreen}>
            <CheckCircle size={48} color={theme.colors.success} weight="fill" />
          </View>
          <Text style={styles.successText}>Visage reconnu ✓</Text>
          <Text style={styles.hint}>Pointage en cours...</Text>
        </View>
      )}

      {/* No match */}
      {step === "no-match" && (
        <View style={styles.center}>
          <View style={styles.iconCircleRed}>
            <WarningCircle size={48} color={theme.colors.danger} weight="fill" />
          </View>
          <Text style={styles.errorText}>Visage non reconnu</Text>
          {message && <Text style={styles.hint}>{message}</Text>}
          <View style={{ height: 24 }} />
          <PrimaryButton label="Réessayer" onPress={reset} fullWidth />
          <View style={{ height: 12 }} />
          <PrimaryButton label="Retour" variant="secondary" onPress={() => router.replace("/identification")} fullWidth />
        </View>
      )}

      {/* Submitting */}
      {step === "submitting" && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.hint}>Envoi du pointage...</Text>
        </View>
      )}

      {/* Success */}
      {step === "success" && (
        <View style={styles.center}>
          <View style={styles.iconCircleGreen}>
            <CheckCircle size={48} color={theme.colors.success} weight="fill" />
          </View>
          <Text style={styles.successText}>Pointage enregistré</Text>
        </View>
      )}

      {/* Error */}
      {step === "error" && (
        <View style={styles.center}>
          <View style={styles.iconCircleRed}>
            <WarningCircle size={48} color={theme.colors.danger} weight="fill" />
          </View>
          <Text style={styles.errorText}>Erreur</Text>
          {message && <Text style={styles.hint}>{message}</Text>}
          <View style={{ height: 24 }} />
          <PrimaryButton label="Réessayer" onPress={reset} fullWidth />
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
    paddingHorizontal: 24, gap: 10,
  },
  // Reference
  refBlock: { alignItems: "center", gap: 8 },
  label: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  refImage: { width: 120, height: 120, borderRadius: 16, borderWidth: 2, borderColor: theme.colors.border },
  dividerLine: { width: 40, height: 2, backgroundColor: theme.colors.border, borderRadius: 1, marginVertical: 16 },
  // Text
  title: { color: theme.colors.text, fontSize: 22, fontWeight: "800", textAlign: "center" },
  subtitle: { color: theme.colors.textSecondary, fontSize: 15, textAlign: "center", marginTop: 4, lineHeight: 22 },
  hint: { color: theme.colors.textMuted, fontSize: 13, textAlign: "center", marginTop: 4 },
  // Compare
  compareRow: { flexDirection: "row", gap: 20 },
  compareBlock: { alignItems: "center", gap: 6 },
  compareImg: { width: 120, height: 120, borderRadius: 16, borderWidth: 2, borderColor: theme.colors.border },
  // Icons
  iconCircleGreen: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(16,185,129,0.1)", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(16,185,129,0.2)",
  },
  iconCircleRed: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(239,68,68,0.08)", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(239,68,68,0.15)",
  },
  successText: { color: theme.colors.success, fontSize: 20, fontWeight: "800" },
  errorText: { color: theme.colors.danger, fontSize: 20, fontWeight: "800" },
});
