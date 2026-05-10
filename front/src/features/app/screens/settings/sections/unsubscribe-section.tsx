import React, { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuraLoader } from "@features/app/components/aura-loader";
import { ReloadButton } from "@features/app/components/reload-button";
import { SettingsSubpageHeader } from "@features/app/screens/settings/shared";
import type { SettingsSectionProps } from "@features/app/screens/settings/sections/section-props";

export function UnsubscribeSection(props: SettingsSectionProps) {
  const {
    styles,
    copy,
    onSelectSettingsSection,
    onLoadUnsubscribeCandidates,
    onOneClickUnsubscribe,
    unsubscribeCandidates,
    isUnsubscribeLoading
  } = props;

  const [unsubscribingEmails, setUnsubscribingEmails] = useState<Record<string, boolean>>({});

  useEffect(() => {
    void onLoadUnsubscribeCandidates();
  }, []);

  async function handlePressCandidate(senderEmail: string, url: string | null, oneClick: boolean) {
    if (!url) return;
    if (oneClick && /^https?:\/\//i.test(url)) {
      setUnsubscribingEmails(prev => ({ ...prev, [senderEmail]: true }));
      try {
        await onOneClickUnsubscribe(url);
      } finally {
        setUnsubscribingEmails(prev => ({ ...prev, [senderEmail]: false }));
        await onLoadUnsubscribeCandidates();
      }
      return;
    }
    // mailto: 또는 비-1click https — 외부 브라우저/메일 앱.
    try {
      await Linking.openURL(url);
    } catch {
      // OS가 처리 못 하면 silent.
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.settingsScreen}>
        <SettingsSubpageHeader
          styles={styles}
          title={copy.settings.unsubscribeTitle}
          subtitle={copy.settings.unsubscribeSubtitle}
          onSelectSettingsSection={onSelectSettingsSection}
        />
        <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
          <View style={styles.sectionCard}>
            <View style={[styles.buttonRow, { justifyContent: "space-between" }]}>
              <Text style={styles.sectionTitle}>
                {copy.settings.unsubscribeCount(unsubscribeCandidates.length)}
              </Text>
              <ReloadButton onPress={() => void onLoadUnsubscribeCandidates()} accessibilityLabel="Reload" />
            </View>

            {isUnsubscribeLoading && unsubscribeCandidates.length === 0 ? (
              <AuraLoader size="md" message={copy.settings.unsubscribeLoading} />
            ) : null}

            {!isUnsubscribeLoading && unsubscribeCandidates.length === 0 ? (
              <Text style={styles.helperText}>{copy.settings.unsubscribeEmpty}</Text>
            ) : null}

            {unsubscribeCandidates.map(candidate => {
              const busy = unsubscribingEmails[candidate.senderEmail];
              const cta = candidate.oneClick
                ? copy.settings.unsubscribeOneClick
                : copy.settings.unsubscribeOpen;
              return (
                <View key={candidate.senderEmail} style={[styles.sectionCard, { marginTop: 8 }]}>
                  <Text style={styles.detailLine}>{candidate.senderName}</Text>
                  <Text style={styles.helperText}>{candidate.senderEmail}</Text>
                  <Text style={styles.helperText}>
                    {copy.settings.unsubscribeMessageCount(candidate.messageCount)}
                  </Text>
                  <Text style={[styles.helperText, { marginBottom: 6 }]} numberOfLines={1}>
                    {candidate.latestSubject}
                  </Text>
                  <Pressable
                    onPress={() =>
                      void handlePressCandidate(candidate.senderEmail, candidate.unsubscribeUrl, candidate.oneClick)
                    }
                    style={candidate.unsubscribeUrl ? styles.secondaryButton : styles.outlineButton}
                    disabled={!candidate.unsubscribeUrl || busy}
                  >
                    <Text style={candidate.unsubscribeUrl ? styles.secondaryButtonText : styles.outlineButtonText}>
                      {busy ? copy.settings.unsubscribePending : cta}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
