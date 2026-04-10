import React from "react";
import { Pressable, Text, View } from "react-native";
import { createAppStyles, type AuraTheme } from "@features/app/styles";
import type { AppTabKey } from "@features/app/types";

interface BottomNavProps {
  theme: AuraTheme;
  selectedTab: AppTabKey;
  navItems: Array<{ key: AppTabKey; label: string; icon: string }>;
  onSelectTab: (tab: AppTabKey) => void;
}

export function BottomNav({ theme, selectedTab, navItems, onSelectTab }: BottomNavProps) {
  const styles = createAppStyles(theme);

  return (
    <View style={styles.bottomNav}>
      {navItems.map(item => {
        const isActive = selectedTab === item.key;

        return (
          <Pressable
            key={item.key}
            onPress={() => onSelectTab(item.key)}
            style={[styles.bottomNavItem, isActive ? styles.bottomNavItemActive : null]}
          >
            <Text style={[styles.bottomNavIcon, isActive ? styles.bottomNavIconActive : null]}>
              {item.icon}
            </Text>
            <Text style={[styles.bottomNavLabel, isActive ? styles.bottomNavLabelActive : null]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
