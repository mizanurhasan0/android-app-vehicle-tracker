import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { User } from '../../api/types';
import {
  NoorAvatar,
  NoorBadge,
  NoorCard,
  NoorIcon,
  NoorSection,
} from '../../components/Noor';
import { BannerCarousel, BannerItem } from '../../components/BannerCarousel';
import { HomeStackParams } from '../../navigation/types';
import { useTranslation, locale } from '../../i18n';
import { money, numberLabel, readable } from '../../utils/format';
import { colors } from '../../theme';
import { DashboardData, HomeNavigation } from './useDashboardData';
import { Stat } from './DashboardCards';
import { h } from './styles';

export function ParentDashboard({
  dashboard,
  navigation,
  user,
  openProfile,
  openBanner,
}: {
  dashboard: DashboardData;
  navigation: HomeNavigation;
  user: User;
  openProfile: () => void;
  openBanner: (banner: BannerItem) => void;
}) {
  const { t } = useTranslation();
  const { due, unknown, unread, student, vehicle, location, pending, banners } =
    dashboard;
  const go = (screen: keyof HomeStackParams) =>
    navigation.navigate(screen as 'Fleet');
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('Profile, {{name}}', { name: user.name })}
        onPress={openProfile}
      >
        <Text style={h.greeting}>{t('Assalamu alaikum')}</Text>
        <Text style={h.parentName}>{user.name}</Text>
        <Text style={h.small}>{t('Parent Dashboard')}</Text>
      </Pressable>
      {student ? (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            navigation.navigate('ParentProfile', { id: student.id })
          }
        >
          <NoorCard style={h.studentCard}>
            <NoorAvatar
              name={student.studentName}
              photoUrl={student.photoUrl}
            />
            <View style={h.flex}>
              <Text style={h.name}>{student.studentName}</Text>
              <Text style={h.small}>
                {student.className || t('Student')}
                {student.roll
                  ? `  |  ${t('Roll: {{roll}}', {
                      roll: student.roll,
                    })}`
                  : ''}
              </Text>
            </View>
            <NoorIcon name="chevron" size={20} color={colors.muted} />
          </NoorCard>
        </Pressable>
      ) : (
        <NoorCard>
          <Text style={h.name}>
            {pending
              ? t('Your application is under review')
              : t('Enroll your child in the transport service')}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => go(pending ? 'ApplicationStatus' : 'Admission')}
          >
            <Text style={h.link}>
              {pending ? t('View application status') : t('Enroll online')} ›
            </Text>
          </Pressable>
        </NoorCard>
      )}
      {vehicle ? (
        <View style={h.vehiclePill}>
          <NoorIcon name="vehicles" size={15} />
          <Text style={h.vehiclePillText}>
            {vehicle.name} ·{' '}
            {location?.status === 'live'
              ? t('Running')
              : t('View last location')}
          </Text>
        </View>
      ) : null}
      <View style={h.stats}>
        <Stat
          color="#078254"
          icon="pin"
          title={t('View location')}
          value={t('Live Tracking')}
          small
          onPress={() =>
            navigation.navigate(
              'LiveTracking',
              vehicle ? { vehicleId: vehicle.id } : undefined,
            )
          }
        />
        <Stat
          color="#F05B66"
          icon="due"
          title={t('Payment')}
          value={unknown ? '—' : money(due)}
          subtitle={t('Total outstanding')}
          onPress={() => go('Bills')}
        />
        <Stat
          color="#F27783"
          icon="calendar"
          title={t('Notices')}
          value={t('{{number}} new', { number: numberLabel(unread) })}
          small
          onPress={() => go('Inbox')}
        />
        <Stat
          color="#4F83F2"
          icon="document"
          title={t('Application')}
          value={t('New admission')}
          small
          onPress={() => go('Admission')}
        />
      </View>
      <BannerCarousel banners={banners} onPress={openBanner} />
      <NoorSection
        title={t('Current vehicle status')}
        action={t('View')}
        onAction={() => go('LiveTracking')}
      >
        {vehicle ? (
          <NoorCard style={h.vehicle}>
            <View style={h.bus}>
              <NoorIcon name="vehicles" color="#DFA81C" size={32} />
            </View>
            <View style={h.flex}>
              <Text style={h.name}>{vehicle.name}</Text>
              <Text style={h.small}>
                {t('Driver: {{name}}', {
                  name: vehicle.driverName || t('Not assigned'),
                })}
              </Text>
              <Text style={h.small}>
                {location?.positionAt
                  ? t('Updated {{time}}', {
                      time: new Date(location.positionAt).toLocaleTimeString(
                        locale(),
                        {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Asia/Dhaka',
                        },
                      ),
                    })
                  : t('Waiting for location')}
              </Text>
            </View>
            <NoorBadge
              label={
                location?.status === 'live'
                  ? `● ${readable('live')}`
                  : readable('offline')
              }
              tone={location?.status === 'live' ? 'green' : 'gray'}
            />
          </NoorCard>
        ) : (
          <Text style={h.emptyText}>
            {t('Your assigned vehicle will appear after approval.')}
          </Text>
        )}
      </NoorSection>
    </>
  );
}
