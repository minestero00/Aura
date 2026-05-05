export type PushPlatform = "ios" | "android";

export interface PushDevice {
  id: string;
  userId: string;
  platform: PushPlatform;
  pushToken: string;
  deviceId: string | null;
  appVersion: string | null;
  lastSeenAt: string;
}

export interface PushPayload {
  title: string;
  body: string;
  category?: string;
  data?: Record<string, string | number | boolean>;
  critical?: boolean;
}

export interface PushDispatchResult {
  delivered: number;
  failed: number;
  attempted: number;
}
