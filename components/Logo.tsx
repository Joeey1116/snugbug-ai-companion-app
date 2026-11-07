import { Image, StyleSheet } from 'react-native';

export function Logo({ size = 88 }: { size?: number }) {
  return (
    <Image
      source={require('../assets/icon.png')}
      style={[styles.logo, { width: size, height: size, borderRadius: size / 5 }]}
      accessibilityLabel="Snugbug"
    />
  );
}

const styles = StyleSheet.create({
  logo: { resizeMode: 'contain' },
});
