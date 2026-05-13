import React, { useEffect, useRef } from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker, {
  DateTimePickerAndroid
} from "@react-native-community/datetimepicker";
import { SettingsStatusRow, SettingsSubpageHeader } from "@features/app/screens/settings/shared";
import { toPickerDate } from "@features/app/screens/settings/types";
import type { SettingsSectionProps } from "@features/app/screens/settings/sections/section-props";

const IOS_SAVE_DEBOUNCE_MS = 600;
const BUFFER_OPTIONS = [0, 5, 10, 15, 20, 30];

export function NotificationsSection(props: SettingsSectionProps) {
  const {
    styles,
    copy,
    areDailyBriefNotificationsEnabled,
    isNotificationPermissionGranted,
    morningBriefTime,
    morningBriefTimeDraft,
    eveningBriefTime,
    departureAlertsEnabled,
    departureBufferMinutes,
    onMorningBriefTimeDraftChange,
    onDisableDailyBriefNotifications,
    onEnableDailyBriefNotifications,
    onSaveMorningBriefTime,
    onSaveEveningBriefTime,
    onSetDepartureAlertsEnabled,
    onSetDepartureBufferMinutes,
    onSelectSettingsSection,
    suggestedMorningTime,
    onApplySuggestedMorningTime,
    onLoadSuggestedMorningTime
  } = props;

  // Settings의 알림 화면 진입 시 한 번 7일 평균을 fetch.
  useEffect(() => {
    void onLoadSuggestedMorningTime();
  }, []);

  const morningDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eveningDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (morningDebounceRef.current) clearTimeout(morningDebounceRef.current);
      if (eveningDebounceRef.current) clearTimeout(eveningDebounceRef.current);
    };
  }, []);

  function applyMorningPick(selectedDate: Date | undefined) {
    if (!selectedDate) return;
    const hours = String(selectedDate.getHours()).padStart(2, "0");
    const minutes = String(selectedDate.getMinutes()).padStart(2, "0");
    onMorningBriefTimeDraftChange(`${hours}:${minutes}`);

    if (Platform.OS === "android") {
      void onSaveMorningBriefTime();
      return;
    }
    if (morningDebounceRef.current) clearTimeout(morningDebounceRef.current);
    morningDebounceRef.current = setTimeout(() => {
      void onSaveMorningBriefTime();
    }, IOS_SAVE_DEBOUNCE_MS);
  }

  function applyEveningPick(selectedDate: Date | undefined) {
    if (!selectedDate) return;
    const hours = String(selectedDate.getHours()).padStart(2, "0");
    const minutes = String(selectedDate.getMinutes()).padStart(2, "0");
    const draft = `${hours}:${minutes}`;

    if (Platform.OS === "android") {
      void onSaveEveningBriefTime(draft);
      return;
    }
    if (eveningDebounceRef.current) clearTimeout(eveningDebounceRef.current);
    eveningDebounceRef.current = setTimeout(() => {
      void onSaveEveningBriefTime(draft);
    }, IOS_SAVE_DEBOUNCE_MS);
  }

  function openAndroidMorningPicker() {
    DateTimePickerAndroid.open({
      value: toPickerDate(morningBriefTimeDraft),
      mode: "time",
      is24Hour: true,
      onChange: (_, selectedDate) => applyMorningPick(selectedDate)
    });
  }

  function openAndroidEveningPicker() {
    DateTimePickerAndroid.open({
      value: toPickerDate(eveningBriefTime?.slice(0, 5) ?? "20:00"),
      mode: "time",
      is24Hour: true,
      onChange: (_, selectedDate) => applyEveningPick(selectedDate)
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.settingsScreen}>
        <SettingsSubpageHeader
          styles={styles}
          title={copy.settings.notificationsTitle}
          subtitle={copy.settings.notificationsSubtitle}
          onSelectSettingsSection={onSelectSettingsSection}
          parentSection="cat-notifications"
        />
        <ScrollView contentContainerStyle={styles.scrollContent} style={styles.scrollView}>
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{copy.settings.currentStatus}</Text>
            <SettingsStatusRow
              styles={styles}
              label={copy.settings.notificationsStatus}
              isOk={areDailyBriefNotificationsEnabled}
              issueText={copy.settings.notificationsDisabled}
              onIssuePress={() => onEnableDailyBriefNotifications()}
            />
            <SettingsStatusRow
              styles={styles}
              label={copy.settings.notificationsPermission}
              isOk={isNotificationPermissionGranted}
              issueText={copy.settings.notificationsBlocked}
              onIssuePress={() => onEnableDailyBriefNotifications()}
            />
            <Text style={styles.detailLine}>
              {copy.settings.notificationsTime}: {morningBriefTime ?? "09:00"}
            </Text>

            <View style={styles.sectionCard}>
              {Platform.OS === "android" ? (
                <Pressable onPress={openAndroidMorningPicker} style={styles.outlineButton}>
                  <Text style={styles.outlineButtonText}>{morningBriefTimeDraft || "09:00"}</Text>
                </Pressable>
              ) : (
                <DateTimePicker
                  display="spinner"
                  mode="time"
                  onChange={(_, selectedDate) => applyMorningPick(selectedDate)}
                  value={toPickerDate(morningBriefTimeDraft)}
                />
              )}
            </View>

            <View style={styles.buttonRow}>
              <Pressable
                onPress={() =>
                  void (areDailyBriefNotificationsEnabled
                    ? onDisableDailyBriefNotifications()
                    : onEnableDailyBriefNotifications())
                }
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>
                  {areDailyBriefNotificationsEnabled
                    ? copy.settings.notificationsDisable
                    : copy.settings.notificationsEnable}
                </Text>
              </Pressable>
            </View>

            {suggestedMorningTime ? (
              <View style={[styles.buttonRow, { marginTop: 8 }]}>
                <Text style={styles.helperText}>
                  {copy.settings.notificationsSuggestedTime} {suggestedMorningTime.slice(0, 5)}
                </Text>
                <Pressable onPress={() => void onApplySuggestedMorningTime()} style={styles.outlineButton}>
                  <Text style={styles.outlineButtonText}>{copy.settings.notificationsApplySuggestion}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {/* 저녁 브리핑 */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{copy.settings.notificationsEveningTitle}</Text>
            <Text style={styles.helperText}>{copy.settings.notificationsEveningSubtitle}</Text>
            <Text style={styles.detailLine}>
              {copy.settings.notificationsEveningTime}: {eveningBriefTime?.slice(0, 5) ?? "20:00"}
            </Text>

            <View style={styles.sectionCard}>
              {Platform.OS === "android" ? (
                <Pressable onPress={openAndroidEveningPicker} style={styles.outlineButton}>
                  <Text style={styles.outlineButtonText}>{eveningBriefTime?.slice(0, 5) ?? "20:00"}</Text>
                </Pressable>
              ) : (
                <DateTimePicker
                  display="spinner"
                  mode="time"
                  onChange={(_, selectedDate) => applyEveningPick(selectedDate)}
                  value={toPickerDate(eveningBriefTime?.slice(0, 5) ?? "20:00")}
                />
              )}
            </View>
          </View>

          {/* 출발 알림 */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{copy.settings.departureTitle}</Text>
            <Text style={styles.helperText}>{copy.settings.departureSubtitle}</Text>
            <SettingsStatusRow
              styles={styles}
              label={copy.settings.departureEnabledLabel}
              isOk={departureAlertsEnabled}
              issueText={copy.settings.notificationsDisabled}
              onIssuePress={() => onSetDepartureAlertsEnabled(true)}
            />

            <View style={styles.buttonRow}>
              <Pressable
                onPress={() => void onSetDepartureAlertsEnabled(!departureAlertsEnabled)}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>
                  {departureAlertsEnabled
                    ? copy.settings.notificationsDisable
                    : copy.settings.notificationsEnable}
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.detailLine, { marginTop: 12 }]}>
              {copy.settings.departureBufferLabel}: {departureBufferMinutes}
            </Text>
            <View style={[styles.buttonRow, { flexWrap: "wrap" }]}>
              {BUFFER_OPTIONS.map(value => {
                const isActive = departureBufferMinutes === value;
                return (
                  <Pressable
                    key={`buffer-${value}`}
                    onPress={() => void onSetDepartureBufferMinutes(value)}
                    style={isActive ? styles.secondaryButton : styles.outlineButton}
                  >
                    <Text style={isActive ? styles.secondaryButtonText : styles.outlineButtonText}>
                      {value}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
