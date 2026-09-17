import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { NoorIcon } from '../../components/Noor';
import { useTranslation } from '../../i18n';
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
  const { t } = useTranslation();
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
          accessibilityLabel={t('Photo of {{name}}', { name })}
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

export function Segment<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View accessibilityRole="tablist" style={parent.segments}>
      {options.map(option => (
        <Pressable
          key={option.value}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === option.value }}
          onPress={() => onChange(option.value)}
          style={[
            parent.segment,
            value === option.value && parent.segmentActive,
          ]}
        >
          <Text
            style={[
              parent.segmentText,
              value === option.value && parent.segmentTextActive,
            ]}
          >
            {option.label}
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
  trackingScreen: { flex: 1, backgroundColor: '#FFFFFF' },
  trackingScroll: { paddingBottom: 28 },
  trackingLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.background,
  },
  trackingEmpty: { flex: 1, padding: 12, backgroundColor: colors.background },
  trackingMap: { width: '100%', position: 'relative', overflow: 'hidden' },
  trackingMapWeb: { flex: 1, height: undefined, borderRadius: 0 },
  trackingControls: {
    position: 'absolute',
    top: 88,
    right: 10,
    gap: 8,
  },
  trackingControl: {
    width: 58,
    height: 58,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#203A35',
    shadowOpacity: 0.16,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  liveHeader: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E6E7',
    backgroundColor: '#FFFFFF',
  },
  addressLink: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 },
  addressText: { color: '#273439', fontSize: 12, fontWeight: '600' },
  speedHeader: { color: '#1C262B', fontSize: 14, fontWeight: '700' },
  vehicleMark: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
  statisticsSection: { paddingHorizontal: 8, paddingTop: 6, paddingBottom: 8, backgroundColor: '#FFFFFF' },
  statisticsTitle: { color: '#5E686C', fontSize: 12, lineHeight: 17, marginBottom: 4 },
  statisticsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    height: 49,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E7ECEF',
    borderRadius: 7,
    backgroundColor: '#F8FAFB',
  },
  statIcon: { width: 25, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  statCopy: { flex: 1, minWidth: 0 },
  statLabel: { color: '#3A8BAA', fontSize: 10, lineHeight: 13 },
  statValue: { color: '#303B40', fontSize: 12, lineHeight: 15, fontWeight: '500' },
  vehiclePicker: { paddingHorizontal: 12, paddingBottom: 10 },
  refreshTracking: { alignSelf: 'center', padding: 10 },
  refreshTrackingText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
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
