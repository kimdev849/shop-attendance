import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as path from "path";

/**
 * Backend TensorFlow utilisé par @vladmandic/face-api.
 *
 * On utilise le build "node-wasm" de face-api (dist/face-api.node-wasm.js) avec
 * le backend @tensorflow/tfjs-backend-wasm : aucune compilation native requise
 * (contrairement à @tensorflow/tfjs-node qui échoue sur Render Free avec
 * "Cannot find module '@tensorflow/tfjs-node'" — ses bindings précompilés sont
 * indisponibles pour certaines plateformes et le build source dépasse les
 * ressources du plan Free).
 *
 * Note : on importe directement "dist/face-api.node-wasm.js" et non le package
 * lui-même, car son champ "main" pointe vers "dist/face-api.node.js" qui exige
 * @tensorflow/tfjs-node au premier require.
 */
type FaceApi = typeof import("@vladmandic/face-api");

/**
 * Chemins des binaires WASM de TensorFlow (fichiers .wasm).
 * En production (Render), on cherche d'abord les fichiers embarqués dans
 * node_modules (@tensorflow/tfjs-backend-wasm/dist) — aucun accès réseau
 * requis. En fallback, on laisse le backend utiliser son CDN par défaut.
 */
function resolveWasmBasePath(): string | null {
  try {
    const wasmDir = path.dirname(require.resolve("@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm-simd.wasm"));
    return `${wasmDir}/`;
  } catch {
    return null;
  }
}

/**
 * Service de reconnaissance faciale côté backend.
 * Remplace l'ancienne comparaison pixel-par-pixel (sharp) par une vraie
 * extraction de descripteurs faciaux (128 features), identique à ce que
 * fait déjà apps/admin-dashboard/lib/face-detection.ts côté navigateur.
 */
@Injectable()
export class FaceRecognitionService implements OnModuleInit {
  private readonly logger = new Logger(FaceRecognitionService.name);
  private faceapi: FaceApi | null = null;
  private modelsLoaded = false;
  private modelsLoading: Promise<void> | null = null;

  /**
   * Seuil de distance euclidienne : < 0.55 = même personne (valeur standard
   * face-api.js). Surchargeable via FACE_MATCH_THRESHOLD pour ajuster la
   * sensibilité en production (plus haut = plus tolérant).
   */
  private readonly MATCH_THRESHOLD = Number.isFinite(Number(process.env.FACE_MATCH_THRESHOLD))
    ? Number(process.env.FACE_MATCH_THRESHOLD)
    : 0.55;

  async onModuleInit() {
    // Précharge les modèles au démarrage du serveur pour éviter un délai
    // sur le premier appel de vérification.
    this.loadModels().catch((err) =>
      this.logger.error(`Échec du préchargement des modèles face-api: ${err}`),
    );
  }

  private async ensureFaceApi() {
    if (this.faceapi) return this.faceapi;

    // On n'appelle PAS env.monkeyPatch : avec le backend WASM on passe des
    // tenseurs à face-api (voir extractDescriptor), il n'a donc jamais besoin
    // d'implémentations Canvas — c'est l'approche de la démo node-wasm
    // officielle du package (@vladmandic/face-api/demo/node-wasm.js).
    // Import direct du fichier : le champ "main" du package pointe vers
    // face-api.node.js qui exige @tensorflow/tfjs-node au premier require.
    const faceapi: FaceApi = await import(
      require.resolve("@vladmandic/face-api/dist/face-api.node-wasm.js")
    );
    this.faceapi = faceapi;
    return faceapi;
  }

  async loadModels(): Promise<void> {
    if (this.modelsLoaded) return;
    if (this.modelsLoading) return this.modelsLoading;

    this.modelsLoading = (async () => {
      const faceapi = await this.ensureFaceApi();

      // Active le backend WASM de TensorFlow avant de charger les modèles.
      // L'import du module WASM enregistre le backend "wasm" ; il faut le
      // faire AVANT setBackend().
      const tf = await import("@tensorflow/tfjs");
      const wasmBackend = await import("@tensorflow/tfjs-backend-wasm");

      // Pointe le backend WASM vers les binaires embarqués dans node_modules
      // quand ils sont disponibles (pas de dépendance réseau au démarrage).
      const basePath = resolveWasmBasePath();
      if (basePath) wasmBackend.setWasmPaths(basePath);

      await tf.setBackend("wasm");
      await tf.ready();
      this.logger.log(`Backend TensorFlow actif: ${tf.getBackend()}`);

      const modelsPath = path.join(__dirname, "..", "..", "..", "models");

      await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath);
      await faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath);
      await faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath);

      this.modelsLoaded = true;
      this.logger.log("Modèles face-api chargés.");
    })();

    return this.modelsLoading;
  }

  /**
   * Extrait le descripteur facial (128 floats) d'une image base64.
   * Retourne null si aucun visage n'est détecté.
   */
  async extractDescriptor(base64Image: string): Promise<Float32Array | null> {
    await this.loadModels();
    const faceapi = await this.ensureFaceApi();
    const sharp = (await import("sharp")).default;

    const cleaned = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(cleaned, "base64");

    // sharp applique l'auto-orientation EXIF (les photos de la tablette Expo
    // gardent l'orientation en métadonnée sans l'appliquer aux pixels) puis
    // décode en pixels RGB bruts. On limite la taille pour éviter de créer
    // un tenseur géant (les photos 12 MP feraient ~150 Mo en int32).
    const { data, info } = await sharp(buffer)
      .rotate()
      .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
      .removeAlpha()
      .toColourspace("srgb")
      .raw()
      .toBuffer({ resolveWithObject: true });

    if (info.channels !== 3) {
      throw new Error(`Format d'image inattendu (${info.channels} canaux au lieu de 3).`);
    }

    // face-api consomme directement un tenseur RGB [h, w, 3] — jamais de
    // canvas (l'approche de la démo node-wasm officielle du package).
    const tf = await import("@tensorflow/tfjs");
    const input = tf.tensor(data, [info.height, info.width, 3], "int32");

    try {
      const detection = await faceapi
        // Le tenseur rank-3 est accepté au runtime (cf. démo node-wasm) mais
        // les types ne déclarent que Tensor4D.
        // @ts-expect-error - TNetInput typé Tensor4D, tenseur rank-3 accepté
        .detectSingleFace(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) return null;
      return detection.descriptor as Float32Array;
    } finally {
      input.dispose();
    }
  }

  /** Distance euclidienne entre deux descripteurs (0 = identique). */
  compareDescriptors(a: Float32Array, b: Float32Array): number {
    if (!this.faceapi) return 999;
    return this.faceapi.euclideanDistance(a, b);
  }

  isSamePerson(a: Float32Array, b: Float32Array): boolean {
    return this.compareDescriptors(a, b) < this.MATCH_THRESHOLD;
  }

  serializeDescriptor(descriptor: Float32Array): string {
    return JSON.stringify(Array.from(descriptor));
  }

  deserializeDescriptor(json: string): Float32Array {
    return new Float32Array(JSON.parse(json));
  }
}
