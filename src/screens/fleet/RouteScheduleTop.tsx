import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Info,
  Map,
  MapPin,
  Settings,
  Sun,
  UsersRound,
  Wallet,
} from 'lucide-react-native';
import type { Student, TransportShift } from '../../api/management';
import type { Route } from '../../api/types';
import {
  AlertRadiusSettings,
  PickupPointEditor,
  RouteAlertSettings,
} from '../../components/PickupPointEditor';
import { RouteFareManager } from '../../components/RouteFareManager';
import { Select } from '../../components/ui';
import { useTranslation } from '../../i18n';
import { money } from '../../utils/format';
import { serviceShift } from '../../utils/transport';

const ink = '#12243A';
const green = '#006E52';
const lightGreen = '#E1F4EB';
const muted = '#6F8296';

export function RouteScheduleHeader({
  onBack,
  onMap,
}: {
  onBack: () => void;
  onMap: () => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={ui.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('Back')}
        onPress={onBack}
        style={({ pressed }) => [ui.headerButton, pressed && ui.pressed]}
      >
        <ArrowLeft size={24} color={ink} />
      </Pressable>
      <View style={ui.headerText}>
        <Text accessibilityRole="header" style={ui.pageTitle}>
          {t('Route & Schedule')}
        </Text>
        <Text style={ui.pageSubtitle}>
          {t('Manage your transport route and schedule')}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('View on live map')}
        onPress={onMap}
        style={({ pressed }) => [ui.headerButton, pressed && ui.pressed]}
      >
        <Map size={24} color={green} />
      </Pressable>
    </View>
  );
}

type RouteScheduleOverviewProps = {
  route: Route;
  scheduled: Student[];
  shifts: TransportShift[];
  shiftId: string;
  onShiftChange: (shiftId: string) => void;
  editable: boolean;
  alertSettings: AlertRadiusSettings;
  onAlertSettingsChange: (settings: AlertRadiusSettings) => void;
};

