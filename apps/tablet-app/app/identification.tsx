import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  WarningCircle,
  ArrowLeft,
  MagnifyingGlass,
  UserCircle,
} from "phosphor-react-native";
import { ScreenContainer } from "../components/screen-container";
import { theme } from "../components/theme";
import { getDeviceConfig } from "../storage/device-config";
import {
  searchCachedRoster,
  CachedWorker,
} from "../storage/worker-cache";
import { lookupWorkerByEmployeeNumber, searchWorkersByName } from "../services/api";
import { isOnline } from "../services/network";
import { useCheckInFlow } from "../lib/flow-context";

export default function IdentificationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setWorker } = useCheckInFlow();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CachedWorker[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }
    setSearching(true);
    setError(null);
    setHasSearched(true);
    try {
      const config = await getDeviceConfig();
      if (!config) {
        setError("Tablette non configurée.");
        return;
      }
      const online = await isOnline();
      if (online) {
        const workers = await searchWorkersByName(config.shopId, q);
        setResults(workers);
      } else {
        setResults(await searchCachedRoster(q));
      }
    } catch {
      setResults(await searchCachedRoster(q));
    } finally {
      setSearching(false);
    }
  }, []);

  function handleSearchChange(text: string) {
    setQuery(text);
    setError(null);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => doSearch(text), 300);
  }

  function clearSearch() {
    setQuery("");
    setResults([]);
    setHasSearched(false);
    setError(null);
  }

  async function handleSelectWorker(worker: CachedWorker) {
    setLoading(true);
    setError(null);
    try {
      const config = await getDeviceConfig();
      if (!config) { setError("Tablette non configurée."); return; }
      const online = await isOnline();
      if (online) {
        const full = await lookupWorkerByEmployeeNumber(worker.employeeNumber, config.shopId);
        if (full) { setWorker(full); router.push("/password"); return; }
      }
      setWorker({ id: worker.id, firstName: worker.firstName, lastName: worker.lastName, employeeNumber: worker.employeeNumber });
      router.push("/password");
    } catch (err: any) {
      setError(err?.message ?? "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  const displayResults = query.trim()
    ? results.filter((w) => {
        const q = query.toLowerCase();
        return w.firstName.toLowerCase().includes(q) || w.lastName.toLowerCase().includes(q) || w.employeeNumber.toLowerCase().includes(q);
      })
    : [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color={theme.colors.textSecondary} weight="bold" />
          <Text style={styles.backText}>Retour</Text>
        </Pressable>
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.iconWrap}>
          <UserCircle size={48} color={theme.colors.primary} weight="fill" />
        </View>
        <Text style={styles.title}>Bon retour !</Text>
        <Text style={styles.subtitle}>Recherchez votre nom pour pointer</Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <MagnifyingGlass size={18} color={theme.colors.textMuted} weight="bold" />
          <TextInput
            value={query}
            onChangeText={handleSearchChange}
            placeholder="Rechercher un collaborateur..."
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="words"
            autoCorrect={false}
            autoFocus
            style={styles.searchInput}
          />
          {searching ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : query.length > 0 ? (
            <Pressable onPress={clearSearch} hitSlop={8}>
              <Text style={styles.clearBtn}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorBox}>
          <WarningCircle size={16} color="#ef4444" weight="fill" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Results */}
      <View style={styles.resultsArea}>
        {loading ? (
          <View style={styles.centerMsg}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <Text style={styles.hintText}>Recherche en cours...</Text>
          </View>
        ) : hasSearched && displayResults.length === 0 ? (
          <View style={styles.centerMsg}>
            <Text style={styles.emptyTitle}>Aucun résultat</Text>
            <Text style={styles.emptyHint}>
              Aucun collaborateur ne correspond à « {query} »{"\n"}Vérifiez l'orthographe ou contactez votre responsable.
            </Text>
          </View>
        ) : displayResults.length > 0 ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.resultCount}>
              {displayResults.length} collaborateur{displayResults.length > 1 ? "s" : ""} trouvé{displayResults.length > 1 ? "s" : ""}
            </Text>
            {displayResults.map((worker) => (
              <Pressable
                key={worker.id}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => handleSelectWorker(worker)}
                disabled={loading}
              >
                <View style={styles.avatar}>
                  <Text style={styles.initials}>
                    {worker.firstName.charAt(0)}{worker.lastName.charAt(0)}
                  </Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardName}>
                    {worker.firstName} {worker.lastName}
                  </Text>
                  <Text style={styles.cardSub}>{worker.employeeNumber}</Text>
                </View>
                <Text style={styles.cardArrow}>›</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.centerMsg}>
            <Text style={styles.hintText}>Entrez au moins 2 lettres pour lancer la recherche</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
  },
  backText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: "500",
  },
  // Hero
  hero: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 24,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primary + "12",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    color: theme.colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    marginTop: 6,
  },
  // Search
  searchWrap: {
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    height: 52,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.text,
  },
  clearBtn: {
    color: theme.colors.textMuted,
    fontSize: 18,
    padding: 4,
  },
  // Error
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: "rgba(239,68,68,0.08)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.15)",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
    flex: 1,
  },
  // Results
  resultsArea: {
    flex: 1,
    marginTop: 12,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  resultCount: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  // Card
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardPressed: {
    opacity: 0.7,
    backgroundColor: theme.colors.surfaceAlt,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: theme.colors.primary + "18",
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: "700",
  },
  cardBody: {
    flex: 1,
    marginLeft: 12,
  },
  cardName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  cardSub: {
    color: theme.colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  cardArrow: {
    color: theme.colors.textMuted,
    fontSize: 24,
    fontWeight: "300",
  },
  // Center messages
  centerMsg: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 8,
  },
  hintText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: "center",
  },
  emptyTitle: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
  emptyHint: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
