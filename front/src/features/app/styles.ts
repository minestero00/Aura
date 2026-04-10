import { StyleSheet } from "react-native";
import { buildContentStyles } from "@features/app/styles/blocks/content";
import { buildInteractiveStyles } from "@features/app/styles/blocks/interactive";
import { buildShellStyles } from "@features/app/styles/blocks/shell";
import { type AuraTheme, useAuraTheme } from "@features/app/styles/theme";

export type { AuraTheme } from "@features/app/styles/theme";
export { useAuraTheme } from "@features/app/styles/theme";

export function createAppStyles(theme: AuraTheme) {
  return StyleSheet.create({
    ...buildShellStyles(theme),
    ...buildContentStyles(theme),
    ...buildInteractiveStyles(theme)
  });
}
