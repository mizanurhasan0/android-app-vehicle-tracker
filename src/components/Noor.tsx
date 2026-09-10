import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { AppIcon, AppIconKind } from './AppIcon';
import { colors } from '../theme';

const iconMap: Record<string, AppIconKind> = {
  student: 'students',
  students: 'students',
  driver: 'user',
  drivers: 'user',
  vehicle: 'vehicles',
  vehicles: 'vehicles',
  bus: 'vehicles',
  trip: 'routes',
  route: 'routes',
  routes: 'routes',
  payment: 'payments',
  payments: 'payments',
  wallet: 'payments',
  income: 'payments',
  expense: 'payments',
  investment: 'payments',
  money: 'payments',
  school: 'students',
  notice: 'bell',
  bell: 'bell',
  notification: 'bell',
  notifications: 'bell',
  request: 'applications',
  requests: 'applications',
  admission: 'applications',
  report: 'bills',
  reports: 'bills',
  receipt: 'bills',
  document: 'bills',
  bills: 'bills',
  due: 'due',
  user: 'user',
  profile: 'user',
  lock: 'lock',
  eye: 'eye',
  back: 'back',
  attendance: 'applications',
  calendar: 'applications',
  history: 'due',
  clock: 'due',
  maintenance: 'routes',
  fuel: 'payments',
};
export function NoorIcon({
  name,
  size = 24,
  color = colors.primary,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  if (iconMap[name])
    return <AppIcon kind={iconMap[name]} size={size} color={color} />;
  if (
    [
      'phone',
      'call',
      'contact',
      'communication',
      'whatsapp',
      'sms',
      'mail',
    ].includes(name)
  ) {
    const envelope = name === 'sms' || name === 'mail';
    return (
      <View
        accessible={false}
        style={[n.symbolBox, { width: size, height: size }]}
      >
        <View style={[n.symbolCanvas, { transform: [{ scale: size / 24 }] }]}>
          {name === 'whatsapp' ? (
            <View style={[n.whatsappCircle, { borderColor: color }]}>
              <NoorIcon name="phone" size={14} color={color} />
              <View style={[n.whatsappTail, { borderLeftColor: color }]} />
            </View>
          ) : envelope ? (
            <>
              <View style={[n.envelope, { borderColor: color }]} />
              <View style={[n.envelopeLeft, { backgroundColor: color }]} />
              <View style={[n.envelopeRight, { backgroundColor: color }]} />
            </>
          ) : (
            <>
              <View style={[n.handsetCurve, { borderColor: color }]} />
              <View style={[n.handsetTop, { backgroundColor: color }]} />
              <View style={[n.handsetBottom, { backgroundColor: color }]} />
            </>
          )}
        </View>
      </View>
    );
  }
  const glyph: Record<string, string> = {
    phone: '☎',
    call: '☎',
    whatsapp: '◉',
    sms: '✉',
    mail: '✉',
    contact: '☎',
    communication: '☎',
    settings: '⚙︎',
    more: '☰',
    menu: '☰',
    plus: '+',
    add: '+',
    close: '×',
    check: '✓',
    location: '●',
    pin: '●',
    search: '⌕',
    edit: '✎',
    chevron: '›',
    download: '↓',
    logout: '↪',
    emergency: '!',
    shield: '✓',
  };
  if (name === 'home')
    return (
      <View style={{ width: size, height: size }} accessible={false}>
        <View
          style={[
            n.homeRoof,
            {
              width: size * 0.57,
              height: size * 0.57,
              backgroundColor: color,
              left: size * 0.22,
              top: size * 0.08,
            },
          ]}
        />
        <View
          style={[
            n.homeBody,
            {
              width: size * 0.67,
              height: size * 0.57,
              backgroundColor: color,
              left: size * 0.17,
            },
          ]}
        />
        <View
          style={[
            n.homeDoor,
            {
              width: size * 0.18,
              height: size * 0.36,
              left: size * 0.42,
            },
          ]}
        />
      </View>
    );
  return (
    <Text
      accessible={false}
      style={[
        n.glyph,
        {
          fontSize: size,
          lineHeight: size + 4,
          color,
          width: size + 3,
        },
      ]}
    >
      {glyph[name] || '▤'}
    </Text>
  );
}

export function NoorLogo({
  size = 64,
  light = false,
}: {
  size?: number;
  light?: boolean;
}) {
  return (
    <View
      accessible={false}
      style={[
        n.logo,
        light ? n.lightLogoBorder : n.primaryLogoBorder,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      <View
        style={[
          n.logoInner,
          { width: size * 0.69, height: size * 0.77, borderRadius: size * 0.2 },
        ]}
      >
        <View
          style={[
            n.busRoof,
            {
              width: size * 0.48,
              height: size * 0.55,
              borderRadius: size * 0.09,
            },
          ]}
        >
          <View
            style={[
              n.windshield,
              {
                width: size * 0.34,
                height: size * 0.23,
                borderRadius: size * 0.025,
              },
            ]}
          />
          <View style={n.busLights}>
            <View style={n.light} />
            <View style={n.light} />
          </View>
        </View>
        <View style={n.wheels}>
          <View style={n.wheel} />
          <View style={n.wheel} />
        </View>
      </View>
      <View
        style={[
          n.logoDash,
          {
            width: size * 0.23,
            height: size * 0.1,
            right: -size * 0.07,
            top: size * 0.4,
          },
        ]}
      />
    </View>
  );
}
export function NoorBrand({
  compact = false,
  light = false,
  subtitle,
}: {
  compact?: boolean;
  light?: boolean;
  subtitle?: string;
}) {
  return (
    <View style={[n.brand, compact && n.brandCompact]}>
      <NoorLogo size={compact ? 34 : 82} light={light} />
      <View style={compact ? n.brandWordsCompact : n.brandWords}>
        <Text
          style={[
            n.brandTitle,
            light ? n.lightBrand : n.primaryBrand,
            compact && n.brandSmall,
          ]}
        >
          {compact ? 'NOOR TRANSPORT' : 'NOOR'}
        </Text>
        {!compact && <Text style={n.transport}>TRANSPORT</Text>}
        <Text
          style={[
            n.brandTag,
            light ? n.lightTag : n.primaryBrand,
            compact && n.brandTagSmall,
          ]}
        >
          {subtitle ||
            (compact
              ? 'Safe Journey, Bright Future'
              : 'Safe Journey, Bright Future')}
        </Text>
      </View>
    </View>
  );
}
export function NoorAvatar({
  name,
  photoUrl,
  size = 46,
}: {
  name: string;
  photoUrl?: string;
  size?: number;
}) {
  return (
    <View
      style={[n.avatar, { width: size, height: size, borderRadius: size / 2 }]}
    >
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
          accessibilityLabel={name}
        />
      ) : (
        <>
          <NoorIcon name="user" size={size * 0.57} />
          <Text style={n.avatarInitial}>{name.trim().slice(0, 1)}</Text>
        </>
      )}
    </View>
  );
}
export function NoorCard({
  children,
  style,
}: React.PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[n.card, style]}>{children}</View>;
}
const tones = {
  green: { bg: '#E0F6E6', ink: '#137440' },
  red: { bg: '#FFE7EB', ink: '#DF425C' },
  amber: { bg: '#FFF2D4', ink: '#BE7E0C' },
  blue: { bg: '#E8F3FF', ink: '#2686D6' },
  gray: { bg: '#EEF2F3', ink: '#6B7B84' },
};
export function NoorBadge({
  label,
  tone = 'green',
}: {
  label: string;
  tone?: keyof typeof tones;
}) {
  return (
    <View style={[n.badge, { backgroundColor: tones[tone].bg }]}>
      <Text style={[n.badgeText, { color: tones[tone].ink }]}>{label}</Text>
    </View>
  );
}
export function NoorSection({
  title,
  action,
  onAction,
  children,
}: React.PropsWithChildren<{
  title: string;
  action?: string;
  onAction?: () => void;
}>) {
  return (
    <View style={n.section}>
      <View style={n.sectionHead}>
        <Text style={n.sectionTitle}>{title}</Text>
        {action && onAction ? (
          <Pressable accessibilityRole="button" onPress={onAction} hitSlop={8}>
            <Text style={n.sectionAction}>{action} ›</Text>
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}
export function NoorRow({
  icon,
  title,
  subtitle,
  onPress,
  trailing,
  color = colors.primary,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [n.row, pressed && n.pressed]}
    >
      <View style={[n.rowIcon, { backgroundColor: color }]}>
        <NoorIcon name={icon} color="#FFFFFF" size={20} />
      </View>
      <View style={n.rowBody}>
        <Text style={n.rowTitle}>{title}</Text>
        {subtitle ? <Text style={n.rowSub}>{subtitle}</Text> : null}
      </View>
      {trailing || (onPress ? <Text style={n.chevron}>›</Text> : null)}
    </Pressable>
  );
}
const n = StyleSheet.create({
  symbolBox: { alignItems: 'center', justifyContent: 'center' },
  symbolCanvas: {
    width: 24,
    height: 24,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handsetCurve: {
    position: 'absolute',
    width: 13,
    height: 18,
    left: 5,
    top: 2,
    borderLeftWidth: 3.5,
    borderBottomWidth: 3.5,
    borderBottomLeftRadius: 12,
    transform: [{ rotate: '-34deg' }],
  },
  handsetTop: {
    position: 'absolute',
    width: 6,
    height: 8,
    left: 3,
    top: 1,
    borderRadius: 2,
    transform: [{ rotate: '-27deg' }],
  },
  handsetBottom: {
    position: 'absolute',
    width: 8,
    height: 6,
    left: 13,
    top: 16,
    borderRadius: 2,
    transform: [{ rotate: '-27deg' }],
  },
  whatsappCircle: {
    height: 22,
    width: 22,
    borderWidth: 1.7,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whatsappTail: {
    position: 'absolute',
    left: 0,
    bottom: -2,
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderTopWidth: 5,
    borderTopColor: 'transparent',
  },
  envelope: {
    position: 'absolute',
    left: 1,
    top: 4,
    width: 22,
    height: 17,
    borderWidth: 1.7,
    borderRadius: 3,
  },
  envelopeLeft: {
    position: 'absolute',
    left: 3,
    top: 9,
    width: 11,
    height: 1.6,
    transform: [{ rotate: '35deg' }],
  },
  envelopeRight: {
    position: 'absolute',
    right: 3,
    top: 9,
    width: 11,
    height: 1.6,
    transform: [{ rotate: '-35deg' }],
  },
  homeRoof: {
    position: 'absolute',
    transform: [{ rotate: '45deg' }],
    borderRadius: 2,
  },
  homeBody: { position: 'absolute', bottom: 0, borderRadius: 2 },
  homeDoor: { position: 'absolute', backgroundColor: '#FFFFFF', bottom: 0 },
  glyph: { fontWeight: '700', textAlign: 'center' },
  lightLogoBorder: { borderColor: '#FFFFFF' },
  primaryLogoBorder: { borderColor: colors.primary },
  lightBrand: { color: '#FFFFFF' },
  lightTag: { color: '#E0F5E9' },
  primaryBrand: { color: colors.primary },
  pressed: { opacity: 0.65 },
  logo: {
    borderWidth: 4,
    backgroundColor: '#F5FFF8',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-5deg' }],
  },
  logoInner: {
    borderWidth: 1.5,
    borderColor: '#CCA733',
    alignItems: 'center',
    justifyContent: 'center',
  },
  busRoof: {
    backgroundColor: '#087044',
    borderWidth: 2,
    borderColor: '#D6B22B',
    alignItems: 'center',
    paddingTop: 4,
  },
  windshield: {
    backgroundColor: '#D7F1E4',
    borderBottomWidth: 3,
    borderColor: '#F1BE35',
  },
  busLights: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '78%',
    marginTop: 5,
  },
  light: { width: 5, height: 4, borderRadius: 2, backgroundColor: '#FDD558' },
  wheels: {
    flexDirection: 'row',
    width: '53%',
    justifyContent: 'space-between',
  },
  wheel: {
    width: 5,
    height: 4,
    backgroundColor: '#164834',
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  logoDash: { position: 'absolute', backgroundColor: '#D5AE2B' },
  brand: { alignItems: 'center', gap: 5 },
  brandCompact: { flexDirection: 'row', gap: 10 },
  brandWords: { alignItems: 'center' },
  brandWordsCompact: { gap: 0 },
  brandTitle: {
    fontSize: 35,
    fontWeight: '900',
    letterSpacing: 0.2,
    lineHeight: 37,
  },
  brandSmall: { fontSize: 18, lineHeight: 22, fontWeight: '800' },
  transport: {
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 2.7,
    color: colors.primary,
    lineHeight: 24,
  },
  brandTag: {
    fontSize: 10,
    letterSpacing: 0.55,
    lineHeight: 17,
    fontWeight: '600',
  },
  brandTagSmall: {
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 0.15,
    fontWeight: '400',
  },
  avatar: {
    backgroundColor: '#DDF1EA',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarInitial: {
    position: 'absolute',
    bottom: 0,
    right: 2,
    fontSize: 9,
    color: colors.primary,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: 12,
    gap: 9,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: 11, fontWeight: '600' },
  section: { gap: 8 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 30,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.primary },
  sectionAction: { fontSize: 12, color: colors.primary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 12,
    paddingHorizontal: 10,
    minHeight: 60,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: '#FFFFFF',
  },
  rowIcon: {
    width: 35,
    height: 35,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, gap: 3 },
  rowTitle: { fontSize: 14, color: colors.ink, fontWeight: '500' },
  rowSub: { fontSize: 11, color: colors.muted, lineHeight: 17 },
  chevron: { fontSize: 22, color: colors.muted },
});
