import AsyncStorage from "@react-native-async-storage/async-storage";

const IGNORED_SENDERS_KEY = "aura.gmail.ignored-senders";

export interface IgnoredSenderRule {
  senderKey: string;
  label: string;
  createdAt: string;
}

export async function loadIgnoredSenderRules(): Promise<IgnoredSenderRule[]> {
  const raw = await AsyncStorage.getItem(IGNORED_SENDERS_KEY);

  if (!raw) {
    return [];
  }

  return JSON.parse(raw) as IgnoredSenderRule[];
}

export async function saveIgnoredSenderRules(rules: IgnoredSenderRule[]) {
  await AsyncStorage.setItem(IGNORED_SENDERS_KEY, JSON.stringify(rules));
}
