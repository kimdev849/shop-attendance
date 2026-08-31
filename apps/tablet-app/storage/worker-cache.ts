import AsyncStorage from "@react-native-async-storage/async-storage";

export interface CachedWorker {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
}

const STORAGE_KEY = "@shopattendance/worker-roster-cache";

/**
 * Cache local du roster des travailleurs actifs du shop. Rafraîchi
 * opportunément quand la tablette est en ligne (voir app/_layout.tsx) afin
 * que l'écran d'identification puisse résoudre un matricule -> workerId
 * MÊME hors connexion, plutôt que de bloquer le pointage (README §11).
 */
export async function setCachedRoster(workers: CachedWorker[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ workers, cachedAt: new Date().toISOString() }));
}

export async function getCachedRoster(): Promise<CachedWorker[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw).workers ?? [];
  } catch {
    return [];
  }
}

export async function findInCachedRoster(employeeNumber: string): Promise<CachedWorker | null> {
  const roster = await getCachedRoster();
  return roster.find((w) => w.employeeNumber === employeeNumber) ?? null;
}

/**
 * Search cached roster by name (first name or last name).
 * Returns matching workers for offline search.
 */
export async function searchCachedRoster(query: string): Promise<CachedWorker[]> {
  const roster = await getCachedRoster();
  const q = query.toLowerCase().trim();
  if (!q) return roster;
  return roster.filter(
    (w) =>
      w.firstName.toLowerCase().includes(q) ||
      w.lastName.toLowerCase().includes(q) ||
      w.employeeNumber.toLowerCase().includes(q),
  );
}
