# Ezana iOS and Android: submission checklist

The apps are a Capacitor shell around `https://ezana.world` (start page `/home`) with native push alerts, Face ID or fingerprint unlock, native share, haptics, deep links, an offline screen and in-app purchases. Bundle id and application id: `world.ezana.app`. Display name: `Ezana`.

What the v1 apps do not offer, by design: real-money brokerage trading, bank or brokerage account linking (Plaid, SnapTrade), web checkout and the Stripe billing portal. The app redirects those pages to `/web-only` ("Available on ezana.world", no link, no price) and the server refuses their API calls from the app. Paper trading stays. University and organisation plans are sold to institutions under contract and are not sold in the app.

## 1. Accounts

1. Get a D-U-N-S number for **Ezana Finance, Inc.** (free from Dun & Bradstreet; allow a few days to two weeks). Both stores need it for an organisation account.
2. Enrol in the **Apple Developer Program as the organisation** Ezana Finance, Inc. (US$99 a year). Apple requires the legal entity, not an individual, for finance apps.
3. Open a **Google Play Console organisation account** (US$25 once). Organisation accounts skip the 12-tester, 14-day closed test that new personal accounts must run before production.

## 2. Services

1. **Firebase** (Android push only). Create a project, add an Android app with package `world.ezana.app`, download `google-services.json`, and create a service account key with the Firebase Cloud Messaging role. iOS push goes straight to Apple (APNs), so no iOS app or APNs key is needed in Firebase.
2. **Apple push key.** In the Apple Developer portal create an APNs auth key (`.p8`); note its key id. Enable the Push Notifications and Associated Domains capabilities on the `world.ezana.app` identifier.
3. **RevenueCat.** Create a project, connect the App Store (App Store Connect API key and the in-app purchase key) and Google Play (service account). Create four entitlements, `personal`, `personal_advanced`, `family`, `professional`, and attach the products below. Set the webhook URL to `https://ezana.world/api/revenuecat/webhook` with an Authorization header value equal to `REVENUECAT_WEBHOOK_SECRET`. The app logs in with the Supabase user id, so web and app purchases map to one person.
4. **Store products** (create the same ids in App Store Connect and Google Play; prices are set in each store, never in code):

   | Plan              | Monthly                                     | Annual                                     |
   | ----------------- | ------------------------------------------- | ------------------------------------------ |
   | Personal          | `world.ezana.app.personal.monthly`          | `world.ezana.app.personal.annual`          |
   | Personal Advanced | `world.ezana.app.personal_advanced.monthly` | `world.ezana.app.personal_advanced.annual` |
   | Family            | `world.ezana.app.family.monthly`            | `world.ezana.app.family.annual`            |
   | Professional      | `world.ezana.app.professional.monthly`      | `world.ezana.app.professional.annual`      |

   These are exactly the retail plans `src/config/pricing.js` sells on the web.

5. **Codemagic.** Connect the repository and create the three environment groups below. Both workflows in `codemagic.yaml` start only by hand.
6. **Android signing.** Generate an upload keystore once (`keytool -genkey -v -keystore ezana-upload.keystore -alias ezana -keyalg RSA -keysize 2048 -validity 10000`), keep it outside the repo, and enrol in Play App Signing. Copy the **app signing** certificate SHA-256 from Play Console (Setup, App signing) into `ANDROID_CERT_SHA256`.

## 3. Environment variables

### Vercel (production)

| Variable                             | What it is                                                                                                                               |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `APPLE_TEAM_ID`                      | 10-character Apple team id. Serves `/.well-known/apple-app-site-association` (404 until set) and signs APNs tokens.                      |
| `ANDROID_CERT_SHA256`                | Play app signing certificate SHA-256 (`AA:BB:…`; several may be comma separated). Serves `/.well-known/assetlinks.json` (404 until set). |
| `APNS_KEY_P8`                        | Contents of the APNs `.p8` key (newlines may be written as `\n`).                                                                        |
| `APNS_KEY_ID`                        | The APNs key id.                                                                                                                         |
| `APNS_ENVIRONMENT`                   | `production` (TestFlight and App Store). `development` only for Xcode debug builds.                                                      |
| `FIREBASE_SERVICE_ACCOUNT_JSON`      | The Firebase service account key JSON, on one line.                                                                                      |
| `REVENUECAT_WEBHOOK_SECRET`          | Shared secret for the RevenueCat webhook Authorization header.                                                                           |
| `NEXT_PUBLIC_REVENUECAT_IOS_KEY`     | RevenueCat public SDK key for iOS (safe to expose).                                                                                      |
| `NEXT_PUBLIC_REVENUECAT_ANDROID_KEY` | RevenueCat public SDK key for Android (safe to expose).                                                                                  |

Without the two RevenueCat public keys the app's `/upgrade` screen says "Upgrades are not available in the app yet" and shows no price, so a free-features-only build can be submitted first.

### Codemagic

