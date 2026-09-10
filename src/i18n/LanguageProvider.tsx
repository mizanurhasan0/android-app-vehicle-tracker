import React, { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { i18n, Language } from './index';
import { LanguageContext } from './LanguageContext';

export const LANGUAGE_STORAGE_KEY = 'transport.language';

export function LanguageProvider({ children }: React.PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then(async saved => {
        if (active) await i18n.changeLanguage(saved === 'en' ? 'en' : 'bn');
      })
      .catch(() => {
        if (active)
          setError('Could not restore your language. Please select it again.');
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  async function changeLanguage(language: Language) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError('');
    try {
      // Persist before switching so the selected setting also survives restart.
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      await i18n.changeLanguage(language);
    } catch {
      setError('Could not save your language. Please try again.');
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  if (!ready) return null;
  return (
    <LanguageContext.Provider value={{ busy, error, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}
