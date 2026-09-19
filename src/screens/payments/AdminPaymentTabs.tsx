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
      <Text style={[desk.choiceText, selected && desk.choiceTextSelected]}>
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
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  choice: {
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  choiceSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  choiceText: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  choiceTextSelected: { color: colors.surface },
  pressed: { opacity: 0.7 },
});
