import { EN_COPY } from "./i18n/en";
import { KO_COPY } from "./i18n/ko";
import { getCategoryLabel } from "./i18n/category-labels";
import type { AppLanguage } from "./i18n/types";

export type { AppCopy, AppLanguage } from "./i18n/types";
export { getCategoryLabel } from "./i18n/category-labels";

export function getCopy(language: AppLanguage) {
  return language === "ko" ? KO_COPY : EN_COPY;
}
