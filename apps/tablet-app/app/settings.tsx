import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  WarningCircle,
  WifiSlash,
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
import { fetchShops, registerDevice } from "../services/api";
import { isOnline } from "../services/network";

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [existingConfig, setExistingConfig] = useState<DeviceConfig | null>(null);
  const [deviceName, setDeviceName] = useState("");
  const [pending, setPending] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [shops, setShops] = useState<any[]>([]);
  const [shopSearch, setShopSearch] = useState("");
  const [selectedShop, setSelectedShop] = useState<any>(null);
  const [shopDropdownOpen, setShopDropdownOpen] = useState(false);
  const [loadingShops, setLoadingShops] = useState(false);
  const [shopError, setShopError] = useState("");
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    getDeviceConfig().then((config) => {
      if (config && mountedRef.current) {
        setExistingConfig(config);
        setDeviceName(config.deviceName);
        if (config.shopId && config.shopName) {
          setSelectedShop({ id: config.shopId, name: config.shopName, city: "" });
        }
      }
    });
    queueSize().then(setPending);
    return () => { mountedRef.current = false; };
  }, []);

  const loadShops = useCallback(async (search: string) => {
    setLoadingShops(true);
    setShopError("");
    try {
      const online = await isOnline();
      if (!online) {
        setShopError("Pas de connexion internet.");
        setShops([]);
        return;
      }
      const result = await fetchShops(search || undefined, 1, 50);
      setShops(result.data ?? []);
      if ((result.data ?? []).length === 0) {
        setShopError(search ? "Aucun résultat." : "Aucun point de vente actif. Créez-en un depuis le dashboard admin.");
      }
    } catch {
      setShopError("Erreur de connexion. Réessayez.");
      setShops([]);
    } finally {
      setLoadingShops(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => loadShops(shopSearch), 400);
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, [shopSearch, loadShops]);

  function handleOpenDropdown() {
    setShopDropdownOpen(true);
    setShopError("");
    if (shops.length === 0 && !loadingShops) loadShops("");
  }

  function handleSelectShop(shop: any) {
    setSelectedShop(shop);
    setShopDropdownOpen(false);
    setShopSearch("");
    setError("");
  }

  const canSave = selectedShop && deviceName.trim().length > 0 && !saving && !saved;

  async function handleSave() {
    setError("");
    if (!selectedShop) { setError("Sélectionnez un point de vente."); return; }
    if (!deviceName.trim()) { setError("Donnez un nom à cette tablette."); return; }
    setSaving(true);
    try {
      const device = await registerDevice({ name: deviceName.trim(), shopId: selectedShop.id });
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
      setError(err?.message ?? "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenContainer center={false}>
      <Pressable style={styles.backButton} onPress={() => router.replace("/")}>
        <ArrowLeft size={18} color={theme.colors.textSecondary} weight="bold" />
        <Text style={styles.backText}>Accueil</Text>
      </Pressable>

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{
            paddingTop: 56,
            paddingBottom: insets.bottom + 40,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <GearSix size={20} color={theme.colors.primary} weight="bold" />
            </View>
            <Text style={styles.title}>Configuration</Text>
            <Text style={styles.subtitle}>
              Sélectionnez un point de vente{"\n"}et donnez un nom à cette tablette.
            </Text>
          </View>

          {/* Shop selector */}
          <Text style={styles.label}>Point de vente *</Text>
          {selectedShop ? (
            <View style={styles.selectedCard}>
              <View style={styles.selectedRow}>
                <Storefront size={18} color={theme.colors.primary} weight="bold" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectedName}>{selectedShop.name}</Text>
                  {selectedShop.city ? <Text style={styles.selectedMeta}>{selectedShop.city}</Text> : null}
                </View>
              </View>
              <Pressable onPress={() => { setSelectedShop(null); setShopSearch(""); }} style={styles.clearBtn}>
                <X size={14} color={theme.colors.textSecondary} weight="bold" />
              </Pressable>
            </View>
          ) : (
            <View>
              <View style={styles.searchRow}>
                <MagnifyingGlass size={15} color={theme.colors.textMuted} weight="bold" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Rechercher un point de vente..."
                  placeholderTextColor={theme.colors.textMuted}
                  value={shopSearch}
                  onChangeText={setShopSearch}
                  onFocus={handleOpenDropdown}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {loadingShops ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
              </View>

              {shopDropdownOpen && (
                <View style={styles.dropdown}>
                  <ScrollView style={{ maxHeight: 200 }} keyboardShouldPersistTaps="handled">
                    {loadingShops && shops.length === 0 && (
                      <View style={styles.msg}><ActivityIndicator size="small" color={theme.colors.primary} /><Text style={styles.msgText}>Chargement...</Text></View>
                    )}
                    {!loadingShops && shops.map((item: any) => {
                      const sel = selectedShop?.id === item.id;
                      return (
                        <Pressable key={item.id} style={[styles.shopItem, sel && styles.shopItemSel]} onPress={() => handleSelectShop(item)}>
                          <Storefront size={14} color={sel ? theme.colors.primary : theme.colors.textMuted} weight="bold" />
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.shopName, sel && { color: theme.colors.primary }]}>{item.name}</Text>
                            {item.city ? <Text style={styles.shopMeta}>{item.city}</Text> : null}
                          </View>
                          {sel ? <CheckCircle size={16} color={theme.colors.primary} weight="fill" /> : null}
                        </Pressable>
                      );
                    })}
                    {!loadingShops && shops.length === 0 && shopError ? (
                      <View style={styles.msg}>
                        {shopError.includes("connexion") ? <WifiSlash size={14} color={theme.colors.warning} weight="bold" /> : <WarningCircle size={14} color={theme.colors.textMuted} weight="bold" />}
                        <Text style={[styles.msgText, shopError.includes("connexion") && { color: theme.colors.warning }]}>{shopError}</Text>
                      </View>
                    ) : null}
                  </ScrollView>
                  <Pressable style={styles.dropdownClose} onPress={() => setShopDropdownOpen(false)}>
                    <Text style={styles.dropdownCloseText}>Fermer</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {/* Device name */}
          <Text style={[styles.label, { marginTop: 20 }]}>Nom de la tablette *</Text>
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
          </View>

          {/* Error */}
          {error ? (
            <View style={styles.errorBox}>
              <WarningCircle size={14} color="#ef4444" weight="bold" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Save */}
          <View style={{ height: 20 }} />
          <PrimaryButton
            label={saved ? "Enregistré !" : saving ? "Enregistrement..." : existingConfig ? "Mettre à jour" : "Enregistrer"}
            onPress={handleSave}
            disabled={!canSave}
            icon={saved ? <CheckCircle size={18} color="#fff" weight="bold" /> : <FloppyDisk size={18} color="#fff" weight="bold" />}
            fullWidth
          />

          {/* Sync */}
          {existingConfig && (
            <>
              <Text style={[styles.label, { marginTop: 24 }]}>Synchronisation</Text>
              <View style={styles.card}>
                <View style={styles.syncRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.syncTitle}>File d'attente</Text>
                    <Text style={styles.syncMeta}>{pending} pointage(s) en attente</Text>
                  </View>
                  <View style={[styles.badge, pending > 0 && styles.badgeActive]}>
                    <Text style={[styles.badgeText, pending > 0 && { color: theme.colors.warning }]}>{pending}</Text>
                  </View>
                </View>
                <View style={{ height: 12 }} />
                <PrimaryButton
                  label="Synchroniser"
                  variant="secondary"
                  onPress={async () => { await flushQueue(); setPending(await queueSize()); }}
                  icon={<ArrowsClockwise size={15} color={theme.colors.textSecondary} weight="bold" />}
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
            icon={<House size={15} color={theme.colors.textSecondary} weight="bold" />}
            fullWidth
          />
        </ScrollView>
      </TouchableWithoutFeedback>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  backButton: {
    position: "absolute",
    top: 12,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 8,
    zIndex: 10,
  },
  backText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 19,
  },
  label: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  // Search
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    color: theme.colors.text,
  },
  // Dropdown
  dropdown: {
    marginTop: 6,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
  },
  shopItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  shopItemSel: {
    backgroundColor: "rgba(59,130,246,0.08)",
  },
  shopName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "500",
  },
  shopMeta: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  msg: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  msgText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    flex: 1,
  },
  dropdownClose: {
    paddingVertical: 8,
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
  },
  dropdownCloseText: {
    color: theme.colors.textMuted,
    fontSize: 12,
  },
  // Selected
  selectedCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(59,130,246,0.3)",
  },
  selectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  selectedName: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  selectedMeta: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  // Input
  input: {
    backgroundColor: theme.colors.input,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: theme.colors.text,
  },
  // Error
  errorBox: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239,68,68,0.08)",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.15)",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
    flex: 1,
  },
  // Sync
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
  syncMeta: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  badge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeActive: {
    backgroundColor: "rgba(245,158,11,0.15)",
  },
  badgeText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
});
