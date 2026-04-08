import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { appStyles as styles } from "../styles";
import type { AppCopy } from "../i18n";

interface LoadingScreenProps {
  copy: AppCopy;
}

export function LoadingScreen({ copy }: LoadingScreenProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#1d2a35" size="large" />
        <Text style={styles.loadingText}>{copy.common.loadingSession}</Text>
      </View>
    </SafeAreaView>
  );
}
