import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { Linking } from "react-native";
import { type Dispatch, type SetStateAction } from "react";
import { connectGmailIntegration, disconnectGmailIntegration } from "@features/auth/api";
import {
  createGmailReplyDraft,
  fetchDailyGmailSummary,
  fetchGmailSummary,
  fetchRecentGmailMessages
} from "@features/gmail/api";
import { filterIgnoredMessages } from "@features/gmail/filtering";
import { saveIgnoredSenderRules, type IgnoredSenderRule } from "@features/gmail/storage";
import type { GmailDigest, GmailMessage } from "@features/gmail/types";
import type { AuthSessionState } from "@features/app/types";
import { getErrorMessage, getIgnoredSenderKeys } from "@features/app/hooks/use-aura-app/helpers";
import { createSessionManager } from "@features/app/hooks/use-aura-app/session";

export interface GmailModuleDeps {
  authState: AuthSessionState | null;
  language: "ko" | "en";
  ignoredSenderRules: IgnoredSenderRule[];
  withSessionAutoRefresh: ReturnType<typeof createSessionManager>["withSessionAutoRefresh"];
  syncMe: ReturnType<typeof createSessionManager>["syncMe"];
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
  setIsGmailSubmitting: Dispatch<SetStateAction<boolean>>;
  setIsInboxLoading: Dispatch<SetStateAction<boolean>>;
  setGmailMessages: Dispatch<SetStateAction<GmailMessage[]>>;
  setGmailDigest: Dispatch<SetStateAction<GmailDigest | null>>;
  setDailyEmailDigest: Dispatch<SetStateAction<GmailDigest | null>>;
  setDailyEmailMessages: Dispatch<SetStateAction<GmailMessage[]>>;
  setReplyingMessageId: Dispatch<SetStateAction<string | null>>;
  setIgnoredSenderRules: Dispatch<SetStateAction<IgnoredSenderRule[]>>;
}

export async function connectGmailForCurrentSession(
  deps: GmailModuleDeps,
  session: AuthSessionState["session"],
  scopes: string[]
) {
  deps.setIsGmailSubmitting(true);
  deps.setErrorMessage(null);

  try {
    let signedInUser = GoogleSignin.getCurrentUser();

    if (!signedInUser) {
      const signInResponse = await GoogleSignin.signIn();

      if (signInResponse.type !== "success") {
        return;
      }

      signedInUser = signInResponse.data;
    }

    const scopeResult = await GoogleSignin.addScopes({ scopes });

    if (scopeResult?.type === "cancelled") {
      return;
    }

    const tokens = await GoogleSignin.getTokens();
    const currentUser = GoogleSignin.getCurrentUser() ?? signedInUser;
    const serverAuthCode =
      scopeResult?.type === "success" ? scopeResult.data.serverAuthCode : currentUser?.serverAuthCode;

    const normalizedScopes = Array.from(new Set([...(currentUser?.scopes ?? []), ...scopes])).sort();

    const { session: activeSession } = await deps.withSessionAutoRefresh(
      accessToken =>
        connectGmailIntegration({
          accessToken: tokens.accessToken,
          serverAuthCode: serverAuthCode ?? undefined,
          email: currentUser?.user.email ?? "",
          scopes: normalizedScopes,
          sessionAccessToken: accessToken
        }),
      session
    );

    await deps.syncMe(activeSession);
  } catch (error: unknown) {
    deps.setErrorMessage(getErrorMessage(error, "Unable to connect Gmail right now."));
  } finally {
    deps.setIsGmailSubmitting(false);
  }
}

export async function disconnectGmail(deps: GmailModuleDeps) {
  if (!deps.authState) {
    return;
  }

  deps.setIsGmailSubmitting(true);
  deps.setErrorMessage(null);

  try {
    const { session } = await deps.withSessionAutoRefresh(accessToken => disconnectGmailIntegration(accessToken));
    deps.setGmailMessages([]);
    deps.setGmailDigest(null);
    deps.setDailyEmailDigest(null);
    deps.setDailyEmailMessages([]);
    await deps.syncMe(session);
  } catch (error: unknown) {
    deps.setErrorMessage(getErrorMessage(error, "Unable to disconnect Gmail right now."));
  } finally {
    deps.setIsGmailSubmitting(false);
  }
}

