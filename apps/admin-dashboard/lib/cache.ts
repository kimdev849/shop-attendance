/**
 * Cache léger côté client pour les appels API.
 * Évite de re-fetch les mêmes données à chaque navigation.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();
const DEFAULT_TTL = 30_000; // 30 secondes

/**
 * Récupère des données avec cache automatique.
 * Si les données sont en cache et < TTL, les retourne directement.
 * Sinon fait l'appel API et met en cache.
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = DEFAULT_TTL,
): Promise<T> {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < ttl) {
    return entry.data as T;
  }

  const data = await fetcher();
  cache.set(key, { data, timestamp: Date.now() });
  return data;
}

/** Invalide un ou plusieurs caches par préfixe. */
export function invalidateCache(...prefixes: string[]) {
  for (const [key] of cache) {
    if (prefixes.some((p) => key.startsWith(p))) {
      cache.delete(key);
    }
  }
}

/** Vide tout le cache. */
export function clearCache() {
  cache.clear();
}
