import { getQueue, removeFromQueue } from "../storage/attendance-queue";
import { isOnline } from "./network";
import { syncAttendanceBatch } from "./api";

export interface FlushResult {
  attempted: number;
  succeeded: number;
  failed: number;
}

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

  const queue = await getQueue();
  if (queue.length === 0) {
    return { attempted: 0, succeeded: 0, failed: 0 };
  }

  try {
    const response = await syncAttendanceBatch(queue);
    const idsToRemove = response.results
      .filter((r) => r.status === "CREATED" || r.status === "DUPLICATE")
      .map((r) => r.clientRequestId);

    await removeFromQueue(idsToRemove);

    return {
      attempted: queue.length,
      succeeded: idsToRemove.length,
      failed: queue.length - idsToRemove.length,
    };
  } catch {
    // Le serveur est injoignable malgré une connectivité réseau détectée
    // (ex: API down). On conserve toute la file pour réessayer plus tard.
    return { attempted: queue.length, succeeded: 0, failed: queue.length };
  }
}
