# Snugbug — BUILD NOTES (v1.0.0, first working build)

Built Nov 6–7, 2026. Local repo: `~/workspace/snugbug-ai-app/`. Standalone app, NOT linked to the BeaTrackFam store. Kit copied 1:1 from Rewards (`~/workspace/beatrackfam-loyalty-app`) and Motivation where noted; names/IDs adapted only.

## What was built

- **Onboarding (consent-first, Motivation pattern):** 4 pages — meet Snugbug, how it works, plain-language data + AI disclosure (chats go to Google Gemini; weekly allowance; never sends/spends; crisis resources 988 / HOME to 741741), then join. ATT prompt fires on join.
- **Auth:** email + password (PKCE flow, AsyncStorage, `lib/supabase.ts` copied verbatim, null client = demo mode) + **Apple Sign In** via `expo-apple-authentication` + Supabase `signInWithIdToken` (SHA-256 hashed nonce). Session guard in `(tabs)/_layout` + `AuthProvider` navigation reactions, copied from Rewards. Reset-password + privacy-policy screens included. No referral system (Rewards-only).
- **Tabs (NativeTabs Liquid Glass bar, copied 1:1):** Chat / Feed / Ideas / Tasks / More. Settings lives under More + a `settings` route.
- **Chat tab:** full chat UI → `snugbug-chat` Edge Function. On-device crisis check before any network call; reminder/list intents show a **confirmation card** first (never creates silently); out-of-allowance screen is friendly and keeps the companion reachable; demo-mode replies are clearly labelled placeholders, never presented as AI. Chat history cached on-device; companion growth recorded per exchange.
- **Feed tab (concept-visual-v2):** avatar header (tap → companion home), prompt bar (opens Chat with the prompt), planned-week card with Mon–Sun strip fed by real reminders, reminders-done card, Ideas preview rows, allowance pill.
- **Ideas tab:** 6 idea rows; each starts a Chat with a prefilled prompt.
- **Tasks tab:** reminders (add via "in 1 hour" / "tomorrow 9 AM" + local notification scheduling) and notes/lists, device-local via AsyncStorage; toggle / delete.
- **Companion screen (house + garden):** companion drawn in code (`SnugbugAvatar` — original vector-style bug, never AI imagery, never called "buddy"). Care points, streak, chat count, garden level; decorations unlock by use (3-day streak → Sunflower; 25 chats → Cozy Chair; 7-day streak → String Lights; 100 chats → Garden Pond; 250 chats → Bookshelf). **Always free/unlimited — allowance never locks this screen and never makes the companion sad.** State cached locally, synced to Supabase `companion_state` when configured.
- **Voice call screen:** animated avatar (speaking/listening states), push-to-talk recording + playback via `expo-audio`. See "Stubbed" below.
- **Settings:** companion name (per-user rename; the name "Snugbug" itself is a working name, not locked), notification + sound toggles, allowance info, clear chat history.
- **More tab:** companion home, voice call, settings, privacy policy, allowance info, clear history, sign out, delete account (calls `delete-account` Edge Function, then wipes local data).
- **Edge Function `supabase/functions/snugbug-chat` (Deno):** Gemini server-side, key from Supabase secret `GEMINI_API_KEY`, never in the client. Model from env (`GEMINI_MODEL`, default `gemini-3.8-flash`; fallback `gemini-3.5-flash-lite`). Server-side metering from `usage_metadata` (input + output tokens → `allowance_ledger`), weekly budget `WEEKLY_TOKEN_BUDGET` (default 75,000 tokens ≈ 50 "sparks", 1 spark = 1,500 tokens), hard-stop at zero with `outOfAllowance`. Hourly abuse cap (30/hour), history cap (last 20 messages), output cap (2,048 tokens). Crisis backstop server-side (deterministic resources reply, never counted). Accounting fails open when tables are missing (Motivation precedent).
- **Migrations `supabase/migrations/001_snugbug.sql`:** `profiles`, `chat_messages`, `allowance_ledger`, `companion_state`, RLS (own rows only; function writes via service role).
- **`delete-account` function:** copied from Motivation, header updated (Snugbug tables cascade on auth-user delete).
- **Workflows:** `ios-build.yml`, `android-build.yml`, `release.yml` copied from Rewards and renamed (Snugbug, `com.beatrackfaminc.snugbug`, artifact names). **MANUAL TRIGGER ONLY** — not run (see Joey steps).
- **Icon:** drawn in PIL (original amber bug, 1024 iOS + 512 Android + 1024×500 feature graphic + favicon/splash/notification icon). No Joey photo, no BeaTrackFam brand assets.
- **What's New:** `store/whats-new-1.0.0.txt`, ends with "Questions or concerns? Email us at contact@beatrackfam.info".

