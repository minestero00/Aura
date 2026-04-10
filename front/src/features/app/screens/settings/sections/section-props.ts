import type { SettingsScreenProps } from "@features/app/screens/settings/types";
import type { createAppStyles } from "@features/app/styles";

export interface SettingsSectionProps extends SettingsScreenProps {
  styles: ReturnType<typeof createAppStyles>;
}
