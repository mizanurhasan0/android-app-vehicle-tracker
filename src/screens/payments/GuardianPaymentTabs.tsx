import React from 'react';
import { useTranslation } from '../../i18n';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme';
import { paymentTabs, PaymentTab } from './types';

export function GuardianPaymentTabs({
  tab,
  onChange,
}: {
  tab: PaymentTab;
  onChange: (tab: PaymentTab) => void;
}) {
  const { t } = useTranslation();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={t('Monthly bills')}
      style={local.tabs}
    >
      {paymentTabs.map(label => (
        <Pressable
          key={label}
          accessibilityRole="tab"
          accessibilityLabel={t(label)}
          accessibilityState={{ selected: tab === label }}
          onPress={() => {
            Keyboard.dismiss();
            onChange(label);
          }}
          style={({ pressed }) => [
            local.tab,
            tab === label && local.selectedTab,
            pressed && local.pressed,
          ]}
        >
          <Text style={[local.tabText, tab === label && local.selectedTabText]}>
            {t(label)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const local = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    backgroundColor: '#EEF5F2',
    borderRadius: 7,
    padding: 3,
  },
  tab: {
    flexGrow: 1,
    flexBasis: 90,
    minHeight: 44,
    paddingHorizontal: 7,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  selectedTab: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedTabText: { color: colors.surface },
  pressed: { opacity: 0.7 },
});
