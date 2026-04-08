import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import { startTransition, useEffect, useState } from "react";
import { Platform, Linking } from "react-native";
import { googleConfig } from "../../../config/google";
import { ApiError } from "../../../lib/api/client";
import { getCategoryLabel, getCopy, type AppLanguage } from "../i18n";
import { loadAppLanguage, saveAppLanguage } from "../storage";
import {
  connectGmailIntegration,
  disconnectGmailIntegration,
  fetchMe,
  signInWithGoogleToken
} from "../../auth/api";
import { clearAuthSession, loadAuthSession, saveAuthSession } from "../../auth/storage";
import {
  createGmailReplyDraft,
  fetchDailyGmailSummary,
  fetchGmailSummary,
  fetchRecentGmailMessages
} from "../../gmail/api";
import { buildLocalDigest, filterIgnoredMessages, getSenderKey } from "../../gmail/filtering";
import { loadIgnoredSenderRules, saveIgnoredSenderRules } from "../../gmail/storage";
import type { GmailDigest, GmailMessage } from "../../gmail/types";
import type { IgnoredSenderRule } from "../../gmail/storage";
import { fetchDailyNewsBriefing } from "../../news/api";
import { loadEnabledNewsCategories, saveEnabledNewsCategories } from "../../news/storage";
import type { NewsArticle, NewsBriefing, NewsCategory } from "../../news/types";
import type {
  AppTabKey,
  AuthSessionState,
  SettingsSectionKey,
  UseAuraAppResult
} from "../types";

const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
const GMAIL_COMPOSE_SCOPE = "https://www.googleapis.com/auth/gmail.compose";

GoogleSignin.configure({
  offlineAccess: true,
  webClientId: googleConfig.webClientId,
  iosClientId: googleConfig.iosClientId
});

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function getIgnoredSenderKeys(rules: IgnoredSenderRule[]) {
  return rules.map(rule => rule.senderKey);
}