## Model choice (checked Nov 7, 2026)

Official pricing page `ai.google.dev/gemini-api/docs/pricing` (crawled Nov 7, 01:55 UTC): `gemini-3.8-flash` is Google's current stable general-purpose Flash model — $0.75 in / $3.75 out per 1M tokens through Dec 31, 2026, $1.50 / $7.50 from Jan 1, 2027. `gemini-2.5-pro/flash` were deprecated Nov 2, 2026 — NOT used anywhere. The model ID is env-driven (`GEMINI_MODEL` secret), so it can be swapped without a code change. Re-check the pricing page before launch.

## Stubbed / placeholder — NOT faked

- **Supabase values:** `eas.json` has placeholders (`https://YOUR-PROJECT-REF.supabase.co`, `YOUR-ANON-KEY-HERE`). No Supabase project exists yet; the app runs in **demo mode** (local placeholder replies, clearly labelled). No Rewards project values were reused.
- **Gemini API key:** no key anywhere in the repo. Set as the `GEMINI_API_KEY` Supabase secret (see `supabase/README.md`).
- **Voice transcription: NOT wired.** Recording + playback work; live transcription is not implemented — there is no speech-to-text service in this build, so a recording cannot become a chat reply on its own. The Voice Call screen says so on screen, and `lib/voice.ts` documents it. Next build: Gemini Live API or STT → snugbug-chat → TTS through the same Edge Function (same allowance metering). Live AI video is NOT in scope.
- **No IAP in this build** (M3 comes later). No ads. The out-of-allowance screen says top-ups arrive in a later update.
- **Apple Sign In** needs "Sign in with Apple" enabled in the Supabase dashboard (Joey step) before the button can succeed.
- **Allowance display word "sparks" is PROVISIONAL** — Joey's call on the final name and the weekly allowance size (default: 50/week).

## Verification (all done Nov 7, 2026)

- `npx tsc --noEmit` — **passes, zero errors** (final run after all fixes).
- `npx expo export --platform web` — **succeeds** (Metro bundles, `dist/` produced).
- `npx expo prebuild --clean` (iOS + Android) — **succeeds**; iOS bundle ID `com.beatrackfaminc.snugbug`, `NSMicrophoneUsageDescription` present, `PrivacyInfo.xcprivacy` generated by the plugin; Android namespace `com.beatrackfaminc.snugbug`, `RECORD_AUDIO` permission present. Generated `ios/`/`android/`/`dist/` removed after verification (regenerable; workflows regenerate them).
- **Web preview (Playwright Chromium 125, 390×844 @2x):** onboarding flow (all 4 pages → sign-in → sign-up) renders, **0 console errors**. All 5 tabs + Companion + Voice Call + Settings render and navigate, **0 console errors**. Exercised end to end: demo chat reply (labelled), reminder intent → confirmation card → "Yes, do it" → reminder lands in Tasks + Feed week strip, crisis message → 988 resources reply, Feed planned-week card + Ideas rows, companion growth (1-day streak, 2 chats, 2 care points after the test chats).
- **Installed versions (fresh `npm install`):** expo 57.0.32, expo-router 57.0.30, react-native-screens 4.26.2, react-native 0.86.3, @supabase/supabase-js 2.119.0, expo-audio 57.0.5, expo-apple-authentication 57.0.2, expo-notifications 57.0.25 (patch drift within the `~` ranges copied from Rewards; same minor lines as the kit).

## Bugs found during this build (fixed)

