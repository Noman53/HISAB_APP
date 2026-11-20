import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { useTheme } from '@/theme/ThemeProvider';
import { palette } from '@/theme/tokens';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

export function StartupSplash({ loading }: { loading: boolean }) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(true);
  const [entranceFinished, setEntranceFinished] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.82)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const titleOffset = useRef(new Animated.Value(9)).current;
  const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  useEffect(() => {
    if (!visible) return;
    const entrance = Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, damping: 12, stiffness: 150, useNativeDriver: true }),
      Animated.timing(titleOffset, { toValue: 0, duration: 440, useNativeDriver: true }),
    ]);
    const orbit = Animated.loop(Animated.timing(rotation, { toValue: 1, duration: 1900, easing: Easing.linear, useNativeDriver: true }));
    entrance.start(({ finished }) => { if (finished) setEntranceFinished(true); });
    orbit.start();
    return () => { entrance.stop(); orbit.stop(); };
  }, [opacity, rotation, scale, titleOffset, visible]);

  useEffect(() => {
    if (!visible || loading || !entranceFinished) return;
    const timeout = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 260, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setVisible(false);
      });
    }, 220);
    return () => clearTimeout(timeout);
  }, [entranceFinished, loading, opacity, visible]);

  if (!visible) return null;
  return <Animated.View accessibilityRole="progressbar" style={[styles.splash, { backgroundColor: colors.background, opacity }]}>
    <View style={styles.logoStage}>
      <Animated.View style={[styles.orbit, { borderColor: colors.border, transform: [{ rotate: spin }] }]}>
        <View style={styles.orbitDot} />
      </Animated.View>
      <Animated.View style={[styles.mark, { backgroundColor: colors.card, transform: [{ scale }] }]}>
        <Ionicons name="wallet-outline" size={31} color={palette.blue} />
      </Animated.View>
    </View>
    <Animated.Text style={[styles.wordmark, { color: colors.text, opacity, transform: [{ translateY: titleOffset }] }]}>HISAB</Animated.Text>
    <AppText style={[styles.tagline, { color: colors.muted }]} localized>Your money, your control</AppText>
  </Animated.View>;
}

const styles = StyleSheet.create({
  splash: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 10, alignItems: 'center', justifyContent: 'center' },
  logoStage: { width: 112, height: 112, alignItems: 'center', justifyContent: 'center' },
  orbit: { position: 'absolute', width: 104, height: 104, borderWidth: 1.5, borderRadius: 52 },
  orbitDot: { position: 'absolute', top: -4, left: 47, width: 9, height: 9, borderRadius: 5, backgroundColor: palette.blue },
  mark: { width: 70, height: 70, borderRadius: 24, alignItems: 'center', justifyContent: 'center', elevation: 5, shadowColor: palette.blue, shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
  wordmark: { marginTop: 16, fontSize: 28, fontWeight: '800', letterSpacing: 3 },
  tagline: { marginTop: 5, fontSize: 12 },
});
