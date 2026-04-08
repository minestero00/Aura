# Google Sign-In Setup

This project can now use the backend development auth stub, but real Google Sign-In needs Google Cloud OAuth setup owned by you.

## What You Need To Create

In Google Cloud Console, create:
- an iOS OAuth Client ID
- an Android OAuth Client ID
- a Web OAuth Client ID

For Android, you also need SHA-1 fingerprints for the signing keys you use.

## What I Need From You

Please prepare these values and send them to me when ready:

### iOS
- iOS OAuth Client ID
- iOS reversed client ID / URL scheme
- bundle identifier you want to keep for the app

### Android
- package name you want to keep for the app
- SHA-1 fingerprint for the debug keystore
- Android OAuth Client ID

### Web
- Web OAuth Client ID
- Web OAuth Client Secret

## Gmail Sync Requirements

To let the backend keep reading Gmail after the user leaves the app, Aura now uses Google's
`serverAuthCode -> access token / refresh token` exchange flow.

That means you also need to do these in Google Cloud:

- enable the `Gmail API`
- keep the `Web OAuth Client ID`
- provide the matching `Web OAuth Client Secret`
- add the Gmail scope to the OAuth consent screen:
  - `https://www.googleapis.com/auth/gmail.readonly`

Without the web client secret, Google sign-in can still work, but backend Gmail sync cannot finish.

## Recommended Source

Use the official React Native Google Sign-In setup guide:
- https://react-native-google-signin.github.io/docs/setting-up/get-config-file

What that guide says you should end up with:
- Android OAuth Client ID(s) with SHA-1 fingerprints
- iOS OAuth Client ID(s) with iOS URL scheme
- Web Client ID

## Notes For This Repo

Current native project identity still uses `AuraApp` internally in the generated React Native project.

That means if we keep the current generated IDs for now, the likely defaults are:
- iOS target / bundle setup based on `AuraApp`
- Android app name/package setup based on the generated project

Before real Google Sign-In integration, we should either:
1. keep the current native identifiers and create OAuth clients for them, or
2. rename the native app identifiers first, then create OAuth clients once

Option 2 is cleaner.
