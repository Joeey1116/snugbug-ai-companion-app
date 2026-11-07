import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../../components/Screen';
import { loadSettings } from '../../lib/settings';

const IDEAS = [
  {
    icon: '💡',
    title: 'Plan my whole week for me',
    sub: 'Snugbug looks at your reminders and builds a calm plan, one day at a time.',
    prompt: 'Plan my whole week for me — one calm thing per day, with room to breathe.',
  },
  {
    icon: '✓',
    title: 'Keep me on track today',
    sub: 'Gentle check-ins and reminders, never nagging — just there when you need it.',
    prompt: 'Keep me on track today — what should I focus on, and what can wait?',
  },
  {
    icon: '✍️',
    title: 'Help me write a message',
    sub: 'A birthday note, a tricky text, a thank-you — Snugbug drafts it, you send it.',
    prompt: 'Help me write a kind message to a friend I have not talked to in a while.',
  },
  {
    icon: '🧹',
    title: 'Tidy up my to-do list',
    sub: 'Dump everything on your mind and Snugbug sorts it into what matters now.',
    prompt: 'Help me tidy up my to-do list — ask me what is on my mind and sort it.',
  },
  {
    icon: '🌱',
    title: 'Grow the garden with me',
    sub: 'A tiny habit, tracked together — every check-in grows something in the garden.',
    prompt: 'Help me pick one tiny daily habit and keep me going with it.',
  },
  {
    icon: '📖',
    title: 'Tell me something good',
    sub: 'A short, hopeful story or a thought to carry into the day.',
    prompt: 'Tell me something good — a short hopeful thought for today.',
  },
];

export default function IdeasTab() {
  const [companionName, setCompanionName] = useState('Snugbug');

  useEffect(() => {
    loadSettings().then((s) => setCompanionName(s.companionName || 'Snugbug'));
  }, []);

  return (
    <Screen>
      <Text style={styles.headline}>IDEAS.</Text>
      <Text style={styles.subline}>Things {companionName} can do with you. Tap one to start.</Text>
      {IDEAS.map((idea) => (
        <TouchableOpacity
          key={idea.title}
          style={styles.row}
          onPress={() => router.push({ pathname: '/(tabs)', params: { prompt: idea.prompt } })}
          activeOpacity={0.8}
        >
          <Text style={styles.icon}>{idea.icon}</Text>
          <View style={styles.text}>
            <Text style={styles.title}>{idea.title}</Text>
            <Text style={styles.sub}>{idea.sub}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headline: { color: '#ffffff', fontSize: 30, fontWeight: '800', letterSpacing: 1, marginTop: 32 },
  subline: { color: '#888888', fontSize: 15, fontStyle: 'italic', marginTop: 8, marginBottom: 12 },
  row: { flexDirection: 'row', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#222222' },
  icon: { fontSize: 26, marginRight: 14, marginTop: 2 },
  text: { flex: 1 },
  title: { color: '#ffffff', fontSize: 17, fontWeight: '800' },
  sub: { color: '#aaaaaa', fontSize: 14, lineHeight: 20, marginTop: 4 },
});
