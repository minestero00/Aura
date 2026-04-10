import React from "react";
import { Pressable, Text, View } from "react-native";
import type { AppCopy } from "@features/app/i18n";
import { createAppStyles } from "@features/app/styles";

interface TravelModeSelectorProps {
  copy: AppCopy;
  selectedTravelMode: "driving" | "transit";
  styles: ReturnType<typeof createAppStyles>;
  onSetTravelMode: (mode: "driving" | "transit") => void;
}

export function TravelModeSelector({
  copy,
  selectedTravelMode,
  styles,
  onSetTravelMode
}: TravelModeSelectorProps) {
  return (
    <View style={styles.travelModeRow}>
      <Pressable
        onPress={() => onSetTravelMode("transit")}
        style={[
          styles.travelModeButton,
          selectedTravelMode === "transit" ? styles.travelModeButtonActive : null
        ]}
      >
        <Text
          style={[
            styles.travelModeButtonText,
            selectedTravelMode === "transit" ? styles.travelModeButtonTextActive : null
          ]}
        >
          🚌 {copy.todo.travelModeTransit}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onSetTravelMode("driving")}
        style={[
          styles.travelModeButton,
          selectedTravelMode === "driving" ? styles.travelModeButtonActive : null
        ]}
      >
        <Text
          style={[
            styles.travelModeButtonText,
            selectedTravelMode === "driving" ? styles.travelModeButtonTextActive : null
          ]}
        >
          🚗 {copy.todo.travelModeDriving}
        </Text>
      </Pressable>
    </View>
  );
}
