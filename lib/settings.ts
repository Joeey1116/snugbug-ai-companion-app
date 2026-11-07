/**
 * Settings — on-device preferences, AsyncStorage-backed.
 * Companion name is the user-facing name for their Snugbug (working
 * name "Snugbug" is NOT final-locked; the user can rename their own
 * companion any time — that rename is personal, not a brand lock).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Settings {
  companionName: string;
  notificationsEnabled: boolean;
  soundsEnabled: boolean;
}

const KEY = 'snugbug:settings:v1';

export const DEFAULT_SETTINGS: Settings = {
  companionName: 'Snugbug',
  notificationsEnabled: true,
  soundsEnabled: true,
};

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(next: Settings): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Best-effort — the in-memory copy still works for this session.
  }
}
