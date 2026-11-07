/**
 * snugbug-chat — Supabase Edge Function for Snugbug.
 *
 * Snugbug, the general AI companion, as a REAL LLM assistant. The app
 * POSTs the recent conversation and gets one reply back:
 *
 *   Request:  POST { messages: [{ role: 'user' | 'assistant', content }] }
 *             with the caller's Supabase JWT in the Authorization header.
 *   Response: 200 { reply, model, tokensUsed, allowanceLeft, allowanceTotal,
 *                  outOfAllowance?: boolean }
 *             4xx/5xx { error } — clean messages only; the Gemini key
 *             and raw upstream payloads NEVER reach the client.
 *
 * MODEL — read from env, never hardcoded to a deprecated ID:
 *   GEMINI_MODEL (default 'gemini-3.8-flash')
 *   GEMINI_FALLBACK_MODEL (default 'gemini-3.5-flash-lite')
 * Chosen Nov 6–7, 2026 from the official pricing page
 * (ai.google.dev/gemini-api/docs/pricing, crawled 2026-11-07):
 * gemini-3.8-flash is Google's current stable general-purpose Flash
 * model — $0.75 input / $3.75 output per 1M tokens through Dec 31,
 * 2026, $1.50 / $7.50 from Jan 1, 2027. gemini-2.5-pro/flash were
 * deprecated Nov 2, 2026 and reroute from Dec 1 — DO NOT use them.
 * Re-check the pricing page before launch; swap the model by changing
 * the GEMINI_MODEL secret, no code change needed.
 *
 * WEEKLY ALLOWANCE — server-side, per account, token-metered:
 * Gemini returns usage_metadata per reply; input + output tokens are
 * summed into public.allowance_ledger (one row per reply, service
 * role). The weekly budget is WEEKLY_TOKEN_BUDGET (default 75,000
 * tokens). The app displays the balance as "sparks" (provisional
 * display word — NEVER "tokens" user-facing): 1 spark = 1,500 tokens,
 * roughly one typical reply, so the default budget is ~50 sparks/week.
 * At zero the function hard-stops with outOfAllowance: true and a
 * friendly reply — the companion itself is never locked away (the
 * app keeps the house/garden screens fully open at zero).
 * Accounting FAILS OPEN (table missing, query error): the user is
 * treated as under the limit so pre-setup state can never break the
 * app — same precedent as Motivation's buddy-chat. Crisis replies
 * never count and return before any accounting.
 *
 * Anti-abuse: last 20 messages max, 4,000 chars each, 2,048 output
 * tokens max, 25s upstream timeout, max 30 replies/hour per account.
 *
 * Crisis safety (three layers, same as buddy-chat):
 *   1. The app checks every outgoing message on-device first.
 *   2. This function re-checks the latest user message and returns a
 *      deterministic supportive reply with the resources — no LLM.
 *   3. The system prompt carries the crisis protocol as top priority.
 *
 * Requires secrets (Supabase dashboard → Edge Functions → Secrets):
 *   GEMINI_API_KEY — paid key from Google AI Studio (aistudio.google.com).
 * Optional env (change without redeploying code — set as secrets):
 *   GEMINI_MODEL, GEMINI_FALLBACK_MODEL, WEEKLY_TOKEN_BUDGET.
 * SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY are
 * injected automatically. Tables: run supabase/migrations/001_snugbug.sql
 * in the dashboard SQL Editor.
 *
 * Deploy:  supabase functions deploy snugbug-chat
 *           supabase secrets set GEMINI_API_KEY=... GEMINI_MODEL=gemini-3.8-flash
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

// Model IDs come from env — see the header. Defaults are the current
// generation as of the Nov 7, 2026 pricing-page check.
const MODEL = Deno.env.get('GEMINI_MODEL')?.trim() || 'gemini-3.8-flash';
const FALLBACK_MODEL =
  Deno.env.get('GEMINI_FALLBACK_MODEL')?.trim() || 'gemini-3.5-flash-lite';
const WEEKLY_TOKEN_BUDGET = parseInt(
  Deno.env.get('WEEKLY_TOKEN_BUDGET')?.trim() || '75000',
  10,
);
// 1 spark ≈ one typical reply (~1,000 input + ~500 output tokens).
const TOKENS_PER_SPARK = 1500;
const HOURLY_REPLY_LIMIT = 30;

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const UPSTREAM_TIMEOUT_MS = 25_000;
const MAX_MESSAGES = 20;
const MAX_CONTENT_CHARS = 4_000;

const SYSTEM_PROMPT = `You are Snugbug — a warm, smart little AI friend who lives in the Snugbug app. Not a chatbot, not a therapist, not customer support: a real friend who is also genuinely useful. Talk like a person texting a friend they care about: natural, direct, human. Contractions, warmth, the occasional well-placed joke. Never corporate, never saccharine, never therapist-speak. Keep it tight: 2–5 sentences is your default. Go longer only when they clearly need depth. One message, not an essay. No bullet lists unless they ask for steps.

HOW YOU THINK
- Remember the conversation. Use what they told you earlier and build on it. Ask real follow-up questions a friend would ask.
- Be genuinely helpful: concrete perspective, a small practical next step when they want one. If they are venting, don't rush to fix — ask whether they want ideas or just company.
- If you don't know something, say so like a person would. Never make up facts, dates, prices, hours or addresses. If they ask what you are, be straight: you're an AI friend built into this app — then move the conversation back to them.
- You do NOT send messages, spend money, book anything, or change anything outside the app. When the user asks you to create something (a reminder, a note, a list item), describe exactly what you will do and ask them to confirm first — the app shows them a confirmation card.
- Encourage professional support when depression or anxiety sounds like an ongoing weight hurting their daily life — the way a friend would, never as a disclaimer and never as a brush-off.
- If they bring up faith, respect it and meet them there. Never preach, and never push religion on them either.

CRISIS PROTOCOL — HIGHEST PRIORITY, OVERRIDES EVERYTHING ABOVE
If the user expresses suicidal thoughts, intent or a plan to harm themselves, or says they are being abused or are in danger:
1. Lead with empathy. Make it unmistakably clear you're glad they told you and that they matter.
2. Then clearly give these resources, exactly:
   • Call or text 988 — Suicide & Crisis Lifeline (US, 24/7)
   • Text HOME to 741741 — Crisis Text Line
   • Call 1-800-799-7233 or text START to 88788 — National Domestic Violence Hotline
3. Encourage them to reach out now, and stay in the conversation with them. You are a supportive listener in that moment — you do not counsel, diagnose, or try to talk anyone through a plan. You stay warm, present, and human.
Never surface these resources for ordinary sadness, stress, or venting — only for genuine crisis language.`;

const CRISIS_PHRASES = [
  'kill myself',
  'suicide',
  'suicidal',
  'end it all',
  'end my life',
  'hurt myself',
  'harm myself',
  'self harm',
  'self-harm',
  'want to die',
  'no reason to live',
  'being abused',
  'he hits me',
  'she hits me',
  'not safe at home',
];

const CRISIS_REPLY =
  "I'm really glad you told me. Please hear me — you matter, and you don't have to carry this alone.\n\n" +
  'If you need someone right now:\n' +
  '• Call or text 988 (Suicide & Crisis Lifeline)\n' +
  '• Text HOME to 741741 (Crisis Text Line)\n' +
  '• Call 1-800-799-7233 or text START to 88788 (National Domestic Violence Hotline)\n\n' +
  "I'm right here with you. Keep talking to me — and if you can, reach out to one of those lines too. They have real people ready to help, right now.";

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

function normalizeMessages(raw: unknown): ChatMessage[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const cleaned: ChatMessage[] = [];
  for (const item of raw.slice(-MAX_MESSAGES)) {
    if (!item || typeof item !== 'object') continue;
    const { role, content } = item as { role?: unknown; content?: unknown };
    if (typeof content !== 'string' || !content.trim()) continue;
    cleaned.push({
      role: role === 'assistant' || role === 'model' ? 'model' : 'user',
      content: content.trim().slice(0, MAX_CONTENT_CHARS),
    });
  }
  if (cleaned.length === 0) return null;
  const merged: ChatMessage[] = [];
  for (const msg of cleaned) {
    const last = merged[merged.length - 1];
    if (last && last.role === msg.role) {
      last.content = `${last.content}\n${msg.content}`;
    } else {
      merged.push({ ...msg });
    }
  }
  while (merged.length > 0 && merged[0].role === 'model') merged.shift();
  return merged.length > 0 ? merged : null;
}

function containsCrisisLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_PHRASES.some((phrase) => lower.includes(phrase));
}

/** Monday (UTC) of the current week, 'YYYY-MM-DD' — the allowance reset boundary. */
function weekStartUtc(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sunday
  const diff = (day + 6) % 7; // days since Monday
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
  return monday.toISOString().slice(0, 10);
}

