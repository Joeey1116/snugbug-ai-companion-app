/**
 * clip-entry.tsx — App Clip entry point (SnugbugClip target, module name
 * "SnugbugClip"). Bundled via the clip target's ENTRY_FILE build setting.
 *
 * Deliberately self-contained: imports ONLY react-native (plus the app
 * icon). No expo-router, no Supabase, no auth, no Gemini key — the clip
 * must launch and be useful even with no account and no network. It is a
 * small taste of the companion home: the bug, a few tappable demo
 * "sparks" with canned replies, and a button that opens the full Snugbug
 * app (deep link snugbug://) when it is installed.
 */
import { useState } from 'react';
import {
  AppRegistry,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const SPARKS: { label: string; reply: string }[] = [
  {
    label: 'I need a spark',
    reply:
      'Here is a little one, just for you: you showed up today, and that counts. One small step is still a step.',
  },
  {
    label: 'Help me breathe',
    reply:
      'Let\u2019s do it together. Breathe in slowly\u2026 and out slowly. Again. You\u2019re doing great \u2014 nice and easy.',
  },
  {
    label: 'Cheer me on',
    reply:
      'You\u2019ve got this. Whatever today throws at you, you\u2019ve handled hard days before \u2014 and you\u2019ll handle this one too.',
  },
];

function ClipApp() {
  const [reply, setReply] = useState<string | null>(null);
  const [fullAppNote, setFullAppNote] = useState('');

  const openFullApp = async () => {
    const url = 'snugbug://';
    try {
      if (await Linking.canOpenURL(url)) {
        await Linking.openURL(url);
        return;
      }
    } catch {
      // fall through to the note below
    }
    setFullAppNote(
      'Snugbug isn\u2019t installed on this phone yet \u2014 get the full app on the App Store to meet your companion, set reminders, and keep your Sparks.',
    );
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.wrap}>
      <Image source={require('./assets/icon.png')} style={styles.logo} accessibilityLabel="Snugbug" />
      <Text style={styles.title}>SNUGBUG</Text>
      <Text style={styles.subtitle}>YOUR LITTLE AI FRIEND</Text>
      <Text style={styles.intro}>
        Meet your little AI friend \u2014 a calm companion for check-ins, gentle reminders, and little
        sparks of encouragement.
      </Text>

      <Text style={styles.sectionLabel}>TRY A SPARK</Text>
      {SPARKS.map((spark) => (
        <TouchableOpacity
          key={spark.label}
          style={styles.sparkButton}
          onPress={() => {
            setReply(spark.reply);
            setFullAppNote('');
          }}>
          <Text style={styles.sparkButtonText}>{spark.label}</Text>
        </TouchableOpacity>
      ))}

      {reply ? (
        <View style={styles.replyCard}>
          <Text style={styles.replyText}>{reply}</Text>
        </View>
      ) : null}

      <TouchableOpacity style={styles.openButton} onPress={openFullApp}>
        <Text style={styles.openButtonText}>Open the full Snugbug app</Text>
      </TouchableOpacity>
      {fullAppNote ? <Text style={styles.note}>{fullAppNote}</Text> : null}

      <Text style={styles.footer}>
        A taste of Snugbug. The full app adds your companion, voice calls, tasks, reminders, and your
        Sparks allowance.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#000000' },
  wrap: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 72, paddingBottom: 48 },
  logo: { width: 110, height: 110, borderRadius: 22, resizeMode: 'contain' },
  title: { color: '#ffffff', fontSize: 28, fontWeight: '800', letterSpacing: 6, marginTop: 24 },
  subtitle: { color: '#888888', fontSize: 13, fontWeight: '800', letterSpacing: 8, marginTop: 6 },
  intro: { color: '#bbbbbb', fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 20 },
  sectionLabel: { color: '#888888', fontSize: 12, fontWeight: '800', letterSpacing: 4, marginTop: 32 },
  sparkButton: {
    backgroundColor: '#1a1a1a',
    borderColor: '#333333',
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  sparkButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  replyCard: {
    backgroundColor: '#141414',
    borderColor: '#2a2a2a',
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 20,
    padding: 18,
    width: '100%',
  },
  replyText: { color: '#eeeeee', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  openButton: {
    backgroundColor: '#ffffff',
    borderRadius: 999,
    marginTop: 28,
    paddingHorizontal: 28,
    paddingVertical: 15,
  },
  openButtonText: { color: '#000000', fontSize: 16, fontWeight: '800' },
  note: { color: '#999999', fontSize: 13, lineHeight: 18, marginTop: 14, textAlign: 'center' },
  footer: { color: '#666666', fontSize: 12, lineHeight: 17, marginTop: 28, textAlign: 'center' },
});

AppRegistry.registerComponent('SnugbugClip', () => ClipApp);
