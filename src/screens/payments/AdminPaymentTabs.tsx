import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme';
import { numberLabel } from '../../utils/format';
import { DeskTab } from './types';
function Choice({
  label,
  selected,
  onPress,
  tab = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  tab?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={tab ? 'tab' : 'button'}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        desk.choice,
        selected && desk.choiceSelected,
        pressed && desk.pressed,
      ]}
    >
      <Text
        numberOfLines={2}
        style={[desk.choiceText, selected && desk.choiceTextSelected]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function AdminPaymentTabs({
  tab,
  pendingCount,
  onChange,
}: {
  tab: DeskTab;
  pendingCount: number;
  onChange: (tab: DeskTab) => void;
}) {
  const { t } = useTranslation();
  return (
    <View accessibilityRole="tablist" style={desk.choices}>
      <Choice
        tab
        label={`${t('To review')} · ${numberLabel(pendingCount)}`}
        selected={tab === 'review'}
        onPress={() => onChange('review')}
      />
      <Choice
        tab
        label={t('Monthly bills')}
        selected={tab === 'bills'}
        onPress={() => onChange('bills')}
      />
      <Choice
        tab
        label={t('History')}
        selected={tab === 'history'}
        onPress={() => onChange('history')}
      />
    </View>
  );
}

const desk = StyleSheet.create({
  choices: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  choice: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 3,
    paddingVertical: 8,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  choiceSelected: {
    borderBottomColor: colors.primary,
  },
  choiceText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  choiceTextSelected: { color: colors.primary, fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
