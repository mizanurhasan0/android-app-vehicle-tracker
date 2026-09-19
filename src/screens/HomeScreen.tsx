import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParams } from '../navigation/types';
import { NoorBrand, NoorIcon } from '../components/Noor';
import { BannerItem } from '../components/BannerCarousel';
import { BannerRoute } from '../api/management';
import { ProfileDrawer } from '../components/ProfileDrawer';
import { Notice } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { numberLabel } from '../utils/format';
import { useTranslation } from '../i18n';
import { colors } from '../theme';
import { AdminDashboard } from './home/AdminDashboard';
import { ParentDashboard } from './home/ParentDashboard';
import { useDashboardData } from './home/useDashboardData';
import { h } from './home/styles';

export { dashboardItems } from './home/AdminDashboard';

export function HomeScreen({
  navigation,
}: NativeStackScreenProps<HomeStackParams, 'Fleet'>) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [profileVisible, setProfileVisible] = useState(false);
  const user = session!.user;
  const admin = user.role === 'ADMIN';
  const dashboard = useDashboardData();
  const { core, management, unread } = dashboard;
  const refresh = async () => {
    await Promise.all([core.refresh(), management.refresh()]);
  };
  const go = (screen: keyof HomeStackParams) =>
    navigation.navigate(screen as 'Fleet');
  const openBanner = (banner: BannerItem) =>
    navigation.navigate(banner.redirectRoute as BannerRoute);
  return (
    <SafeAreaView style={h.safe} edges={['top', 'left', 'right']}>
      <View style={h.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Menu')}
          onPress={() => go('More')}
          style={h.headerButton}
        >
          <NoorIcon name="menu" color="#FFFFFF" size={25} />
        </Pressable>
        <View style={h.brand}>
          <NoorBrand
            compact
            light
            subtitle={admin ? t('Admin') : t('Parent Dashboard')}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Notifications, {{number}} unread', {
            number: numberLabel(unread),
          })}
          onPress={() => go('Inbox')}
          style={h.headerButton}
        >
          <NoorIcon name="bell" color="#FFFFFF" size={23} />
          {unread > 0 ? (
            <View style={h.unread}>
              <Text style={h.unreadText}>{numberLabel(unread)}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>
      <ScrollView
        contentContainerStyle={h.scroll}
        refreshControl={
          <RefreshControl
            refreshing={core.loading || management.loading}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={h.content}>
          <Notice text={core.error || management.error} kind="error" />
          {admin ? (
            <AdminDashboard
              dashboard={dashboard}
              navigation={navigation}
              openBanner={openBanner}
            />
          ) : (
            <ParentDashboard
              dashboard={dashboard}
              navigation={navigation}
              user={user}
              openProfile={() => setProfileVisible(true)}
              openBanner={openBanner}
            />
          )}
        </View>
      </ScrollView>
      {profileVisible ? (
        <ProfileDrawer visible onClose={() => setProfileVisible(false)} />
      ) : null}
    </SafeAreaView>
  );
}
