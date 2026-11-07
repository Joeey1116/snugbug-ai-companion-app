/**
 * Chat client — talks to the snugbug-chat Supabase Edge Function.
 *
 * Server-side metering lives in the function: it counts
 * usage_metadata in/out tokens per reply, enforces the weekly
 * allowance, and hard-stops at zero. The client NEVER meters.
 *
 * Demo mode (no Supabase configured): a clearly-marked local reply
 * so the UI can be exercised end to end before the backend exists.
 * It is labelled as a demo reply in the UI — never presented as AI.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured, supabase } from './supabase';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  demo?: boolean;
}

export interface ChatResult {
  reply: string;
  /** Allowance units ("sparks", provisional name) left this week, when the server reports it. */
  allowanceLeft: number | null;
  allowanceTotal: number | null;
  outOfAllowance: boolean;
  demo: boolean;
}

const HISTORY_KEY = 'snugbug:chat-history:v1';
const MAX_HISTORY = 40;

export async function loadHistory(): Promise<ChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

export async function saveHistory(messages: ChatMessage[]): Promise<void> {
  try {
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-MAX_HISTORY)));
  } catch {
    // Best-effort.
  }
}

export async function clearHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(HISTORY_KEY);
  } catch {
    // Best-effort.
  }
}

function demoReply(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('hello') || lower.includes('hi ') || lower.startsWith('hi')) {
    return "Hey, I'm here. (Demo mode — connect Supabase to chat with the real Snugbug.) What can I help with today?";
  }
  if (lower.includes('plan') && lower.includes('week')) {
    return "Here's a calm shape for your week: one important thing per day, and a breather built in. (Demo mode — connect Supabase for real planning with your reminders.)";
  }
  return "Got it — I've noted that. (Demo mode — this is a placeholder reply. Connect Supabase and deploy the snugbug-chat function for real answers.)";
}

export async function sendChat(
  messages: { role: 'user' | 'assistant'; content: string }[],
): Promise<ChatResult> {
  if (!isSupabaseConfigured() || !supabase) {
    const last = messages[messages.length - 1];
    return {
      reply: demoReply(last?.content ?? ''),
      allowanceLeft: null,
      allowanceTotal: null,
      outOfAllowance: false,
      demo: true,
    };
  }
  const { data, error } = await supabase.functions.invoke('snugbug-chat', {
    body: { messages },
  });
  if (error) {
    throw new Error(error.message || 'Could not reach Snugbug. Check your connection and try again.');
  }
  const body = data as {
    reply?: string;
    error?: string;
    allowanceLeft?: number;
    allowanceTotal?: number;
    outOfAllowance?: boolean;
  };
  if (body?.error || !body?.reply) {
    if (body?.outOfAllowance) {
      return {
        reply: '',
        allowanceLeft: 0,
        allowanceTotal: body.allowanceTotal ?? null,
        outOfAllowance: true,
        demo: false,
      };
    }
    throw new Error(body?.error || 'Snugbug had trouble answering that.');
  }
  return {
    reply: body.reply,
    allowanceLeft: typeof body.allowanceLeft === 'number' ? body.allowanceLeft : null,
    allowanceTotal: typeof body.allowanceTotal === 'number' ? body.allowanceTotal : null,
    outOfAllowance: false,
    demo: false,
  };
}
