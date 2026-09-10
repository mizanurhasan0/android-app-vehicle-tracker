import { StyleSheet } from 'react-native';
export const colors = {
  primary: '#006B47',
  ink: '#243C48',
  muted: '#70828A',
  background: '#F4FAF7',
  surface: '#FFFFFF',
  line: '#E2EEE8',
  mint: '#E9F7EF',
  amber: '#98600A',
  danger: '#A73138',
};
export const styles = StyleSheet.create({
  between: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: {
    fontSize: 23,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.8,
  },
  heading: { fontSize: 17, fontWeight: '700', color: colors.ink },
  body: { fontSize: 14, lineHeight: 22, color: colors.ink },
  muted: { fontSize: 12, lineHeight: 19, color: colors.muted },
  label: {
    fontSize: 12,
    letterSpacing: 1.7,
    fontWeight: '700',
    color: colors.primary,
  },
  section: { gap: 10 },
});
