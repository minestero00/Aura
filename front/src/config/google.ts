import {
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_IOS_URL_SCHEME,
  GOOGLE_WEB_CLIENT_ID
} from "@env";

export const googleConfig = {
  webClientId: GOOGLE_WEB_CLIENT_ID,
  iosClientId: GOOGLE_IOS_CLIENT_ID,
  androidClientId: GOOGLE_ANDROID_CLIENT_ID,
  iosUrlScheme: GOOGLE_IOS_URL_SCHEME
} as const;
