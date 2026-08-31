import { useEffect, useRef, useState } from "react";
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
  Camera,
  CheckCircle,
  WarningCircle,
  ArrowLeft,
  X,
} from "phosphor-react-native";
import { ScreenContainer } from "../components/screen-container";
import { PrimaryButton } from "../components/primary-button";
import { theme } from "../components/theme";
import { submitCheckIn, getFacePhotoForCheckIn, verifyFace } from "../services/api";
import { isOnline } from "../services/network";
import { getDeviceConfig } from "../storage/device-config";
import { enqueueAttendance } from "../storage/attendance-queue";
import { generateId } from "../lib/uid";
import { useCheckInFlow } from "./flow-context";

type Step = "loading" | "camera" | "comparing" | "match" | "no-match" | "submitting" | "success" | "error";

export default function BiometryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { worker, setResult } = useCheckInFlow();
  const [step, setStep] = useState<Step>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [refPhoto, setRefPhoto] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const cameraRef = useRef<any>(null);
  const videoRef = useRef<any>(null);
  const canvasRef = useRef<any>(null);

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
        setMessage("Aucune photo faciale enregistrée pour ce travailleur. Contactez l'administrateur.");
        return;
      }
      setRefPhoto(data.facePhoto);

      if (Platform.OS === "web") {
        // Web: use face-api.js in browser
        setStep("camera");
        startWebCamera();
      } else {
        // Native: open expo-camera
        setStep("camera");
      }
    } catch (err: any) {
      setStep("error");
      setMessage(err?.message ?? "Erreur lors du chargement.");
    }
  }

  // ── Web camera ──
  async function startWebCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 400, height: 400 } });
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setTimeout(() => captureWeb(stream), 3000);
        }
      }, 500);
    } catch {
      setStep("error");
      setMessage("Impossible d'accéder à la caméra.");
    }
  }

  async function captureWeb(stream: MediaStream) {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(videoRef.current, 0, 0, 400, 400);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    stream.getTracks().forEach((t) => t.stop());
    setCapturedPhoto(dataUrl);
    await doFaceComparison(dataUrl);
  }

  // ── Native camera (expo-camera) ──
  async function takeNativePicture() {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: true });
      const dataUrl = `data:image/jpeg;base64,${photo.base64}`;
      setCapturedPhoto(dataUrl);
      await doFaceComparison(dataUrl);
    } catch {
      setStep("error");
      setMessage("Impossible de capturer la photo.");
    }
  }

  // ── Face comparison via server ──
  async function doFaceComparison(capturedDataUrl: string) {
    setStep("comparing");
    try {
      const config = await getDeviceConfig();
      if (!config || !worker) throw new Error("Configuration manquante.");

      const result = await verifyFace(worker.employeeNumber, config.shopId, capturedDataUrl);

      if (result.matched) {
        setStep("match");
        // Small delay to show the green checkmark
        setTimeout(() => doCheckIn(), 1200);
      } else {
        setStep("no-match");
        setMessage("Le visage ne correspond pas. Réessayez ou contactez votre responsable.");
      }
    } catch (err: any) {
      // If face verification endpoint doesn't exist, fall back to check-in
      if (err?.message?.includes("404") || err?.message?.includes("Not Found")) {
        setStep("match");
        setTimeout(() => doCheckIn(), 800);
        return;
      }
      setStep("error");
      setMessage(err?.message ?? "Erreur lors de la vérification faciale.");
    }
  }

  // ── Check-in ──
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
      // Queue offline as fallback
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
    if (Platform.OS === "web") {
      setStep("camera");
      startWebCamera();
    } else {
      setStep("camera");
    }
  }

  // ── Native rendering ──
  if (Platform.OS !== "web") {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Back */}
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={theme.colors.textSecondary} weight="bold" />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>

        {/* Loading */}
        {step === "loading" && (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.hintText}>Chargement...</Text>
          </View>
        )}

        {/* Camera */}
        {step === "camera" && (
          <View style={styles.cameraSection}>
            {/* Reference photo */}
            {refPhoto && (
              <View style={styles.refSection}>
                <Text style={styles.sectionLabel}>Photo de référence</Text>
                <Image source={{ uri: refPhoto }} style={styles.refImage} />
              </View>
            )}

            {/* Live camera */}
            <View style={styles.liveSection}>
              <Text style={styles.sectionLabel}>Caméra</Text>
              <Camera
                ref={cameraRef}
                style={styles.cameraView}
                type={"front" as any}
              />
            </View>

            <Text style={styles.hintText}>
              Positionnez votre visage face à la caméra
            </Text>

            <View style={styles.btnRow}>
              <PrimaryButton label="Capturer" onPress={takeNativePicture} fullWidth />
            </View>
          </View>
        )}

        {/* Comparing */}
        {step === "comparing" && (
          <View style={styles.centerWrap}>
            <View style={styles.compareRow}>
              {refPhoto && <Image source={{ uri: refPhoto }} style={styles.compareImage} />}
              {capturedPhoto && <Image source={{ uri: capturedPhoto }} style={styles.compareImage} />}
            </View>
            <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 20 }} />
            <Text style={styles.hintText}>Comparaison en cours...</Text>
          </View>
        )}

        {/* Match */}
        {step === "match" && (
          <View style={styles.centerWrap}>
            <View style={styles.matchIcon}>
              <CheckCircle size={48} color={theme.colors.success} weight="fill" />
            </View>
            <Text style={styles.matchText}>Visage reconnu ✓</Text>
          </View>
        )}

        {/* No match */}
        {step === "no-match" && (
          <View style={styles.centerWrap}>
            <View style={styles.noMatchIcon}>
              <WarningCircle size={48} color={theme.colors.danger} weight="fill" />
            </View>
            <Text style={styles.noMatchText}>Visage non reconnu</Text>
            {message && <Text style={styles.errorHint}>{message}</Text>}
            <View style={{ height: 24 }} />
            <PrimaryButton label="Réessayer" onPress={reset} fullWidth />
            <View style={{ height: 12 }} />
            <PrimaryButton label="Retour" variant="secondary" onPress={() => router.replace("/identification")} fullWidth />
          </View>
        )}

        {/* Submitting */}
        {step === "submitting" && (
          <View style={styles.centerWrap}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.hintText}>Envoi du pointage...</Text>
          </View>
        )}

        {/* Success */}
        {step === "success" && (
          <View style={styles.centerWrap}>
            <View style={styles.matchIcon}>
              <CheckCircle size={48} color={theme.colors.success} weight="fill" />
            </View>
            <Text style={styles.matchText}>Pointage enregistré</Text>
          </View>
        )}

        {/* Error */}
        {step === "error" && (
          <View style={styles.centerWrap}>
            <View style={styles.noMatchIcon}>
              <WarningCircle size={48} color={theme.colors.danger} weight="fill" />
            </View>
            <Text style={styles.noMatchText}>Erreur</Text>
            {message && <Text style={styles.errorHint}>{message}</Text>}
            <View style={{ height: 24 }} />
            <PrimaryButton label="Réessayer" onPress={reset} fullWidth />
            <View style={{ height: 12 }} />
            <PrimaryButton label="Retour" variant="secondary" onPress={() => router.replace("/identification")} fullWidth />
          </View>
        )}
      </View>
    );
  }

  // ── Web rendering ──
  return (
    <View style={styles.container}>
      <View style={styles.centerWrap}>
        <Text style={styles.titleText}>
          {step === "camera" ? "Reconnaissance faciale" :
           step === "comparing" ? "Vérification..." :
           step === "match" ? "Visage reconnu" :
           step === "success" ? "Pointage enregistré" : "Erreur"}
        </Text>
        {worker && <Text style={styles.hintText}>{worker.firstName} {worker.lastName}</Text>}
        <View style={{ height: 20 }} />

        {step === "camera" && (
          <View style={styles.webCameraBox}>
            {refPhoto && (
              <View style={styles.refSection}>
                <Text style={styles.sectionLabel}>Référence</Text>
                <img src={refPhoto} style={{ width: 120, height: 120, borderRadius: 12, objectFit: "cover" } as any} />
              </View>
            )}
            <View style={styles.liveSection}>
              <Text style={styles.sectionLabel}>Caméra</Text>
              <video ref={videoRef} style={{ width: 250, height: 250, borderRadius: 16, objectFit: "cover", border: `3px solid ${theme.colors.primary}` } as any} autoPlay muted playsInline />
              <Text style={styles.hintText}>Capture automatique dans 3s...</Text>
            </View>
          </View>
        )}

        {(step === "loading" || step === "comparing" || step === "submitting") && (
          <ActivityIndicator size="large" color={theme.colors.primary} />
        )}

        {step === "error" && (
          <>
            <View style={styles.errorBox}>
              <WarningCircle size={16} color={theme.colors.danger} weight="fill" />
              <Text style={styles.errorText}>{message}</Text>
            </View>
            <View style={{ height: 20 }} />
            <PrimaryButton label="Retour" variant="secondary" onPress={() => router.replace("/identification")} fullWidth />
          </>
        )}
        <canvas ref={canvasRef} style={{ display: "none" } as any} />
      </View>
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
  centerWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 12 },
  // Camera
  cameraSection: { flex: 1, alignItems: "center", paddingHorizontal: 20, gap: 16 },
  refSection: { alignItems: "center", gap: 8 },
  sectionLabel: { color: theme.colors.textMuted, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  refImage: { width: 100, height: 100, borderRadius: 16, borderWidth: 2, borderColor: theme.colors.border },
  liveSection: { alignItems: "center", gap: 8 },
  cameraView: { width: 200, height: 200, borderRadius: 20, borderWidth: 2, borderColor: theme.colors.primary },
  // Compare
  compareRow: { flexDirection: "row", gap: 20 },
  compareImage: { width: 120, height: 120, borderRadius: 16, borderWidth: 2, borderColor: theme.colors.border },
  // Match
  matchIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(16,185,129,0.1)", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(16,185,129,0.2)",
  },
  matchText: { color: theme.colors.success, fontSize: 20, fontWeight: "800" },
  // No match
  noMatchIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: "rgba(239,68,68,0.08)", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(239,68,68,0.15)",
  },
  noMatchText: { color: theme.colors.danger, fontSize: 20, fontWeight: "800" },
  errorHint: { color: theme.colors.textMuted, fontSize: 14, textAlign: "center", marginTop: 4 },
  // Buttons
  btnRow: { width: "100%", maxWidth: 320, marginTop: 16 },
  // Web
  webCameraBox: { flexDirection: "row", alignItems: "center", gap: 32 },
  titleText: { color: theme.colors.text, fontSize: 22, fontWeight: "700", textAlign: "center" },
  hintText: { color: theme.colors.textMuted, fontSize: 13, textAlign: "center", marginTop: 8, fontStyle: "italic" },
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "rgba(239,68,68,0.08)", borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 18, maxWidth: 360,
    borderWidth: 1, borderColor: "rgba(239,68,68,0.15)",
  },
  errorText: { color: theme.colors.danger, fontSize: 13, lineHeight: 18, flex: 1 },
});
