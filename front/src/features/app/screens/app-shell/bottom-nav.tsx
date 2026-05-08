import React from "react";
import { Pressable, Text, View } from "react-native";
import { createAppStyles, type AuraTheme } from "@features/app/styles";
import type { AppTabKey } from "@features/app/types";
import { TAB_ICONS } from "@features/app/screens/app-shell/tab-icons";

interface BottomNavProps {
  theme: AuraTheme;
  selectedTab: AppTabKey;
  navItems: Array<{ key: AppTabKey; label: string }>;
  onSelectTab: (tab: AppTabKey) => void;
}

export function BottomNav({ theme, selectedTab, navItems, onSelectTab }: BottomNavProps) {
  const styles = createAppStyles(theme);

  return (
    <View style={styles.bottomNav}>
      {navItems.map(item => {
        const isActive = selectedTab === item.key;
        const Icon = TAB_ICONS[item.key];
        const iconColor = isActive ? theme.colors.accent : theme.colors.textMuted;

        return (
          <Pressable
            key={item.key}
            onPress={() => onSelectTab(item.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            style={styles.bottomNavItem}
          >
            <View style={styles.bottomNavIndicatorRow}>
              <View
                style={[
                  styles.bottomNavIndicator,
                  isActive ? styles.bottomNavIndicatorActive : null
                ]}
              />
            </View>
            <Icon color={iconColor} size={22} />
            <Text
              style={[styles.bottomNavLabel, isActive ? styles.bottomNavLabelActive : null]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
