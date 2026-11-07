import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '../components/Screen';
import { GlassCard } from '../components/GlassCard';
import { SnugbugAvatar } from '../components/SnugbugAvatar';
import { maybeRequestTracking } from '../lib/tracking';

/**
 * Consent-first onboarding (Motivation pattern): the user meets
 * Snugbug, sees how the app works, reads the plain-language data +
 * AI disclosure and agrees before any account is created.
 */
const STEPS = [
  { num: '01', title: 'CHAT', text: 'Ask Snugbug anything — a real AI friend who helps you think things through, plan your week, and get stuff done.' },
  { num: '02', title: 'CARE', text: 'Your companion has its own house and garden. Chatting grows it, and milestones unlock decorations — always free, never paywalled.' },
  { num: '03', title: 'DO', text: 'Snugbug sets reminders, keeps your lists, and looks things up. Anything it creates, it shows you first — you tap to confirm.' },
];

export default function Onboarding() {
  const [page, setPage] = useState(0);

  // No Skip / guest entry: the tabs require a real signed-in account,
  // so onboarding only leads to sign-up or sign-in.
  return (
    <Screen>
      {page === 0 && (
        <View style={styles.page}>
          <View style={styles.hero}>
            <SnugbugAvatar size={132} />
            <Text style={styles.brand}>SNUGBUG</Text>
            <Text style={styles.headline}>YOUR LITTLE{'\n'}AI FRIEND.</Text>
            <Text style={styles.subline}>Smart help, with a companion who grows with you.</Text>
          </View>
          <Text style={styles.intro}>
            Snugbug is a real AI assistant with a little companion you take
            care of — its own house, its own garden, built together as you chat.
          </Text>
        </View>
      )}

      {page === 1 && (
        <View style={styles.page}>
          <Text style={styles.headline}>HOW IT WORKS.</Text>
          <Text style={styles.subline}>Three things. Zero fine print.</Text>
          <View style={styles.steps}>
            {STEPS.map((s) => (
              <GlassCard key={s.num} style={styles.stepCard}>
                <Text style={styles.stepNum}>{s.num}</Text>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text style={styles.stepText}>{s.text}</Text>
              </GlassCard>
            ))}
          </View>
        </View>
      )}

      {page === 2 && (
        <View style={styles.page}>
          <Text style={styles.headline}>BEFORE YOU JOIN.</Text>
          <Text style={styles.subline}>The honest version, up front.</Text>
          <View style={styles.steps}>
            <GlassCard style={styles.stepCard}>
              <Text style={styles.stepText}>• Your chats are answered by Google's Gemini AI — your messages are sent to Google to get a reply. They are never sold, and never used for ads.</Text>
              <Text style={styles.stepText}>• Snugbug has a fair weekly allowance of AI replies ("sparks"). When it runs out, the brain rests until next week — your companion stays right here, happy and free.</Text>
              <Text style={styles.stepText}>• Snugbug never sends messages, spends money, or books anything for you. It drafts things for you to send yourself.</Text>
              <Text style={styles.stepText}>• If you ever say you're thinking of hurting yourself, Snugbug gives you real help right away — call or text 988, or text HOME to 741741.</Text>
              <Text style={styles.stepText}>• You can delete your account any time in Settings. You can read the full policy before you join.</Text>
            </GlassCard>
          </View>
          <TouchableOpacity
            style={styles.secondary}
            onPress={() => router.push('/privacy-policy')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryText}>Read the full privacy policy</Text>
          </TouchableOpacity>
        </View>
      )}

      {page === 3 && (
        <View style={styles.page}>
          <View style={styles.hero}>
            <SnugbugAvatar size={104} />
            <Text style={styles.headline}>MEET SNUGBUG.</Text>
            <Text style={styles.subline}>Your companion is waiting.</Text>
          </View>
          <TouchableOpacity
            style={styles.primary}
            onPress={async () => {
              await maybeRequestTracking();
              router.push('/sign-up');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryText}>CREATE MY ACCOUNT</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondary}
            onPress={async () => {
              await maybeRequestTracking();
              router.push('/sign-in');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryText}>I have an account</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.dots}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>
        {page < 3 ? (
          <TouchableOpacity
            style={styles.primary}
            onPress={() => setPage(page + 1)}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryText}>{page === 0 ? 'HOW IT WORKS' : page === 1 ? 'YOUR DATA' : 'GET STARTED'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.fineWrap}>
            <Text style={styles.fine}>Snugbug — your little AI friend</Text>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  hero: { alignItems: 'center', marginTop: 24, marginBottom: 24 },
  brand: { color: '#888888', fontSize: 13, fontWeight: '800', letterSpacing: 4, marginTop: 20 },
  headline: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 44,
  },
  subline: { color: '#888888', fontSize: 16, fontStyle: 'italic', marginTop: 10, textAlign: 'center' },
  intro: {
    color: '#aaaaaa',
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  steps: { marginTop: 20 },
  stepCard: { marginBottom: 12 },
  stepNum: { color: '#555555', fontSize: 13, fontWeight: '800', letterSpacing: 3 },
  stepTitle: { color: '#ffffff', fontSize: 20, fontWeight: '800', letterSpacing: 2, marginTop: 6 },
  stepText: { color: '#bbbbbb', fontSize: 14, lineHeight: 21, marginTop: 8 },
  primary: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryText: { color: '#000000', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  secondary: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    marginBottom: 8,
  },
  secondaryText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  footer: { paddingBottom: 8 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#333333', marginHorizontal: 5 },
  dotActive: { backgroundColor: '#ffffff', width: 24 },
  fineWrap: { alignItems: 'center', paddingVertical: 18 },
  fine: { color: '#555555', fontSize: 12, letterSpacing: 1 },
});
