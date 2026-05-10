import { Linking, Platform } from "react-native";

interface ComposeMailParams {
  to: string;
  subject: string;
  body: string;
}

function encodeRecipient(value: string): string {
  // "Name <user@example.com>" → "user@example.com" 형태 추출. mailto/deeplink는 주소만 받음.
  const angleMatch = /<([^>]+)>/.exec(value);
  return encodeURIComponent(angleMatch ? angleMatch[1].trim() : value.trim());
}

function buildMailtoUrl({ to, subject, body }: ComposeMailParams): string {
  const params = new URLSearchParams();
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  const query = params.toString();
  return `mailto:${encodeRecipient(to)}${query ? `?${query}` : ""}`;
}

function buildGmailIosDeeplink({ to, subject, body }: ComposeMailParams): string {
  const params = new URLSearchParams();
  params.set("to", encodeRecipient(to));
  if (subject) params.set("subject", subject);
  if (body) params.set("body", body);
  return `googlegmail://co?${params.toString()}`;
}

/**
 * 사용자가 외부 메일 앱에서 직접 send. AURA는 초안만 제공 — Gmail send scope나 권한 없이
 * 안전. iOS는 Gmail 앱 우선(설치돼 있으면), Android는 mailto가 시스템 chooser를 띄워
 * 사용자가 Gmail/다른 메일 앱 선택. canOpenURL이 fail하면 mailto fallback.
 */
export async function openComposeInExternalApp(params: ComposeMailParams): Promise<boolean> {
  if (Platform.OS === "ios") {
    const gmailUrl = buildGmailIosDeeplink(params);
    try {
      const canOpenGmail = await Linking.canOpenURL(gmailUrl);
      if (canOpenGmail) {
        await Linking.openURL(gmailUrl);
        return true;
      }
    } catch {
      // canOpenURL 실패 — mailto로 fallback.
    }
  }

  const mailto = buildMailtoUrl(params);
  try {
    await Linking.openURL(mailto);
    return true;
  } catch {
    return false;
  }
}
