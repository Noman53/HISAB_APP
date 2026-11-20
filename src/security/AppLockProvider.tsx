import * as LocalAuthentication from 'expo-local-authentication';
import { getPersistentValue, setPersistentValue } from '@/services/persistent-storage';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, AppState, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { useTheme } from '@/theme/ThemeProvider';
import { palette, radius, spacing } from '@/theme/tokens';

const APP_LOCK_KEY = 'hisab.app-lock.enabled';

type AppLockContextValue = {
  enabled: boolean;
  supported: boolean;
  updating: boolean;
  error: string;
  setEnabled: (enabled: boolean) => Promise<void>;
};

const AppLockContext = createContext<AppLockContextValue | null>(null);

export function useAppLock() {
  const context = useContext(AppLockContext);
  if (!context) throw new Error('useAppLock must be used within AppLockProvider.');
  return context;
}

async function authenticate() {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock Hisab',
    disableDeviceFallback: false,
  });
  if (!result.success) throw new Error('Authentication was not completed. Try again or use your device passcode.');
}

export function AppLockProvider({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  const supported = Platform.OS !== 'web';
  const [enabled, setEnabledState] = useState(false);
  const [locked, setLocked] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [initializationError, setInitializationError] = useState('');
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const authInProgress = useRef(false);

  const loadPreference = useCallback(async () => {
    setInitializationError('');
    setInitialized(false);
    if (!supported) {
      setEnabledState(false);
      setLocked(false);
      setInitialized(true);
      return;
    }
    try {
      const saved = await getPersistentValue(APP_LOCK_KEY);
      if (saved !== null && saved !== 'true' && saved !== 'false') throw new Error('The saved app-lock preference is invalid.');
      const isEnabled = saved === 'true';
      setEnabledState(isEnabled);
      setLocked(isEnabled);
      setInitialized(true);
    } catch (reason) {
      setInitializationError(reason instanceof Error ? reason.message : 'Could not load the app-lock preference.');
      setInitialized(true);
    }
  }, [supported]);

  useEffect(() => { void loadPreference(); }, [loadPreference]);

  useEffect(() => {
    if (!enabled) return;
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        setLocked(true);
        setError('');
      }
    });
    return () => subscription.remove();
  }, [enabled]);

  async function unlock() {
    if (authInProgress.current) return;
    authInProgress.current = true;
    setAuthenticating(true);
    setError('');
    try {
      await authenticate();
      if (AppState.currentState === 'active') setLocked(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not unlock Hisab.');
    } finally {
      authInProgress.current = false;
      setAuthenticating(false);
    }
  }

  async function setEnabled(next: boolean) {
    if (!supported) {
      setError('App lock is available only in the mobile app.');
      return;
    }
    if (updating || next === enabled) return;
    setUpdating(true);
    setError('');
    try {
      if (next) {
        if (!await LocalAuthentication.hasHardwareAsync()) throw new Error('This device does not support biometric authentication.');
        if (!await LocalAuthentication.isEnrolledAsync()) throw new Error('Set up device biometrics before enabling the app lock.');
        await authenticate();
        await setPersistentValue(APP_LOCK_KEY, 'true');
        setEnabledState(true);
        setLocked(false);
      } else {
        await authenticate();
        await setPersistentValue(APP_LOCK_KEY, 'false');
        setEnabledState(false);
        setLocked(false);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update the app lock.');
    } finally {
      setUpdating(false);
    }
  }

  const value = { enabled, supported, updating, error, setEnabled };
  return <AppLockContext.Provider value={value}>
    {!initialized ? (
      <SafeAreaView style={[styles.gate, { backgroundColor: colors.background }]}><ActivityIndicator color={palette.blue} /></SafeAreaView>
    ) : initializationError ? (
      <SafeAreaView style={[styles.gate, { backgroundColor: colors.background }]}>
        <View style={styles.lockContent}>
          <AppText style={styles.title}>Hisab could not load app-lock settings</AppText>
          <AppText accessibilityRole="alert" style={styles.error}>{initializationError}</AppText>
          <TouchableOpacity accessibilityRole="button" onPress={() => void loadPreference()} style={styles.button}><AppText style={styles.buttonText}>Try again</AppText></TouchableOpacity>
        </View>
      </SafeAreaView>
    ) : enabled && locked ? (
      <SafeAreaView style={[styles.gate, { backgroundColor: colors.background }]}>
        <View style={[styles.lockIcon, { backgroundColor: colors.soft }]}><Ionicons name="lock-closed-outline" size={25} color={palette.blue} /></View>
        <AppText style={styles.title}>Hisab is locked</AppText>
        <AppText style={[styles.description, { color: colors.muted }]}>Use biometrics or your device passcode to continue.</AppText>
        {error ? <AppText accessibilityRole="alert" style={styles.error}>{error}</AppText> : null}
        <TouchableOpacity accessibilityRole="button" disabled={authenticating} onPress={() => void unlock()} style={[styles.button, { opacity: authenticating ? 0.65 : 1 }]}>
          {authenticating ? <ActivityIndicator color="#FFFFFF" /> : <AppText style={styles.buttonText}>Unlock Hisab</AppText>}
        </TouchableOpacity>
      </SafeAreaView>
    ) : children}
  </AppLockContext.Provider>;
}

const styles = StyleSheet.create({
  gate: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  lockContent: { width: '100%', maxWidth: 360, alignItems: 'center' },
  lockIcon: { width: 58, height: 58, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  description: { fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  error: { color: palette.red, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 12 },
  button: { minHeight: 50, minWidth: 180, marginTop: 22, paddingHorizontal: 20, borderRadius: radius.md, backgroundColor: palette.blue, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
