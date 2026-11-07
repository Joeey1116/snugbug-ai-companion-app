import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../lib/auth';
import { containsCrisisLanguage, CRISIS_REPLY } from '../../lib/crisis';
import {
  clearHistory,
  loadHistory,
  saveHistory,
  sendChat,
  type ChatMessage,
} from '../../lib/chat';
import { addListItem, addReminder, parseListRequest, parseReminderRequest } from '../../lib/tasks';
import { loadCompanion, recordChat } from '../../lib/companion';
import { loadSettings } from '../../lib/settings';
import { SnugbugAvatar } from '../../components/SnugbugAvatar';
import { GlassCard } from '../../components/GlassCard';

/** Allowance display word (PROVISIONAL — Joey's call): "sparks". Never "tokens" user-facing. */
interface PendingAction {
  kind: 'reminder' | 'list';
  summary: string;
  reminderText?: string;
  reminderAt?: Date;
  listItem?: string;
  listName?: string;
}

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function ChatTab() {
  const { userId } = useAuth();
  const params = useLocalSearchParams<{ prompt?: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [allowanceLeft, setAllowanceLeft] = useState<number | null>(null);
  const [allowanceTotal, setAllowanceTotal] = useState<number | null>(null);
  const [outOfAllowance, setOutOfAllowance] = useState(false);
  const [demo, setDemo] = useState(false);
  const [companionName, setCompanionName] = useState('Snugbug');
  const [pending, setPending] = useState<PendingAction | null>(null);
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const promptHandled = useRef<string | null>(null);

  useEffect(() => {
    loadHistory().then(setMessages);
    loadSettings().then((s) => setCompanionName(s.companionName || 'Snugbug'));
    loadCompanion(userId).catch(() => {});
  }, [userId]);

  const pushMessages = useCallback((next: ChatMessage[]) => {
    setMessages(next);
    void saveHistory(next);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const appendAssistant = useCallback(
    (content: string, isDemo = false) => {
      setMessages((prev) => {
        const next: ChatMessage[] = [
          ...prev,
          { id: uid(), role: 'assistant', content, createdAt: new Date().toISOString(), demo: isDemo },
        ];
        void saveHistory(next);
        return next;
      });
    },
    [],
  );

  const sendToBrain = useCallback(
    async (history: ChatMessage[]) => {
      setSending(true);
      setError('');
      try {
        const result = await sendChat(
          history.slice(-20).map((m) => ({ role: m.role, content: m.content })),
        );
        setDemo(result.demo);
        if (result.outOfAllowance) {
          setOutOfAllowance(true);
          setAllowanceLeft(0);
          setAllowanceTotal(result.allowanceTotal);
          return;
        }
        setAllowanceLeft(result.allowanceLeft);
        setAllowanceTotal(result.allowanceTotal);
        appendAssistant(result.reply, result.demo);
        try {
          const prev = await loadCompanion(userId);
          await recordChat(userId, prev);
        } catch {
          // Companion growth is best-effort.
        }
      } catch (err: any) {
        setError(err?.message ?? 'Could not reach Snugbug. Check your connection and try again.');
      } finally {
        setSending(false);
      }
    },
    [appendAssistant, userId],
  );

  const handleSend = useCallback(
    (rawText: string) => {
      const text = rawText.trim();
      if (!text || sending) return;
      setInput('');
      setError('');

      // Crisis check FIRST, on-device, before any network call.
      if (containsCrisisLanguage(text)) {
        const next: ChatMessage[] = [
          ...messages,
          { id: uid(), role: 'user', content: text, createdAt: new Date().toISOString() },
          { id: uid(), role: 'assistant', content: CRISIS_REPLY, createdAt: new Date().toISOString() },
        ];
        pushMessages(next);
        return;
      }

      // Task intents: confirmation card first — never create silently.
      const reminder = parseReminderRequest(text);
      if (reminder) {
        const userMsg: ChatMessage = { id: uid(), role: 'user', content: text, createdAt: new Date().toISOString() };
        pushMessages([...messages, userMsg]);
        setPending({
          kind: 'reminder',
          summary: `Remind you to ${reminder.text} — ${reminder.at.toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}`,
          reminderText: reminder.text,
          reminderAt: reminder.at,
        });
        return;
      }
      const listReq = parseListRequest(text);
      if (listReq) {
        const userMsg: ChatMessage = { id: uid(), role: 'user', content: text, createdAt: new Date().toISOString() };
        pushMessages([...messages, userMsg]);
        setPending({
          kind: 'list',
          summary: `Add "${listReq.item}" to your ${listReq.list} list`,
          listItem: listReq.item,
          listName: listReq.list,
        });
        return;
      }

      const next: ChatMessage[] = [
        ...messages,
        { id: uid(), role: 'user', content: text, createdAt: new Date().toISOString() },
      ];
      pushMessages(next);
      void sendToBrain(next);
    },
    [messages, sending, pushMessages, sendToBrain],
  );

  // A prompt passed in from Feed / Ideas (e.g. "Plan my whole week for me").
  useEffect(() => {
    const prompt = params.prompt;
    if (prompt && promptHandled.current !== prompt && messages.length >= 0) {
      promptHandled.current = prompt;
      handleSend(prompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.prompt]);

  const confirmPending = async () => {
    if (!pending) return;
    const action = pending;
    setPending(null);
    try {
      if (action.kind === 'reminder' && action.reminderText && action.reminderAt) {
        await addReminder(action.reminderText, action.reminderAt);
        appendAssistant(
          `Done — I'll remind you to ${action.reminderText} at ${action.reminderAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`,
        );
      } else if (action.kind === 'list' && action.listItem) {
        await addListItem(action.listName ?? 'Shopping', action.listItem);
        appendAssistant(`Added "${action.listItem}" to your ${action.listName ?? 'Shopping'} list.`);
      }
      try {
        const prev = await loadCompanion(userId);
        await recordChat(userId, prev);
      } catch {
        // Best-effort.
      }
    } catch {
      setError('Could not save that. Try again from the Tasks tab.');
    }
  };

  const renderItem = ({ item }: { item: ChatMessage }) => (
    <View style={[styles.bubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
      {item.role === 'assistant' && (
        <Text style={styles.bubbleName}>{companionName}</Text>
      )}
      <Text style={styles.bubbleText}>{item.content}</Text>
      {item.demo ? <Text style={styles.demoTag}>Demo reply — connect Supabase for real answers</Text> : null}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <SnugbugAvatar size={56} />
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{companionName}</Text>
          <Text style={styles.headerSub}>
            {allowanceLeft !== null
              ? `${allowanceLeft} sparks left this week`
              : 'Your little AI friend'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/companion')} style={styles.headerBtn} activeOpacity={0.8}>
          <Text style={styles.headerBtnText}>Home</Text>
        </TouchableOpacity>
      </View>

      {demo ? (
        <Text style={styles.demoBanner}>
          Demo mode — no Supabase project yet. Replies are placeholders, not AI.
        </Text>
      ) : null}

      {messages.length === 0 ? (
        <View style={styles.empty}>
          <SnugbugAvatar size={120} />
          <Text style={styles.emptyTitle}>Hey, I'm {companionName}.</Text>
          <Text style={styles.emptyText}>
            Ask me anything, plan your week, or tell me to remind you about something.
            I only create things when you say yes first.
          </Text>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {outOfAllowance ? (
        <GlassCard style={styles.outCard}>
          <Text style={styles.outTitle}>Your sparks need a rest.</Text>
          <Text style={styles.outText}>
            You've used this week's allowance — the brain rests until next week.
            {companionName} is still right here, and your house and garden are
            still yours to visit. (Top-ups arrive in a later update.)
          </Text>
          <TouchableOpacity onPress={() => router.push('/companion')} style={styles.outBtn} activeOpacity={0.8}>
            <Text style={styles.outBtnText}>Visit {companionName}'s home</Text>
          </TouchableOpacity>
        </GlassCard>
      ) : null}

      {pending ? (
        <GlassCard style={styles.confirmCard}>
          <Text style={styles.confirmTitle}>Should I do this?</Text>
          <Text style={styles.confirmText}>{pending.summary}</Text>
          <View style={styles.confirmRow}>
            <TouchableOpacity onPress={confirmPending} style={styles.confirmYes} activeOpacity={0.8}>
              <Text style={styles.confirmYesText}>Yes, do it</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPending(null)} style={styles.confirmNo} activeOpacity={0.8}>
              <Text style={styles.confirmNoText}>Not now</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {sending ? (
        <View style={styles.typing}>
          <ActivityIndicator color="#aaaaaa" size="small" />
          <Text style={styles.typingText}>{companionName} is thinking…</Text>
        </View>
      ) : null}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder={`Ask ${companionName} anything…`}
          placeholderTextColor="#555555"
          multiline
          editable={!sending && !outOfAllowance}
          onSubmitEditing={() => handleSend(input)}
        />
        <TouchableOpacity
          style={[styles.send, (!input.trim() || sending || outOfAllowance) && styles.sendDisabled]}
          onPress={() => handleSend(input)}
          disabled={!input.trim() || sending || outOfAllowance}
          activeOpacity={0.8}
        >
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.bottomPad} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#000000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 12,
  },
  headerText: { flex: 1, marginLeft: 12 },
  headerTitle: { color: '#ffffff', fontSize: 20, fontWeight: '800' },
  headerSub: { color: '#888888', fontSize: 13, marginTop: 2 },
  headerBtn: { borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  headerBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
  demoBanner: {
    color: '#ffcc66',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  list: { paddingHorizontal: 20, paddingBottom: 16 },
  bubble: { borderRadius: 18, padding: 14, marginBottom: 10, maxWidth: '88%' },
  userBubble: { backgroundColor: '#ffffff', alignSelf: 'flex-end' },
  assistantBubble: { backgroundColor: '#1a1a1a', alignSelf: 'flex-start', borderWidth: 1, borderColor: '#2a2a2a' },
  bubbleName: { color: '#F5B544', fontSize: 12, fontWeight: '800', marginBottom: 4 },
  bubbleText: { color: '#ffffff', fontSize: 15, lineHeight: 22 },
  demoTag: { color: '#888888', fontSize: 11, marginTop: 6, fontStyle: 'italic' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { color: '#ffffff', fontSize: 24, fontWeight: '800', marginTop: 20, textAlign: 'center' },
  emptyText: { color: '#aaaaaa', fontSize: 15, lineHeight: 23, textAlign: 'center', marginTop: 10 },
  outCard: { marginHorizontal: 20 },
  outTitle: { color: '#ffffff', fontSize: 17, fontWeight: '800' },
  outText: { color: '#bbbbbb', fontSize: 14, lineHeight: 21, marginTop: 8 },
  outBtn: { backgroundColor: '#ffffff', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  outBtnText: { color: '#000000', fontSize: 14, fontWeight: '800' },
  confirmCard: { marginHorizontal: 20 },
  confirmTitle: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  confirmText: { color: '#bbbbbb', fontSize: 14, lineHeight: 20, marginTop: 6 },
  confirmRow: { flexDirection: 'row', marginTop: 12 },
  confirmYes: { flex: 1, backgroundColor: '#ffffff', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginRight: 8 },
  confirmYesText: { color: '#000000', fontSize: 14, fontWeight: '800' },
  confirmNo: { flex: 1, borderWidth: 1, borderColor: '#3a3a3a', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  confirmNoText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  error: { color: '#ff8888', fontSize: 14, marginHorizontal: 20, marginBottom: 8 },
  typing: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 8 },
  typingText: { color: '#888888', fontSize: 13, marginLeft: 8, fontStyle: 'italic' },
  inputRow: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 8, alignItems: 'flex-end' },
  input: {
    flex: 1,
    backgroundColor: '#111111',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    color: '#ffffff',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 120,
  },
  send: { backgroundColor: '#ffffff', borderRadius: 18, paddingHorizontal: 18, paddingVertical: 13, marginLeft: 8 },
  sendDisabled: { opacity: 0.4 },
  sendText: { color: '#000000', fontSize: 15, fontWeight: '800' },
  bottomPad: { height: 96 },
});
