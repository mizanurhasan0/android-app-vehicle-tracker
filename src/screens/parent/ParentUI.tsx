import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { NoorIcon } from '../../components/Noor';
import { colors, styles } from '../../theme';

export function StudentAvatar({
  name,
  photoUrl,
  size = 56,
}: {
  name: string;
  photoUrl?: string;
  size?: number;
}) {
  const [failedUrl, setFailedUrl] = useState('');
  return (
    <View
      style={[
        parent.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      {photoUrl && failedUrl !== photoUrl ? (
        <Image
          accessibilityLabel={`${name} — ছবি`}
          source={{ uri: photoUrl }}
          style={parent.avatarImage}
          onError={() => setFailedUrl(photoUrl)}
        />
      ) : (
        <NoorIcon name="student" size={size * 0.58} color={colors.primary} />
      )}
    </View>
  );
}

export function InfoRow({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value?: string | null;
}) {
  return (
    <View style={parent.infoRow}>
      <NoorIcon name={icon} size={18} color={colors.primary} />
      <Text style={parent.infoLabel}>{label}</Text>
      <Text selectable style={parent.infoValue}>
        {value || '—'}
      </Text>
    </View>
  );
}

export function Segment({
  labels,
  value,
  onChange,
}: {
  labels: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View accessibilityRole="tablist" style={parent.segments}>
      {labels.map(label => (
        <Pressable
          key={label}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === label }}
          onPress={() => onChange(label)}
          style={[parent.segment, value === label && parent.segmentActive]}
        >
          <Text
            style={[
              parent.segmentText,
              value === label && parent.segmentTextActive,
            ]}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function TimelineItem({
  icon,
  title,
  detail,
  last = false,
  active = false,
  children,
}: React.PropsWithChildren<{
  icon: string;
  title: string;
  detail?: string;
  last?: boolean;
  active?: boolean;
}>) {
  return (
    <View style={parent.timelineRow}>
      <View style={parent.timelineRail}>
        <View style={[parent.timelineDot, active && parent.timelineDotActive]}>
          <NoorIcon
            name={icon}
            size={15}
            color={active ? '#FFFFFF' : colors.primary}
          />
        </View>
        {!last ? <View style={parent.timelineLine} /> : null}
      </View>
      <View style={parent.timelineBody}>
        <Text style={styles.body}>{title}</Text>
        {detail ? <Text style={styles.muted}>{detail}</Text> : null}
        {children}
      </View>
    </View>
  );
}

export const parent = StyleSheet.create({
  avatar: {
    backgroundColor: '#DDEFE8',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  infoRow: {
    flexDirection: 'row',
    gap: 9,
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  infoLabel: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 21,
    minWidth: 62,
  },
  infoValue: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 21,
    flex: 1,
    fontWeight: '500',
  },
  segments: {
    flexDirection: 'row',
    backgroundColor: '#EEF5F2',
    borderRadius: 7,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    minHeight: 42,
    paddingVertical: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.ink, fontSize: 13, textAlign: 'center' },
  segmentTextActive: { color: '#FFFFFF', fontWeight: '700' },
  timelineRow: { flexDirection: 'row', gap: 12 },
  timelineRail: { width: 26, alignItems: 'center' },
  timelineDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#DDF1E6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotActive: { backgroundColor: colors.primary },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
    backgroundColor: '#AED8C2',
  },
  timelineBody: { flex: 1, paddingTop: 2, paddingBottom: 24, gap: 5 },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 5,
  },
  grow: { flex: 1, gap: 4 },
  section: { gap: 12 },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 4 },
  compactActions: { flexDirection: 'row', gap: 8 },
  compactAction: {
    flex: 1,
    minHeight: 52,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 7,
    padding: 9,
  },
  compactActionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  disabled: { opacity: 0.45 },
  map: { height: 370, flex: 0, borderRadius: 9, overflow: 'hidden' },
  successPanel: {
    backgroundColor: '#EBF8F0',
    alignItems: 'center',
    padding: 22,
    gap: 14,
    borderRadius: 9,
  },
  successIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
});
