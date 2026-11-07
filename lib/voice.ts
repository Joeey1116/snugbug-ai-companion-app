/**
 * Voice calls — push-to-talk recording + playback via expo-audio.
 *
 * STUB, stated plainly: recording and playback work on-device, but
 * live transcription is NOT wired yet — there is no speech-to-text
 * service in this build, so a recording cannot become a chat reply
 * on its own. The Voice Call screen says so on screen. Wiring options
 * for the next build: Gemini Live API (real-time voice, billed per
 * minute) or STT → snugbug-chat → TTS through the same Edge Function
 * so allowance metering still applies. Do NOT fake a transcript.
 */
import { RecordingPresets, setAudioModeAsync, useAudioRecorder, type AudioRecorder } from 'expo-audio';

let callAudioConfigured = false;

export async function ensureCallAudio(): Promise<void> {
  if (callAudioConfigured) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'doNotMix',
      allowsRecording: true,
      shouldRouteThroughEarpiece: false,
    });
    callAudioConfigured = true;
  } catch {
    // Best-effort — recording still works in the foreground on most devices.
  }
}

export function useVoiceRecorder(): AudioRecorder {
  return useAudioRecorder(RecordingPresets.HIGH_QUALITY);
}
