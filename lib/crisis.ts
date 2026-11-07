/**
 * Crisis safety — shared by the Chat tab (on-device check, before any
 * network call) and the snugbug-chat Edge Function (server backstop).
 * Plain substring match, deliberately simple and predictable.
 * Crisis replies never count against the weekly allowance.
 */
export const CRISIS_PHRASES = [
  'kill myself',
  'suicide',
  'suicidal',
  'end it all',
  'end my life',
  'hurt myself',
  'harm myself',
  'self harm',
  'self-harm',
  'want to die',
  'no reason to live',
  'being abused',
  'he hits me',
  'she hits me',
  'not safe at home',
];

export const CRISIS_REPLY =
  "I'm really glad you told me. Please hear me — you matter, and you don't have to carry this alone.\n\n" +
  'If you need someone right now:\n' +
  '• Call or text 988 (Suicide & Crisis Lifeline)\n' +
  '• Text HOME to 741741 (Crisis Text Line)\n' +
  '• Call 1-800-799-7233 or text START to 88788 (National Domestic Violence Hotline)\n\n' +
  "I'm right here with you. Keep talking to me — and if you can, reach out to one of those lines too. They have real people ready to help, right now.";

export function containsCrisisLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return CRISIS_PHRASES.some((phrase) => lower.includes(phrase));
}
