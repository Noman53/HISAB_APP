import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useColorScheme } from 'react-native';
import { getPersistentValue, setPersistentValue } from '@/services/persistent-storage';
import { palette, ThemeColors, ThemeMode } from './tokens';

type ThemeContextValue = { mode: ThemeMode; isDark: boolean; colors: ThemeColors; preferenceError: string | null; setMode: (mode: ThemeMode) => Promise<void> };
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: React.PropsWithChildren) {
  const system = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>('system');
  const [preferenceError, setPreferenceError] = useState<string | null>(null);
  const preferenceRevision = useRef(0);
  const persistenceQueue = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    let active = true;
    void getPersistentValue('hisab.theme.mode').then(value => {
      if (!active || preferenceRevision.current > 0) return;
      if (value === 'system' || value === 'light' || value === 'dark') setMode(value);
    }).catch(() => {
      if (active && preferenceRevision.current === 0) setPreferenceError('Could not load your saved appearance preference. System appearance is being used.');
    });
    return () => { active = false; };
  }, []);
  const saveMode = useCallback(async (nextMode: ThemeMode) => {
    const revision = ++preferenceRevision.current;
    setMode(nextMode);
    const operation = persistenceQueue.current.then(() => setPersistentValue('hisab.theme.mode', nextMode));
    persistenceQueue.current = operation.catch(() => undefined);
    try {
      await operation;
      if (revision === preferenceRevision.current) setPreferenceError(null);
    } catch {
      if (revision === preferenceRevision.current) setPreferenceError('Appearance changed for this session but could not be saved for next time.');
    }
  }, []);
  const isDark = mode === 'dark' || (mode === 'system' && system === 'dark');
  const colors = isDark ? palette.dark : palette.light;
  const value = useMemo(() => ({ mode, isDark, colors, preferenceError, setMode: saveMode }), [mode, isDark, colors, preferenceError, saveMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
}
