import { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../components/Screen';
import { GlassCard } from '../components/GlassCard';
import { useAuth } from '../lib/auth';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type Settings,
} from '../lib/settings';
import { updateProfile } from '../lib/profile';

export default function SettingsScreen() {
  const { userId } = useAuth();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState('');

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const update = async (next: Settings) => {
    setSettings(next);
    await saveSettings(next);
    setSaved('Saved.');
    setTimeout(() => setSaved(''), 2000);
    if (userId) {
      try {
        await updateProfile(userId, { companion_name: next.companionName });
      } catch {
        // Local setting stands; the server copy syncs on next sign-in.
      }
    }
  };

  return (
    <Screen>
      <Text style={styles.headline}>SETTINGS.</Text>
      <Text style={styles.subline}>Your profile, your companion, your preferences.</Text>

      <Text style={styles.label}>YOUR COMPANION'S NAME</Text>
      <TextInput
        style={styles.input}
        value={settings.companionName}
        onChangeText={(v) => update({ ...settings, companionName: v.trim() ? v : 'Snugbug' })}
        placeholder="Snugbug"
        placeholderTextColor="#555555"
        maxLength={24}
      />
      <Text style={styles.hint}>This is your companion's name in your app. (The name "Snugbug" itself is still a working name — not final-locked.)</Text>

      <GlassCard>
        <ToggleRow
          label="Notifications"
          sub="Reminders you asked for"
          value={settings.notificationsEnabled}
          onToggle={(v) => update({ ...settings, notificationsEnabled: v })}
        />
        <ToggleRow
          label="Sounds"
          sub="Gentle sounds in the app"
          value={settings.soundsEnabled}
          onToggle={(v) => update({ ...settings, soundsEnabled: v })}
        />
      </GlassCard>

      <GlassCard>
        <Text style={styles.cardTitle}>Weekly allowance</Text>
        <Text style={styles.cardText}>
          Your sparks balance shows at the top of Chat after each reply.
          The weekly allowance amount is set before launch — nothing to
          buy in this version, and your companion is always free.
        </Text>
      </GlassCard>

      {saved ? <Text style={styles.saved}>{saved}</Text> : null}

      <TouchableOpacity style={styles.secondary} onPress={() => router.push('/privacy-policy')} activeOpacity={0.8}>
        <Text style={styles.secondaryText}>Privacy policy</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Snugbug 1.0.0 (1000)</Text>
    </Screen>
  );
}

function ToggleRow({
  label,
  sub,
  value,
  onToggle,
}: {
  label: string;
  sub: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleSub}>{sub}</Text>
      </View>
      <TouchableOpacity
        style={[styles.toggle, value && styles.toggleOn]}
        onPress={() => onToggle(!value)}
        activeOpacity={0.8}
      >
        <View style={[styles.knob, value && styles.knobOn]} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  headline: { color: '#ffffff', fontSize: 30, fontWeight: '800', letterSpacing: 1, marginTop: 32 },
  subline: { color: '#888888', fontSize: 15, fontStyle: 'italic', marginTop: 8, marginBottom: 12 },
  label: { color: '#888888', fontSize: 12, fontWeight: '700', letterSpacing: 2, marginBottom: 8, marginTop: 8 },
  input: {
    backgroundColor: '#111111',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    color: '#ffffff',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 4,
  },
  hint: { color: '#777777', fontSize: 13, marginBottom: 8, lineHeight: 18 },
  cardTitle: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  cardText: { color: '#bbbbbb', fontSize: 14, lineHeight: 21, marginTop: 6 },
  saved: { color: '#aaddff', fontSize: 14, textAlign: 'center', marginTop: 8 },
  secondary: { borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  secondaryText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  version: { color: '#555555', fontSize: 12, textAlign: 'center', marginTop: 20 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#222222' },
  toggleText: { flex: 1 },
  toggleLabel: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  toggleSub: { color: '#888888', fontSize: 13, marginTop: 2 },
  toggle: { width: 52, height: 30, borderRadius: 15, backgroundColor: '#333333', justifyContent: 'center', paddingHorizontal: 3 },
  toggleOn: { backgroundColor: '#F5B544' },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#ffffff' },
  knobOn: { alignSelf: 'flex-end' },
});
