import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import * as path from "path";

/**
 * Service de reconnaissance faciale côté backend.
 * Remplace l'ancienne comparaison pixel-par-pixel (sharp) par une vraie
 * extraction de descripteurs faciaux (128 features), identique à ce que
 * fait déjà apps/admin-dashboard/lib/face-detection.ts côté navigateur.
 */
@Injectable()
export class FaceRecognitionService implements OnModuleInit {
  private readonly logger = new Logger(FaceRecognitionService.name);
  private faceapi: typeof import("@vladmandic/face-api") | null = null;
  private modelsLoaded = false;
  private modelsLoading: Promise<void> | null = null;

  /** Seuil de distance euclidienne : < 0.55 = même personne (valeur standard face-api.js) */
  private readonly MATCH_THRESHOLD = 0.55;

  async onModuleInit() {
    // Précharge les modèles au démarrage du serveur pour éviter un délai
    // sur le premier appel de vérification.
    this.loadModels().catch((err) =>
      this.logger.error(`Échec du préchargement des modèles face-api: ${err}`),
    );
  }

  private async ensureFaceApi() {
    if (this.faceapi) return this.faceapi;

    // face-api.js est prévu pour le navigateur : on lui fournit les
    // implémentations Canvas/Image/ImageData via @napi-rs/canvas (binaires
    // précompilés — pas de compilation native requise, contrairement à "canvas").
    const { Canvas, Image, ImageData } = await import("@napi-rs/canvas");
    const faceapi = await import("@vladmandic/face-api");
    // @ts-expect-error - monkeyPatch attend les types DOM du navigateur
    faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

    this.faceapi = faceapi;
    return faceapi;
  }

  async loadModels(): Promise<void> {
    if (this.modelsLoaded) return;
    if (this.modelsLoading) return this.modelsLoading;

    this.modelsLoading = (async () => {
      const faceapi = await this.ensureFaceApi();
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
    const { loadImage } = await import("@napi-rs/canvas");

    const cleaned = base64Image.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(cleaned, "base64");
    const img = await loadImage(buffer);

    const detection = await faceapi
      // @ts-expect-error - Image de "canvas" est compatible avec l'API attendue
      .detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) return null;
    return detection.descriptor as Float32Array;
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
