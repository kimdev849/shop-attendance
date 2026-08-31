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
  UserCircle,
} from "phosphor-react-native";
import { ScreenContainer } from "../components/screen-container";
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
  const [hasSearched, setHasSearched] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(
    async (q: string) => {
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
        setError("Tablette non configurée.");
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
    : [];

  return (
    <ScreenContainer>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <ArrowLeft size={20} color={theme.colors.textMuted} weight="bold" />
        <Text style={styles.backText}>Retour</Text>
      </Pressable>

      <View style={styles.topSection}>
        {/* Icon */}
        <View style={styles.iconCircle}>
          <UserCircle size={36} color={theme.colors.primary} weight="fill" />
        </View>

        {/* Text */}
        <Text style={styles.title}>Pointage</Text>
        <Text style={styles.subtitle}>
          Tapez votre nom pour vous identifier
        </Text>

        {/* Search bar */}
        <View style={styles.searchCard}>
          <MagnifyingGlass size={18} color={theme.colors.textMuted} weight="bold" />
          <TextInput
            value={query}
            onChangeText={handleSearchChange}
            placeholder="Votre nom..."
            placeholderTextColor={theme.colors.textMuted}
            autoCapitalize="words"
            autoCorrect={false}
            autoFocus
            style={styles.searchInput}
          />
          {searching ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : query.length > 0 ? (
            <Pressable onPress={() => { setQuery(""); setResults([]); setHasSearched(false); }}>
              <Text style={styles.clearText}>✕</Text>
            </Pressable>
          ) : null}
        </View>

        {error && (
          <View style={styles.errorBox}>
            <WarningCircle size={16} color={theme.colors.danger} weight="fill" />
            <Text style={styles.error}>{error}</Text>
          </View>
        )}
      </View>

      {/* Results — only shown when searching */}
      <View style={styles.bottomSection}>
        {loading ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator color={theme.colors.primary} size="large" />
            <Text style={styles.hintText}>Recherche...</Text>
          </View>
        ) : hasSearched && displayResults.length === 0 ? (
          <View style={styles.centerWrap}>
            <Text style={styles.emptyText}>
              Aucun résultat pour « {query} »
            </Text>
            <Text style={styles.emptyHint}>
              Vérifiez l'orthographe ou demandez à l'administrateur
            </Text>
          </View>
        ) : displayResults.length > 0 ? (
          <ScrollView
            style={styles.resultsScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {displayResults.map((worker) => (
              <Pressable
                key={worker.id}
                style={styles.workerItem}
                onPress={() => handleSelectWorker(worker)}
              >
                <View style={styles.workerAvatar}>
                  <Text style={styles.workerInitials}>
                    {worker.firstName.charAt(0)}{worker.lastName.charAt(0)}
                  </Text>
                </View>
                <View style={styles.workerInfo}>
                  <Text style={styles.workerName}>
                    {worker.firstName} {worker.lastName}
                  </Text>
                  <Text style={styles.workerMatricule}>
                    {worker.employeeNumber}
                  </Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
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
  topSection: {
    alignItems: "center",
    paddingTop: 50,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
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
    marginBottom: 24,
  },
  // Search
  searchCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.input,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    gap: 10,
    width: "100%",
    maxWidth: 400,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 17,
    color: theme.colors.text,
  },
  clearText: {
    color: theme.colors.textMuted,
    fontSize: 18,
    padding: 4,
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
    width: "100%",
    maxWidth: 400,
  },
  error: {
    color: theme.colors.danger,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
  // Bottom section
  bottomSection: {
    flex: 1,
    marginTop: 20,
    width: "100%",
    maxWidth: 400,
  },
  resultsScroll: {
    flex: 1,
  },
  centerWrap: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  hintText: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  emptyHint: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },
  // Worker card
  workerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  workerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  workerInitials: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: "700",
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "600",
  },
  workerMatricule: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  arrow: {
    color: theme.colors.textMuted,
    fontSize: 22,
    fontWeight: "300",
  },
});