1. **expo-asset 58.0.20 (SDK 58) broke Metro** — plain `npm install` pulled it via expo-audio; `npx expo export` failed "Unable to resolve module expo/internal/bundle-origin". Fixed with `npx expo install expo-asset` → **57.0.21**, pinned in package.json. (Same bug the sibling games build hit independently.)
2. **Static `expo-tracking-transparency` import redboxed the web preview** — blank white page, "Route ./onboarding.tsx is missing the required default export". Fixed: `lib/tracking.ts` now lazy-loads it with a dynamic import inside try/catch. Same treatment applied to `expo-apple-authentication` in `AppleSignInButton.tsx` (dynamic imports only). No static imports of native-only modules remain anywhere (`grep` verified). Unused `lib/audio.ts` (Motivation copy) removed.
3. **Chat user bubbles: white text on white bubble (invisible).** Caught on screenshot; fixed with black text on user bubbles, re-screenshotted to confirm.
4. **"Remind you to to call Mom"** — leading space blocked the "to" strip in `parseReminderRequest`. Fixed (trim before strip), re-screenshotted: "Remind you to call Mom — Sat 9:00 AM".
5. **Companion "Garden level 1" text invisible** (default black on dark card). Fixed with explicit white color, re-screenshotted.
6. **Onboarding wording:** consent page said "Read the full policy on the next screen" — corrected to "You can read the full policy before you join."

## Web-preview-only artifacts (not device bugs)

- On web, NativeTabs renders as a top pill bar (Chat/Feed/Ideas/Tasks/More) and can overlap the top of a screen's content slightly (e.g. the "TASKS." headline looks clipped at the viewport top). On iOS/Android the bar is the bottom Liquid Glass bar and does not overlap content. Verify on device.
- The sibling games build's Metro cache note also applied here: a stale Metro cache once served a broken route transform; `npx expo start --clear` fixed it.

## NOT tested on a real device — stated plainly

No iOS/Android device testing was possible from this environment. **Joey's bar stands: every tab and button must be tested working on a real device before release.** This build is ready for that testing, not a claim it passed. In particular, on-device checks still owed: NativeTabs mount (watch for the known crash signature — dies ~1s after tabs mount, often as a permission prompt appears), Apple Sign In end-to-end, voice recording/playback + mic permission prompt, local notification delivery, ATT prompt, and the GitHub Actions iOS/Android builds (never run — see below).

## Joey-only steps remaining

1. **Confirm the app display name + allowance display name** ("sparks" is provisional) + **weekly allowance size** (default 50/week) + **bundle ID** `com.beatrackfaminc.snugbug` (PROVISIONAL — can't change after first store upload) + **companion name "Snugbug"** (working name, NOT final-locked; still needs App Store + Google Play + trademark check — do NOT file any trademark).
2. **Supabase project:** create a NEW project (free tier) — do NOT reuse Rewards' project. Then: run `supabase/migrations/001_snugbug.sql`; set secrets `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.8-flash`, `GEMINI_FALLBACK_MODEL=gemini-3.5-flash-lite`, `WEEKLY_TOKEN_BUDGET=75000`; deploy with `supabase functions deploy snugbug-chat` + `supabase functions deploy delete-account`; put the URL + anon key in `eas.json`; enable Email + Apple providers with redirect allowlist `snugbug://confirmed`, `snugbug://reset-password`. Full steps in `supabase/README.md`.
3. **GitHub repo** (see final report for status): if the repo could not be created from here, create public repo `Joeey1116/BeaTrackFam-AI-App` on github.com, then push this local repo. **Deploy key:** if not added via the connector, add `/home/hatch/.ssh/id_ed25519_snugbug.pub` at repo Settings → Deploy keys → Add (allow write access). Never share the private key.
4. **App Store Connect:** create the app record for `com.beatrackfaminc.snugbug`; create an API key and add repo secrets `ASC_API_KEY_ID`, `ASC_API_KEY_P8`, `ASC_API_ISSUER_ID`, `APPLE_TEAM_ID`; create a distribution certificate (.p12) + provisioning profile ("Snugbug App Store") and add `IOS_DISTRIBUTION_P12`, `IOS_DISTRIBUTION_PASSWORD`. Then run the iOS workflow (manual trigger) and upload to TestFlight.
5. **Google Play:** create the app record for `com.beatrackfaminc.snugbug`; generate an upload keystore and add `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, plus `PLAY_SERVICE_ACCOUNT_JSON`. Then run the Android workflow (manual trigger).
6. **Real-device test pass** (Joey): every tab and button, NativeTabs crash-signature check, Apple Sign In, voice call + mic prompt, notifications, ATT prompt.
7. **Before launch:** re-check `ai.google.dev/gemini-api/docs/pricing` and confirm the `GEMINI_MODEL` value; confirm the age rating (likely 12+) and the privacy labels / data-safety declarations (account email + chat content sent to Google Gemini; voice audio processed for calls).
