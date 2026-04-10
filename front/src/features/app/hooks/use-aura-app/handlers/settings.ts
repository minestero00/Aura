import { Linking } from "react-native";
import { getErrorMessage } from "@features/app/hooks/use-aura-app/helpers";
import { saveAppLanguage } from "@features/app/storage";
import { saveEnabledNewsCategories } from "@features/news/storage";
import type { NewsCategory } from "@features/news/types";
import { fetchUsage } from "@features/usage/api";
import type { AuraHandlersContext } from "./types";

export function createSettingsHandlers(context: AuraHandlersContext) {
  async function handleLoadUsage() {
    if (!context.authState) {
      return;
    }

    try {
      context.setErrorMessage(null);
      const { result } = await context.withSessionAutoRefresh(accessToken => fetchUsage(accessToken));
      context.setUsage(result);
    } catch (error: unknown) {
      context.setErrorMessage(
        getErrorMessage(
          error,
          context.language === "ko" ? "사용량 정보를 불러올 수 없습니다." : "Unable to load usage right now."
        )
      );
    }
  }

  async function handleToggleNewsCategory(category: NewsCategory) {
    const exists = context.enabledNewsCategories.includes(category);

    if (!exists && context.enabledNewsCategories.length >= 5) {
      context.setErrorMessage(
        context.language === "ko"
          ? "뉴스 토픽은 최대 5개까지 선택할 수 있습니다."
          : "You can select up to 5 news topics."
      );
      return;
    }

    const nextCategories = exists
      ? context.enabledNewsCategories.filter(value => value !== category)
      : [...context.enabledNewsCategories, category];

    if (nextCategories.length === 0) {
      return;
    }

    context.setEnabledNewsCategories(nextCategories);
    context.setNewsBriefing(null);
    context.setNewsArticles([]);
    await saveEnabledNewsCategories(nextCategories);
  }

  async function handleSetLanguage(nextLanguage: "ko" | "en") {
    context.setLanguage(nextLanguage);
    await saveAppLanguage(nextLanguage);
  }

  async function handleOpenSystemSettings() {
    await Linking.openSettings();
  }

  return {
    handleLoadUsage,
    handleToggleNewsCategory,
    handleSetLanguage,
    handleOpenSystemSettings
  };
}
