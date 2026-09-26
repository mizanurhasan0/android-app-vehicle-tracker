import React from 'react';
import { Text, TextInput, TextInputProps, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { NoorIcon } from '../../../components/Noor';
import { translateMessage, useTranslation } from '../../../i18n';
import { normalizeDigits } from '../../../utils/format';
import { SmallButton } from './buttons';
import { s } from './styles';
import { C } from './tokens';

export function SearchBar({
  value,
  onChange,
  onAdd,
  placeholder = 'Search...',
}: {
  value: string;
  onChange: (text: string) => void;
  onAdd?: () => void;
  placeholder?: string;
}) {
  const { t } = useTranslation();
  return (
    <View style={s.row}>
      <View style={s.search}>
        <NoorIcon name="search" size={18} color={C.muted} />
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={t(placeholder)}
          placeholderTextColor={C.muted}
          accessibilityLabel={t(placeholder)}
          style={s.searchInput}
          multiline={false}
          numberOfLines={1}
          autoCorrect={false}
        />
      </View>
      {onAdd ? (
        <SmallButton title={t('Add')} icon="plus" onPress={onAdd} />
      ) : null}
    </View>
  );
}

export function Input({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  const { t } = useTranslation();
  return (
    <View style={s.field}>
      <Text style={s.label}>{t(label)}</Text>
      <TextInput
        {...props}
        accessibilityLabel={t(label)}
        accessibilityHint={
          error ? translateMessage(error) : props.accessibilityHint
        }
        aria-invalid={!!error}
        placeholder={props.placeholder ? t(props.placeholder) : undefined}
        placeholderTextColor={C.muted}
        onChangeText={value =>
          props.onChangeText?.(
            props.keyboardType &&
              ['number-pad', 'decimal-pad', 'phone-pad', 'numeric'].includes(
                props.keyboardType,
              )
              ? normalizeDigits(value)
              : value,
          )
        }
        style={[
          s.input,
          props.multiline && s.multiline,
          props.style,
          !!error && s.invalid,
        ]}
      />
      {error ? (
        <Text style={s.errorText}>{translateMessage(error)}</Text>
      ) : null}
    </View>
  );
}

export function Choice({
  label,
  labelAction,
  value,
  options,
  onChange,
  optional = true,
  error,
}: {
  label: string;
  labelAction?: React.ReactNode;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  optional?: boolean;
  error?: string;
}) {
  const { t } = useTranslation();
  return (
    <View style={s.field}>
      <View style={s.fieldLabelRow}>
        <Text style={s.label}>{t(label)}</Text>
        {labelAction}
      </View>
      <View style={[s.select, !!error && s.invalid]}>
        <Picker
          accessibilityHint={error ? translateMessage(error) : undefined}
          aria-invalid={!!error}
          selectedValue={value}
          onValueChange={item => onChange(String(item))}
          accessibilityLabel={t(label)}
          style={s.picker}
        >
          {optional ? (
            <Picker.Item label={t('Select an option')} value="" />
          ) : null}
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
        <Text style={s.errorText}>{translateMessage(error)}</Text>
      ) : null}
    </View>
  );
}
