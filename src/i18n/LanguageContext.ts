import { createContext, useContext } from 'react';
import { Language } from './index';

interface LanguageSettings {
  busy: boolean;
  error: string;
  changeLanguage: (language: Language) => Promise<void>;
}
export const LanguageContext = createContext<LanguageSettings | null>(null);

export const useLanguageSettings = () => useContext(LanguageContext);
