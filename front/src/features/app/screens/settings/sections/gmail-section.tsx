import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SettingsStatusRow, SettingsSubpageHeader } from "@features/app/screens/settings/shared";
import type { SettingsSectionProps } from "@features/app/screens/settings/sections/section-props";

export function GmailSection(props: SettingsSectionProps) {
  const {
    styles,
    copy,
    gmailAddress,
    gmailConnected,
    gmailConnectedAt,
    isGmailRefreshRequired,
    noticeMessage,
    onConnectGmail,
    onDisconnectGmail,
    onSelectSettingsSection
  } = props;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.settingsScreen}>
        <SettingsSubpageHeader
          styles={styles}
          title={copy.settings.gmailTitle}
          subtitle={copy.settings.gmailSubtitle}
          onSelectSettingsSection={onSelectSettingsSection}
          parentSection="cat-account"
        />
        <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{copy.settings.currentStatus}</Text>
            <SettingsStatusRow
              styles={styles}
              label={copy.settings.connected}
              isOk={gmailConnected && !isGmailRefreshRequired}
              issueText={isGmailRefreshRequired ? copy.settings.refreshRequired : copy.settings.notConnected}
            />
            <Text style={styles.detailLine}>
              {copy.settings.address}: {gmailAddress ?? copy.settings.notConnected}
            </Text>
            <Text style={styles.detailLine}>
              {copy.settings.connectedAt}: {gmailConnectedAt ?? copy.settings.notConnected}
            </Text>

            {isGmailRefreshRequired ? (
              <View style={styles.warningCard}>
                <Text style={styles.warningText}>{copy.settings.refreshRequired}</Text>
                <Text style={styles.helperText}>{copy.settings.refreshHelp}</Text>
              </View>
            ) : null}

            {noticeMessage ? (
              <View style={styles.successCard}>
                <Text style={styles.successText}>{noticeMessage}</Text>
              </View>
            ) : null}

            <View style={styles.buttonRow}>
              <Pressable onPress={() => void onConnectGmail()} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>
                  {gmailConnected ? copy.settings.refreshGmail : copy.settings.connectGmail}
                </Text>
              </Pressable>

              {gmailConnected ? (
                <Pressable onPress={() => void onDisconnectGmail()} style={styles.outlineButton}>
                  <Text style={styles.outlineButtonText}>{copy.settings.disconnectGmail}</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
