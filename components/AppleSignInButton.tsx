/**
 * Apple Sign In — shared by sign-in and sign-up.
 * Standard expo-apple-authentication + Supabase signInWithIdToken
 * pattern (SHA-256 hashed nonce, raw nonce sent to Supabase).
 * Only rendered on iOS where Apple Sign In is available; hidden
 * elsewhere. Requires "Sign in with Apple" enabled in the Supabase
 * dashboard (Auth → Providers → Apple) — a Joey setup step.
 *
 * Crash-safety: expo-apple-authentication is NEVER statically
 * imported (same lesson as lib/tracking.ts — a static import of a
 * native-only module resolves the whole route to undefined on web).
 * It is loaded lazily with dynamic imports inside try/catch.
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { ensureProfile } from '../lib/profile';

export function AppleSignInButton({ label }: { label: string }) {
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    (async () => {
      try {
        const mod = await import('expo-apple-authentication');
        const fn = mod?.isAvailableAsync;
        if (typeof fn !== 'function') return;
        setAvailable(await fn());
      } catch {
        setAvailable(false);
      }
    })();
  }, []);

  if (!available) return null;

  // No backend yet (demo build): hide Apple sign-in the same way the email
  // form disables itself — otherwise it fires a fetch at a placeholder
  // host and shows the same raw "hostname could not be found" error.
  if (!isSupabaseConfigured()) return null;

  const handlePress = async () => {
    setError('');
    setLoading(true);
    try {
      const AppleAuthentication = await import('expo-apple-authentication');
      const Crypto = await import('expo-crypto');
      const nonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        nonce,
      );
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        ],
        nonce: hashedNonce,
      });
      if (!credential.identityToken) {
        setError('Apple sign-in did not return an identity token. Try again.');
        return;
      }
      const { data, error: signInError } = await supabase!.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce,
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }
      if (data.user) {
        try {
          await ensureProfile(data.user.id, data.user.email ?? '');
        } catch {
          // Non-fatal: the profile self-heals on next launch.
        }
      }
      router.replace('/(tabs)');
    } catch (err: any) {
      if (err?.code === 'ERR_REQUEST_CANCELED') return;
      setError('Apple sign-in failed. Try again or use email instead.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <TouchableOpacity style={styles.apple} onPress={handlePress} disabled={loading} activeOpacity={0.8}>
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.appleText}> {label} with Apple</Text>
        )}
      </TouchableOpacity>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </>
  );
}

const styles = StyleSheet.create({
  apple: {
    backgroundColor: '#111111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3a3a3a',
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  appleText: { color: '#ffffff', fontSize: 16, fontWeight: '800', letterSpacing: 1 },
  error: { color: '#ff8888', fontSize: 14, marginTop: 8 },
});
