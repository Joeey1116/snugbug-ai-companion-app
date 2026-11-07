# Supabase — Snugbug

## One-time setup (Joey)

1. **Create a Supabase project** (free tier) at https://supabase.com/dashboard — a NEW project for Snugbug. Do NOT reuse the Rewards Supabase project (different app, separate users).
2. **Run the migration:** in the project, open the SQL Editor and run `supabase/migrations/001_snugbug.sql` (creates `profiles`, `chat_messages`, `allowance_ledger`, `companion_state` with RLS).
3. **Get a Gemini API key** at https://aistudio.google.com/api-keys (paid key — the free tier has rate limits; the allowance system is the guardrail).
4. **Set the function secrets** (dashboard → Edge Functions → Secrets):
   - `GEMINI_API_KEY` — the key from step 3 (never in the client, never in this repo)
   - `GEMINI_MODEL` — `gemini-3.8-flash` (current generation, Nov 7 2026 pricing check; change without redeploying code)
   - `GEMINI_FALLBACK_MODEL` — `gemini-3.5-flash-lite`
   - `WEEKLY_TOKEN_BUDGET` — `75000` (≈ 50 sparks/week; 1 spark = 1,500 tokens)
5. **Deploy the functions** (needs the Supabase CLI logged in):
   ```bash
   supabase link --project-ref YOUR-PROJECT-REF
   supabase functions deploy snugbug-chat
   supabase functions deploy delete-account
   ```
6. **Wire the app:** put the project's URL + anon key in `eas.json` (all three profiles) — they are public keys, safe to ship in the bundle.
7. **Auth settings** (dashboard → Authentication):
   - Enable Email provider; set the Site URL / redirect allowlist to include `snugbug://confirmed` and `snugbug://reset-password`.
   - Enable Apple provider ("Sign in with Apple") for the Apple button — needs the Apple Service ID + key from Apple Developer.

## What the function does

`snugbug-chat` resolves the caller from their Supabase JWT, checks the latest message for crisis language (deterministic resources reply, never counted), enforces the weekly token budget from `allowance_ledger` (hard-stop at zero with `outOfAllowance: true`), calls Gemini, and records usage from `usage_metadata` (input + output tokens) plus the chat history. Accounting fails open when the tables aren't there yet (same precedent as Motivation's buddy-chat) — metering only works once step 2 is done.

## Model note

Model IDs are read from env, never hardcoded. Default `gemini-3.8-flash` was chosen Nov 7, 2026 from the official pricing page (ai.google.dev/gemini-api/docs/pricing): $0.75 input / $3.75 output per 1M tokens through Dec 31, 2026, $1.50 / $7.50 from Jan 1, 2027. `gemini-2.5-pro/flash` were deprecated Nov 2, 2026 and reroute from Dec 1 — do NOT use them. Re-check the pricing page before launch.