export async function loadRecentEmails(deps: GmailModuleDeps) {
  if (!deps.authState) {
    return;
  }

  deps.setIsInboxLoading(true);
  deps.setErrorMessage(null);

  try {
    const { result: response } = await deps.withSessionAutoRefresh(accessToken =>
      fetchRecentGmailMessages(accessToken, 5, getIgnoredSenderKeys(deps.ignoredSenderRules))
    );
    deps.setGmailMessages(filterIgnoredMessages(response.messages, deps.ignoredSenderRules));
  } catch (error: unknown) {
    deps.setErrorMessage(getErrorMessage(error, "Unable to load Gmail messages right now."));
  } finally {
    deps.setIsInboxLoading(false);
  }
}

export async function loadEmailSummary(deps: GmailModuleDeps) {
  if (!deps.authState) {
    return;
  }

  deps.setIsInboxLoading(true);
  deps.setErrorMessage(null);

  try {
    const { result: response } = await deps.withSessionAutoRefresh(accessToken =>
      fetchGmailSummary(accessToken, 5, getIgnoredSenderKeys(deps.ignoredSenderRules), deps.language)
    );
    const filteredMessages = filterIgnoredMessages(response.messages, deps.ignoredSenderRules);
    deps.setGmailDigest(response.digest);
    deps.setGmailMessages(filteredMessages);
  } catch (error: unknown) {
    deps.setErrorMessage(getErrorMessage(error, "Unable to summarize Gmail right now."));
  } finally {
    deps.setIsInboxLoading(false);
  }
}

export async function loadDailyEmailBrief(deps: GmailModuleDeps) {
  if (!deps.authState) {
    return;
  }

  deps.setIsInboxLoading(true);
  deps.setErrorMessage(null);

  try {
    const { result: response } = await deps.withSessionAutoRefresh(accessToken =>
      fetchDailyGmailSummary(accessToken, getIgnoredSenderKeys(deps.ignoredSenderRules), deps.language)
    );
    const filteredMessages = filterIgnoredMessages(response.messages, deps.ignoredSenderRules);
    deps.setDailyEmailDigest(response.digest);
    deps.setDailyEmailMessages(filteredMessages);
  } catch (error: unknown) {
    deps.setErrorMessage(getErrorMessage(error, "Unable to build today's email brief right now."));
  } finally {
    deps.setIsInboxLoading(false);
  }
}

export async function ignoreSender(deps: GmailModuleDeps, message: GmailMessage, senderKey: string) {
  const exists = deps.ignoredSenderRules.some(rule => rule.senderKey === senderKey);

  if (exists) {
    return;
  }

  const nextRules = [
    ...deps.ignoredSenderRules,
    {
      senderKey,
      label: message.from,
      createdAt: new Date().toISOString()
    }
  ];

  deps.setIgnoredSenderRules(nextRules);
  deps.setGmailDigest(null);
  deps.setDailyEmailDigest(null);
  await saveIgnoredSenderRules(nextRules);
}

export async function removeIgnoredSender(deps: GmailModuleDeps, senderKey: string) {
  const nextRules = deps.ignoredSenderRules.filter(rule => rule.senderKey !== senderKey);
  deps.setIgnoredSenderRules(nextRules);
  deps.setGmailDigest(null);
  deps.setDailyEmailDigest(null);
  await saveIgnoredSenderRules(nextRules);
}

export async function replyToMessage(deps: GmailModuleDeps, message: GmailMessage) {
  if (!deps.authState) {
    return;
  }

  deps.setReplyingMessageId(message.id);
  deps.setErrorMessage(null);

  try {
    await deps.withSessionAutoRefresh(accessToken => createGmailReplyDraft(accessToken, message.id, deps.language));
    await Linking.openURL("https://mail.google.com/mail/u/0/#drafts");
  } catch (error: unknown) {
    deps.setErrorMessage(
      getErrorMessage(
        error,
        deps.language === "ko"
          ? "답장 초안을 만들 수 없습니다. Gmail 접근을 다시 연결해보세요."
          : "Unable to create the reply draft right now."
      )
    );
  } finally {
    deps.setReplyingMessageId(null);
  }
}
