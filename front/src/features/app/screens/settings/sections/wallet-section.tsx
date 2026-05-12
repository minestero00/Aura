import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomSheetModal } from "@features/app/components/bottom-sheet-modal";
import { SettingsSubpageHeader } from "@features/app/screens/settings/shared";
import type { SettingsSectionProps } from "@features/app/screens/settings/sections/section-props";
import { getCurrentAccessToken } from "@lib/supabase/client";
import { ApiError } from "@lib/api/client";
import { launchImageLibrary } from "react-native-image-picker";
import {
  createCoupon,
  deleteCoupon,
  extractCouponFromImageText,
  fetchCoupons,
  revealCouponCode,
  updateCoupon
} from "@features/wallet/api";
import { CouponCodeRenderer } from "@features/wallet/components/coupon-code-renderer";
import { CouponGeofencePicker } from "@features/wallet/components/coupon-geofence-picker";
import { extractTextFromImage, isNativeOcrAvailable } from "@features/wallet/native-ocr";
import type { CodeFormat, Coupon, CouponGeofence, CouponStatus } from "@features/wallet/types";
import { useAuraTheme } from "@features/app/styles";

const FILTER_ORDER: Array<CouponStatus | "all"> = ["active", "expiring_soon", "all"];

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return null;
  const diff = ts - Date.now();
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseExpiryInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return null;
  const d = new Date(`${trimmed}T23:59:59`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function WalletSection(props: SettingsSectionProps) {
  const { styles, copy, onSelectSettingsSection } = props;
  const theme = useAuraTheme();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<CouponStatus | "all">("active");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [detailCoupon, setDetailCoupon] = useState<Coupon | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getCurrentAccessToken();
      if (!token) {
        setCoupons([]);
        return;
      }
      const list = await fetchCoupons(token, filter);
      setCoupons(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.wallet.errorLoad);
    } finally {
      setIsLoading(false);
    }
  }, [filter, copy.wallet.errorLoad]);

  useEffect(() => {
    void load();
  }, [load]);

  function statusLabel(status: CouponStatus): string {
    switch (status) {
      case "expiring_soon":
        return copy.wallet.statusExpiring;
      case "expired":
        return copy.wallet.statusExpired;
      case "used":
        return copy.wallet.statusUsed;
      case "active":
      default:
        return copy.wallet.statusActive;
    }
  }

  function filterLabel(key: CouponStatus | "all"): string {
    if (key === "expiring_soon") return copy.wallet.filterExpiring;
    if (key === "all") return copy.wallet.filterAll;
    return copy.wallet.filterActive;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.settingsScreen}>
        <SettingsSubpageHeader
          styles={styles}
          title={copy.wallet.title}
          subtitle={copy.wallet.subtitle}
          onSelectSettingsSection={onSelectSettingsSection}
        />
        <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={localStyles.filterRow}
          >
            {FILTER_ORDER.map(key => {
              const isActive = filter === key;
              return (
                <Pressable
                  key={`wallet-filter-${key}`}
                  onPress={() => setFilter(key)}
                  style={[
                    localStyles.filterChip,
                    {
                      backgroundColor: isActive ? theme.colors.accent : theme.colors.surfaceMuted
                    }
                  ]}
                >
                  <Text
                    style={[
                      localStyles.filterChipText,
                      { color: isActive ? theme.colors.accentText : theme.colors.textSecondary }
                    ]}
                  >
                    {filterLabel(key)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {error ? (
            <View style={styles.warningCard}>
              <Text style={styles.warningText}>{error}</Text>
            </View>
          ) : null}

          {isLoading ? (
            <View style={styles.sectionCard}>
              <ActivityIndicator color={theme.colors.accent} />
            </View>
          ) : coupons.length === 0 ? (
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{copy.wallet.empty}</Text>
              <Text style={styles.helperText}>{copy.wallet.emptyHint}</Text>
            </View>
          ) : (
            coupons.map(coupon => {
              const daysLeft = daysUntil(coupon.expiresAt);
              return (
                <Pressable
                  key={coupon.id}
                  onPress={() => setDetailCoupon(coupon)}
                  style={styles.sectionCard}
                >
                  <View style={localStyles.cardHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.messageMeta}>{coupon.brand}</Text>
                      <Text style={styles.messageSubject}>{coupon.title}</Text>
                    </View>
                    <View style={localStyles.cardBadgeCol}>
                      <Text style={[localStyles.cardBadge, { color: theme.colors.textMuted }]}>
                        {statusLabel(coupon.status)}
                      </Text>
                      {daysLeft !== null && coupon.status !== "used" ? (
                        <Text
                          style={[
                            localStyles.cardBadge,
                            {
                              color:
                                daysLeft <= 0
                                  ? theme.colors.dangerText
                                  : daysLeft <= 3
                                  ? theme.colors.dangerText
                                  : theme.colors.textPrimary
                            }
                          ]}
                        >
                          {copy.wallet.daysLeft(daysLeft)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  {coupon.geofence?.placeName ? (
                    <Text style={styles.helperText}>
                      {copy.wallet.geofenceSavedAt(coupon.geofence.placeName)}
                    </Text>
                  ) : null}
                  {coupon.expiresAt ? (
                    <Text style={styles.messageMeta}>
                      {copy.wallet.expiresLabel(formatDate(coupon.expiresAt))}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })
          )}

          <Pressable onPress={() => setIsAddOpen(true)} style={[styles.primaryButton, { marginTop: 18 }]}>
            <Text style={styles.primaryButtonText}>{copy.wallet.addButton}</Text>
          </Pressable>
        </ScrollView>
      </View>

      <AddCouponModal
        visible={isAddOpen}
        styles={styles}
        copy={copy}
        onClose={() => setIsAddOpen(false)}
        onCreated={() => {
          setIsAddOpen(false);
          void load();
        }}
      />

      {detailCoupon ? (
        <CouponDetailModal
          coupon={detailCoupon}
          styles={styles}
          copy={copy}
          onClose={() => setDetailCoupon(null)}
          onChanged={() => {
            setDetailCoupon(null);
            void load();
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

interface AddCouponModalProps {
  visible: boolean;
  styles: SettingsSectionProps["styles"];
  copy: SettingsSectionProps["copy"];
  onClose: () => void;
  onCreated: () => void;
}

function AddCouponModal({ visible, styles, copy, onClose, onCreated }: AddCouponModalProps) {
  const theme = useAuraTheme();
  const [brand, setBrand] = useState("");
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [codeFormat, setCodeFormat] = useState<CodeFormat>("text_only");
  const [expires, setExpires] = useState("");
  const [notes, setNotes] = useState("");
  const [geofence, setGeofence] = useState<CouponGeofence | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [imageBusy, setImageBusy] = useState<null | "picking" | "ocr">(null);
  // 원본 이미지 base64를 저장 시 createCoupon에 첨부. 풀스크린에서 그대로 표시.
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string | null>(null);

  async function handleExtractFromImage() {
    if (!isNativeOcrAvailable()) {
      setFormError(copy.wallet.ocrUnavailable);
      return;
    }
    setFormError(null);
    setImageBusy("picking");
    let imageUri: string | null = null;
    let pickedBase64: string | null = null;
    let pickedMime: string | null = null;
    try {
      const picked = await launchImageLibrary({
        mediaType: "photo",
        selectionLimit: 1,
        includeBase64: true
      });
      if (picked.didCancel) {
        setImageBusy(null);
        return;
      }
      const asset = picked.assets?.[0];
      imageUri = asset?.uri ?? null;
      pickedBase64 = asset?.base64 ?? null;
      pickedMime = asset?.type ?? "image/png";
    } catch {
      setFormError(copy.wallet.ocrFailed);
      setImageBusy(null);
      return;
    }
    if (!imageUri) {
      setImageBusy(null);
      return;
    }

    // 원본 이미지 보존 — 저장 시 createCoupon에 첨부됨.
    setImageBase64(pickedBase64);
    setImageMime(pickedMime);

    setImageBusy("ocr");
    try {
      const ocr = await extractTextFromImage(imageUri);
      if (!ocr || ocr.fullText.trim().length === 0) {
        setFormError(copy.wallet.ocrFailed);
        return;
      }
      const accessToken = await getCurrentAccessToken();
      if (!accessToken) return;
      const candidate = await extractCouponFromImageText(accessToken, ocr.fullText, "ko");
      if (candidate.brand) setBrand(candidate.brand);
      if (candidate.title) setTitle(candidate.title);
      if (candidate.code) setCode(candidate.code);
      // 이미지가 있으면 풀스크린에 이미지 자체를 보여줄 거라 codeFormat은 "text_only"
      // 유지 (CouponCodeRenderer는 fallback). 이미지가 있으면 detail modal이 image 우선.
      if (candidate.expiresAt) {
        const d = new Date(candidate.expiresAt);
        if (!Number.isNaN(d.getTime())) {
          const yyyy = d.getFullYear();
          const mm = `${d.getMonth() + 1}`.padStart(2, "0");
          const dd = `${d.getDate()}`.padStart(2, "0");
          setExpires(`${yyyy}-${mm}-${dd}`);
        }
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : copy.wallet.ocrFailed);
    } finally {
      setImageBusy(null);
    }
  }

  useEffect(() => {
    if (!visible) {
      setBrand("");
      setTitle("");
      setCode("");
      setCodeFormat("text_only");
      setExpires("");
      setNotes("");
      setGeofence(null);
      setImageBase64(null);
      setImageMime(null);
      setFormError(null);
      setIsSaving(false);
    }
  }, [visible]);

  async function handleSave() {
    if (!brand.trim() || !title.trim() || !code.trim()) {
      setFormError(copy.wallet.errorRequired);
      return;
    }
    setIsSaving(true);
    setFormError(null);
    try {
      const token = await getCurrentAccessToken();
      if (!token) throw new Error("not signed in");
      await createCoupon(token, {
        brand: brand.trim(),
        title: title.trim(),
        code: code.trim(),
        codeFormat,
        expiresAt: parseExpiryInput(expires),
        source: imageBase64 ? "scan" : "manual",
        notes: notes.trim() || null,
        geofence: geofence ?? null,
        codeImageBase64: imageBase64 ? `data:${imageMime};base64,${imageBase64}` : null
      });
      onCreated();
    } catch (err) {
      if (err instanceof ApiError && err.code === "WALLET_DUPLICATE_CODE") {
        setFormError(copy.wallet.errorDuplicate);
      } else {
        setFormError(err instanceof Error ? err.message : copy.wallet.errorLoad);
      }
    } finally {
      setIsSaving(false);
    }
  }

  const formatOptions: Array<{ key: CodeFormat; label: string }> = [
    { key: "text_only", label: copy.wallet.codeFormatText },
    { key: "barcode_qr", label: copy.wallet.codeFormatQr },
    { key: "barcode_code128", label: copy.wallet.codeFormatBarcode }
  ];

  return (
    <BottomSheetModal visible={visible} onClose={onClose} sheetStyle={styles.modalCard}>
      <View style={styles.modalHandle} />
      <Text style={styles.sectionTitle}>{copy.wallet.addModalTitle}</Text>

      <ScrollView
        style={localStyles.formScroll}
        contentContainerStyle={localStyles.formContent}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => void handleExtractFromImage()}
          disabled={imageBusy !== null}
          style={[styles.secondaryButton, { marginBottom: 10 }]}
        >
          {imageBusy ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ActivityIndicator color={theme.colors.textSecondary} size="small" />
              <Text style={styles.secondaryButtonText}>
                {imageBusy === "picking" ? copy.wallet.pickingImage : copy.wallet.ocrRunning}
              </Text>
            </View>
          ) : (
            <Text style={styles.secondaryButtonText}>{copy.wallet.fromImageButton}</Text>
          )}
        </Pressable>

        <Text style={styles.inputLabel}>{copy.wallet.formBrand}</Text>
            <TextInput
              value={brand}
              onChangeText={setBrand}
              placeholder={copy.wallet.formBrandPlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              style={localStyles.input}
            />

            <Text style={styles.inputLabel}>{copy.wallet.formTitle}</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={copy.wallet.formTitlePlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              style={localStyles.input}
            />

            <Text style={styles.inputLabel}>{copy.wallet.formCode}</Text>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder={copy.wallet.formCodePlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              style={localStyles.input}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.inputLabel}>{copy.wallet.codeFormatLabel}</Text>
            <View style={localStyles.formatRow}>
              {formatOptions.map(option => {
                const isActive = codeFormat === option.key;
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => setCodeFormat(option.key)}
                    style={[
                      localStyles.formatChip,
                      {
                        backgroundColor: isActive
                          ? theme.colors.accent
                          : theme.colors.surfaceMuted
                      }
                    ]}
                  >
                    <Text
                      style={[
                        localStyles.formatChipText,
                        { color: isActive ? theme.colors.accentText : theme.colors.textSecondary }
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.inputLabel}>{copy.wallet.formExpires}</Text>
            <TextInput
              value={expires}
              onChangeText={setExpires}
              placeholder={copy.wallet.formExpiresPlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              style={localStyles.input}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.inputLabel}>{copy.wallet.formNotes}</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder={copy.wallet.formNotesPlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              style={localStyles.input}
            />

        <CouponGeofencePicker copy={copy} value={geofence} onChange={setGeofence} />

        {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
      </ScrollView>

      <View style={styles.buttonRow}>
        <Pressable onPress={onClose} style={styles.outlineButton} disabled={isSaving}>
          <Text style={styles.outlineButtonText}>{copy.wallet.actionCancel}</Text>
        </Pressable>
        <Pressable
          onPress={() => void handleSave()}
          style={[styles.primaryButton, isSaving ? styles.primaryButtonDisabled : null]}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={theme.colors.accentText} />
          ) : (
            <Text style={styles.primaryButtonText}>{copy.wallet.actionSave}</Text>
          )}
        </Pressable>
      </View>
    </BottomSheetModal>
  );
}

interface CouponDetailModalProps {
  coupon: Coupon;
  styles: SettingsSectionProps["styles"];
  copy: SettingsSectionProps["copy"];
  onClose: () => void;
  onChanged: () => void;
}

function CouponDetailModal({ coupon, styles, copy, onClose, onChanged }: CouponDetailModalProps) {
  const theme = useAuraTheme();
  const [code, setCode] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // 화면 unmount/close 시 평문 code/이미지를 메모리에서 즉시 폐기.
  useEffect(() => {
    return () => {
      setCode(null);
      setImageBase64(null);
    };
  }, []);

  async function reveal() {
    setIsRevealing(true);
    setError(null);
    try {
      const token = await getCurrentAccessToken();
      if (!token) throw new Error("not signed in");
      const result = await revealCouponCode(token, coupon.id);
      setCode(result.code);
      setImageBase64(result.imageBase64);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.wallet.errorLoad);
    } finally {
      setIsRevealing(false);
    }
  }

  async function markUsed() {
    setIsBusy(true);
    try {
      const token = await getCurrentAccessToken();
      if (!token) return;
      await updateCoupon(token, coupon.id, { used: true });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.wallet.errorLoad);
    } finally {
      setIsBusy(false);
    }
  }

  function confirmDelete() {
    Alert.alert(copy.wallet.confirmDeleteTitle, copy.wallet.confirmDeleteBody, [
      { text: copy.wallet.actionCancel, style: "cancel" },
      {
        text: copy.wallet.actionDelete,
        style: "destructive",
        onPress: () => void doDelete()
      }
    ]);
  }

  async function doDelete() {
    setIsBusy(true);
    try {
      const token = await getCurrentAccessToken();
      if (!token) return;
      await deleteCoupon(token, coupon.id);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.wallet.errorLoad);
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <BottomSheetModal visible onClose={onClose} sheetStyle={styles.modalCard}>
      <View style={styles.modalHandle} />
      <Text style={styles.messageMeta}>{coupon.brand}</Text>
      <Text style={styles.sectionTitle}>{coupon.title}</Text>
      {coupon.geofence?.placeName ? (
        <Text style={styles.helperText}>
          {copy.wallet.geofenceSavedAt(coupon.geofence.placeName)}
        </Text>
      ) : null}
      {coupon.expiresAt ? (
        <Text style={styles.detailLine}>
          {copy.wallet.expiresLabel(formatDate(coupon.expiresAt))}
        </Text>
      ) : null}

      <View style={localStyles.codeArea}>
        {code ? (
          <>
            {imageBase64 ? (
              <Image
                source={{ uri: imageBase64 }}
                style={localStyles.couponImage}
                resizeMode="contain"
              />
            ) : (
              <CouponCodeRenderer code={code} codeFormat={coupon.codeFormat} />
            )}
            <Text style={[styles.helperText, { marginTop: 14 }]}>
              {copy.wallet.detailScanInstruction}
            </Text>
          </>
        ) : (
          <>
            <Text style={styles.helperText}>{copy.wallet.detailCodeRevealHint}</Text>
            <Pressable
              onPress={() => void reveal()}
              style={[styles.primaryButton, { marginTop: 12 }]}
              disabled={isRevealing}
            >
              {isRevealing ? (
                <ActivityIndicator color={theme.colors.accentText} />
              ) : (
                <Text style={styles.primaryButtonText}>{copy.wallet.detailCodeShow}</Text>
              )}
            </Pressable>
          </>
        )}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.buttonRow}>
        <Pressable
          onPress={() => void markUsed()}
          style={[styles.outlineButton, { flex: 1 }]}
          disabled={isBusy || coupon.status === "used"}
        >
          <Text style={styles.outlineButtonText}>{copy.wallet.actionUsed}</Text>
        </Pressable>
        <Pressable
          onPress={confirmDelete}
          style={[styles.dangerButton, { flex: 1 }]}
          disabled={isBusy}
        >
          <Text style={styles.dangerButtonText}>{copy.wallet.actionDelete}</Text>
        </Pressable>
      </View>
    </BottomSheetModal>
  );
}

const localStyles = StyleSheet.create({
  filterRow: { flexDirection: "row", marginBottom: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 8
  },
  filterChipText: { fontSize: 13, fontWeight: "700" },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 6
  },
  cardBadgeCol: { alignItems: "flex-end", gap: 2 },
  cardBadge: { fontSize: 11, fontWeight: "800" },
  formScroll: { maxHeight: 460 },
  formContent: { paddingBottom: 12, gap: 6 },
  input: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(150,150,170,0.35)",
    fontSize: 15
  },
  formatRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  formatChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999
  },
  formatChipText: { fontSize: 12, fontWeight: "700" },
  codeArea: {
    marginTop: 18,
    marginBottom: 14,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  codeText: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 6
  },
  couponImage: {
    width: "100%",
    height: 300,
    borderRadius: 12,
    backgroundColor: "#FFFFFF"
  }
});
