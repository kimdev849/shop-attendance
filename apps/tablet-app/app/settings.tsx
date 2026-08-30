import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import {
  GearSix,
  FloppyDisk,
  ArrowsClockwise,
  House,
  DeviceMobile,
  ArrowLeft,
  MagnifyingGlass,
  CheckCircle,
  Storefront,
  X,
} from "phosphor-react-native";
import { ScreenContainer } from "../components/screen-container";
import { PrimaryButton } from "../components/primary-button";
import { theme } from "../components/theme";
import {
  getDeviceConfig,
  setDeviceConfig,
  DeviceConfig,
} from "../storage/device-config";
import { queueSize } from "../storage/attendance-queue";
import { flushQueue } from "../services/sync-manager";
import { fetchShops, registerDevice, ShopSummary } from "../services/api";

export default function SettingsScreen() {
  const router = useRouter();

  // ── Device config state ────────────────────────────────────────
  const [existingConfig, setExistingConfig] = useState<DeviceConfig | null>(null);
  const [deviceName, setDeviceName] = useState("");
  const [pending, setPending] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ── Shop selector state ────────────────────────────────────────
  const [shops, setShops] = useState<ShopSummary[]>([]);
  const [shopSearch, setShopSearch] = useState("");
  const [selectedShop, setSelectedShop] = useState<ShopSummary | null>(null);
  const [shopDropdownOpen, setShopDropdownOpen] = useState(false);
  const [loadingShops, setLoadingShops] = useState(false);
  const [shopPage, setShopPage] = useState(1);
  const [hasMoreShops, setHasMoreShops] = useState(true);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load existing config on mount
  useEffect(() => {
    getDeviceConfig().then((config) => {
      if (config) {
        setExistingConfig(config);
        setDeviceName(config.deviceName);
        // Restore selected shop if available
        if (config.shopId && config.shopName) {
          setSelectedShop({
            id: config.shopId,
            name: config.shopName,
            code: "",
            status: "ACTIVE",
          });
        }
      }
    });
    queueSize().then(setPending);
  }, []);

  // ── Shop search ────────────────────────────────────────────────

  const loadShops = useCallback(async (search: string, page: number, append = false) => {
    setLoadingShops(true);
    try {
      const result = await fetchShops(search || undefined, page, 30);
      if (append) {
        setShops((prev) => [...prev, ...result.data]);
      } else {
        setShops(result.data);
      }
      setHasMoreShops(page < result.totalPages);
    } catch {
      // Silently fail — user can retry
    } finally {
      setLoadingShops(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadShops("", 1);
  }, [loadShops]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setShopPage(1);
      loadShops(shopSearch, 1);
    }, 400);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [shopSearch, loadShops]);

  function handleSelectShop(shop: ShopSummary) {
    setSelectedShop(shop);
    setShopDropdownOpen(false);
    setShopSearch("");
    setError("");
  }

  function handleClearShop() {
    setSelectedShop(null);
    setShopSearch("");
  }

  function loadMoreShops() {
    if (loadingShops || !hasMoreShops) return;
    const nextPage = shopPage + 1;
    setShopPage(nextPage);
    loadShops(shopSearch, nextPage, true);
  }

  // ── Save ───────────────────────────────────────────────────────

  async function handleSave() {
    setError("");

    if (!selectedShop) {
      setError("Veuillez sélectionner un shop.");
      return;
    }
    if (!deviceName.trim()) {
      setError("Veuillez entrer un nom pour cette tablette.");
      return;
    }

    setSaving(true);
    try {
      // Register device with the server (auto-generates deviceIdentifier)
      const device = await registerDevice({
        name: deviceName.trim(),
        shopId: selectedShop.id,
      });

      // Save config locally
      const config: DeviceConfig = {
        apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "https://shop-attendance-api.onrender.com",
        shopId: selectedShop.id,
        deviceId: device.deviceIdentifier,
        deviceName: deviceName.trim(),
        shopName: selectedShop.name,
      };
      await setDeviceConfig(config);
      setExistingConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err?.message ?? "Erreur lors de l'enregistrement. Vérifiez votre connexion.");
    } finally {
      setSaving(false);
    }
  }

  // ── Render shop item ──────────────────────────────────────────

  function renderShopItem({ item }: { item: ShopSummary }) {
    const isSelected = selectedShop?.id === item.id;
    return (
      <Pressable
        style={[styles.shopItem, isSelected && styles.shopItemSelected]}
        onPress={() => handleSelectShop(item)}
      >
        <View style={styles.shopItemLeft}>
          <Storefront size={16} color={isSelected ? theme.colors.primary : theme.colors.textMuted} weight="bold" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.shopItemName, isSelected && styles.shopItemNameSelected]}>
              {item.name}
            </Text>
            {item.city && (
              <Text style={styles.shopItemCity}>{item.city}</Text>
            )}
          </View>
        </View>
        {isSelected && (
          <CheckCircle size={18} color={theme.colors.primary} weight="fill" />
        )}
      </Pressable>
    );
  }

  return (
    <ScreenContainer>
      <Pressable style={styles.backButton} onPress={() => router.replace("/")}>
        <ArrowLeft size={20} color={theme.colors.textMuted} weight="bold" />
        <Text style={styles.backText}>Accueil</Text>
      </Pressable>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <FlatList
          data={[]}
          renderItem={null}
          keyExtractor={() => "empty"}
          ListHeaderComponent={
            <View style={styles.inner}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.iconCircle}>
                  <GearSix size={22} color={theme.colors.primaryLight} weight="bold" />
                </View>
                <Text style={styles.title}>Configuration</Text>
                <Text style={styles.subtitle}>
                  Sélectionnez le shop et donnez un nom à cette tablette.{"\n"}
                  L'identifiant est automatiquement généré.
                </Text>
              </View>

              {/* ── Shop selector ─────────────────────────────── */}
              <View style={styles.sectionLabel}>
                <Storefront size={14} color={theme.colors.textMuted} weight="bold" />
                <Text style={styles.sectionLabelText}>Point de vente</Text>
              </View>

              <View style={styles.card}>
                {selectedShop ? (
                  <View style={styles.selectedShopCard}>
                    <View style={styles.selectedShopInfo}>
                      <Storefront size={20} color={theme.colors.primary} weight="bold" />
                      <View>
                        <Text style={styles.selectedShopName}>{selectedShop.name}</Text>
                        {selectedShop.city && (
                          <Text style={styles.selectedShopCity}>{selectedShop.city}</Text>
                        )}
                      </View>
                    </View>
                    <Pressable onPress={handleClearShop} style={styles.clearButton}>
                      <X size={16} color={theme.colors.textMuted} weight="bold" />
                    </Pressable>
                  </View>
                ) : (
                  <>
                    {/* Search input */}
                    <View style={styles.searchRow}>
                      <MagnifyingGlass size={16} color={theme.colors.textMuted} weight="bold" />
                      <TextInput
                        style={styles.searchInput}
                        placeholder="Rechercher un shop..."
                        placeholderTextColor={theme.colors.textMuted}
                        value={shopSearch}
                        onChangeText={setShopSearch}
                        onFocus={() => setShopDropdownOpen(true)}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>

                    {/* Dropdown */}
                    {shopDropdownOpen && (
                      <View style={styles.dropdown}>
                        <FlatList
                          data={shops}
                          renderItem={renderShopItem}
                          keyExtractor={(item) => item.id}
                          style={styles.dropdownList}
                          keyboardShouldPersistTaps="handled"
                          ListEmptyComponent={
                            loadingShops ? (
                              <View style={styles.dropdownLoading}>
                                <ActivityIndicator size="small" color={theme.colors.primary} />
                                <Text style={styles.dropdownLoadingText}>Chargement...</Text>
                              </View>
                            ) : (
                              <Text style={styles.dropdownEmpty}>Aucun shop trouvé</Text>
                            )
                          }
                          ListFooterComponent={
                            hasMoreShops && shops.length > 0 ? (
                              <Pressable onPress={loadMoreShops} style={styles.loadMoreBtn}>
                                {loadingShops ? (
                                  <ActivityIndicator size="small" color={theme.colors.primary} />
                                ) : (
                                  <Text style={styles.loadMoreText}>Charger plus</Text>
                                )}
                              </Pressable>
                            ) : null
                          }
                          onEndReached={loadMoreShops}
                          onEndReachedThreshold={0.5}
                        />
                        <Pressable
                          style={styles.dropdownClose}
                          onPress={() => setShopDropdownOpen(false)}
                        >
                          <Text style={styles.dropdownCloseText}>Fermer</Text>
                        </Pressable>
                      </View>
                    )}
                  </>
                )}
              </View>

              {/* ── Device name ───────────────────────────────── */}
              <View style={[styles.sectionLabel, { marginTop: 20 }]}>
                <DeviceMobile size={14} color={theme.colors.textMuted} weight="bold" />
                <Text style={styles.sectionLabelText}>Nom de la tablette</Text>
              </View>

              <View style={styles.card}>
                <TextInput
                  style={styles.input}
                  value={deviceName}
                  onChangeText={(t) => { setDeviceName(t); setError(""); }}
                  placeholder="Ex: Tablette Caisse 1"
                  placeholderTextColor={theme.colors.textMuted}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
                <Text style={styles.fieldHint}>
                  Un nom unique pour identifier cette tablette
                </Text>
              </View>

              {/* ── Error ─────────────────────────────────────── */}
              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {/* ── Save button ───────────────────────────────── */}
              <View style={{ height: 20 }} />
              <PrimaryButton
                label={saved ? "Enregistré !" : saving ? "Enregistrement..." : existingConfig ? "Mettre à jour" : "Enregistrer"}
                onPress={handleSave}
                disabled={saving || saved}
                icon={saved ? <CheckCircle size={18} color="#fff" weight="bold" /> : <FloppyDisk size={18} color="#fff" weight="bold" />}
                fullWidth
              />

              {/* ── Sync section ──────────────────────────────── */}
              {existingConfig && (
                <>
                  <View style={[styles.sectionLabel, { marginTop: 24 }]}>
                    <ArrowsClockwise size={14} color={theme.colors.textMuted} weight="bold" />
                    <Text style={styles.sectionLabelText}>Synchronisation</Text>
                  </View>

                  <View style={styles.card}>
                    <View style={styles.syncRow}>
                      <View>
                        <Text style={styles.syncTitle}>File d'attente</Text>
                        <Text style={styles.syncSubtitle}>
                          {pending} pointage(s) en attente
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.syncBadge,
                          pending > 0 && styles.syncBadgeActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.syncBadgeText,
                            pending > 0 && styles.syncBadgeTextActive,
                          ]}
                        >
                          {pending}
                        </Text>
                      </View>
                    </View>
                    <View style={{ height: 12 }} />
                    <PrimaryButton
                      label="Synchroniser maintenant"
                      variant="secondary"
                      onPress={async () => {
                        await flushQueue();
                        setPending(await queueSize());
                      }}
                      icon={
                        <ArrowsClockwise size={16} color={theme.colors.textSecondary} weight="bold" />
                      }
                      fullWidth
                    />
                  </View>
                </>
              )}

              <View style={{ height: 16 }} />
              <PrimaryButton
                label="Retour à l'accueil"
                variant="secondary"
                onPress={() => router.replace("/")}
                icon={
                  <House size={16} color={theme.colors.textSecondary} weight="bold" />
                }
                fullWidth
              />

              <View style={{ height: 40 }} />
            </View>
          }
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      </TouchableWithoutFeedback>
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
  inner: {
    width: "100%",
    maxWidth: 420,
    paddingTop: 50,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },
  title: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    marginLeft: 4,
  },
  sectionLabelText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow,
  },
  // ── Shop selector ──────────────────────────────
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.input,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: theme.colors.text,
  },
  dropdown: {
    marginTop: 8,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxHeight: 240,
    overflow: "hidden",
  },
  dropdownList: {
    maxHeight: 200,
  },
  shopItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  shopItemSelected: {
    backgroundColor: `${theme.colors.primary}15`,
  },
  shopItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  shopItemName: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  shopItemNameSelected: {
    color: theme.colors.primary,
    fontWeight: "600",
  },
  shopItemCity: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  dropdownLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  dropdownLoadingText: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  dropdownEmpty: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 16,
  },
  loadMoreBtn: {
    paddingVertical: 10,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  loadMoreText: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: "600",
  },
  dropdownClose: {
    paddingVertical: 10,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  dropdownCloseText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "500",
  },
  // ── Selected shop ──────────────────────────────
  selectedShopCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: `${theme.colors.primary}10`,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: `${theme.colors.primary}30`,
  },
  selectedShopInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  selectedShopName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  selectedShopCity: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  // ── Input ──────────────────────────────────────
  input: {
    backgroundColor: theme.colors.input,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: theme.colors.text,
  },
  fieldHint: {
    color: theme.colors.textMuted,
    fontSize: 11,
    marginTop: 6,
  },
  // ── Error ──────────────────────────────────────
  errorBox: {
    marginTop: 12,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.2)",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
    textAlign: "center",
  },
  // ── Sync ───────────────────────────────────────
  syncRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  syncTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  syncSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  syncBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  syncBadgeActive: {
    backgroundColor: "rgba(245,158,11,0.15)",
    borderColor: "rgba(245,158,11,0.3)",
  },
  syncBadgeText: {
    color: theme.colors.textMuted,
    fontSize: 14,
    fontWeight: "700",
  },
  syncBadgeTextActive: {
    color: theme.colors.warning,
  },
});
