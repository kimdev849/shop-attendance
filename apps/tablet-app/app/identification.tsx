import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  User,
  WarningCircle,
  ArrowLeft,
  MagnifyingGlass,
  CheckCircle,
} from "phosphor-react-native";
import { ScreenContainer } from "../components/screen-container";
import { PrimaryButton } from "../components/primary-button";
import { theme } from "../components/theme";
import { getDeviceConfig } from "../storage/device-config";
import {
  findInCachedRoster,
  searchCachedRoster,
  CachedWorker,
} from "../storage/worker-cache";
import { lookupWorkerByEmployeeNumber, searchWorkersByName } from "../services/api";
import { isOnline } from "../services/network";
import { useCheckInFlow } from "./flow-context";

export default function IdentificationScreen() {
  const router = useRouter();
  const { setWorker } = useCheckInFlow();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CachedWorker[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load full roster on mount for offline search
  useEffect(() => {
    (async () => {
      const cached = await searchCachedRoster("");
      setResults(cached);
    })();
  }, []);

  const doSearch = useCallback(
    async (q: string) => {
      setSearching(true);
      setError(null);
      try {
        const config = await getDeviceConfig();
        if (!config) {
          setError("Tablette non configurée. Contactez votre administrateur.");
          return;
        }
        const online = await isOnline();
        if (online) {
          const workers = await searchWorkersByName(config.shopId, q);
          setResults(workers);
        } else {
          const filtered = await searchCachedRoster(q);
          setResults(filtered);
        }
      } catch {
        // Fallback to cache
        const filtered = await searchCachedRoster(q);
        setResults(filtered);
      } finally {
        setSearching(false);
      }
    },
    [],
  );

  function handleSearchChange(text: string) {
    setQuery(text);
    setError(null);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => doSearch(text), 300);
  }

  async function handleSelectWorker(worker: CachedWorker) {
    setLoading(true);
    setError(null);
    try {
      const config = await getDeviceConfig();
      if (!config) {
        setError("Tablette non configurée. Contactez votre administrateur.");
        return;
      }

      const online = await isOnline();
      if (online) {
        const fullWorker = await lookupWorkerByEmployeeNumber(
          worker.employeeNumber,
          config.shopId,
        );
        if (fullWorker) {
          setWorker(fullWorker);
          router.push("/password");
          return;
        }
      }

      // Offline fallback: use cached worker data
      setWorker({
        id: worker.id,
        firstName: worker.firstName,
        lastName: worker.lastName,
        employeeNumber: worker.employeeNumber,
      });
      router.push("/password");
    } catch (err: any) {
      setError(err?.message ?? "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  const displayResults = query.trim()
    ? results.filter(
        (w) =>
          w.firstName.toLowerCase().includes(query.toLowerCase()) ||
          w.lastName.toLowerCase().includes(query.toLowerCase()) ||
          w.employeeNumber.toLowerCase().includes(query.toLowerCase()),
      )
    : results;

  return (
    <ScreenContainer>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <ArrowLeft size={20} color={theme.colors.textMuted} weight="bold" />
        <Text style={styles.backText}>Retour</Text>
      </Pressable>

      <View style={styles.iconCircle}>
        <User size={30} color={theme.colors.primaryLight} weight="bold" />
      </View>

      <Text style={styles.title}>Qui êtes-vous ?</Text>
      <Text style={styles.subtitle}>
        Recherchez votre nom pour commencer
      </Text>

      <View style={{ height: 20 }} />

      {/* Search input */}
      <View style={styles.searchCard}>
        <MagnifyingGlass size={18} color={theme.colors.textMuted} weight="bold" />
        <TextInput
          value={query}
          onChangeText={handleSearchChange}
          placeholder="Rechercher par nom..."
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="words"
          autoCorrect={false}
          autoFocus
          style={styles.searchInput}
        />
        {searching ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : null}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <WarningCircle size={16} color={theme.colors.danger} weight="fill" />
          <Text style={styles.error}>{error}</Text>
        </View>
      )}

      {/* Results list */}
      <View style={styles.resultsContainer}>
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <Text style={styles.loadingText}>Recherche en cours...</Text>
          </View>
        ) : displayResults.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>
              {query.trim()
                ? "Aucun travailleur trouvé pour cette recherche."
                : "Aucun travailleur dans ce shop."}
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.resultsScroll}
            keyboardShouldPersistTaps="handled"
          >
            {displayResults.map((worker) => (
              <Pressable
                key={worker.id}
                style={styles.workerItem}
                onPress={() => handleSelectWorker(worker)}
              >
                <View style={styles.workerAvatar}>
                  <Text style={styles.workerInitials}>
                    {worker.firstName.charAt(0)}
                    {worker.lastName.charAt(0)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.workerName}>
                    {worker.firstName} {worker.lastName}
                  </Text>
                  <Text style={styles.workerMatricule}>
                    {worker.employeeNumber}
                  </Text>
                </View>
                <CheckCircle size={18} color={theme.colors.textMuted} weight="bold" />
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: "absolute",
    top: 16,
    left: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 8,
    zIndex: 10,
  },
  backText: {
    color: theme.colors.textMuted,
    fontSize: 14,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    color: theme.colors.text,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
  },
  // Search
  searchCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.input,
    borderRadius: theme.radius,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: theme.colors.text,
  },
  // Results
  resultsContainer: {
    flex: 1,
    marginTop: 16,
  },
  resultsScroll: {
    flex: 1,
  },
  workerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  workerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  workerInitials: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  workerName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  workerMatricule: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  // Error
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    backgroundColor: "rgba(239,68,68,0.08)",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.15)",
  },
  error: {
    color: theme.colors.danger,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  loadingWrap: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 40,
  },
  loadingText: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  emptyWrap: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    textAlign: "center",
  },
});
