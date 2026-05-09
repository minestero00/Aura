import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { type Dispatch, type SetStateAction } from "react";
import { connectGmailIntegration, disconnectGmailIntegration } from "@features/auth/api";
import { type IgnoredSenderRule } from "@features/gmail/storage";
import type { GmailDigest, GmailMessage } from "@features/gmail/types";
import type { ActionableError, AuthSessionState } from "@features/app/types";
import { getErrorMessage } from "@features/app/hooks/use-aura-app/helpers";
import { createSessionManager } from "@features/app/hooks/use-aura-app/session";
export { loadDailyEmailBrief, loadEmailSummary, loadRecentEmails } from "./gmail-inbox";
export { ignoreSender, removeIgnoredSender } from "./gmail-sender-rules";
export { replyToMessage } from "./gmail-reply";

export interface GmailModuleDeps {
  authState: AuthSessionState | null;
  language: "ko" | "en";
  ignoredSenderRules: IgnoredSenderRule[];
  withSessionAutoRefresh: ReturnType<typeof createSessionManager>["withSessionAutoRefresh"];
  syncMe: ReturnType<typeof createSessionManager>["syncMe"];
  setErrorMessage: Dispatch<SetStateAction<string | null>>;
  setActionableError: Dispatch<SetStateAction<ActionableError | null>>;
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
      () =>
        connectGmailIntegration({
          accessToken: tokens.accessToken,
          serverAuthCode: serverAuthCode ?? undefined,
          email: currentUser?.user.email ?? "",
          scopes: normalizedScopes
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
    const { session } = await deps.withSessionAutoRefresh(() => disconnectGmailIntegration());
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
