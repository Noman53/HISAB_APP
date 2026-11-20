import { Redirect } from 'expo-router';
import { LocalizedTouchableOpacity as TouchableOpacity } from '@/components/LocalizedControls';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { isInitialSetupComplete } from '@/finance/database';
import { getLaunchDestination, LAUNCH_CHOICE_KEY, LaunchDestination } from '@/services/launch-routing';
import { getPersistentValue } from '@/services/persistent-storage';
import { getSupabaseClient } from '@/services/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { palette, radius, spacing } from '@/theme/tokens';

export default function IndexRoute() {
  const { colors } = useTheme();
  const [destination, setDestination] = useState<LaunchDestination | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setError('');
    void Promise.all([
      isInitialSetupComplete(),
      getPersistentValue(LAUNCH_CHOICE_KEY),
    ]).then(async ([setupComplete, storedChoice]) => {
      const client = getSupabaseClient();
      const sessionResult = client ? await client.auth.getSession() : null;
      if (sessionResult?.error) throw sessionResult.error;
      const choice = storedChoice === 'guest' || storedChoice === 'account' ? storedChoice : null;
      if (active) setDestination(getLaunchDestination(setupComplete, choice, Boolean(sessionResult?.data.session)));
    }).catch(reason => {
      if (active) setError(reason instanceof Error ? reason.message : 'Could not load initial setup.');
    });
    return () => { active = false; };
  }, [retry]);

  if (destination) return <Redirect href={destination} />;
  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
    {error ? <View style={styles.errorState}>
      <AppText style={styles.title} localized>Hisab could not start</AppText>
      <AppText accessibilityRole="alert" style={[styles.message, { color: colors.muted }]} localized>{error}</AppText>
      <TouchableOpacity accessibilityRole="button" onPress={() => setRetry(value => value + 1)} style={styles.retry}>
        <AppText style={styles.retryText} localized>Try again</AppText>
      </TouchableOpacity>
    </View> : <ActivityIndicator color={palette.blue} />}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  errorState: { alignItems: 'center', gap: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  message: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  retry: { backgroundColor: palette.blue, borderRadius: radius.md, paddingHorizontal: 20, paddingVertical: 12, marginTop: 4 },
  retryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
});
