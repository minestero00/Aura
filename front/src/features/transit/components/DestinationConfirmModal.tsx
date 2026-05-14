import React, { useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT, type LatLng } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuraTheme } from "@features/app/styles";
import type { PlaceCandidate } from "@features/transit/api";

interface DestinationConfirmModalProps {
  visible: boolean;
  query: string;
  candidates: PlaceCandidate[];
  language: "ko" | "en";
  onConfirm: (candidate: PlaceCandidate) => void;
  onCancel: () => void;
}

/**
 * 검색어에 대한 다중 후보를 지도 + 리스트로 표시. "현대아파트" 같은 모호한 질의에서
 * 사용자가 정확한 위치를 picks. picks 즉시 onConfirm 호출 → caller가 directions 검색.
 *
 * 후보가 1개여도 caller가 사용자 확인을 원하면 visible=true로 띄움. 후보가 0개면
 * caller가 ZERO_RESULTS 처리 후 modal 안 띄움.
 */
export function DestinationConfirmModal({
  visible,
  query,
  candidates,
  language,
  onConfirm,
  onCancel
}: DestinationConfirmModalProps) {
  const theme = useAuraTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const isKo = language === "ko";

  // visible 변할 때마다 첫 후보를 default selected로.
  useEffect(() => {
    if (!visible) return;
    setSelectedId(candidates[0]?.placeId ?? null);
  }, [visible, candidates]);

  const selected = useMemo(
    () => candidates.find(c => c.placeId === selectedId) ?? candidates[0] ?? null,
    [candidates, selectedId]
  );

  const allCoords: LatLng[] = useMemo(
    () =>
      candidates.map(c => ({
        latitude: c.lat,
        longitude: c.lng
      })),
    [candidates]
  );

  function handleMapReady() {
    if (!mapRef.current || allCoords.length === 0) return;
    if (allCoords.length === 1) {
      mapRef.current.animateToRegion(
        {
          ...allCoords[0],
          latitudeDelta: 0.01,
          longitudeDelta: 0.01
        },
        0
      );
      return;
    }
    mapRef.current.fitToCoordinates(allCoords, {
      edgePadding: { top: 80, right: 60, bottom: 280, left: 60 },
      animated: false
    });
  }

  function handleSelectCandidate(c: PlaceCandidate) {
    setSelectedId(c.placeId);
    mapRef.current?.animateToRegion(
      {
        latitude: c.lat,
        longitude: c.lng,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005
      },
      300
    );
  }

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onCancel}
    >
      <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_DEFAULT}
          style={StyleSheet.absoluteFill}
          showsUserLocation
          showsMyLocationButton={false}
          onMapReady={handleMapReady}
        >
          {candidates.map((c, idx) => {
            const isSelected = c.placeId === selectedId;
            return (
              <Marker
                key={c.placeId}
                coordinate={{ latitude: c.lat, longitude: c.lng }}
                title={`${idx + 1}. ${c.name}`}
                description={c.formattedAddress ?? undefined}
                pinColor={isSelected ? "#ef4444" : "#3b82f6"}
                onPress={() => handleSelectCandidate(c)}
              />
            );
          })}
        </MapView>

        <View
          style={[
            styles.topBar,
            { top: insets.top + 8, backgroundColor: theme.colors.elevated }
          ]}
        >
          <Pressable onPress={onCancel} style={styles.topCloseBtn} hitSlop={8}>
            <Text style={[styles.topCloseIcon, { color: theme.colors.textSecondary }]}>×</Text>
          </Pressable>
          <View style={styles.topMeta}>
            <Text style={[styles.topQuery, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              "{query}"
            </Text>
            <Text style={[styles.topCount, { color: theme.colors.textSecondary }]}>
              {isKo ? `${candidates.length}개 후보 — 맞는 곳을 골라주세요` : `${candidates.length} matches — pick one`}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.bottomSheet,
            {
              paddingBottom: insets.bottom + 16,
              backgroundColor: theme.colors.elevated,
              borderColor: theme.colors.line
            }
          ]}
        >
          <FlatList
            data={candidates}
            keyExtractor={c => c.placeId}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item, index }) => {
              const isSelected = item.placeId === selectedId;
              return (
                <Pressable
                  onPress={() => handleSelectCandidate(item)}
                  style={[
                    styles.candidateRow,
                    {
                      backgroundColor: isSelected
                        ? theme.colors.accentSoft
                        : theme.colors.surfaceMuted
                    }
                  ]}
                >
                  <View
                    style={[
                      styles.candidateNum,
                      {
                        backgroundColor: isSelected ? theme.colors.accent : theme.colors.line
                      }
                    ]}
                  >
                    <Text
                      style={[
                        styles.candidateNumText,
                        { color: isSelected ? theme.colors.accentText : theme.colors.textSecondary }
                      ]}
                    >
                      {index + 1}
                    </Text>
                  </View>
                  <View style={styles.candidateBody}>
                    <Text style={[styles.candidateName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {item.formattedAddress ? (
                      <Text
                        style={[styles.candidateAddr, { color: theme.colors.textSecondary }]}
                        numberOfLines={2}
                      >
                        {item.formattedAddress}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />

          <Pressable
            onPress={() => selected && onConfirm(selected)}
            disabled={!selected}
            style={[
              styles.confirmBtn,
              { backgroundColor: theme.colors.accent, opacity: selected ? 1 : 0.5 }
            ]}
            accessibilityRole="button"
          >
            <Text style={[styles.confirmText, { color: theme.colors.accentText }]}>
              {selected
                ? isKo
                  ? `"${selected.name}" 선택`
                  : `Use "${selected.name}"`
                : isKo
                  ? "곳을 선택해 주세요"
                  : "Select a place"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4
  },
  topCloseBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center"
  },
  topCloseIcon: { fontSize: 24, fontWeight: "700", lineHeight: 26 },
  topMeta: { flex: 1, gap: 2 },
  topQuery: { fontSize: 15, fontWeight: "700" },
  topCount: { fontSize: 12 },
  bottomSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 14,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    maxHeight: "55%",
    gap: 10
  },
  list: { maxHeight: 220, flexGrow: 0 },
  candidateRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    gap: 12
  },
  candidateNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  candidateNumText: { fontSize: 13, fontWeight: "800" },
  candidateBody: { flex: 1, gap: 2 },
  candidateName: { fontSize: 14, fontWeight: "700" },
  candidateAddr: { fontSize: 12, lineHeight: 16 },
  separator: { height: 8 },
  confirmBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center"
  },
  confirmText: { fontSize: 15, fontWeight: "800" }
});
