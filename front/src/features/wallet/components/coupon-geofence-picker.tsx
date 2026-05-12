import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuraTheme } from "@features/app/styles";
import type { AppCopy } from "@features/app/i18n";
import { getCurrentDeviceLocation } from "@features/location/current-location";
import type { CouponGeofence } from "@features/wallet/types";

interface Props {
  copy: AppCopy;
  value: CouponGeofence | null;
  onChange: (next: CouponGeofence | null) => void;
}

/**
 * 쿠폰 등록 form 안의 "사용 매장" picker.
 * - 사용자 입력 가능한 매장 이름 + 현재 위치 capture 버튼
 * - 좌표만 capture, Place API 미사용 (J.4 1차 — Places lookup은 후속)
 */
export function CouponGeofencePicker({ copy, value, onChange }: Props) {
  const theme = useAuraTheme();
  const [placeName, setPlaceName] = useState(value?.placeName ?? "");
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function commitPlaceName(next: string) {
    setPlaceName(next);
    if (value) {
      onChange({ ...value, placeName: next.trim() || null });
    }
  }

  async function captureCurrent() {
    setIsCapturing(true);
    setError(null);
    try {
      const result = await getCurrentDeviceLocation();
      if (result.kind !== "ok") {
        setError(copy.wallet.geofencePermissionDenied);
        return;
      }
      onChange({
        lat: result.lat,
        lng: result.lng,
        radiusM: 200,
        placeName: placeName.trim() || null
      });
    } finally {
      setIsCapturing(false);
    }
  }

  function clear() {
    setPlaceName("");
    setError(null);
    onChange(null);
  }

  return (
    <View>
      <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
        {copy.wallet.geofencePlaceLabel}
      </Text>
      <TextInput
        value={placeName}
        onChangeText={commitPlaceName}
        placeholder={copy.wallet.geofencePlaceholder}
        placeholderTextColor={theme.colors.textMuted}
        style={[
          styles.input,
          {
            borderColor: theme.colors.line,
            color: theme.colors.textPrimary
          }
        ]}
      />

      <View style={styles.actionsRow}>
        <Pressable
          onPress={() => void captureCurrent()}
          disabled={isCapturing}
          style={[
            styles.actionChip,
            {
              backgroundColor: value
                ? theme.colors.accentSoft
                : theme.colors.surfaceMuted,
              borderColor: theme.colors.line
            }
          ]}
        >
          {isCapturing ? (
            <ActivityIndicator color={theme.colors.textSecondary} size="small" />
          ) : (
            <Text style={[styles.actionChipText, { color: theme.colors.textPrimary }]}>
              {value ? copy.wallet.geofenceSavedAt(value.placeName || "") : copy.wallet.geofenceUseCurrent}
            </Text>
          )}
        </Pressable>
        {value ? (
          <Pressable onPress={clear} style={styles.clearButton} hitSlop={6}>
            <Text style={[styles.clearButtonText, { color: theme.colors.textMuted }]}>×</Text>
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text style={{ color: theme.colors.dangerText, fontSize: 13, marginTop: 4 }}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: "700", marginBottom: 8, marginTop: 6 },
  input: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 15,
    marginBottom: 8
  },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  actionChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    alignItems: "center"
  },
  actionChipText: { fontSize: 13, fontWeight: "700" },
  clearButton: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  clearButtonText: { fontSize: 22, fontWeight: "700" }
});
