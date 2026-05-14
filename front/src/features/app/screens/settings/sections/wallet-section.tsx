import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
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
import { cropBarcodeFromImage, extractTextFromImage, isNativeOcrAvailable } from "@features/wallet/native-ocr";
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
  const { styles, copy, onSelectSettingsSection, onOpenWalletAdd, walletRefreshKey } = props;
  const theme = useAuraTheme();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<CouponStatus | "all">("active");
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

  // 외부에서 신규 쿠폰 create 완료 → walletRefreshKey 증가 → reload.
  useEffect(() => {
    if (walletRefreshKey > 0) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletRefreshKey]);

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
          <View style={localStyles.filterRow}>
            {FILTER_ORDER.map(key => {
              const isActive = filter === key;
              return (
                <Pressable
                  key={`wallet-filter-${key}`}
                  onPress={() => setFilter(key)}
                  style={[
                    localStyles.filterChip,
                    {
                      backgroundColor: isActive ? theme.colors.accent : theme.colors.surfaceMuted,
                      borderColor: isActive ? theme.colors.accent : theme.colors.line
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
          </View>

          {error ? (
            <View style={styles.warningCard}>
              <Text style={styles.warningText}>{error}</Text>
            </View>
          ) : null}

          {isLoading ? (
            <View style={[styles.sectionCard, { alignItems: "center", paddingVertical: 32 }]}>
              <ActivityIndicator color={theme.colors.accent} />
            </View>
          ) : coupons.length === 0 ? (
            <View style={[localStyles.emptyCard, { backgroundColor: theme.colors.accentSoft }]}>
              <Text style={[localStyles.emptyIcon, { color: theme.colors.accent }]}>🎟️</Text>
              <Text style={[localStyles.emptyTitle, { color: theme.colors.textPrimary }]}>
                {copy.wallet.empty}
              </Text>
              <Text style={[localStyles.emptyHint, { color: theme.colors.textSecondary }]}>
                {copy.wallet.emptyHint}
              </Text>
            </View>
          ) : (
            <View style={localStyles.cardList}>
              {coupons.map(coupon => {
                const daysLeft = daysUntil(coupon.expiresAt);
                const isUrgent = daysLeft !== null && daysLeft <= 3 && coupon.status !== "used";
                const isUsed = coupon.status === "used";
                return (
                  <Pressable
                    key={coupon.id}
                    onPress={() => setDetailCoupon(coupon)}
                    style={({ pressed }) => [
                      localStyles.couponCard,
                      {
                        backgroundColor: theme.colors.elevated,
                        borderColor: isUrgent ? theme.colors.dangerText : theme.colors.line,
                        opacity: isUsed ? 0.55 : pressed ? 0.85 : 1
                      }
                    ]}
                  >
                    <View style={localStyles.couponCardLeftRail}>
                      <View
                        style={[
                          localStyles.couponBrandChip,
                          {
                            backgroundColor: isUrgent
                              ? theme.colors.dangerSoft
                              : theme.colors.accentSoft
                          }
                        ]}
                      >
                        <Text
                          style={[
                            localStyles.couponBrandChipText,
                            {
                              color: isUrgent ? theme.colors.dangerText : theme.colors.accent
                            }
                          ]}
                          numberOfLines={1}
                        >
                          {coupon.brand}
                        </Text>
                      </View>
                    </View>

                    <View style={localStyles.couponCardBody}>
                      <Text
                        style={[localStyles.couponTitle, { color: theme.colors.textPrimary }]}
                        numberOfLines={2}
                      >
                        {coupon.title}
                      </Text>
                      <View style={localStyles.couponMetaRow}>
                        {coupon.expiresAt ? (
                          <Text
                            style={[
                              localStyles.couponMetaText,
                              { color: theme.colors.textSecondary }
                            ]}
                          >
                            {copy.wallet.expiresLabel(formatDate(coupon.expiresAt))}
                          </Text>
                        ) : null}
                        {coupon.geofence?.placeName ? (
                          <Text
                            style={[
                              localStyles.couponMetaText,
                              { color: theme.colors.textMuted }
                            ]}
                            numberOfLines={1}
                          >
                            · {coupon.geofence.placeName}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={localStyles.couponCardRight}>
                      {daysLeft !== null && !isUsed ? (
                        <View
                          style={[
                            localStyles.dDayBadge,
                            {
                              backgroundColor: isUrgent
                                ? theme.colors.dangerText
                                : theme.colors.surfaceMuted
                            }
                          ]}
                        >
                          <Text
                            style={[
                              localStyles.dDayBadgeText,
                              {
                                color: isUrgent ? "#FFFFFF" : theme.colors.textPrimary
                              }
                            ]}
                          >
                            {copy.wallet.daysLeft(daysLeft)}
                          </Text>
                        </View>
                      ) : (
                        <Text
                          style={[localStyles.statusText, { color: theme.colors.textMuted }]}
                        >
                          {statusLabel(coupon.status)}
                        </Text>
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          <Pressable onPress={onOpenWalletAdd} style={[styles.primaryButton, { marginTop: 18 }]}>
            <Text style={styles.primaryButtonText}>{copy.wallet.addButton}</Text>
          </Pressable>
        </ScrollView>
      </View>

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

interface AddCouponDrawerProps {
  visible: boolean;
  styles: SettingsSectionProps["styles"];
  copy: SettingsSectionProps["copy"];
  onClose: () => void;
  onCreated: () => void;
}

export function AddCouponDrawer({ visible, styles, copy, onClose, onCreated }: AddCouponDrawerProps) {
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

    setImageBusy("ocr");
    try {
      // 바코드 영역 자동 crop 시도 → 있으면 그것을 codeImage로 사용 (점원 스캔 편의).
      // 없으면 원본 이미지 fallback.
      const cropped = await cropBarcodeFromImage(imageUri);
      if (cropped) {
        setImageBase64(cropped.base64);
        setImageMime(cropped.mime);
      } else {
        setImageBase64(pickedBase64);
        setImageMime(pickedMime);
      }
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

  const inputStyle = [
    localStyles.input,
    {
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.line,
      color: theme.colors.textPrimary
    }
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
          style={[
            localStyles.imagePickerCard,
            {
              backgroundColor: imageBase64
                ? theme.colors.accentSoft
                : theme.colors.surfaceMuted,
              borderColor: imageBase64 ? theme.colors.accent : theme.colors.line
            }
          ]}
        >
          {imageBase64 && imageMime ? (
            <Image
              source={{ uri: `data:${imageMime};base64,${imageBase64}` }}
              style={localStyles.imagePickerThumb}
              resizeMode="cover"
            />
          ) : (
            <Text style={[localStyles.imagePickerIcon, { color: theme.colors.accent }]}>📷</Text>
          )}
          <View style={{ flex: 1 }}>
            {imageBusy ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <ActivityIndicator color={theme.colors.accent} size="small" />
                <Text style={[localStyles.imagePickerText, { color: theme.colors.textPrimary }]}>
                  {imageBusy === "picking" ? copy.wallet.pickingImage : copy.wallet.ocrRunning}
                </Text>
              </View>
            ) : (
              <>
                <Text
                  style={[localStyles.imagePickerText, { color: theme.colors.textPrimary }]}
                >
                  {copy.wallet.fromImageButton}
                </Text>
                {imageBase64 ? (
                  <Text
                    style={[localStyles.imagePickerHint, { color: theme.colors.textSecondary }]}
                  >
                    {copy.wallet.ocrAttachedHint}
                  </Text>
                ) : null}
              </>
            )}
          </View>
        </Pressable>

        <View style={localStyles.fieldGroup}>
          <Text style={styles.inputLabel}>{copy.wallet.formBrand}</Text>
          <TextInput
            value={brand}
            onChangeText={setBrand}
            placeholder={copy.wallet.formBrandPlaceholder}
            placeholderTextColor={theme.colors.textMuted}
            style={inputStyle}
          />
        </View>

        <View style={localStyles.fieldGroup}>
          <Text style={styles.inputLabel}>{copy.wallet.formTitle}</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={copy.wallet.formTitlePlaceholder}
            placeholderTextColor={theme.colors.textMuted}
            style={inputStyle}
          />
        </View>

        <View style={localStyles.fieldGroup}>
          <Text style={styles.inputLabel}>{copy.wallet.formCode}</Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder={copy.wallet.formCodePlaceholder}
            placeholderTextColor={theme.colors.textMuted}
            style={inputStyle}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={localStyles.fieldGroup}>
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
                        : theme.colors.surfaceMuted,
                      borderColor: isActive ? theme.colors.accent : theme.colors.line
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
        </View>

        <View style={localStyles.fieldGroup}>
          <Text style={styles.inputLabel}>{copy.wallet.formExpires}</Text>
          <TextInput
            value={expires}
            onChangeText={setExpires}
            placeholder={copy.wallet.formExpiresPlaceholder}
            placeholderTextColor={theme.colors.textMuted}
            style={inputStyle}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={localStyles.fieldGroup}>
          <Text style={styles.inputLabel}>{copy.wallet.formNotes}</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={copy.wallet.formNotesPlaceholder}
            placeholderTextColor={theme.colors.textMuted}
            style={inputStyle}
          />
        </View>

        <View style={localStyles.fieldGroup}>
          <CouponGeofencePicker copy={copy} value={geofence} onChange={setGeofence} />
        </View>

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
  const [isRevealing, setIsRevealing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // detail 진입 = reveal 의도로 간주. mount 즉시 reveal 호출 → 사용자가 별도 버튼
  // 탭 없이 바로 저장된 이미지/바코드가 풀스크린에 표시된다.
  // unmount 시 평문 code/이미지 메모리에서 즉시 폐기는 그대로 유지.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getCurrentAccessToken();
        if (!token) throw new Error("not signed in");
        const result = await revealCouponCode(token, coupon.id);
        if (cancelled) return;
        setCode(result.code);
        setImageBase64(result.imageBase64);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : copy.wallet.errorLoad);
      } finally {
        if (!cancelled) setIsRevealing(false);
      }
    })();
    return () => {
      cancelled = true;
      setCode(null);
      setImageBase64(null);
    };
  }, [coupon.id]);

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

  const [actionsOpen, setActionsOpen] = useState(false);

  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={localStyles.viewerRoot}>
        {/* 이미지 풀스크린 — 점원에게 보여주는 화면. 검은 배경 + 가운데 이미지만. */}
        {imageBase64 ? (
          <ScrollView
            style={localStyles.viewerScroll}
            contentContainerStyle={localStyles.viewerScrollContent}
            maximumZoomScale={6}
            minimumZoomScale={1}
            pinchGestureEnabled
            bouncesZoom
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            centerContent
          >
            <Image
              source={{ uri: imageBase64 }}
              style={localStyles.viewerImage}
              resizeMode="contain"
            />
          </ScrollView>
        ) : code ? (
          <View style={localStyles.viewerCentered}>
            <CouponCodeRenderer code={code} codeFormat={coupon.codeFormat} size={320} />
          </View>
        ) : (
          <View style={localStyles.viewerCentered}>
            <ActivityIndicator color="#FFFFFF" size="large" />
          </View>
        )}

        {/* 좌상단 X 닫기 */}
        <Pressable onPress={onClose} hitSlop={14} style={localStyles.viewerCloseButton}>
          <Text style={localStyles.viewerOverlayIcon}>×</Text>
        </Pressable>

        {/* 우상단 ⋯ 메뉴 — 액션은 별도 sheet로 분리해 이미지 가독성 보존 */}
        <Pressable onPress={() => setActionsOpen(true)} hitSlop={14} style={localStyles.viewerMenuButton}>
          <Text style={localStyles.viewerOverlayIcon}>⋯</Text>
        </Pressable>

        {error ? (
          <View style={localStyles.viewerErrorBanner}>
            <Text style={[styles.errorText, { color: "#FFFFFF" }]}>{error}</Text>
          </View>
        ) : null}

        {/* 액션 sheet */}
        <BottomSheetModal
          visible={actionsOpen}
          onClose={() => setActionsOpen(false)}
          sheetStyle={styles.modalCard}
        >
          <View style={styles.modalHandle} />
          <Text style={styles.messageMeta}>{coupon.brand}</Text>
          <Text style={styles.sectionTitle}>{coupon.title}</Text>
          {coupon.expiresAt ? (
            <Text style={styles.detailLine}>
              {copy.wallet.expiresLabel(formatDate(coupon.expiresAt))}
            </Text>
          ) : null}
          {coupon.geofence?.placeName ? (
            <Text style={styles.helperText}>
              {copy.wallet.geofenceSavedAt(coupon.geofence.placeName)}
            </Text>
          ) : null}

          <View style={[styles.buttonRow, { marginTop: 14 }]}>
            <Pressable
              onPress={() => {
                setActionsOpen(false);
                void markUsed();
              }}
              style={[styles.outlineButton, { flex: 1 }]}
              disabled={isBusy || coupon.status === "used"}
            >
              <Text style={styles.outlineButtonText}>{copy.wallet.actionUsed}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setActionsOpen(false);
                confirmDelete();
              }}
              style={[styles.dangerButton, { flex: 1 }]}
              disabled={isBusy}
            >
              <Text style={styles.dangerButtonText}>{copy.wallet.actionDelete}</Text>
            </Pressable>
          </View>
        </BottomSheetModal>
      </View>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 14, flexWrap: "wrap" },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1
  },
  filterChipText: { fontSize: 13, fontWeight: "700" },
  cardList: { gap: 10 },
  couponCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1
  },
  couponCardLeftRail: { justifyContent: "center" },
  couponBrandChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    maxWidth: 96
  },
  couponBrandChipText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.2 },
  couponCardBody: { flex: 1, gap: 4 },
  couponTitle: { fontSize: 15, fontWeight: "700", lineHeight: 20 },
  couponMetaRow: { flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" },
  couponMetaText: { fontSize: 12, fontWeight: "600" },
  couponCardRight: { justifyContent: "center", alignItems: "flex-end", minWidth: 56 },
  dDayBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    minWidth: 48,
    alignItems: "center"
  },
  dDayBadgeText: { fontSize: 12, fontWeight: "800" },
  statusText: { fontSize: 11, fontWeight: "700" },
  emptyCard: {
    paddingVertical: 28,
    paddingHorizontal: 24,
    borderRadius: 22,
    alignItems: "center",
    gap: 6,
    marginBottom: 6
  },
  emptyIcon: { fontSize: 36, marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontWeight: "800", textAlign: "center" },
  emptyHint: { fontSize: 13, lineHeight: 18, textAlign: "center" },
  imagePickerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14
  },
  imagePickerIcon: { fontSize: 26, width: 36, textAlign: "center" },
  imagePickerThumb: { width: 44, height: 44, borderRadius: 10 },
  imagePickerText: { fontSize: 14, fontWeight: "700" },
  imagePickerHint: { fontSize: 12, marginTop: 2 },
  fieldGroup: { marginBottom: 12 },
  // ScrollView 자체에 maxHeight 두면 폼 필드가 짤린다. modalCard의 maxHeight 78%가
  // 이미 부모 한계라 ScrollView는 그 안에서 자연스럽게 채움.
  formScroll: { flexGrow: 0, flexShrink: 1 },
  formContent: { paddingBottom: 12 },
  input: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15
  },
  formatRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  formatChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1
  },
  formatChipText: { fontSize: 12, fontWeight: "700" },
  // 풀스크린 detail 화면
  detailRoot: {
    flex: 1
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingTop: 64,
    paddingHorizontal: 20,
    paddingBottom: 16
  },
  detailCloseButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center"
  },
  detailCloseText: { fontSize: 28, fontWeight: "700", lineHeight: 30 },
  detailBrand: { fontSize: 13, fontWeight: "700", marginBottom: 4 },
  detailTitle: { fontSize: 22, fontWeight: "800", lineHeight: 28, marginBottom: 6 },
  detailExpires: { fontSize: 13, lineHeight: 18 },
  detailBody: {
    flex: 1,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 14
  },
  detailScanHint: { fontSize: 14, textAlign: "center" },
  detailReveal: { alignItems: "center", gap: 8 },
  // 풀스크린 이미지 — ScrollView 안에서 핀치줌 가능 (max 6x).
  // 매장에서 바코드 영역만 핀치인하면 화면 가득. 다음 commit에서 native
  // VNDetectBarcodesRequest로 자동 crop 도입 예정.
  zoomScroll: {
    flex: 1,
    width: "100%"
  },
  zoomContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  couponImageFull: {
    width: "100%",
    aspectRatio: 0.65,
    maxHeight: "100%",
    borderRadius: 16,
    backgroundColor: "#FFFFFF"
  },
  detailActions: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
    borderTopWidth: 1
  },
  // 이미지 풀스크린 viewer (점원에게 보여주기 위함).
  viewerRoot: {
    flex: 1,
    backgroundColor: "#000000"
  },
  viewerScroll: { flex: 1 },
  viewerScrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  viewerImage: {
    // 화면 꽉 채우기. resizeMode="contain"이라 이미지 비율은 그대로, 빈 공간은
    // 검은 배경(viewerRoot)으로 자연스럽게 채워진다. aspectRatio 강제 금지 — 쿠폰별
    // 비율이 천차만별이라 잘리거나 가운데에 작게 떠 보임.
    width: "100%",
    height: "100%"
  },
  viewerCentered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 8
  },
  viewerCloseButton: {
    position: "absolute",
    top: 60,
    left: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)"
  },
  viewerMenuButton: {
    position: "absolute",
    top: 60,
    right: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)"
  },
  viewerOverlayIcon: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 26
  },
  viewerErrorBanner: {
    position: "absolute",
    bottom: 80,
    left: 20,
    right: 20,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.7)"
  }
});
