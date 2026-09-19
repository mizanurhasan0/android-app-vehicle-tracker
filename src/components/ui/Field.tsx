import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { colors, styles } from '../../theme';
import { normalizeDigits } from '../../utils/format';
import { translateMessage, useTranslation } from '../../i18n';
import { controlStyles } from './controlStyles';

export function Field({
  label,
  hint,
  error,
  ...props
}: TextInputProps & { label: string; hint?: string; error?: string }) {
  const [focused, setFocused] = useState(false);
  useTranslation();
  return (
    <View style={ui.field}>
      <Text style={ui.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        onChangeText={value =>
          props.onChangeText?.(
            [
              'phone-pad',
              'number-pad',
              'decimal-pad',
              'numeric',
              'numbers-and-punctuation',
            ].includes(props.keyboardType || '')
              ? normalizeDigits(value)
              : value,
          )
        }
        accessibilityLabel={label}
        accessibilityHint={
          error ? translateMessage(error) : props.accessibilityHint
        }
        aria-invalid={!!error}
        onFocus={event => {
          setFocused(true);
          props.onFocus?.(event);
        }}
        onBlur={event => {
          setFocused(false);
          props.onBlur?.(event);
        }}
        placeholderTextColor="#7E8D85"
        style={[
          ui.input,
          props.multiline && ui.multiline,
          focused && ui.focused,
          props.style,
          !!error && ui.invalid,
        ]}
      />
      {error ? (
        <Text style={ui.errorText}>{translateMessage(error)}</Text>
      ) : hint ? (
        <Text style={styles.muted}>{hint}</Text>
      ) : null}
    </View>
  );
}

const ui = StyleSheet.create({
  ...controlStyles,
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    color: colors.ink,
    backgroundColor: '#FFFFFF',
    fontSize: 14,
  },
  multiline: { minHeight: 104, textAlignVertical: 'top' },
  focused: { borderColor: colors.primary },
});
