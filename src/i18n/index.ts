import i18next from 'i18next';
import {
  initReactI18next,
  useTranslation as useReactTranslation,
} from 'react-i18next';
import en from './en.json';
import bn from './bn.json';

export type Language = 'en' | 'bn';
export const i18n = i18next.createInstance();
// Bundled dictionaries initialize synchronously and work offline.
i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, bn: { translation: bn } },
  lng: 'en',
  fallbackLng: 'en',
  supportedLngs: ['en', 'bn'],
  initAsync: false,
  keySeparator: false,
  nsSeparator: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export function useTranslation() {
  return useReactTranslation('translation', { i18n });
}

export const locale = () => (i18n.language === 'bn' ? 'bn-BD' : 'en-BD');

// Translate known application/server messages at display time. Arbitrary notes
// and names are not translation keys and remain exactly as supplied.
export function translateMessage(message: string): string {
  if (i18n.exists(message)) return i18n.t(message);
  return message
    .split('\n')
    .map(line => (i18n.exists(line) ? i18n.t(line) : line))
    .join('\n');
}
