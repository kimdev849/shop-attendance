import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CheckInPayload } from "@shop-attendance/types";

/**
 * File d'attente locale des pointages effectués hors ligne (README §11
 * "Mode offline de la tablette"). Chaque entrée porte un `clientRequestId`
 * unique généré au moment du pointage, ce qui garantit l'idempotence côté
 * serveur lors de la synchronisation (aucun doublon, même si le même item
 * est renvoyé plusieurs fois après une coupure réseau en plein transfert).
 */
const STORAGE_KEY = "@shopattendance/attendance-queue";

export interface QueuedAttendance extends CheckInPayload {
  queuedAt: string;
}

export async function enqueueAttendance(item: QueuedAttendance): Promise<void> {
  const queue = await getQueue();
  queue.push(item);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export async function getQueue(): Promise<QueuedAttendance[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as QueuedAttendance[];
  } catch {
    return [];
  }
}

export async function removeFromQueue(clientRequestIds: string[]): Promise<void> {
  const queue = await getQueue();
  const remaining = queue.filter((item) => !clientRequestIds.includes(item.clientRequestId));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function queueSize(): Promise<number> {
  return (await getQueue()).length;
}
