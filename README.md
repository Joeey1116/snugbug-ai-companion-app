Snugbug — your little AI friend.

A standalone general AI assistant app (not linked to the BeaTrackFam store) with a companion you take care of: its own house, its own garden, built together as you chat. Full LLM from day one, general-purpose, with a fair weekly allowance of AI replies.

## Stack

Expo SDK 57 / React Native / expo-router / TypeScript. Supabase Auth + Supabase Edge Function (`snugbug-chat`) calling Gemini server-side. GitHub Actions manual-dispatch builds for iOS + Android.

## Quick start

```bash
npm install
npx expo start
```

Copy the Supabase values into `eas.json` first (placeholders until Joey creates the project — see BUILD-NOTES.md).

## Structure

- `app/` — onboarding (consent-first), sign-in / sign-up (email + Apple), reset-password, privacy-policy, `(tabs)` Chat / Feed / Ideas / Tasks / More, `companion.tsx` (house + garden), `voice-call.tsx`, `settings.tsx`
- `components/` — `SnugbugAvatar` (companion drawn in code, never AI imagery), `GlassCard`, `Screen`, `Logo`, `AppleSignInButton`
- `lib/` — `supabase` (PKCE, AsyncStorage, null client = demo mode), `auth` (session owner), `chat` (Edge Function client), `companion` (growth/unlocks), `tasks` (reminders/lists), `crisis`, `tracking`, `voice`, `notifications`, `profile`, `settings`
- `supabase/functions/snugbug-chat/` — Edge Function: Gemini server-side, token metering from `usage_metadata`, weekly allowance hard-stop
- `supabase/functions/delete-account/` — account deletion (service role)
- `supabase/migrations/001_snugbug.sql` — profiles, chat_messages, allowance_ledger, companion_state
- `.github/workflows/` — `ios-build.yml`, `android-build.yml`, `release.yml` (manual trigger only)

## Name status

**"Snugbug" is a WORKING NAME — NOT final-locked.** Joey picked it for now (Nov 6, 2026: "I think we'll keep Snugbug for now"). It still needs a full App Store + Google Play + trademark check before locking. Do not file any trademark. The bundle ID `com.beatrackfaminc.snugbug` is likewise PROVISIONAL — Joey must confirm before any store upload; bundle IDs can't change after the first upload.

## Allowance display word (provisional)

The weekly allowance is shown as **"sparks"** (1 spark ≈ 1,500 tokens ≈ one typical reply; default budget 75,000 tokens/week ≈ 50 sparks). "Tokens" is the internal/metering term only — it never appears user-facing. Joey still owes the final call on the allowance size and the display name.
