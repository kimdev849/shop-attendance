import { getQueue, removeFromQueue } from "../storage/attendance-queue";
import { isOnline } from "./network";
import { syncAttendanceBatch } from "./api";
import type { SyncAttendanceResult } from "@shop-attendance/types";

export interface FlushResult {
  attempted: number;
  succeeded: number;
  failed: number;
}

const MAX_BATCHES_PER_FLUSH = 10;

/**
 * Vide la file d'attente locale vers le serveur (README §11 "Mode offline").
 * Ne retire de la file QUE les éléments confirmés CREATED ou DUPLICATE par
 * le serveur — un item ERROR reste en file pour une prochaine tentative, ce
 * qui rend la synchronisation résiliente aux coupures partielles.
 */
export async function flushQueue(): Promise<FlushResult> {
  const online = await isOnline();
  if (!online) {
    return { attempted: 0, succeeded: 0, failed: 0 };
  }

  // Garde-fou anti-boucle : en cas d'erreur persistante (ex: 4xx sur le
  // batch entier), on plafonne le nombre de passages par flush.
  let totalAttempted = 0;
  let totalSucceeded = 0;
  let totalFailed = 0;
  let lastKnownError: string | null = null;

  for (let round = 0; round < MAX_BATCHES_PER_FLUSH; round++) {
    const queue = await getQueue();
    if (queue.length === 0) break;

    // ⚠️ L'API valide chaque item avec CheckInDto + forbidNonWhitelisted:true :
    // un champ inconnu comme queuedAt fait rejeter TOUT le batch en 400. On
    // n'envoie que les champs du DTO.
    const items = queue.map(({ queuedAt: _q, ...payload }) => payload);

    let results: SyncAttendanceResult[];
    try {
      const response = await syncAttendanceBatch(items);
      // L'API renvoie un tableau nu ; on tolère aussi la forme { results }.
      results = Array.isArray(response) ? response : (response?.results ?? []);
      if (!Array.isArray(results)) throw new Error("Réponse de sync invalide.");
    } catch (err: any) {
      // Serveur injoignable malgré une connectivité détectée (API down,
      // cold start Render) : on conserve toute la file pour retenter plus tard.
      lastKnownError = err?.message ?? "Serveur injoignable";
      totalFailed += queue.length;
      break;
    }

    const idsToRemove = results
      .filter((r) => r.status === "CREATED" || r.status === "DUPLICATE")
      .map((r) => r.clientRequestId);

    if (idsToRemove.length > 0) {
      await removeFromQueue(idsToRemove);
    }

    totalAttempted += queue.length;
    totalSucceeded += idsToRemove.length;
    totalFailed += queue.length - idsToRemove.length;

    // Tous les items ont été traités → rien à retenter dans ce flush.
    if (idsToRemove.length === queue.length) break;
    // Certains items sont en ERROR (données) : ils resteraient en tête de file
    // indéfiniment, inutile de re-poster le même batch dans ce flush.
    break;
  }

  if (totalFailed > 0 && lastKnownError) {
    console.warn(`[sync] flush incomplet: ${totalFailed} item(s), cause: ${lastKnownError}`);
  }

  return { attempted: totalAttempted, succeeded: totalSucceeded, failed: totalFailed };
}
