import { Ionicons } from '@expo/vector-icons';
import { Alert } from '@/components/LocalizedAlert';
import { LocalizedTouchableOpacity as TouchableOpacity } from '@/components/LocalizedControls';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { Surface } from '@/components/Surface';
import { createLocalBackup, restoreLocalBackup } from '@/finance/database';
import { useFinanceStore } from '@/finance/store';
import { useTheme } from '@/theme/ThemeProvider';
import { palette, radius, spacing } from '@/theme/tokens';

export default function BackupScreen() {
  const { colors } = useTheme();
  const [working, setWorking] = useState<'backup' | 'restore' | null>(null);
  const [error, setError] = useState('');

  async function makeBackup() {
    setWorking('backup'); setError('');
    try {
      const json = await createLocalBackup();
      const uri = `${FileSystem.cacheDirectory}hisab-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      await FileSystem.writeAsStringAsync(uri, json, { encoding: FileSystem.EncodingType.UTF8 });
      if (!(await Sharing.isAvailableAsync())) throw new Error('File sharing is unavailable on this device.');
      await Sharing.shareAsync(uri, { mimeType: 'application/json', dialogTitle: 'Save or share Hisab backup', UTI: 'public.json' });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not create a backup.'); }
    finally { setWorking(null); }
  }

  async function pickBackup() {
    setWorking('restore'); setError('');
    try {
      const picked = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/json'], copyToCacheDirectory: true, multiple: false });
      if (picked.canceled || !picked.assets[0]) return;
      const text = await FileSystem.readAsStringAsync(picked.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
      setWorking(null);
      Alert.alert('Restore this backup?', 'This merges records into this device. Existing records with matching IDs will be replaced; other local records will remain.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Restore', onPress: () => { setWorking('restore'); void restoreLocalBackup(text).then(async counts => { await useFinanceStore.getState().initialize(); const total = Object.values(counts).reduce((sum, count) => sum + count, 0); Alert.alert('Restore complete', `${total} records were merged into this device.`); }).catch(reason => setError(reason instanceof Error ? reason.message : 'Could not restore the backup.')).finally(() => setWorking(null)); } }]);
      return;
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not read the selected backup.'); }
    finally { setWorking(current => current === 'restore' ? null : current); }
  }

  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}><ScrollView contentContainerStyle={styles.content}>
    <View style={styles.header}><TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="arrow-back" size={20} color={colors.text} /></TouchableOpacity><AppText style={styles.title} localized>Backup & restore</AppText><View style={{ width: 42 }} /></View>
    <Surface style={styles.info}><View style={[styles.icon, { backgroundColor: colors.soft }]}><Ionicons name="lock-closed-outline" size={20} color={palette.blue} /></View><AppText style={styles.infoTitle} localized>Your data stays on this device</AppText><AppText style={[styles.body, { color: colors.muted }]} localized>Create a portable, unencrypted JSON copy of your wallets, transactions, budgets, goals, debts, recurring entries, and bill history. Store the file somewhere private.</AppText></Surface>
    <TouchableOpacity disabled={!!working} onPress={() => void makeBackup()} accessibilityRole="button" style={[styles.action, { opacity: working ? 0.65 : 1 }]}><Ionicons name="cloud-download-outline" size={20} color="#FFFFFF" />{working === 'backup' ? <ActivityIndicator color="#FFFFFF" /> : <AppText style={styles.actionText} localized>Create backup</AppText>}</TouchableOpacity>
    <TouchableOpacity disabled={!!working} onPress={() => void pickBackup()} accessibilityRole="button" style={[styles.secondary, { backgroundColor: colors.card, borderColor: colors.border, opacity: working ? 0.65 : 1 }]}><Ionicons name="folder-open-outline" size={19} color={palette.blue} />{working === 'restore' ? <ActivityIndicator color={palette.blue} /> : <AppText style={[styles.secondaryText, { color: colors.text }]} localized>Restore from file</AppText>}</TouchableOpacity>
    <Surface style={styles.note}><Ionicons name="information-circle-outline" size={17} color={palette.blue} /><AppText style={[styles.body, { flex: 1, color: colors.muted }]} localized>Restore merges by record ID. A database transaction protects your existing data if validation fails. Treat backup files as sensitive financial records.</AppText></Surface>
    {error ? <AppText accessibilityRole="alert" style={styles.error} localized>{error}</AppText> : null}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1 }, content: { padding: spacing.md, paddingBottom: 40 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }, back: { width: 42, height: 42, borderWidth: 1, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 18, fontWeight: '700' }, info: { padding: 18, alignItems: 'center', marginBottom: 18 }, icon: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }, infoTitle: { fontSize: 15, fontWeight: '700', marginBottom: 7 }, body: { fontSize: 11, lineHeight: 18, textAlign: 'center' }, action: { minHeight: 52, borderRadius: radius.md, backgroundColor: palette.blue, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, marginTop: 4 }, actionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' }, secondary: { minHeight: 51, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, marginTop: 10 }, secondaryText: { fontSize: 13, fontWeight: '700' }, note: { padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginTop: 20 }, error: { color: palette.red, fontSize: 12, lineHeight: 17, marginTop: 15, textAlign: 'center' } });
