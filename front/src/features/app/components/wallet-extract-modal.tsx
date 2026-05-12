import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { AuraLoader } from "@features/app/components/aura-loader";
import type { AppCopy } from "@features/app/i18n";
import { createAppStyles, useAuraTheme } from "@features/app/styles";
import type { CouponExtractCandidate } from "@features/wallet/api";
import type { CodeFormat, CreateCouponInput } from "@features/wallet/types";

interface Props {
  visible: boolean;
  isLoading: boolean;
  candidate: CouponExtractCandidate | null;
  copy: AppCopy;
  onSave: (input: CreateCouponInput) => Promise<boolean>;
  onClose: () => void;
}

const FORMAT_OPTIONS: CodeFormat[] = ["text_only", "barcode_qr", "barcode_code128"];

function isoToDateInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, "0");
  const dd = `${date.getDate()}`.padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function dateInputToIso(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return null;
  const d = new Date(`${trimmed}T23:59:59`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function WalletExtractModal({ visible, isLoading, candidate, copy, onSave, onClose }: Props) {
  const styles = createAppStyles(useAuraTheme());
  const theme = useAuraTheme();
  const [brand, setBrand] = useState("");
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [codeFormat, setCodeFormat] = useState<CodeFormat>("text_only");
  const [expires, setExpires] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // candidate 변경 시 form prefill. 모달 닫힘 시 reset.
  useEffect(() => {
    if (!visible) {
      setBrand("");
      setTitle("");
      setCode("");
      setCodeFormat("text_only");
      setExpires("");
      setError(null);
      setIsSaving(false);
      return;
    }
    if (candidate) {
      setBrand(candidate.brand ?? "");
      setTitle(candidate.title ?? "");
      setCode(candidate.code ?? "");
      setCodeFormat(candidate.codeFormat ?? "text_only");
      setExpires(isoToDateInput(candidate.expiresAt));
    }
  }, [visible, candidate]);

  async function handleSave() {
    if (!brand.trim() || !title.trim() || !code.trim()) {
      setError(copy.wallet.errorRequired);
      return;
    }
    setIsSaving(true);
    setError(null);
    const ok = await onSave({
      brand: brand.trim(),
      title: title.trim(),
      code: code.trim(),
      codeFormat,
      expiresAt: dateInputToIso(expires),
      source: "mail_auto"
    });
    if (!ok) {
      setError(copy.wallet.errorDuplicate);
    }
    setIsSaving(false);
  }

  const formatLabel = (format: CodeFormat): string => {
    if (format === "barcode_qr") return copy.wallet.codeFormatQr;
    if (format === "text_only") return copy.wallet.codeFormatText;
    return copy.wallet.codeFormatBarcode;
  };

  const isInsufficient = !isLoading && candidate !== null && candidate.confidence < 0.1;
  const isLowConfidence = !isLoading && candidate !== null && candidate.confidence >= 0.1 && candidate.confidence < 0.6;

  return (
    <Modal animationType="fade" transparent visible={visible}>
      <View style={styles.dailyBriefModalBackdrop}>
        <Pressable accessibilityLabel="Close" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={styles.dailyBriefModalCard}>
          <View style={styles.dailyBriefModalHeader}>
            <View style={styles.dailyBriefHeaderMain}>
              <Text style={styles.dailyBriefEyebrow}>AURA</Text>
              <Text style={styles.dailyBriefTitle}>{copy.wallet.extractTitle}</Text>
            </View>
            <Pressable onPress={onClose} style={styles.dailyBriefCloseButton}>
              <Text style={styles.dailyBriefCloseText}>×</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.dailyBriefBodyContent} style={styles.dailyBriefBodyScroll}>
            {isLoading ? (
              <AuraLoader size="md" message={copy.wallet.extractLoading} />
            ) : isInsufficient ? (
              <Text style={styles.dailyBriefEmptyText}>{copy.wallet.extractInsufficient}</Text>
            ) : (
              <>
                {isLowConfidence ? (
                  <View style={styles.warningCard}>
                    <Text style={styles.warningText}>{copy.wallet.extractConfidenceLow}</Text>
                  </View>
                ) : null}

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
                  {FORMAT_OPTIONS.map(format => {
                    const isActive = codeFormat === format;
                    return (
                      <Pressable
                        key={format}
                        onPress={() => setCodeFormat(format)}
                        style={[
                          localStyles.formatChip,
                          {
                            backgroundColor: isActive ? theme.colors.accent : theme.colors.surfaceMuted
                          }
                        ]}
                      >
                        <Text
                          style={[
                            localStyles.formatChipText,
                            { color: isActive ? theme.colors.accentText : theme.colors.textSecondary }
                          ]}
                        >
                          {formatLabel(format)}
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

                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </>
            )}
          </ScrollView>

          {!isLoading && !isInsufficient ? (
            <View style={styles.dailyBriefFooterActions}>
              <Pressable
                onPress={() => void handleSave()}
                style={[styles.primaryButton, isSaving ? styles.primaryButtonDisabled : null]}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color={theme.colors.accentText} />
                ) : (
                  <Text style={styles.primaryButtonText}>{copy.wallet.extractSaveButton}</Text>
                )}
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  input: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(150,150,170,0.35)",
    fontSize: 15,
    marginBottom: 6
  },
  formatRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  formatChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  formatChipText: { fontSize: 12, fontWeight: "700" }
});
