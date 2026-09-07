import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from '../i18n';
import { useLanguageSettings } from '../i18n/LanguageContext';
import { colors } from '../theme';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'bn', label: 'বাংলা' },
] as const;
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const settings = useLanguageSettings();
  if (!settings) return null;
  return (
    <View style={local.container}>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t('Language')}
        style={local.options}
      >
        {languages.map(language => (
          <Pressable
            key={language.code}
            accessibilityRole="radio"
            accessibilityLabel={language.label}
            accessibilityState={{
              checked: i18n.language === language.code,
              disabled: settings.busy,
            }}
            disabled={settings.busy}
            onPress={() => {
              settings.changeLanguage(language.code);
            }}
            style={({ pressed }) => [
              local.option,
              i18n.language === language.code && local.selected,
              (pressed || settings.busy) && local.dimmed,
            ]}
          >
            <Text
              style={[
                local.label,
                i18n.language === language.code && local.selectedLabel,
              ]}
            >
              {language.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {settings.error ? (
        <Text accessibilityLiveRegion="polite" style={local.error}>
          {t(settings.error)}
        </Text>
      ) : null}
    </View>
  );
}
const local = StyleSheet.create({
  container: { gap: 6, flexShrink: 1 },
  options: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    padding: 3,
    borderRadius: 13,
    backgroundColor: colors.mint,
  },
  option: {
    minHeight: 44,
    minWidth: 60,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  selected: { backgroundColor: colors.primary },
  label: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 22,
  },
  selectedLabel: { color: colors.surface },
  dimmed: { opacity: 0.65 },
  error: { color: colors.danger, fontSize: 13, lineHeight: 20 },
});