export function RouteScheduleOverview({
  route,
  scheduled,
  shifts,
  shiftId,
  onShiftChange,
  editable,
  alertSettings,
  onAlertSettingsChange,
}: RouteScheduleOverviewProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [faresOpen, setFaresOpen] = useState(false);
  const [locationsOpen, setLocationsOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const origin = route.stops[0]?.name;
  const destination = route.stops[route.stops.length - 1]?.name;
  const routeLabel =
    origin && destination ? `${origin} to ${destination}` : route.name;
  const visibleStops = route.stops.slice(0, 4);

  return (
    <View style={ui.overview}>
      <View style={[ui.topCards, width < 390 && ui.stackedCards]}>
        <View style={[ui.card, ui.topCard]}>
          <View style={ui.cardHeading}>
            <View style={ui.iconCircle}>
              <UsersRound
                size={23}
                color={green}
                fill={green}
                strokeWidth={1.8}
              />
            </View>
            <View style={ui.headingCopy}>
              <Text style={ui.cardTitle}>{t("Today's passengers")}</Text>
              <Text style={ui.cardSubtitle}>{t('Transport shift')}</Text>
            </View>
          </View>
          <View style={ui.shiftSelect}>
            <Sun size={19} color="#F1A50A" />
            <View style={ui.shiftField}>
              <Select
                label={t('Transport shift')}
                value={shiftId}
                onChange={onShiftChange}
                compact
                hideLabel
                options={[
                  { value: '', label: t('All shifts') },
                  ...shifts.map(shift => ({
                    value: shift.id,
                    label: t(shift.name),
                  })),
                ]}
              />
            </View>
          </View>
          {scheduled.length ? (
            <View style={ui.passengers}>
              {scheduled.map(student => (
                <View key={student.id} style={ui.passengerRow}>
                  <View style={ui.passengerCopy}>
                    <Text style={ui.passengerName} numberOfLines={1}>
                      {student.studentName}
                    </Text>
                    <Text style={ui.passengerTrip} numberOfLines={2}>
                      {student.stopName} →{' '}
                      {student.dropoffStopName ||
                        student.dropAddress ||
                        t('End point')}
                    </Text>
                  </View>
                  <Text style={ui.passengerShift} numberOfLines={1}>
                    {t(
                      shifts.find(shift => shift.id === serviceShift(student))
                        ?.name || serviceShift(student),
                    )}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={ui.emptyPassengers}>
              {t('No students scheduled for this date and shift.')}
            </Text>
          )}
        </View>

        <View style={[ui.card, ui.topCard]}>
          <View style={ui.cardHeading}>
            <View style={ui.iconCircle}>
              <Wallet size={23} color={green} fill={green} strokeWidth={1.7} />
            </View>
            <View style={ui.headingCopy}>
              <Text style={ui.cardTitle}>{t('Monthly transport fees')}</Text>
              <Text style={ui.cardSubtitle} numberOfLines={1}>
                {routeLabel}
              </Text>
            </View>
          </View>
          <Text style={ui.feeAmount}>{money(route.monthlyAmount)}</Text>
          <View style={ui.feeCaption}>
            <Text style={ui.cardSubtitle}>{t('Default monthly fee')}</Text>
            <Info size={15} color="#5A9D96" />
          </View>
          {!route.fares?.length ? (
            <Text style={ui.feeExplanation}>
              {t(
                'No stop-to-stop fares yet. The default fee applies without an end point.',
              )}
            </Text>
          ) : (
            <Text style={ui.feeExplanation}>
              {t('Fee depends on destination')}
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: faresOpen }}
            onPress={() => setFaresOpen(open => !open)}
            style={({ pressed }) => [ui.feeAction, pressed && ui.pressed]}
          >
            <Settings size={18} color={green} />
            <Text style={ui.feeActionText}>
              {editable ? t('Manage monthly fees') : t('View monthly fees')}
            </Text>
            <ChevronRight size={18} color={green} />
          </Pressable>
        </View>
      </View>
      {faresOpen ? (
        <RouteFareManager route={route} editable={editable} />
      ) : null}

      <View style={ui.card}>
        <Pressable
          accessibilityRole={editable ? 'button' : undefined}
          accessibilityState={
            editable ? { expanded: locationsOpen } : undefined
          }
          disabled={!editable}
          onPress={() => setLocationsOpen(open => !open)}
          style={({ pressed }) => [ui.wideCardHeading, pressed && ui.pressed]}
        >
          <View style={[ui.iconCircle, ui.blueIcon]}>
            <MapPin size={23} color={green} fill={green} strokeWidth={1.8} />
          </View>
          <View style={ui.headingCopy}>
            <Text style={ui.cardTitle}>{t('Pickup points')}</Text>
            <Text style={ui.cardSubtitle}>
              {editable
                ? t(
                    'Set each pickup location. Alert distances are shared across this route.',
                  )
                : t('Pickup locations along this route')}
            </Text>
          </View>
          {editable ? (
            locationsOpen ? (
              <ChevronDown size={20} color={ink} />
            ) : (
              <ChevronRight size={20} color={ink} />
            )
          ) : null}
        </Pressable>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={ui.stopChips}
        >
          {visibleStops.map(stop => (
            <Pressable
              key={stop.id}
              accessibilityRole={editable ? 'button' : undefined}
              disabled={!editable}
              accessibilityLabel={`${stop.name}, ${
                stop.pickupPoint ? t('Configured') : t('Not configured')
              }`}
              onPress={() => setLocationsOpen(true)}
              style={[
                ui.stopChip,
                stop.pickupPoint ? ui.stopReady : ui.stopMissing,
              ]}
            >
              <View
                style={[
                  ui.stopStatusIcon,
                  stop.pickupPoint ? ui.readyIcon : ui.missingIcon,
                ]}
              >
                {stop.pickupPoint ? (
                  <Check size={13} color="#FFFFFF" strokeWidth={3} />
                ) : (
                  <CircleAlert size={14} color="#FFFFFF" strokeWidth={2.3} />
                )}
              </View>
              <View>
                <Text style={ui.stopName} numberOfLines={1}>
                  {stop.name}
                </Text>
                <Text
                  style={[
                    ui.stopStatus,
                    stop.pickupPoint ? ui.readyText : ui.missingText,
                  ]}
                >
                  {stop.pickupPoint ? t('Configured') : t('Not set')}
                </Text>
              </View>
            </Pressable>
          ))}
          {route.stops.length > visibleStops.length ? (
            <Pressable
              accessibilityRole={editable ? 'button' : undefined}
              disabled={!editable}
              onPress={() => setLocationsOpen(true)}
              style={[ui.stopChip, ui.moreChip]}
            >
              <Text style={ui.moreCount}>
                +{route.stops.length - visibleStops.length}
              </Text>
              <Text style={ui.moreLabel}>{t('more')}</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </View>
      {editable ? (
        <>
          <View style={[ui.shortcutRow, width < 390 && ui.stackedCards]}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: alertsOpen }}
              onPress={() => setAlertsOpen(open => !open)}
              style={({ pressed }) => [
                ui.card,
                ui.shortcutCard,
                pressed && ui.pressed,
              ]}
            >
              <View style={ui.iconCircle}>
                <Bell size={23} color={green} fill={green} />
              </View>
              <View style={ui.headingCopy}>
                <Text style={ui.cardTitle}>{t('Alert settings')}</Text>
                <Text style={ui.cardSubtitle}>
                  {t('Set pickup alerts and distances')}
                </Text>
              </View>
              <ChevronRight size={18} color={ink} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: locationsOpen }}
              onPress={() => setLocationsOpen(open => !open)}
              style={({ pressed }) => [
                ui.card,
                ui.shortcutCard,
                pressed && ui.pressed,
              ]}
            >
              <View style={ui.iconCircle}>
                <MapPin
                  size={23}
                  color={green}
                  fill={green}
                  strokeWidth={1.8}
                />
              </View>
              <View style={ui.headingCopy}>
                <Text style={ui.cardTitle}>{t('Change locations')}</Text>
                <Text style={ui.cardSubtitle}>
                  {t('Set or update pickup points')}
                </Text>
              </View>
              <ChevronRight size={18} color={ink} />
            </Pressable>
          </View>

          {alertsOpen ? (
            <View style={ui.card}>
              <RouteAlertSettings
                stops={route.stops}
                value={alertSettings}
                onChange={onAlertSettingsChange}
                initiallyOpen
              />
            </View>
          ) : null}
          {locationsOpen ? (
            <View style={[ui.card, ui.editorCard]}>
              {route.stops.map(stop => (
                <PickupPointEditor
                  key={stop.id}
                  stop={stop}
                  alertSettings={alertSettings}
                />
              ))}
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}

const ui = StyleSheet.create({
  overview: { gap: 10 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: 3 },
  pageTitle: {
    color: ink,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  pageSubtitle: { color: muted, fontSize: 12.5, lineHeight: 17 },
  topCards: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  stackedCards: { flexDirection: 'column' },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5F0ED',
    borderWidth: 1,
    borderRadius: 14,
    padding: 11,
    shadowColor: '#163B34',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 9,
    elevation: 1,
  },
  topCard: { flex: 1, minWidth: 0, gap: 8 },
  cardHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  wideCardHeading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  headingCopy: { flex: 1, minWidth: 0, gap: 2 },
  iconCircle: {
    width: 37,
    height: 37,
    borderRadius: 20,
    backgroundColor: lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blueIcon: { backgroundColor: '#E0F7F7' },
  cardTitle: { color: ink, fontSize: 14, lineHeight: 18, fontWeight: '700' },
  cardSubtitle: { color: muted, fontSize: 11, lineHeight: 16 },
  shiftSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F6F9F9',
    borderColor: '#E3EAEB',
    borderWidth: 1,
    borderRadius: 8,
    paddingLeft: 6,
  },
  shiftField: { flex: 1 },
  passengers: { gap: 6, paddingTop: 1 },
  passengerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderBottomColor: '#E9F0EE',
    borderBottomWidth: 1,
    paddingBottom: 5,
  },
  passengerCopy: { flex: 1, minWidth: 0 },
  passengerName: { color: ink, fontSize: 11, fontWeight: '700' },
  passengerTrip: { color: muted, fontSize: 10, lineHeight: 14 },
  passengerShift: { color: green, fontSize: 9, maxWidth: 52 },
  emptyPassengers: {
    color: muted,
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 5,
  },
  feeAmount: { color: green, fontSize: 23, fontWeight: '800', marginLeft: 44 },
  feeCaption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 44,
  },
  feeExplanation: {
    color: muted,
    fontSize: 10.5,
    lineHeight: 14,
    marginLeft: 44,
  },
  feeAction: {
    minHeight: 35,
    borderRadius: 8,
    backgroundColor: '#E2F6EE',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 7,
    marginTop: 'auto',
  },
  feeActionText: { flex: 1, color: green, fontSize: 11, fontWeight: '700' },
  stopChips: { gap: 7, paddingTop: 11 },
  stopChip: {
    minHeight: 43,
    minWidth: 101,
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingHorizontal: 7,
  },
  stopReady: { backgroundColor: '#EEF9F4', borderColor: '#DCF2E7' },
  stopMissing: { backgroundColor: '#FFF8E9', borderColor: '#FFF0CD' },
  stopStatusIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyIcon: { backgroundColor: '#079D60' },
  missingIcon: { backgroundColor: '#D09A00' },
  stopName: { color: ink, fontSize: 11, fontWeight: '700', maxWidth: 73 },
  stopStatus: { fontSize: 10 },
  readyText: { color: '#079D60' },
  missingText: { color: '#A97A00' },
  moreChip: {
    minWidth: 47,
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 0,
    backgroundColor: '#F0F3F4',
    borderColor: '#F0F3F4',
  },
  moreCount: { color: ink, fontSize: 11, fontWeight: '700' },
  moreLabel: { color: muted, fontSize: 9 },
  shortcutRow: { flexDirection: 'row', gap: 8 },
  shortcutCard: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 64,
  },
  editorCard: { gap: 8 },
  pressed: { opacity: 0.75 },
});