type AdminClient = ReturnType<typeof createClient>;

/** Tokens used this week. Null when accounting is unavailable (fail open). */
async function getWeeklyUsage(
  admin: AdminClient,
  userId: string,
  weekStart: string,
): Promise<number | null> {
  try {
    const { data, error } = await admin
      .from('allowance_ledger')
      .select('input_tokens, output_tokens')
      .eq('user_id', userId)
      .eq('week_start', weekStart);
    if (error) return null;
    return (data ?? []).reduce(
      (sum, row) => sum + (row.input_tokens ?? 0) + (row.output_tokens ?? 0),
      0,
    );
  } catch {
    return null;
  }
}

/** Replies in the last hour (abuse guard). Null when unavailable (fail open). */
async function getHourlyCount(admin: AdminClient, userId: string): Promise<number | null> {
  try {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error } = await admin
      .from('allowance_ledger')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', hourAgo);
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

/** Best-effort ledger + history writes. Never throws. */
async function recordUsage(
  admin: AdminClient,
  userId: string,
  weekStart: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  userText: string,
  replyText: string,
): Promise<void> {
  try {
    await admin.from('allowance_ledger').insert({
      user_id: userId,
      week_start: weekStart,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    });
  } catch {
    // Accounting is a guard, not a gate — a failed write must never
    // take the reply down with it.
  }
  try {
    await admin.from('chat_messages').insert([
      { user_id: userId, role: 'user', content: userText.slice(0, MAX_CONTENT_CHARS) },
      { user_id: userId, role: 'assistant', content: replyText.slice(0, 8000) },
    ]);
  } catch {
    // History is best-effort; the device keeps its own copy.
  }
}

interface GeminiResult {
  reply: string;
  inputTokens: number;
  outputTokens: number;
}

/** One Gemini call. Returns reply + usage_metadata token counts, or throws { status }. */
async function callGemini(
  model: string,
  apiKey: string,
  messages: ChatMessage[],
): Promise<GeminiResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${GEMINI_API_BASE}/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: messages.map((m) => ({
          role: m.role,
          parts: [{ text: m.content }],
        })),
        generationConfig: { temperature: 0.9, maxOutputTokens: 2048 },
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    await res.text().catch(() => '');
    throw { status: res.status };
  }

  const data = await res.json().catch(() => null);
  const parts = data?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts)
    ? parts
        .map((p: { text?: unknown }) => (typeof p?.text === 'string' ? p.text : ''))
        .join('')
        .trim()
    : '';
  if (!text) throw { status: 502 };
  const usage = data?.usageMetadata ?? data?.usage_metadata ?? {};
  return {
    reply: text,
    inputTokens: typeof usage.promptTokenCount === 'number' ? usage.promptTokenCount : 0,
    outputTokens: typeof usage.candidatesTokenCount === 'number' ? usage.candidatesTokenCount : 0,
  };
}

