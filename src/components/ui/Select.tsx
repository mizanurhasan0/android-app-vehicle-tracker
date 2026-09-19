import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors } from '../../theme';
import { Picker } from '@react-native-picker/picker';
import { translateMessage, useTranslation } from '../../i18n';
import { Icon } from '../Icon';
import { Button } from './Button';
import { controlStyles } from './controlStyles';

export function Select({
  label,
  value,
  options,
  onChange,
  disabled = false,
  error,
  compact = false,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const [optionsOpen, setOptionsOpen] = useState(false);
  if (compact) {
    const selectedLabel =
      options.find(option => option.value === value)?.label ||
      t('Select an option');
    return (
      <View style={[ui.field, ui.compactField]}>
        <Text style={[ui.fieldLabel, ui.compactFieldLabel]}>{label}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityValue={{ text: selectedLabel }}
          accessibilityState={{ disabled, expanded: optionsOpen }}
          disabled={disabled}
          onPress={() => setOptionsOpen(true)}
          style={({ pressed }) => [
            ui.compactSelect,
            !!error && ui.invalid,
            disabled && ui.disabled,
            pressed && ui.pressed,
          ]}
        >
          <Text style={ui.compactValue}>{selectedLabel}</Text>
          <View style={ui.selectChevron}>
            <Icon name="chevron" size={16} color={colors.muted} />
          </View>
        </Pressable>
        {error ? (
          <Text style={ui.errorText}>{translateMessage(error)}</Text>
        ) : null}
        {optionsOpen ? (
          <Modal
            transparent
            animationType="fade"
            onRequestClose={() => setOptionsOpen(false)}
          >
            <View style={ui.selectOverlay}>
              <Pressable
                style={StyleSheet.absoluteFill}
                accessibilityRole="button"
                accessibilityLabel={t('Cancel')}
                onPress={() => setOptionsOpen(false)}
              />
              <View style={ui.selectDialog} accessibilityViewIsModal>
                <Text accessibilityRole="header" style={ui.selectTitle}>
                  {label}
                </Text>
                <ScrollView keyboardShouldPersistTaps="handled">
                  {options.map(option => (
                    <Pressable
                      key={option.value}
                      accessibilityRole="radio"
                      accessibilityLabel={option.label}
                      accessibilityState={{ checked: option.value === value }}
                      onPress={() => {
                        setOptionsOpen(false);
                        onChange(option.value);
                      }}
                      style={({ pressed }) => [
                        ui.selectOption,
                        option.value === value && ui.selectOptionActive,
                        pressed && ui.pressed,
                      ]}
                    >
                      <Text style={ui.selectOptionText}>{option.label}</Text>
                      {option.value === value ? (
                        <Icon name="check" size={18} />
                      ) : null}
                    </Pressable>
                  ))}
                </ScrollView>
                <Button
                  title={t('Cancel')}
                  secondary
                  onPress={() => setOptionsOpen(false)}
                />
              </View>
            </View>
          </Modal>
        ) : null}
      </View>
    );
  }
  return (
    <View style={ui.field}>
      <Text style={ui.fieldLabel}>{label}</Text>
      <View style={[ui.select, !!error && ui.invalid]}>
        <Picker
          accessibilityLabel={label}
          accessibilityHint={error ? translateMessage(error) : undefined}
          aria-invalid={!!error}
          selectedValue={value}
          enabled={!disabled}
          accessibilityState={{ disabled }}
          onValueChange={item => onChange(String(item))}
          style={ui.picker}
        >
          <Picker.Item label={t('Select an option')} value="" />
          {options.map(option => (
            <Picker.Item
              key={option.value}
              label={option.label}
              value={option.value}
            />
          ))}
        </Picker>
      </View>
      {error ? (
        <Text style={ui.errorText}>{translateMessage(error)}</Text>
      ) : null}
    </View>
  );
}

const ui = StyleSheet.create({
  ...controlStyles,
  compactField: { gap: 3 },
  compactFieldLabel: { fontSize: 11 },
  select: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  picker: { color: colors.ink, minHeight: 44 },
  compactSelect: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    backgroundColor: colors.surface,
  },
  compactValue: { flex: 1, fontSize: 13, color: colors.ink, fontWeight: '500' },
  selectChevron: { transform: [{ rotate: '90deg' }] },
  selectOverlay: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  selectDialog: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '75%',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  selectTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    padding: 12,
    borderRadius: 6,
  },
  selectOptionActive: { backgroundColor: colors.mint },
  selectOptionText: { flex: 1, fontSize: 15, color: colors.ink },
});
