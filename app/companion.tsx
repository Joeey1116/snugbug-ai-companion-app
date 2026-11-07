import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../components/Screen';
import { GlassCard } from '../components/GlassCard';
import { SnugbugAvatar } from '../components/SnugbugAvatar';
import { useAuth } from '../lib/auth';
import { DECORATIONS, loadCompanion, type CompanionState, DEFAULT_COMPANION } from '../lib/companion';
import { loadSettings } from '../lib/settings';

/**
 * The companion's house + garden.
 *
 * ALWAYS free and unlimited — the weekly allowance meters only the
 * AI brain. Running out of sparks never locks this screen away and
 * never makes the companion sad. Decorations unlock through use
 * (streaks, chat milestones), never through payment.
 */
export default function CompanionScreen() {
  const { userId } = useAuth();
  const [companionName, setCompanionName] = useState('Snugbug');
  const [state, setState] = useState<CompanionState>(DEFAULT_COMPANION);

  useFocusEffect(
    useCallback(() => {
      loadSettings().then((s) => setCompanionName(s.companionName || 'Snugbug'));
      loadCompanion(userId).then(setState).catch(() => {});
    }, [userId]),
  );

  const has = (id: string) => state.unlocked.includes(id);

  return (
    <Screen>
      <View style={styles.head}>
        <SnugbugAvatar size={140} />
        <Text style={styles.name}>{companionName}'s home</Text>
        <Text style={styles.sub}>
          {state.streakDays > 0
            ? `${state.streakDays}-day streak · ${state.chatCount} chats · garden level ${state.gardenLevel}`
            : 'Chat with your friend and the garden grows.'}
        </Text>
      </View>

      {/* House + garden scene, drawn in code */}
      <GlassCard>
        <View style={styles.scene}>
          <View style={styles.house}>
            <View style={styles.roof} />
            <View style={styles.door} />
            <View style={styles.window} />
            {has('string-lights') ? <Text style={styles.lights}>✦ ✦ ✦ ✦ ✦</Text> : null}
            {has('cozy-chair') ? <Text style={styles.chair}>🪑</Text> : null}
          </View>
          <View style={styles.garden}>
            <Text style={styles.gardenText}>
              {has('sunflower') ? '🌻 ' : '🌱 '}
              {has('garden-pond') ? '🪷 ' : ''}
              {has('bookshelf') ? '📚 ' : ''}
              Garden level {state.gardenLevel}
            </Text>
            <Text style={styles.gardenSub}>
              {state.carePoints} care points earned by chatting
            </Text>
          </View>
        </View>
      </GlassCard>

      <Text style={styles.section}>Decorations</Text>
      {DECORATIONS.map((d) => (
        <GlassCard key={d.id} style={styles.decoCard}>
          <Text style={styles.decoName}>
            {has(d.id) ? '✓ ' : '🔒 '}{d.name}
          </Text>
          <Text style={styles.decoRule}>{has(d.id) ? 'Unlocked — yours to keep, always free.' : `Unlocks: ${d.rule}`}</Text>
        </GlassCard>
      ))}

      <TouchableOpacity style={styles.primary} onPress={() => router.push('/voice-call')} activeOpacity={0.8}>
        <Text style={styles.primaryText}>CALL {companionName.toUpperCase()}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondary} onPress={() => router.push('/(tabs)')} activeOpacity={0.8}>
        <Text style={styles.secondaryText}>Chat with {companionName}</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', marginTop: 24, marginBottom: 8 },
  name: { color: '#ffffff', fontSize: 28, fontWeight: '800', marginTop: 12 },
  sub: { color: '#888888', fontSize: 14, marginTop: 6, textAlign: 'center' },
  scene: { alignItems: 'center' },
  house: {
    width: 180,
    height: 130,
    backgroundColor: '#2a2118',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4a3a26',
    alignItems: 'center',
    marginTop: 24,
  },
  roof: {
    width: 0,
    height: 0,
    borderLeftWidth: 100,
    borderRightWidth: 100,
    borderBottomWidth: 50,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#F5B544',
    marginTop: -50,
  },
  door: { width: 44, height: 64, backgroundColor: '#F5B544', borderRadius: 8, marginTop: 40 },
  window: {
    position: 'absolute',
    right: 16,
    top: 44,
    width: 34,
    height: 34,
    backgroundColor: '#ffe9a8',
    borderRadius: 6,
  },
  lights: { position: 'absolute', top: 8, color: '#F5B544', fontSize: 12 },
  chair: { position: 'absolute', left: 10, bottom: 8, fontSize: 22 },
  garden: { marginTop: 16, alignItems: 'center' },
  gardenText: { fontSize: 26 },
  gardenSub: { color: '#888888', fontSize: 13, marginTop: 8 },
  section: { color: '#ffffff', fontSize: 18, fontWeight: '800', marginTop: 16, marginBottom: 10 },
  decoCard: { marginBottom: 10 },
  decoName: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  decoRule: { color: '#aaaaaa', fontSize: 13, marginTop: 4 },
  primary: { backgroundColor: '#ffffff', borderRadius: 16, paddingVertical: 17, alignItems: 'center', marginTop: 8, marginBottom: 12 },
  primaryText: { color: '#000000', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  secondary: { borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  secondaryText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
});
