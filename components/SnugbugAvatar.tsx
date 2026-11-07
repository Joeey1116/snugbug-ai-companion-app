import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

/**
 * Snugbug — the companion, drawn in code (original vector-style bug).
 * No AI imagery is used for the companion's identity, and the
 * companion is never called "buddy". Amber round body, two antennae,
 * big eyes, pink cheeks, a smile. `speaking` gently pulses the body
 * (voice-call speaking state); `listening` widens the eyes slightly.
 */
export function SnugbugAvatar({
  size = 120,
  speaking = false,
  listening = false,
}: {
  size?: number;
  speaking?: boolean;
  listening?: boolean;
}) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!speaking) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 420, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 420, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [speaking, pulse]);

  const s = size;
  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
      {/* Antennae */}
      <View style={[styles.antenna, { left: s * 0.30, transform: [{ rotate: '-18deg' }] }]} />
      <View style={[styles.antenna, { right: s * 0.30, transform: [{ rotate: '18deg' }] }]} />
      <View style={[styles.antennaTip, { left: s * 0.26, top: s * 0.02 }]} />
      <View style={[styles.antennaTip, { right: s * 0.26, top: s * 0.02 }]} />
      <Animated.View style={[styles.body, { width: s * 0.86, height: s * 0.86, borderRadius: s * 0.43, transform: [{ scale: pulse }] }]}>
        {/* Eyes */}
        <View style={[styles.eye, { width: s * 0.20, height: listening ? s * 0.24 : s * 0.20, left: s * 0.16, top: s * 0.24 }]}>
          <View style={[styles.pupil, { width: s * 0.09, height: s * 0.09 }]} />
        </View>
        <View style={[styles.eye, { width: s * 0.20, height: listening ? s * 0.24 : s * 0.20, right: s * 0.16, top: s * 0.24 }]}>
          <View style={[styles.pupil, { width: s * 0.09, height: s * 0.09 }]} />
        </View>
        {/* Cheeks */}
        <View style={[styles.cheek, { left: s * 0.08, top: s * 0.48 }]} />
        <View style={[styles.cheek, { right: s * 0.08, top: s * 0.48 }]} />
        {/* Smile */}
        <View style={[styles.smile, { width: s * 0.30, height: s * 0.15, bottom: s * 0.14 }]} />
        {/* Little feet */}
        <View style={[styles.foot, { left: s * 0.24, bottom: -s * 0.02 }]} />
        <View style={[styles.foot, { right: s * 0.24, bottom: -s * 0.02 }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  antenna: {
    position: 'absolute',
    top: 6,
    width: 4,
    height: 26,
    backgroundColor: '#F5B544',
    borderRadius: 2,
  },
  antennaTip: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F5B544',
  },
  body: {
    backgroundColor: '#F5B544',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eye: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pupil: {
    backgroundColor: '#1a1a1a',
    borderRadius: 999,
  },
  cheek: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,120,150,0.55)',
  },
  smile: {
    position: 'absolute',
    borderBottomWidth: 4,
    borderBottomColor: '#1a1a1a',
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
  },
  foot: {
    position: 'absolute',
    width: 18,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D99A2B',
  },
});
