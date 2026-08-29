/**
 * Utilitaire de détection faciale basé sur @vladmandic/face-api.
 * Charge les modèles et extrait des descripteurs faciaux (128 features).
 * 
 * IMPORTANT: Ce module est lazy-loaded côté client uniquement.
 * Ne jamais l'importer directement dans un composant — utiliser dynamic import.
 */

let faceapi: typeof import("@vladmandic/face-api") | null = null;
let modelsLoaded = false;

async function ensureFaceApi() {
  if (faceapi) return faceapi;
  faceapi = await import("@vladmandic/face-api");
  return faceapi;
}

/** Charge les modèles face-api.js (une seule fois). */
export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  const fapi = await ensureFaceApi();
  await fapi.nets.ssdMobilenetv1.loadFromUri("/models");
  await fapi.nets.faceLandmark68Net.loadFromUri("/models");
  await fapi.nets.faceRecognitionNet.loadFromUri("/models");
  modelsLoaded = true;
}

/**
 * Extrait le descripteur facial d'une image.
 * Retourne un Float32Array de 128 floats, ou null si aucun visage détecté.
 */
export async function extractFaceDescriptor(
  input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
): Promise<Float32Array | null> {
  await loadFaceModels();
  const fapi = await ensureFaceApi();

  const detection = await fapi
    .detectSingleFace(input, new fapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) return null;
  return detection.descriptor as Float32Array;
}

/** Compare deux descripteurs — retourne la distance (0=identique, 2=différent). */
export function compareDescriptors(a: Float32Array, b: Float32Array): number {
  if (!faceapi) return 999;
  return faceapi.euclideanDistance(a, b);
}

/** Vérifie si deux visages sont la même personne (seuil: 0.55). */
export function isSamePerson(d1: Float32Array, d2: Float32Array, threshold = 0.55): boolean {
  return compareDescriptors(d1, d2) < threshold;
}

/** Serialise un Float32Array en JSON string pour stockage en base. */
export function serializeDescriptor(descriptor: Float32Array): string {
  return JSON.stringify(Array.from(descriptor));
}

/** Déséserialize un JSON string en Float32Array. */
export function deserializeDescriptor(json: string): Float32Array {
  return new Float32Array(JSON.parse(json));
}