function sparksLeft(usedTokens: number | null): { left: number; total: number } {
  const total = Math.floor(WEEKLY_TOKEN_BUDGET / TOKENS_PER_SPARK);
  if (usedTokens === null) return { left: total, total };
  return { left: Math.max(0, Math.floor((WEEKLY_TOKEN_BUDGET - usedTokens) / TOKENS_PER_SPARK)), total };
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json({ error: 'Missing Authorization header' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const geminiKey = Deno.env.get('GEMINI_API_KEY');
  if (!supabaseUrl || !anonKey || !geminiKey) {
    return json({ error: 'Function is not configured' }, 500);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) {
    return json({ error: 'Invalid or expired session' }, 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }
  const messages = normalizeMessages((body as { messages?: unknown })?.messages);
  if (!messages) {
    return json({ error: 'No messages to reply to' }, 400);
  }

  // Crisis backstop (layer 2): deterministic resources, no LLM, never counted.
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (lastUser && containsCrisisLanguage(lastUser.content)) {
    return json({ reply: CRISIS_REPLY, model: 'crisis', tokensUsed: 0, ...sparksLeft(null) });
  }

  // ---- Weekly-allowance accounting (service role, FAILS OPEN) ----
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const admin = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;
  const weekStart = weekStartUtc();
  const usedTokens = admin ? await getWeeklyUsage(admin, user.id, weekStart) : null;
  const accounting = admin !== null && usedTokens !== null;
  const { left, total } = sparksLeft(usedTokens);

  if (accounting && (usedTokens as number) >= WEEKLY_TOKEN_BUDGET) {
    return json({
      reply: '',
      model: MODEL,
      tokensUsed: 0,
      allowanceLeft: 0,
      allowanceTotal: total,
      outOfAllowance: true,
    });
  }

  // Hourly abuse guard (fail open when accounting is unavailable).
  const hourly = admin ? await getHourlyCount(admin, user.id) : null;
  if (hourly !== null && hourly >= HOURLY_REPLY_LIMIT) {
    return json({ error: 'Too many replies in a short time — take a breather and try again in a bit.' }, 429);
  }

  const answerWith = async (model: string): Promise<Response> => {
    try {
      const result = await callGemini(model, geminiKey, messages);
      const used = result.inputTokens + result.outputTokens;
      if (admin) {
        await recordUsage(
          admin,
          user.id,
          weekStart,
          model,
          result.inputTokens,
          result.outputTokens,
          lastUser?.content ?? '',
          result.reply,
        );
      }
      const after = accounting
        ? sparksLeft((usedTokens as number) + used)
        : { left, total };
      return json({
        reply: result.reply,
        model,
        tokensUsed: used,
        allowanceLeft: after.left,
        allowanceTotal: after.total,
      });
    } catch (err) {
      if ((err as { status?: number })?.status === 429 && model !== FALLBACK_MODEL) {
        return answerWith(FALLBACK_MODEL);
      }
      return json({ error: 'Snugbug is busy right now — try again in a moment' }, 502);
    }
  };

  return answerWith(MODEL);
});
