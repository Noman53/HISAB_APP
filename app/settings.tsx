import { Ionicons } from '@expo/vector-icons';
import { LocalizedTextInput as TextInput, LocalizedTouchableOpacity as TouchableOpacity } from '@/components/LocalizedControls';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { Session } from '@supabase/supabase-js';
import { AppText } from '@/components/AppText';
import { useLanguage } from '@/i18n/LanguageProvider';
import { Surface } from '@/components/Surface';
import { getSupabaseClient } from '@/services/supabase';
import { useTheme } from '@/theme/ThemeProvider';
import { palette, radius, spacing } from '@/theme/tokens';

const DISPLAY_NAME_KEY = 'hisab.profile.display-name';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { language, error: languageError, setLanguage, translate } = useLanguage();
  const client = getSupabaseClient();
  const [session, setSession] = useState<Session | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [name, auth] = await Promise.all([
          SecureStore.getItemAsync(DISPLAY_NAME_KEY),
          client?.auth.getSession(),
        ]);
        if (!active) return;
        if (auth?.error) throw auth.error;
        setDisplayName(name ?? '');
        setSession(auth?.data.session ?? null);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not load profile settings.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    const listener = client?.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession);
    }).data.subscription;
    return () => { active = false; listener?.unsubscribe(); };
  }, [client]);

  async function saveProfile() {
    const normalized = displayName.trim();
    if (normalized.length > 60) {
      setError('Display name must be 60 characters or fewer.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (normalized) await SecureStore.setItemAsync(DISPLAY_NAME_KEY, normalized);
      else await SecureStore.deleteItemAsync(DISPLAY_NAME_KEY);
      setDisplayName(normalized);
      setMessage('Profile details saved on this device.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save profile details.');
    } finally {
      setSaving(false);
    }
  }

  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity>
        <AppText style={styles.heading} localized>Profile & privacy</AppText>
        <View style={{ width: 42 }} />
      </View>
      <Surface style={styles.profile}>
        <View style={[styles.avatar, { backgroundColor: colors.soft }]}><Ionicons name="person-outline" size={22} color={palette.blue} /></View>
        <AppText style={styles.sectionTitle}>{displayName || translate('Your profile')}</AppText>
        <AppText style={[styles.body, { color: colors.muted }]}>{session?.user.email ?? translate('Guest profile · no cloud account connected')}</AppText>
      </Surface>

      <AppText style={styles.label} localized>Language</AppText>
      <Surface style={styles.card}>
        <AppText style={[styles.body, { color: colors.muted, marginBottom: 11 }]} localized>Choose your app language.</AppText>
        <View style={styles.languages}>
          {(['en', 'bn'] as const).map(value => <TouchableOpacity key={value} accessibilityRole="button" accessibilityState={{ selected: language === value }} onPress={() => void setLanguage(value)} style={[styles.languageOption, { backgroundColor: language === value ? colors.soft : colors.background, borderColor: language === value ? palette.blue : colors.border }]}><AppText style={{ color: language === value ? palette.blue : colors.text, fontSize: 12, fontWeight: '700' }}>{translate(value === 'en' ? 'English' : 'Bangla')}</AppText></TouchableOpacity>)}
        </View>
        {languageError ? <AppText accessibilityRole="alert" style={styles.error} localized>{languageError}</AppText> : null}
      </Surface>

      <AppText style={styles.label} localized>PROFILE DETAILS</AppText>
      <Surface style={styles.card}>
        <AppText style={[styles.fieldLabel, { color: colors.muted }]} localized>DISPLAY NAME · OPTIONAL</AppText>
        <TextInput accessibilityLabel="Display name" autoCapitalize="words" maxLength={60} value={displayName} onChangeText={setDisplayName} placeholder="Your name" placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]} />
        <AppText style={[styles.body, { color: colors.muted, marginTop: 7 }]} localized>This name is stored securely on this device and is not included in finance sync.</AppText>
        <TouchableOpacity accessibilityRole="button" disabled={saving || loading} onPress={() => void saveProfile()} style={[styles.save, { opacity: saving || loading ? 0.6 : 1 }]}>{saving ? <ActivityIndicator color="#FFFFFF" /> : <AppText style={styles.saveText} localized>Save profile</AppText>}</TouchableOpacity>
      </Surface>

      <AppText style={styles.label} localized>PRIVACY</AppText>
      <Surface style={styles.privacy}>
        <Ionicons name="shield-checkmark-outline" size={19} color={palette.green} />
        <View style={styles.copy}>
          <AppText style={styles.sectionTitle} localized>Local-first finance data</AppText>
          <AppText style={[styles.body, { color: colors.muted }]} localized>Your ledger stays in the app’s local SQLite database. Cloud sync is optional and limited to the account you connect.</AppText>
        </View>
      </Surface>
      <Surface style={styles.privacy}>
        <Ionicons name="warning-outline" size={19} color={palette.amber} />
        <View style={styles.copy}>
          <AppText style={styles.sectionTitle} localized>Protect your data</AppText>
          <AppText style={[styles.body, { color: colors.muted }]} localized>Your phone’s screen lock helps protect your data. Backup files aren’t encrypted, so keep them somewhere private.</AppText>
        </View>
      </Surface>
      <Surface style={styles.about}>
        <AppText style={styles.sectionTitle} localized>About Hisab</AppText>
        <View style={[styles.versionRow, { borderTopColor: colors.border }]}><AppText style={[styles.body, { color: colors.muted }]} localized>Version</AppText><AppText style={styles.version} localized>{Constants.expoConfig?.version ?? 'Unknown'}</AppText></View>
        <AppText style={[styles.body, { color: colors.muted, marginTop: 10 }]} localized>Personal finance tools designed to work offline, with optional cloud sync.</AppText>
      </Surface>
      {message ? <AppText accessibilityRole="alert" style={styles.success} localized>{message}</AppText> : null}
      {error ? <AppText accessibilityRole="alert" style={styles.error} localized>{error}</AppText> : null}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: 36, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  back: { width: 42, height: 42, borderWidth: 1, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: 19, fontWeight: '700' },
  profile: { padding: 18, alignItems: 'center', gap: 5 },
  avatar: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700' },
  body: { fontSize: 11, lineHeight: 17 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 11 },
  card: { padding: 15 },
  fieldLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8, marginBottom: 8 },
  languages: { flexDirection: 'row', gap: 8 },
  languageOption: { flex: 1, minHeight: 42, borderWidth: 1, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 13, fontSize: 13 },
  save: { minHeight: 44, backgroundColor: palette.blue, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginTop: 13 },
  saveText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  privacy: { padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  copy: { flex: 1, gap: 5 },
  about: { padding: 15 },
  versionRow: { minHeight: 39, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 11, paddingTop: 9, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  version: { fontSize: 11, fontWeight: '600' },
  success: { color: palette.green, fontSize: 12, lineHeight: 18 },
  error: { color: palette.red, fontSize: 12, lineHeight: 18 },
});
