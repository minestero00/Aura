import React from "react";
import { createAppStyles, useAuraTheme } from "@features/app/styles";
import { SettingsSectionContent } from "@features/app/screens/settings/sections";
import type { SettingsScreenProps } from "@features/app/screens/settings/types";

export function SettingsScreen(props: SettingsScreenProps) {
  const styles = createAppStyles(useAuraTheme());

  return <SettingsSectionContent {...props} styles={styles} />;
}
