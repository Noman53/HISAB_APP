import 'react-native-gesture-handler';
import '@/services/background-sync';
import '@/services/notification-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { useEffect, useRef } from 'react';
import { useFinanceStore } from '@/finance/store';
import * as Network from 'expo-network';
import { AppState } from 'react-native';
import { getSupabaseClient } from '@/services/supabase';
import { isAutoSyncEnabled, isSyncLinkedTo, recordAutoSyncFailure } from '@/finance/database';
import { synchronizeFinance } from '@/finance/sync';
import { LanguageProvider } from '@/i18n/LanguageProvider';
import { AppLockProvider } from '@/security/AppLockProvider';
import { StartupSplash } from '@/components/StartupSplash';

function RootStack() {
  const { isDark, colors } = useTheme();
  const initialize = useFinanceStore(state => state.initialize);
  const financeData = useFinanceStore(state => state.data);
  const loading = useFinanceStore(state => state.loading);
  useEffect(() => { void initialize(); }, [initialize]);
  const syncing = useRef(false);
  const syncQueued = useRef(false);
  const tryAutoSync = useRef<(online: boolean) => void>(() => undefined);
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) return;
    let active = true;
    async function syncIfLinked(online: boolean) {
      if (!active || !online) return;
      if (syncing.current) { syncQueued.current = true; return; }
      syncing.current = true;
      try {
        const { data, error } = await client!.auth.getSession();
        if (error) throw error;
        const userId = data.session?.user.id;
        if (userId && await isSyncLinkedTo(userId) && await isAutoSyncEnabled(userId)) await synchronizeFinance(userId);
      } catch (reason) {
        try {
          await recordAutoSyncFailure();
        } catch (recordError) {
          console.error('Automatic finance sync failed and its status could not be saved.', reason, recordError);
        }
      }
      finally {
        syncing.current = false;
        if (active && syncQueued.current) {
          syncQueued.current = false;
          void Network.getNetworkStateAsync().then(network => syncIfLinked(network.isConnected === true && network.isInternetReachable !== false)).catch(reason => console.warn('Could not check network status for queued finance sync.', reason));
        }
      }
    }
    tryAutoSync.current = online => { void syncIfLinked(online); };
    const networkSubscription = Network.addNetworkStateListener(state => {
      void syncIfLinked(state.isConnected === true && state.isInternetReachable !== false);
    });
    const appSubscription = AppState.addEventListener('change', state => {
      if (state === 'active') void Network.getNetworkStateAsync().then(network => syncIfLinked(network.isConnected === true && network.isInternetReachable !== false)).catch(reason => console.warn('Could not check network status for finance sync.', reason));
    });
    const authSubscription = client.auth.onAuthStateChange(() => {
      setTimeout(() => {
        if (!active) return;
        void Network.getNetworkStateAsync().then(network => syncIfLinked(network.isConnected === true && network.isInternetReachable !== false)).catch(reason => console.warn('Could not check network status after account change.', reason));
      }, 0);
    });
    void Network.getNetworkStateAsync().then(network => syncIfLinked(network.isConnected === true && network.isInternetReachable !== false)).catch(reason => console.warn('Could not check network status for finance sync.', reason));
    return () => { active = false; networkSubscription.remove(); appSubscription.remove(); authSubscription.data.subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!financeData) return;
    void Network.getNetworkStateAsync().then(network => tryAutoSync.current(network.isConnected === true && network.isInternetReachable !== false)).catch(reason => console.warn('Could not check network status after finance data changed.', reason));
  }, [financeData]);
  return <><StatusBar style={isDark ? 'light' : 'dark'} /><Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} /><StartupSplash loading={loading} /></>;
}

export default function RootLayout() {
  return <ThemeProvider><LanguageProvider><AppLockProvider><RootStack /></AppLockProvider></LanguageProvider></ThemeProvider>;
}