export function useAuraApp(): UseAuraAppResult {
  const [authState, setAuthState] = useState<AuthSessionState | null>(null);
  const [language, setLanguage] = useState<AppLanguage>("en");
  const [selectedTab, setSelectedTab] = useState<AppTabKey>("mail");
  const [selectedSettingsSection, setSelectedSettingsSection] =
    useState<SettingsSectionKey>("menu");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGmailSubmitting, setIsGmailSubmitting] = useState(false);
  const [isInboxLoading, setIsInboxLoading] = useState(false);
  const [isNewsLoading, setIsNewsLoading] = useState(false);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [gmailDebugState, setGmailDebugState] = useState("idle");
  const [gmailMessages, setGmailMessages] = useState<GmailMessage[]>([]);
  const [gmailDigest, setGmailDigest] = useState<GmailDigest | null>(null);
  const [replyingMessageId, setReplyingMessageId] = useState<string | null>(null);
  const [dailyEmailDigest, setDailyEmailDigest] = useState<GmailDigest | null>(null);
  const [dailyEmailMessages, setDailyEmailMessages] = useState<GmailMessage[]>([]);
  const [ignoredSenderRules, setIgnoredSenderRules] = useState<IgnoredSenderRule[]>([]);
  const [ignoredSenderDraft, setIgnoredSenderDraft] = useState("");
  const [enabledNewsCategories, setEnabledNewsCategories] = useState<NewsCategory[]>([
    "world",
    "business",
    "tech"
  ]);
  const [newsBriefing, setNewsBriefing] = useState<NewsBriefing | null>(null);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapLanguage() {
      const storedLanguage = await loadAppLanguage();

      if (isMounted) {
        setLanguage(storedLanguage);
      }
    }

    void bootstrapLanguage();

    async function bootstrapSession() {
      try {
        const stored = await loadAuthSession();

        if (!stored) {
          return;
        }

        const me = await fetchMe(stored.session.accessToken);

        if (!isMounted) {
          return;
        }

        startTransition(() => {
          setAuthState({
            session: stored.session,
            me
          });
        });
      } catch {
        await clearAuthSession();
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    }

    void bootstrapSession();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapNewsCategories() {
      const categories = await loadEnabledNewsCategories();

      if (isMounted) {
        setEnabledNewsCategories(categories);
      }
    }

    void bootstrapNewsCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!authState?.me.integrations.gmailConnected) {
      return;
    }

    if (isInboxLoading || dailyEmailDigest || dailyEmailMessages.length > 0) {
      return;
    }

    void handleLoadDailyEmailBriefForSession(authState.session);
  }, [
    authState?.me.integrations.gmailConnected,
    authState?.session.accessToken,
    dailyEmailDigest,
    dailyEmailMessages.length,
    isInboxLoading,
    ignoredSenderRules
  ]);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapIgnoredSenders() {
      const rules = await loadIgnoredSenderRules();

      if (isMounted) {
        setIgnoredSenderRules(rules);
      }
    }

    void bootstrapIgnoredSenders();

    return () => {
      isMounted = false;
    };
  }, []);

  async function syncMe(session: AuthSessionState["session"]) {
    const me = await fetchMe(session.accessToken);

    await saveAuthSession({
      session,
      me
    });

    startTransition(() => {
      setAuthState({
        session,
        me
      });
    });
  }

  async function connectGmailForCurrentSession(session: AuthSessionState["session"]) {
    setIsGmailSubmitting(true);
    setErrorMessage(null);

    try {
      let signedInUser = GoogleSignin.getCurrentUser();

      if (!signedInUser) {
        const signInResponse = await GoogleSignin.signIn();

        if (signInResponse.type !== "success") {
          return;
        }

        signedInUser = signInResponse.data;
      }

      const scopeResult = await GoogleSignin.addScopes({
        scopes: [GMAIL_READONLY_SCOPE, GMAIL_COMPOSE_SCOPE]
      });

      if (scopeResult?.type === "cancelled") {
        return;
      }

      const tokens = await GoogleSignin.getTokens();
      const currentUser = GoogleSignin.getCurrentUser() ?? signedInUser;
      const serverAuthCode =
        scopeResult?.type === "success"
          ? scopeResult.data.serverAuthCode
          : currentUser?.serverAuthCode;

      const scopes = Array.from(
        new Set([...(currentUser?.scopes ?? []), GMAIL_READONLY_SCOPE, GMAIL_COMPOSE_SCOPE])
      ).sort();

      await connectGmailIntegration({
        accessToken: tokens.accessToken,
        serverAuthCode: serverAuthCode ?? undefined,
        email: currentUser?.user.email ?? "",
        scopes,
        sessionAccessToken: session.accessToken
      });

      await syncMe(session);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Unable to connect Gmail right now."));
    } finally {
      setIsGmailSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (Platform.OS === "android") {
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true
        });
      }

      const response = await GoogleSignin.signIn();

      if (response.type !== "success") {
        setErrorMessage("Google sign-in was cancelled.");
        return;
      }

      if (!response.data.idToken) {
        setErrorMessage("Google did not return an ID token.");
        return;
      }

      const auth = await signInWithGoogleToken(response.data.idToken);
      await syncMe(auth.session);
      setSelectedTab("mail");
      setSelectedSettingsSection("menu");

      if (!auth.integrations.gmailConnected) {
        await connectGmailForCurrentSession(auth.session);
        await handleLoadDailyEmailBriefForSession(auth.session);
      } else {
        await handleLoadDailyEmailBriefForSession(auth.session);
      }
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE
      ) {
        setErrorMessage("Google Play Services is not available on this device.");
      } else if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === statusCodes.SIGN_IN_CANCELLED
      ) {
        setErrorMessage("Google sign-in was cancelled.");
      } else {
        setErrorMessage(getErrorMessage(error, "Unable to sign in with Google right now."));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReset() {
    await clearAuthSession();

    try {
      await GoogleSignin.signOut();
    } catch {
      // Ignore native sign out errors during local reset.
    }

    setAuthState(null);
    setErrorMessage(null);
    setGmailDebugState("idle");
    setGmailMessages([]);
    setGmailDigest(null);
    setDailyEmailDigest(null);
    setDailyEmailMessages([]);
    setNewsBriefing(null);
    setNewsArticles([]);
    setSelectedTab("mail");
    setSelectedSettingsSection("menu");
  }

  async function handleConnectGmail() {
    if (!authState) {
      return;
    }
    setGmailDebugState("manual_connect_requested");
    await connectGmailForCurrentSession(authState.session);
    await handleLoadDailyEmailBriefForSession(authState.session);
  }

  async function handleDisconnectGmail() {
    if (!authState) {
      return;
    }

    setIsGmailSubmitting(true);
    setErrorMessage(null);

    try {
      await disconnectGmailIntegration(authState.session.accessToken);
      setGmailMessages([]);
      setGmailDigest(null);
      setDailyEmailDigest(null);
      setDailyEmailMessages([]);
      await syncMe(authState.session);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Unable to disconnect Gmail right now."));
    } finally {
      setIsGmailSubmitting(false);
    }
  }

  async function handleLoadRecentEmails() {
    if (!authState) {
      return;
    }

    setIsInboxLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetchRecentGmailMessages(
        authState.session.accessToken,
        5,
        getIgnoredSenderKeys(ignoredSenderRules)
      );
      setGmailMessages(filterIgnoredMessages(response.messages, ignoredSenderRules));
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Unable to load Gmail messages right now."));
    } finally {
      setIsInboxLoading(false);
    }
  }

  async function handleLoadEmailSummary() {
    if (!authState) {
      return;
    }

    setIsInboxLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetchGmailSummary(
        authState.session.accessToken,
        5,
        getIgnoredSenderKeys(ignoredSenderRules),
        language
      );
      const filteredMessages = filterIgnoredMessages(response.messages, ignoredSenderRules);
      setGmailDigest(response.digest);
      setGmailMessages(filteredMessages);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Unable to summarize Gmail right now."));
    } finally {
      setIsInboxLoading(false);
    }
  }

  async function handleLoadDailyEmailBrief() {
    if (!authState) {
      return;
    }

    await handleLoadDailyEmailBriefForSession(authState.session);
  }

  async function handleLoadDailyEmailBriefForSession(session: AuthSessionState["session"]) {
    setIsInboxLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetchDailyGmailSummary(
        session.accessToken,
        getIgnoredSenderKeys(ignoredSenderRules),
        language
      );
      const filteredMessages = filterIgnoredMessages(response.messages, ignoredSenderRules);
      setDailyEmailDigest(response.digest);
      setDailyEmailMessages(filteredMessages);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Unable to build today's email brief right now."));
    } finally {
      setIsInboxLoading(false);
    }
  }

  async function handleLoadDailyNewsBrief() {
    if (!authState) {
      return;
    }

    setIsNewsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetchDailyNewsBriefing(
        authState.session.accessToken,
        enabledNewsCategories,
        language
      );
      setNewsBriefing(response.briefing);
      setNewsArticles(response.articles);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Unable to load the daily news brief right now."));
    } finally {
      setIsNewsLoading(false);
    }
  }

  async function handleIgnoreSender(message: GmailMessage) {
    const senderKey = getSenderKey(message.from);
    const exists = ignoredSenderRules.some(rule => rule.senderKey === senderKey);

    if (exists) {
      return;
    }

    const nextRules = [
      ...ignoredSenderRules,
      {
        senderKey,
        label: message.from,
        createdAt: new Date().toISOString()
      }
    ];

    setIgnoredSenderRules(nextRules);
    setGmailDigest(null);
    setDailyEmailDigest(null);
    await saveIgnoredSenderRules(nextRules);
  }

  function handleOpenGmailSettings() {
    setSelectedTab("settings");
    setSelectedSettingsSection("gmail");
  }

  function handleOpenIgnoredSenderSettings(message?: GmailMessage) {
    setSelectedTab("settings");
    setSelectedSettingsSection("ignored-senders");

    if (message) {
      setIgnoredSenderDraft(getSenderKey(message.from));
    }
  }

  function handleOpenNewsSettings() {
    setSelectedTab("settings");
    setSelectedSettingsSection("news");
  }

  function handleOpenLanguageSettings() {
    setSelectedTab("settings");
    setSelectedSettingsSection("language");
  }

  async function handleRemoveIgnoredSender(senderKey: string) {
    const nextRules = ignoredSenderRules.filter(rule => rule.senderKey !== senderKey);
    setIgnoredSenderRules(nextRules);
    setGmailDigest(null);
    setDailyEmailDigest(null);
    await saveIgnoredSenderRules(nextRules);
  }

  async function handleSaveIgnoredSenderDraft() {
    const normalized = ignoredSenderDraft.trim().toLowerCase();

    if (!normalized) {
      return;
    }

    const exists = ignoredSenderRules.some(rule => rule.senderKey === normalized);
    if (exists) {
      setIgnoredSenderDraft("");
      return;
    }

    const nextRules = [
      ...ignoredSenderRules,
      {
        senderKey: normalized,
        label: normalized,
        createdAt: new Date().toISOString()
      }
    ];

    setIgnoredSenderRules(nextRules);
    setIgnoredSenderDraft("");
    setGmailDigest(null);
    setDailyEmailDigest(null);
    await saveIgnoredSenderRules(nextRules);
  }

  async function handleToggleNewsCategory(category: NewsCategory) {
    const exists = enabledNewsCategories.includes(category);

    if (!exists && enabledNewsCategories.length >= 5) {
      setErrorMessage(
        language === "ko"
          ? "뉴스 토픽은 최대 5개까지 선택할 수 있습니다."
          : "You can select up to 5 news topics."
      );
      return;
    }

    const nextCategories = exists
      ? enabledNewsCategories.filter(value => value !== category)
      : [...enabledNewsCategories, category];

    if (nextCategories.length === 0) {
      return;
    }

    setEnabledNewsCategories(nextCategories);
    setNewsBriefing(null);
    setNewsArticles([]);
    await saveEnabledNewsCategories(nextCategories);
  }

  async function handleSetLanguage(nextLanguage: AppLanguage) {
    setLanguage(nextLanguage);
    await saveAppLanguage(nextLanguage);
  }

  async function handleReplyToMessage(message: GmailMessage) {
    if (!authState) {
      return;
    }

    setReplyingMessageId(message.id);
    setErrorMessage(null);

    try {
      const response = await createGmailReplyDraft(
        authState.session.accessToken,
        message.id,
        language
      );
      const draftUrl = `https://mail.google.com/mail/u/0/#drafts`;
      await Linking.openURL(draftUrl);
    } catch (error: unknown) {
      setErrorMessage(
        getErrorMessage(
          error,
          language === "ko"
            ? "답장 초안을 만들 수 없습니다. Gmail 접근을 다시 연결해보세요."
            : "Unable to create the reply draft right now."
        )
      );
    } finally {
      setReplyingMessageId(null);
    }
  }

  const visibleGmailMessages = filterIgnoredMessages(gmailMessages, ignoredSenderRules);
  const visibleDailyEmailMessages = filterIgnoredMessages(dailyEmailMessages, ignoredSenderRules);
  const isGmailRefreshRequired =
    Boolean(authState?.me.integrations.gmailConnected) &&
    !Boolean(authState?.me.integrations.gmailSyncReady) &&
    Boolean(authState?.me.integrations.gmailAccessExpiresAt) &&
    new Date(authState?.me.integrations.gmailAccessExpiresAt ?? 0).getTime() <= Date.now();
  const copy = getCopy(language);

  return {
    authState,
    copy,
    dailyEmailDigest,
    dailyEmailMessages: visibleDailyEmailMessages,
    enabledNewsCategories,
    errorMessage,
    language,
    gmailDebugState,
    gmailDigest,
    gmailMessages: visibleGmailMessages,
    replyingMessageId,
    ignoredSenderRules,
    ignoredSenderDraft,
    isBootstrapping,
    isGmailSubmitting,
    isInboxLoading,
    isNewsLoading,
    isSubmitting,
    isGmailRefreshRequired,
    newsArticles,
    newsBriefing,
    selectedTab,
    selectedSettingsSection,
    handleConnectGmail,
    handleDisconnectGmail,
    handleIgnoredSenderDraftChange: setIgnoredSenderDraft,
    handleIgnoreSender,
    handleOpenGmailSettings,
    handleOpenIgnoredSenderSettings,
    handleOpenLanguageSettings,
    handleOpenNewsSettings,
    handleRemoveIgnoredSender,
    handleLoadDailyEmailBrief,
    handleLoadDailyNewsBrief,
    handleGoogleSignIn,
    handleLoadEmailSummary,
    handleLoadRecentEmails,
    handleReplyToMessage,
    handleReset
    ,
    handleSaveIgnoredSenderDraft,
    handleSetLanguage,
    handleToggleNewsCategory,
    labelNewsCategory: category => getCategoryLabel(language, category),
    handleSelectTab: tab => {
      setSelectedTab(tab);
      if (tab !== "settings") {
        setSelectedSettingsSection("menu");
      }
    },
    handleSelectSettingsSection: setSelectedSettingsSection
  };
}
