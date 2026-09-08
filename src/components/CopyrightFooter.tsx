import React from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAction } from '../hooks/useAction';
import { useTranslation } from '../i18n';
import { colors } from '../theme';

export function CopyrightFooter() {
  const { t } = useTranslation();
  const action = useAction();
  const year = new Date().getFullYear();
  return (
    <View style={local.footer}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`© ${year} Eng. Mizanur Hasan`}
        accessibilityHint={t('Opens LinkedIn profile')}
        accessibilityState={{ disabled: action.busy }}
        disabled={action.busy}
        onPress={() => {
          action.run(
            () => Linking.openURL('https://www.linkedin.com/in/mizanur-hasan'),
            '',
          );
        }}
        style={({ pressed }) => [local.link, pressed && local.pressed]}
      >
        <Text style={local.credit}>
          © {year} <Text style={local.name}>Eng. Mizanur Hasan</Text>
        </Text>
      </Pressable>
      {action.error ? (
        <Text accessibilityLiveRegion="polite" style={local.error}>
          {t('Could not open LinkedIn. Please try again.')}
        </Text>
      ) : null}
    </View>
  );
}

const local = StyleSheet.create({
  footer: { alignItems: 'center' },
  link: {
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  credit: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 20,
    textAlign: 'center',
  },
  name: {
    color: colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  error: {
    color: colors.danger,
    fontSize: 12,
    lineHeight: 20,
    textAlign: 'center',
  },
  pressed: { opacity: 0.65 },
});
