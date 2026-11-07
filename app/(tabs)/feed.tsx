import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Screen } from '../../components/Screen';
import { GlassCard } from '../../components/GlassCard';
import { SnugbugAvatar } from '../../components/SnugbugAvatar';
import { loadReminders, loadLists, type Reminder } from '../../lib/tasks';
import { loadSettings } from '../../lib/settings';
import { loadHistory } from '../../lib/chat';

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function dayIndex(date: Date): number {
  // Monday = 0 … Sunday = 6
  return (date.getDay() + 6) % 7;
}

export default function FeedTab() {
  const [companionName, setCompanionName] = useState('Snugbug');
  const [prompt, setPrompt] = useState('');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [doneCount, setDoneCount] = useState(0);
  const [listCount, setListCount] = useState(0);
  const [chatCount, setChatCount] = useState(0);

  const refresh = useCallback(() => {
    loadSettings().then((s) => setCompanionName(s.companionName || 'Snugbug'));
    loadReminders().then((all) => {
      setReminders(all);
      setDoneCount(all.filter((r) => r.done).length);
    });
    loadLists().then((lists) => setListCount(lists.reduce((n, l) => n + l.items.length, 0)));
    loadHistory().then((h) => setChatCount(h.filter((m) => m.role === 'user').length));
  }, []);

  useFocusEffect(refresh);
  useEffect(refresh, [refresh]);

  const plannedDays = new Set(reminders.filter((r) => !r.done).map((r) => dayIndex(new Date(r.at))));
  const openPrompt = () => {
    const text = prompt.trim();
    if (!text) {
      router.push('/(tabs)');
      return;
    }
    setPrompt('');
    router.push({ pathname: '/(tabs)', params: { prompt: text } });
  };

  return (
    <Screen>
      <TouchableOpacity style={styles.avatarHead} onPress={() => router.push('/companion')} activeOpacity={0.8}>
        <SnugbugAvatar size={132} />
        <Text style={styles.name}>{companionName}</Text>
        <Text style={styles.tagline}>Your little AI friend — tap to visit home</Text>
      </TouchableOpacity>

      <Text style={styles.section}>Feed</Text>
      <TextInput
        style={styles.promptBar}
        value={prompt}
        onChangeText={setPrompt}
        placeholder={`Ask ${companionName} anything…`}
        placeholderTextColor="#777777"
        onSubmitEditing={openPrompt}
        returnKeyType="send"
      />

      <GlassCard>
        <Text style={styles.cardTitle}>{companionName} planned your week</Text>
        <Text style={styles.cardText}>
          {reminders.filter((r) => !r.done).length > 0
            ? `${reminders.filter((r) => !r.done).length} reminder${reminders.filter((r) => !r.done).length === 1 ? '' : 's'} on your list already.`
            : 'No reminders yet — ask in Chat and they will show up here.'}
        </Text>
        <View style={styles.weekStrip}>
          {WEEK_DAYS.map((d, i) => (
            <View key={i} style={styles.weekDay}>
              <Text style={[styles.weekLetter, plannedDays.has(i) && styles.weekLetterActive]}>{d}</Text>
              <View style={[styles.weekDot, plannedDays.has(i) && styles.weekDotActive]} />
            </View>
          ))}
        </View>
        <View style={styles.cardFoot}>
          <Text style={styles.cardFootText}>♥ {chatCount} chats</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')} activeOpacity={0.8}>
            <Text style={styles.cardFootLink}>See tasks →</Text>
          </TouchableOpacity>
        </View>
      </GlassCard>

      <GlassCard>
        <Text style={styles.cardTitle}>Your reminders are done</Text>
        <Text style={styles.cardText}>
          {doneCount > 0
            ? `${companionName} helped you finish ${doneCount} reminder${doneCount === 1 ? '' : 's'}${listCount > 0 ? ` and your lists hold ${listCount} item${listCount === 1 ? '' : 's'}` : ''}.`
            : 'Nothing finished yet — check things off in Tasks and they land here.'}
        </Text>
      </GlassCard>

      <Text style={styles.section}>Ideas</Text>
      <TouchableOpacity
        style={styles.ideaRow}
        onPress={() => router.push({ pathname: '/(tabs)', params: { prompt: 'Plan my whole week for me — one calm thing per day.' } })}
        activeOpacity={0.8}
      >
        <Text style={styles.ideaIcon}>💡</Text>
        <View style={styles.ideaText}>
          <Text style={styles.ideaTitle}>Plan my whole week for me</Text>
          <Text style={styles.ideaSub}>{companionName} builds a calm plan, one day at a time.</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.ideaRow}
        onPress={() => router.push({ pathname: '/(tabs)', params: { prompt: 'Keep me on track today — gentle check-ins, no nagging.' } })}
        activeOpacity={0.8}
      >
        <Text style={styles.ideaIcon}>✓</Text>
        <View style={styles.ideaText}>
          <Text style={styles.ideaTitle}>Keep me on track today</Text>
          <Text style={styles.ideaSub}>Gentle check-ins and reminders, never nagging.</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.pill}>
        <Text style={styles.pillText}>Weekly allowance · sparks balance shows in Chat</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatarHead: { alignItems: 'center', marginTop: 24, marginBottom: 8 },
  name: { color: '#ffffff', fontSize: 32, fontWeight: '800', marginTop: 12 },
  tagline: { color: '#888888', fontSize: 14, marginTop: 6, fontStyle: 'italic' },
  section: { color: '#ffffff', fontSize: 26, fontWeight: '800', marginTop: 20, marginBottom: 12 },
  promptBar: {
    backgroundColor: '#111111',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    color: '#ffffff',
    fontSize: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 16,
  },
  cardTitle: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
  cardText: { color: '#bbbbbb', fontSize: 14, lineHeight: 21, marginTop: 6 },
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#3a3a3a',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginTop: 14,
  },
  weekDay: { flex: 1, alignItems: 'center' },
  weekLetter: { color: '#777777', fontSize: 15, fontWeight: '800' },
  weekLetterActive: { color: '#ffffff' },
  weekDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#333333', marginTop: 8 },
  weekDotActive: { backgroundColor: '#F5B544' },
  cardFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  cardFootText: { color: '#aaaaaa', fontSize: 13 },
  cardFootLink: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  ideaRow: { flexDirection: 'row', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#222222' },
  ideaIcon: { fontSize: 24, marginRight: 14, marginTop: 2 },
  ideaText: { flex: 1 },
  ideaTitle: { color: '#ffffff', fontSize: 17, fontWeight: '800' },
  ideaSub: { color: '#aaaaaa', fontSize: 14, lineHeight: 20, marginTop: 4 },
  pill: {
    alignSelf: 'center',
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
    marginTop: 24,
  },
  pillText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
});
