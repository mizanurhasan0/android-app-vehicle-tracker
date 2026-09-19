import { StyleSheet } from 'react-native';
import { colors } from '../../theme';

export const controlStyles = StyleSheet.create({
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.985 }] },
  field: { gap: 5 },
  fieldLabel: { fontSize: 12, color: colors.ink, fontWeight: '600' },
  invalid: { borderColor: colors.danger, borderWidth: 2 },
  errorText: { color: colors.danger },
});
