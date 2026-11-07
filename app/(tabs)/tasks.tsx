import { useCallback, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '../../components/Screen';
import { GlassCard } from '../../components/GlassCard';
import {
  addListItem,
  addReminder,
  deleteReminder,
  loadLists,
  loadReminders,
  toggleListItem,
  toggleReminder,
  type NoteList,
  type Reminder,
} from '../../lib/tasks';

export default function TasksTab() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [lists, setLists] = useState<NoteList[]>([]);
  const [reminderText, setReminderText] = useState('');
  const [listText, setListText] = useState('');

  const refresh = useCallback(() => {
    loadReminders().then(setReminders);
    loadLists().then(setLists);
  }, []);

  useFocusEffect(refresh);

  const addReminderInOneHour = async () => {
    const text = reminderText.trim();
    if (!text) return;
    setReminderText('');
    const item = await addReminder(text, new Date(Date.now() + 60 * 60 * 1000));
    setReminders((prev) => [item, ...prev]);
  };

  const addReminderTomorrow9 = async () => {
    const text = reminderText.trim();
    if (!text) return;
    setReminderText('');
    const at = new Date();
    at.setDate(at.getDate() + 1);
    at.setHours(9, 0, 0, 0);
    const item = await addReminder(text, at);
    setReminders((prev) => [item, ...prev]);
  };

  const addToShopping = async () => {
    const text = listText.trim();
    if (!text) return;
    setListText('');
    setLists(await addListItem('Shopping', text));
  };

  return (
    <Screen>
      <Text style={styles.headline}>TASKS.</Text>
      <Text style={styles.subline}>Reminders and lists — everything Snugbug made for you, in one place.</Text>

      <Text style={styles.section}>Add a reminder</Text>
      <TextInput
        style={styles.input}
        value={reminderText}
        onChangeText={setReminderText}
        placeholder="e.g. Call Mom"
        placeholderTextColor="#555555"
      />
      <View style={styles.row}>
        <TouchableOpacity style={styles.smallBtn} onPress={addReminderInOneHour} activeOpacity={0.8}>
          <Text style={styles.smallBtnText}>In 1 hour</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.smallBtn} onPress={addReminderTomorrow9} activeOpacity={0.8}>
          <Text style={styles.smallBtnText}>Tomorrow 9 AM</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.section}>Reminders</Text>
      {reminders.length === 0 ? (
        <Text style={styles.emptyText}>No reminders yet. Ask in Chat — “remind me at 9 AM to call Mom” — and it lands here.</Text>
      ) : (
        reminders.map((r) => (
          <GlassCard key={r.id} style={styles.card}>
            <TouchableOpacity onPress={async () => setReminders(await toggleReminder(r.id))} activeOpacity={0.8}>
              <Text style={[styles.itemText, r.done && styles.doneText]}>
                {r.done ? '✓ ' : '○ '}{r.text}
              </Text>
              <Text style={styles.itemSub}>
                {new Date(r.at).toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={async () => setReminders(await deleteReminder(r.id))} activeOpacity={0.8}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
          </GlassCard>
        ))
      )}

      <Text style={styles.section}>Add to shopping list</Text>
      <TextInput
        style={styles.input}
        value={listText}
        onChangeText={setListText}
        placeholder="e.g. milk"
        placeholderTextColor="#555555"
        onSubmitEditing={addToShopping}
      />
      <TouchableOpacity style={styles.primary} onPress={addToShopping} activeOpacity={0.8}>
        <Text style={styles.primaryText}>ADD TO LIST</Text>
      </TouchableOpacity>

      <Text style={styles.section}>Lists</Text>
      {lists.length === 0 ? (
        <Text style={styles.emptyText}>No lists yet. Ask in Chat — “add milk to my shopping list”.</Text>
      ) : (
        lists.map((list) => (
          <GlassCard key={list.id} style={styles.card}>
            <Text style={styles.listTitle}>{list.title}</Text>
            {list.items.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={async () => setLists(await toggleListItem(list.id, item.id))}
                activeOpacity={0.8}
              >
                <Text style={[styles.itemText, item.done && styles.doneText]}>
                  {item.done ? '✓ ' : '○ '}{item.text}
                </Text>
              </TouchableOpacity>
            ))}
          </GlassCard>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headline: { color: '#ffffff', fontSize: 30, fontWeight: '800', letterSpacing: 1, marginTop: 32 },
  subline: { color: '#888888', fontSize: 15, fontStyle: 'italic', marginTop: 8, marginBottom: 8 },
  section: { color: '#ffffff', fontSize: 16, fontWeight: '800', marginTop: 20, marginBottom: 10 },
  input: {
    backgroundColor: '#111111',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    color: '#ffffff',
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  row: { flexDirection: 'row', marginTop: 10 },
  smallBtn: {
    borderWidth: 1,
    borderColor: '#3a3a3a',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
  },
  smallBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  primary: { backgroundColor: '#ffffff', borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 10 },
  primaryText: { color: '#000000', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  card: { marginBottom: 12 },
  itemText: { color: '#ffffff', fontSize: 16, lineHeight: 24 },
  doneText: { color: '#777777', textDecorationLine: 'line-through' },
  itemSub: { color: '#888888', fontSize: 13, marginTop: 4 },
  deleteText: { color: '#ff8888', fontSize: 13, fontWeight: '700', marginTop: 10 },
  listTitle: { color: '#F5B544', fontSize: 15, fontWeight: '800', marginBottom: 8 },
  emptyText: { color: '#888888', fontSize: 14, lineHeight: 21 },
});
