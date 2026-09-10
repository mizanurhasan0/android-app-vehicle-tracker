import { StyleSheet } from 'react-native';
export const colors = {
  primary: '#087F78',
  ink: '#18343B',
  muted: '#62767A',
  background: '#F4F8F8',
  surface: '#FFFFFF',
  line: '#E1ECEB',
  mint: '#E6F4F0',
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
    fontSize: 29,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: -0.8,
  },
  heading: { fontSize: 19, fontWeight: '700', color: colors.ink },
  body: { fontSize: 15, lineHeight: 23, color: colors.ink },
  muted: { fontSize: 14, lineHeight: 21, color: colors.muted },
  label: {
    fontSize: 12,
    letterSpacing: 1.7,
    fontWeight: '700',
    color: colors.primary,
  },
  section: { gap: 14 },
});
