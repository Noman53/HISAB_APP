import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '@/i18n/LanguageProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const icons: Record<string, keyof typeof Ionicons.glyphMap> = { index: 'home-outline', transactions: 'list-outline', reports: 'pie-chart-outline', budgets: 'wallet-outline', more: 'grid-outline' };

export default function TabLayout() {
  const { colors } = useTheme();
  const { translate } = useLanguage();
  const insets = useSafeAreaInsets();
  return <Tabs screenOptions={({ route }) => ({ headerShown: false, tabBarActiveTintColor: '#2563EB', tabBarInactiveTintColor: colors.muted, tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border, height: 82 + insets.bottom, paddingTop: 10, paddingBottom: 22 + insets.bottom }, tabBarLabelStyle: { fontSize: 11, fontWeight: '600' }, tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name] ?? 'ellipse-outline'} color={String(color)} size={size} /> })}>
    <Tabs.Screen name="index" options={{ title: translate('Home') }} />
    <Tabs.Screen name="transactions" options={{ title: translate('Transactions') }} />
    <Tabs.Screen name="reports" options={{ title: translate('Reports') }} />
    <Tabs.Screen name="budgets" options={{ title: translate('Budgets') }} />
    <Tabs.Screen name="more" options={{ title: translate('More') }} />
  </Tabs>;
}
