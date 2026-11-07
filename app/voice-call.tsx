import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { AudioModule, RecordingPresets, useAudioPlayer, useAudioRecorder } from 'expo-audio';
import { Screen } from '../components/Screen';
import { GlassCard } from '../components/GlassCard';
import { SnugbugAvatar } from '../components/SnugbugAvatar';
import { ensureCallAudio } from '../lib/voice';
import { loadSettings } from '../lib/settings';

/**
 * Voice call with the companion — phase 1: voice + animated avatar.
 *
 * STUB, stated on screen: push-to-talk recording and playback work,
 * but live transcription is NOT wired in this build — there is no
 * speech-to-text service yet, so a recording cannot become a chat
 * reply on its own. Nothing here fakes a transcript. Next build:
 * Gemini Live API or STT → snugbug-chat → TTS through the Edge
 * Function (same allowance metering). Live AI video is NOT in scope.
 */
type CallState = 'idle' | 'listening' | 'recorded' | 'playing';

export default function VoiceCallScreen() {
  const [companionName, setCompanionName] = useState('Snugbug');
  const [callState, setCallState] = useState<CallState>('idle');
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [recordingSecs, setRecordingSecs] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const player = useAudioPlayer();

  useEffect(() => {
    loadSettings().then((s) => setCompanionName(s.companionName || 'Snugbug'));
    void ensureCallAudio();
  }, []);

  const startRecording = async () => {
    setError('');
    setBusy(true);
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setError('Microphone permission is needed for voice calls. Allow it in your device settings.');
        return;
      }
      await ensureCallAudio();
      await recorder.prepareToRecordAsync();
      recorder.record();
      setCallState('listening');
      setRecordingSecs(0);
    } catch {
      setError('Could not start recording. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const stopRecording = async () => {
    setBusy(true);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (uri) {
        setRecordingUri(uri);
        setRecordingSecs(Math.max(1, Math.round((recorder.getStatus().durationMillis ?? 0) / 1000)));
        setCallState('recorded');
      } else {
        setCallState('idle');
      }
    } catch {
      setError('Could not stop the recording.');
      setCallState('idle');
    } finally {
      setBusy(false);
    }
  };

  const playRecording = () => {
    if (!recordingUri) return;
    try {
      player.replace({ uri: recordingUri });
      player.play();
      setCallState('playing');
    } catch {
      setError('Could not play that recording back.');
    }
  };

  const stateLabel =
    callState === 'listening'
      ? 'Listening…'
      : callState === 'playing'
        ? `${companionName} is playing your message back`
        : callState === 'recorded'
          ? 'Recording saved on this device'
          : 'Tap and hold to talk';

  return (
    <Screen>
      <View style={styles.head}>
        <SnugbugAvatar
          size={180}
          speaking={callState === 'playing'}
          listening={callState === 'listening'}
        />
        <Text style={styles.name}>{companionName}</Text>
        <Text style={styles.state}>{stateLabel}</Text>
      </View>

      <GlassCard>
        <Text style={styles.noteTitle}>How voice calls work right now</Text>
        <Text style={styles.noteText}>
          Hold the button to record your voice, then play it back. Live
          transcription isn't wired yet — your recording stays on this
          device and can't become a chat reply on its own. Type it in
          Chat instead for now. Voice replies arrive in the next update.
        </Text>
        {recordingUri ? (
          <Text style={styles.noteText}>Last recording: {recordingSecs}s, saved on this device.</Text>
        ) : null}
      </GlassCard>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.talkBtn, callState === 'listening' && styles.talkBtnActive]}
        onPressIn={startRecording}
        onPressOut={stopRecording}
        disabled={busy}
        activeOpacity={0.8}
      >
        {busy ? (
          <ActivityIndicator color="#000000" />
        ) : (
          <Text style={styles.talkBtnText}>
            {callState === 'listening' ? 'RELEASE TO STOP' : 'HOLD TO TALK'}
          </Text>
        )}
      </TouchableOpacity>

      {recordingUri ? (
        <TouchableOpacity style={styles.secondary} onPress={playRecording} activeOpacity={0.8}>
          <Text style={styles.secondaryText}>▶ Play my recording back</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        style={styles.secondary}
        onPress={() => router.push('/(tabs)')}
        activeOpacity={0.8}
      >
        <Text style={styles.secondaryText}>Type it in Chat instead</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.end} onPress={() => router.back()} activeOpacity={0.8}>
        <Text style={styles.endText}>End call</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: 'center', marginTop: 32, marginBottom: 16 },
  name: { color: '#ffffff', fontSize: 28, fontWeight: '800', marginTop: 16 },
  state: { color: '#888888', fontSize: 15, marginTop: 6, fontStyle: 'italic', textAlign: 'center' },
  noteTitle: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  noteText: { color: '#bbbbbb', fontSize: 14, lineHeight: 21, marginTop: 8 },
  error: { color: '#ff8888', fontSize: 14, marginTop: 12, textAlign: 'center' },
  talkBtn: {
    backgroundColor: '#F5B544',
    borderRadius: 999,
    paddingVertical: 20,
    alignItems: 'center',
    marginTop: 16,
  },
  talkBtnActive: { backgroundColor: '#ff5a5a' },
  talkBtnText: { color: '#000000', fontSize: 16, fontWeight: '800', letterSpacing: 2 },
  secondary: {
    borderWidth: 1,
    borderColor: '#2a2a2a',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  end: { alignItems: 'center', paddingVertical: 16, marginTop: 8 },
  endText: { color: '#ff8888', fontSize: 15, fontWeight: '700' },
});