| Group               | Variable                             | What it is                                                                                                                                   |
| ------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `android_signing`   | `CM_KEYSTORE`                        | The upload keystore, base64 encoded.                                                                                                         |
| `android_signing`   | `CM_KEYSTORE_PASSWORD`               | Keystore password.                                                                                                                           |
| `android_signing`   | `CM_KEY_ALIAS`                       | Key alias (for example `ezana`).                                                                                                             |
| `android_signing`   | `CM_KEY_PASSWORD`                    | Key password.                                                                                                                                |
| `google_play`       | `GCLOUD_SERVICE_ACCOUNT_CREDENTIALS` | Google Play service account JSON with release permissions.                                                                                   |
| `google_play`       | `GOOGLE_SERVICES_JSON`               | `google-services.json`, base64 encoded (Android push).                                                                                       |
| `app_store_connect` | `APP_STORE_CONNECT_ISSUER_ID`        | App Store Connect API issuer id.                                                                                                             |
| `app_store_connect` | `APP_STORE_CONNECT_KEY_IDENTIFIER`   | App Store Connect API key id.                                                                                                                |
| `app_store_connect` | `APP_STORE_CONNECT_PRIVATE_KEY`      | The API key `.p8` contents.                                                                                                                  |
| `app_store_connect` | `CERTIFICATE_PRIVATE_KEY`            | An RSA private key Codemagic uses to create or reuse the distribution certificate (`ssh-keygen -t rsa -b 2048 -m PEM -f cert_key -q -N ""`). |

### Local only

| Variable                  | Where                                | What it is                                  |
| ------------------------- | ------------------------------------ | ------------------------------------------- |
| `REVIEW_ACCOUNT_PASSWORD` | your shell, never a file in the repo | Password for the reviewer account (step 4). |

## 4. Review account

Run `REVIEW_ACCOUNT_PASSWORD='<strong password>' node scripts/create-review-account.mjs` from the repo root. It creates or resets `appreview@ezana.world`: email verified, past the waitlist, onboarding complete, community terms accepted, a paper portfolio with four positions and two watchlists. If `MFA_REQUIRE_ENROLLMENT=true` is set in production, reviewers would be forced to enrol a second factor; keep it unset (the default) while the apps are in review.

## 5. App Store Connect

1. New app: bundle id `world.ezana.app`, name Ezana, primary category **Finance**, SKU `ezana-ios`.
2. Age rating questionnaire: no objectionable content categories; user-generated content **yes** (community posts, comments, messages), moderated with report and block.
3. App Privacy (answer exactly what the app collects; it sends no data for tracking and there is no advertising):
   - Contact info: **email address**, **name** (account, linked to the user).
   - Identifiers: **user id** (account, linked).
   - Financial info: **other financial info** the user enters (paper portfolio, watchlists, alerts), linked, app functionality.
   - User content: **posts, comments and messages**, linked, app functionality.
   - Purchases: **purchase history** (subscriptions), linked, app functionality.
   - Diagnostics: **crash data** and **performance data** (Sentry, including a small sample of session replays and the IP address), linked, app functionality. The site loads no third-party analytics today; revisit this answer if analytics are added.
4. Privacy policy URL `https://ezana.world/privacy-policy`; support URL `https://ezana.world/help-center`; Terms of Use (EULA) `https://ezana.world/terms-of-service`.
5. Subscriptions: one group with the eight products above, each with a review screenshot of the `/upgrade` screen.
6. Review notes:
   - Sign in with `appreview@ezana.world` and the password from step 4.
   - Real-money trading and bank or brokerage linking are available only on ezana.world; the app offers market data, paper trading, watchlists, alerts and the community.
   - University and organisation plans are sold to institutions under contract and are not sold in the app.
   - Push notifications are requested only when the user turns on an alert. Face ID unlock is in Settings, Password and security.
7. Upload builds from Codemagic (`ios-release`, TestFlight), test, then submit.

## 6. Google Play

1. Store listing (short and full description, icon, feature graphic, screenshots).
2. **Data safety**: the same data as App Privacy above; data encrypted in transit; users can delete their account in Settings (in-app account deletion) and request data export.
3. **Financial features declaration**: choose the option for an app that provides market information, news and paper trading. It does not offer money transmission, lending, payments or real-money brokerage.
4. Content rating questionnaire; **target audience 18 and over**.
5. Subscriptions: the eight products above.
6. Run `android-release` in Codemagic; it uploads to **internal testing** as a draft. Test on a device, then promote to production.

## 7. Screenshots to capture

6.7-inch and 6.5-inch iPhone (and 12.9-inch iPad only if iPad is offered), and an Android phone: Home, a dataset hub (for example `/datasets/capitol-watch`), an Echo article, the watchlist, Sonar.

## 8. Known review risks and the answer to each

| Risk                            | Answer                                                                                                                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Minimum functionality (4.2)     | Native push alerts, Face ID or fingerprint unlock, native share sheet, haptics, universal links and app links, an offline screen, in-app purchases.                                                          |
| User-generated content (1.2)    | Report and Block on every post, comment, message and profile; content reported by three members is hidden pending review; an admin queue at `/admin/moderation`; community terms accepted before first post. |
| Payments (3.1.1)                | Retail plans are in-app purchases through the App Store and Google Play. No web pricing, checkout or billing link appears in the app. Organisation plans are sold to institutions (3.1.3).                   |
| Financial services (3.1.1, 5.1) | No real-money trading or account linking in the app; market information and paper trading only.                                                                                                              |
| Account deletion (5.1.1)        | In-app account deletion in Settings.                                                                                                                                                                         |

## 9. What could not be verified before submission

The builds were set up without a Mac or a device: the iOS project, signing and push to Apple, Face ID, the Android release bundle and Play App Links verification are first exercised by the Codemagic workflows and on TestFlight and the Play internal track.
