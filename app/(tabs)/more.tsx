import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../components/Screen';
import { GlassCard } from '../../components/GlassCard';
import { SnugbugAvatar } from '../../components/SnugbugAvatar';
import { useAuth } from '../../lib/auth';
import { loadSettings } from '../../lib/settings';
import { clearHistory } from '../../lib/chat';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MoreTab() {
  const { email, signOut, userId } = useAuth();
  const [companionName, setCompanionName] = useState('Snugbug');

  useFocusEffect(
    useCallback(() => {
      loadSettings().then((s) => setCompanionName(s.companionName || 'Snugbug'));
    }, []),
  );

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your account, chat history, companion and reminders from our servers. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isSupabaseConfigured() && supabase) {
                await supabase.functions.invoke('delete-account', {});
              }
            } catch {
              // Server delete failed — still sign out and wipe local data.
            }
            try {
              await clearHistory();
              await AsyncStorage.multiRemove([
                'snugbug:settings:v1',
                'snugbug:companion:v1',
                'snugbug:reminders:v1',
                'snugbug:lists:v1',
              ]);
            } catch {
              // Best-effort.
            }
            await signOut();
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <View style={styles.head}>
        <SnugbugAvatar size={88} />
        <Text style={styles.name}>{companionName}</Text>
        <Text style={styles.email}>{email ?? ''}</Text>
      </View>

      <GlassCard>
        <MenuRow label="Visit your companion's home" onPress={() => router.push('/companion')} />
        <MenuRow label="Voice call with your companion" onPress={() => router.push('/voice-call')} />
        <MenuRow label="Settings" onPress={() => router.push('/settings')} />
        <MenuRow label="Privacy policy" onPress={() => router.push('/privacy-policy')} />
      </GlassCard>

      <GlassCard>
        <Text style={styles.cardTitle}>Weekly allowance</Text>
        <Text style={styles.cardText}>
          Your sparks balance shows at the top of Chat after each reply.
          Top-ups and upgrades arrive in a later update — nothing to buy in this version.
        </Text>
      </GlassCard>

      <TouchableOpacity
        style={styles.primary}
        onPress={async () => {
          await clearHistory();
          Alert.alert('Chat cleared', 'Your on-device chat history was cleared.');
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.primaryText}>CLEAR CHAT HISTORY</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondary} onPress={() => void signOut()} activeOpacity={0.8}>
        <Text style={styles.secondaryText}>Sign out</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.danger} onPress={handleDeleteAccount} activeOpacity={0.8}>
        <Text style={styles.dangerText}>Delete my account</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Snugbug 1.0.0 (1000)</Text>
    </Screen>
  );
}

function MenuRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.rowText}>{label}</Text>
      <Text style={styles.rowArrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', marginTop: 32, marginBottom: 20 },
  name: { color: '#ffffff', fontSize: 26, fontWeight: '800', marginTop: 12 },
  email: { color: '#888888', fontSize: 14, marginTop: 4 },
  cardTitle: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  cardText: { color: '#bbbbbb', fontSize: 14, lineHeight: 21, marginTop: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#222222' },
  rowText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  rowArrow: { color: '#888888', fontSize: 22 },
  primary: { backgroundColor: '#ffffff', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  primaryText: { color: '#000000', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  secondary: { borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
  secondaryText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  danger: { alignItems: 'center', paddingVertical: 12 },
  dangerText: { color: '#ff8888', fontSize: 15, fontWeight: '700' },
  version: { color: '#555555', fontSize: 12, textAlign: 'center', marginTop: 16 },
});
