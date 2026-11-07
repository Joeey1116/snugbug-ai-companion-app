/**
 * Tasks — reminders + notes/lists, device-local (AsyncStorage).
 * Reminders fire via expo-notifications local scheduling (lazy import,
 * same crash-safety pattern as lib/notifications.ts).
 * Lookups and drafting happen in Chat; this file only stores what the
 * user confirmed. Nothing is created silently — the Chat tab shows a
 * confirmation card first.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Reminder {
  id: string;
  text: string;
  at: string; // ISO timestamp
  done: boolean;
  createdAt: string;
}

export interface NoteList {
  id: string;
  title: string;
  items: { id: string; text: string; done: boolean }[];
  createdAt: string;
}

const REMINDERS_KEY = 'snugbug:reminders:v1';
const LISTS_KEY = 'snugbug:lists:v1';

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

async function write(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Best-effort.
  }
}

export async function loadReminders(): Promise<Reminder[]> {
  return read<Reminder[]>(REMINDERS_KEY, []);
}

export async function loadLists(): Promise<NoteList[]> {
  return read<NoteList[]>(LISTS_KEY, []);
}

export async function addReminder(text: string, at: Date): Promise<Reminder> {
  const all = await loadReminders();
  const item: Reminder = {
    id: uid(),
    text,
    at: at.toISOString(),
    done: false,
    createdAt: new Date().toISOString(),
  };
  await write(REMINDERS_KEY, [item, ...all]);
  // Schedule the local notification, best-effort.
  try {
    const Notifications = await import('expo-notifications');
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Snugbug reminder', body: text, data: { target: 'tasks' } },
      trigger: { type: 'date', date: at } as any,
    });
  } catch {
    // Reminders still show in the Tasks tab without the push.
  }
  return item;
}

export async function toggleReminder(id: string): Promise<Reminder[]> {
  const all = await loadReminders();
  const next = all.map((r) => (r.id === id ? { ...r, done: !r.done } : r));
  await write(REMINDERS_KEY, next);
  return next;
}

export async function deleteReminder(id: string): Promise<Reminder[]> {
  const all = await loadReminders();
  const next = all.filter((r) => r.id !== id);
  await write(REMINDERS_KEY, next);
  return next;
}

export async function addListItem(listTitle: string, text: string): Promise<NoteList[]> {
  const all = await loadLists();
  const title = listTitle.trim() || 'My list';
  const existing = all.find((l) => l.title.toLowerCase() === title.toLowerCase());
  if (existing) {
    const next = all.map((l) =>
      l.id === existing.id
        ? { ...l, items: [...l.items, { id: uid(), text, done: false }] }
        : l,
    );
    await write(LISTS_KEY, next);
    return next;
  }
  const list: NoteList = {
    id: uid(),
    title,
    items: [{ id: uid(), text, done: false }],
    createdAt: new Date().toISOString(),
  };
  const next = [list, ...all];
  await write(LISTS_KEY, next);
  return next;
}

export async function toggleListItem(listId: string, itemId: string): Promise<NoteList[]> {
  const all = await loadLists();
  const next = all.map((l) =>
    l.id === listId
      ? { ...l, items: l.items.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i)) }
      : l,
  );
  await write(LISTS_KEY, next);
  return next;
}

/** Parse a "remind me at 9 AM to call Mom"-style request, best-effort. */
export function parseReminderRequest(text: string): { text: string; at: Date } | null {
  const m = text.match(/remind me (?:at|to)?\s*(.+)/i);
  if (!m) return null;
  const rest = m[1].trim();
  // "9 AM to call Mom" / "9am call Mom" / "tomorrow at 9am to ..."
  const timeMatch = rest.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!timeMatch) return { text: rest, at: new Date(Date.now() + 60 * 60 * 1000) };
  let hour = parseInt(timeMatch[1], 10);
  const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
  const ampm = (timeMatch[3] || '').toLowerCase();
  if (ampm === 'pm' && hour < 12) hour += 12;
  if (ampm === 'am' && hour === 12) hour = 0;
  const taskText = rest.replace(timeMatch[0], '').replace(/^(to|about)\s+/i, '').trim() || 'Reminder';
  const at = new Date();
  at.setHours(hour, minute, 0, 0);
  if (/tomorrow/i.test(rest)) at.setDate(at.getDate() + 1);
  if (at.getTime() <= Date.now()) at.setDate(at.getDate() + 1);
  return { text: taskText, at };
}

/** Parse an "add milk to my shopping list"-style request, best-effort. */
export function parseListRequest(text: string): { item: string; list: string } | null {
  const m = text.match(/add\s+(.+?)\s+to\s+(?:my\s+)?(.+?)\s*(?:list)?\s*$/i);
  if (!m) return null;
  return { item: m[1].trim(), list: m[2].trim() };
}
