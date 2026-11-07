/**
 * Companion state — the house + garden world.
 *
 * HARD LINE (plan): the companion, its house and its garden are ALWAYS
 * free and unlimited. The weekly allowance meters only the AI brain
 * (chat replies). Running out of allowance never locks the companion
 * away, never makes it sad, never nags for money.
 *
 * Growth: chatting earns care points; streaks and chat milestones
 * unlock decorations (7-day streak, 100 chats). Stored per account in
 * Supabase when configured (companion_state table), cached locally in
 * AsyncStorage otherwise — the local cache is the source of truth
 * until the backend exists.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured, supabase } from './supabase';

export interface CompanionState {
  carePoints: number;
  chatCount: number;
  streakDays: number;
  lastChatDate: string | null; // YYYY-MM-DD
  unlocked: string[]; // decoration ids
  gardenLevel: number;
}

export const DECORATIONS = [
  { id: 'sunflower', name: 'Sunflower', rule: 'Chat 3 days in a row' },
  { id: 'cozy-chair', name: 'Cozy Chair', rule: 'Reach 25 chats' },
  { id: 'string-lights', name: 'String Lights', rule: '7-day streak' },
  { id: 'garden-pond', name: 'Garden Pond', rule: 'Reach 100 chats' },
  { id: 'bookshelf', name: 'Bookshelf', rule: 'Reach 250 chats' },
];

const KEY = 'snugbug:companion:v1';

export const DEFAULT_COMPANION: CompanionState = {
  carePoints: 0,
  chatCount: 0,
  streakDays: 0,
  lastChatDate: null,
  unlocked: [],
  gardenLevel: 1,
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function decorationsFor(state: CompanionState): string[] {
  const out = new Set(state.unlocked);
  if (state.streakDays >= 3) out.add('sunflower');
  if (state.chatCount >= 25) out.add('cozy-chair');
  if (state.streakDays >= 7) out.add('string-lights');
  if (state.chatCount >= 100) out.add('garden-pond');
  if (state.chatCount >= 250) out.add('bookshelf');
  return [...out];
}

export async function loadCompanion(userId: string | null): Promise<CompanionState> {
  let state = DEFAULT_COMPANION;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) state = { ...DEFAULT_COMPANION, ...JSON.parse(raw) };
  } catch {
    // Fall through to defaults.
  }
  if (userId && isSupabaseConfigured() && supabase) {
    try {
      const { data } = await supabase
        .from('companion_state')
        .select('care_points, chat_count, streak_days, last_chat_date, unlocked, garden_level')
        .eq('user_id', userId)
        .maybeSingle();
      if (data) {
        state = {
          carePoints: data.care_points ?? state.carePoints,
          chatCount: data.chat_count ?? state.chatCount,
          streakDays: data.streak_days ?? state.streakDays,
          lastChatDate: data.last_chat_date ?? state.lastChatDate,
          unlocked: data.unlocked ?? state.unlocked,
          gardenLevel: data.garden_level ?? state.gardenLevel,
        };
      }
    } catch {
      // Local cache stands in.
    }
  }
  return state;
}

export async function saveCompanion(
  userId: string | null,
  state: CompanionState,
): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Best-effort.
  }
  if (userId && isSupabaseConfigured() && supabase) {
    try {
      await supabase.from('companion_state').upsert(
        {
          user_id: userId,
          care_points: state.carePoints,
          chat_count: state.chatCount,
          streak_days: state.streakDays,
          last_chat_date: state.lastChatDate,
          unlocked: state.unlocked,
          garden_level: state.gardenLevel,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      );
    } catch {
      // Local cache stands in.
    }
  }
}

/** Record one completed chat exchange: +1 care point, streak upkeep, unlocks. */
export async function recordChat(
  userId: string | null,
  prev: CompanionState,
): Promise<CompanionState> {
  const today = todayStr();
  let streak = prev.streakDays;
  if (prev.lastChatDate === today) {
    // Same day — streak unchanged.
  } else if (prev.lastChatDate === yesterdayStr()) {
    streak = prev.streakDays + 1;
  } else {
    streak = 1;
  }
  const next: CompanionState = {
    carePoints: prev.carePoints + 1,
    chatCount: prev.chatCount + 1,
    streakDays: streak,
    lastChatDate: today,
    unlocked: prev.unlocked,
    gardenLevel: 1 + Math.floor((prev.chatCount + 1) / 50),
  };
  next.unlocked = decorationsFor(next);
  await saveCompanion(userId, next);
  return next;
}
