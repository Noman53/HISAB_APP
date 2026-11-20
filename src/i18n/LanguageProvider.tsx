import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { getPersistentValue, setPersistentValue } from '@/services/persistent-storage';
import { AppLanguage } from './translations';
import { setActiveLanguage, translateText } from './translate';

type LanguageContextValue = {
  language: AppLanguage;
  error: string | null;
  setLanguage: (language: AppLanguage) => Promise<void>;
  translate: (text: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const LANGUAGE_KEY = 'hisab.language';

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<AppLanguage>('en');
  const [error, setError] = useState<string | null>(null);
  const revision = useRef(0);
  const queue = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    void getPersistentValue(LANGUAGE_KEY).then(saved => {
      if (!active || revision.current > 0) return;
      if (saved === 'en' || saved === 'bn') {
        setLanguageState(saved);
        setActiveLanguage(saved);
      }
      else if (saved !== null) setError('Saved language preference is invalid; English is being used.');
    }).catch(() => {
      if (active && revision.current === 0) setError('Could not load the saved language preference; English is being used.');
    });
    return () => { active = false; };
  }, []);

  const setLanguage = useCallback(async (next: AppLanguage) => {
    const currentRevision = ++revision.current;
    setLanguageState(next);
    setActiveLanguage(next);
    const operation = queue.current.then(() => setPersistentValue(LANGUAGE_KEY, next));
    queue.current = operation.catch(() => undefined);
    try {
      await operation;
      if (currentRevision === revision.current) setError(null);
    } catch {
      if (currentRevision === revision.current) setError('Language changed for this session but could not be saved for next time.');
    }
  }, []);

  const translate = useCallback((text: string) => {
    return translateText(text, language);
  }, [language]);

  const value = useMemo(() => ({ language, error, setLanguage, translate }), [language, error, setLanguage, translate]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('useLanguage must be used within LanguageProvider.');
  return value;
}
