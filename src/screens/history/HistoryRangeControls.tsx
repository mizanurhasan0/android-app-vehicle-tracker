import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from '../../components/icons';
import { ChevronDown } from 'lucide-react-native';
import { locale, useTranslation } from '../../i18n';
import { dhakaDate, HistoryPeriod } from '../../utils/historyDates';

type HistoryRangeControlsProps = {
  period: HistoryPeriod;
  day: string;
  dateError?: string;
  onPeriodChange: (period: HistoryPeriod) => void;
  onDateApply: (day: string) => void;
  onToday: () => void;
  onPrevious: () => void;
  onNext: () => void;
  nextDisabled: boolean;
};

const periods: HistoryPeriod[] = ['day', 'week', 'month'];
const monday = Date.UTC(2021, 7, 2);
type CalendarView = 'days' | 'months' | 'years';

function changeMonth(month: string, direction: number) {
  const [year, value] = month.split('-').map(Number);
  return new Date(Date.UTC(year, value - 1 + direction, 1))
    .toISOString()
    .slice(0, 7);
}

function formatCalendarDate(day: string, dateLocale: string) {
  return new Date(`${day}T00:00:00.000Z`).toLocaleDateString(dateLocale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function HistoryRangeControls({
  period,
  day,
  dateError,
  onPeriodChange,
  onDateApply,
  onToday,
  onPrevious,
  onNext,
  nextDisabled,
}: HistoryRangeControlsProps) {
  const { t } = useTranslation();
  const { width, height } = useWindowDimensions();
  const compact = width < 530;
  const stacked = width < 375;
  const [dateOpen, setDateOpen] = useState(false);
  const [draft, setDraft] = useState(day);
  const [visibleMonth, setVisibleMonth] = useState(day.slice(0, 7));
  const [calendarView, setCalendarView] = useState<CalendarView>('days');
  const calendarMonth = /^20\d{2}-(0[1-9]|1[0-2])$/.test(visibleMonth)
    ? visibleMonth
    : day.slice(0, 7);
  const dateLocale = locale() === 'bn-BD' ? 'bn-BD' : 'en-GB';
  const formattedDay = formatCalendarDate(day, dateLocale);
  const today = dhakaDate();
  const [monthYear, monthNumber] = calendarMonth.split('-').map(Number);
  const monthStart = new Date(Date.UTC(monthYear, monthNumber - 1, 1));
  const monthName = monthStart.toLocaleDateString(dateLocale, {
    month: 'long',
    timeZone: 'UTC',
  });
  const yearName = monthStart.toLocaleDateString(dateLocale, {
    year: 'numeric',
    timeZone: 'UTC',
  });
  const leadingDays = (monthStart.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(
    Date.UTC(monthYear, monthNumber, 0),
  ).getUTCDate();
  const calendarSize = Math.ceil((leadingDays + daysInMonth) / 7) * 7;
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Date(monday + index * 86_400_000).toLocaleDateString(dateLocale, {
      weekday: 'short',
      timeZone: 'UTC',
    }),
  );
  const shortLabels = {
    day: t('Day'),
    week: t('Week (Monday–Sunday)').split(' ')[0],
    month: t('Month'),
  };
  const fullLabels = {
    day: t('Day'),
    week: t('Week (Monday–Sunday)'),
    month: t('Calendar month'),
  };

  const openDate = () => {
    const initialDay = day > today ? today : day;
    setDraft(initialDay);
    setVisibleMonth(initialDay.slice(0, 7));
    setCalendarView('days');
    setDateOpen(true);
  };
  const chooseCalendarMonth = (value: string) => {
    const [year, month] = value.split('-').map(Number);
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const candidate = `${value}-${String(
      Math.min(Number(draft.slice(8, 10)), lastDay),
    ).padStart(2, '0')}`;
    setDraft(candidate > today ? today : candidate);
    setVisibleMonth(value);
    setCalendarView('days');
  };
  const applyDate = () => {
    onDateApply(draft);
    setDateOpen(false);
  };

  const tabs = (
    <View
      style={[
        styles.periodTabs,
        compact && styles.compactTabs,
        stacked && styles.stackedTabs,
      ]}
      accessibilityRole="tablist"
    >
      {periods.map(value => (
        <Pressable
          key={value}
          accessibilityRole="tab"
          accessibilityLabel={fullLabels[value]}
          accessibilityState={{ selected: period === value }}
          onPress={() => onPeriodChange(value)}
          style={[
            styles.periodTab,
            compact && styles.compactPeriodTab,
            period === value && styles.periodTabActive,
          ]}
        >
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            numberOfLines={1}
            style={[
              styles.periodText,
              compact && styles.compactPeriodText,
              period === value && styles.periodTextActive,
            ]}
          >
            {shortLabels[value]}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <>
      <View style={styles.container}>
        <View style={[styles.primaryRow, compact && styles.compactRow]}>
          <View
            style={[
              styles.dateNavigator,
              compact && styles.compactDateNavigator,
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Previous period')}
              hitSlop={5}
              onPress={onPrevious}
              style={[styles.arrowButton, compact && styles.compactArrowButton]}
            >
              <ChevronLeft
                size={compact ? 19 : 22}
                color={COLORS.ink}
                strokeWidth={2.3}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Date (YYYY-MM-DD)')}
              accessibilityValue={{ text: formattedDay }}
              onPress={openDate}
              style={[styles.dateButton, compact && styles.compactDateButton]}
            >
              <CalendarDays
                size={compact ? 15 : 18}
                color={COLORS.green}
                strokeWidth={2.1}
              />
              <Text
                numberOfLines={1}
                style={[styles.dateText, compact && styles.compactDateText]}
              >
                {formattedDay}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Next period')}
              accessibilityState={{ disabled: nextDisabled }}
              disabled={nextDisabled}
              hitSlop={5}
              onPress={onNext}
              style={[
                styles.arrowButton,
                compact && styles.compactArrowButton,
                nextDisabled && styles.disabled,
              ]}
            >
              <ChevronRight
                size={compact ? 19 : 22}
                color={COLORS.ink}
                strokeWidth={2.3}
              />
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Today')}
            onPress={onToday}
            style={[styles.todayButton, compact && styles.compactTodayButton]}
          >
            <Text
              style={[styles.todayText, compact && styles.compactTodayText]}
            >
              {t('Today')}
            </Text>
          </Pressable>
          {!stacked ? tabs : null}
        </View>
        {stacked ? tabs : null}
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={dateOpen}
        onRequestClose={() => setDateOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            accessibilityLabel={t('Cancel')}
            onPress={() => setDateOpen(false)}
            style={StyleSheet.absoluteFill}
          />
          <ScrollView
            bounces={false}
            style={[styles.dialog, { maxHeight: height - 48 }]}
            contentContainerStyle={styles.dialogContent}
          >
            <View style={styles.dialogHeading}>
              <View style={styles.dialogIcon}>
                <CalendarDays size={21} color={COLORS.green} />
              </View>
              <View style={styles.dialogHeadingText}>
                <Text style={styles.dialogTitle}>
                  {t('Choose journey date')}
                </Text>
                <Text style={styles.dialogSubtitle}>
                  {t('Select a date to view recorded history')}
                </Text>
              </View>
            </View>
            <View style={styles.monthNavigator}>
              {calendarView === 'days' ? (
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('Previous month')}
                    accessibilityState={{
                      disabled: calendarMonth <= '2000-01',
                    }}
                    disabled={calendarMonth <= '2000-01'}
                    onPress={() =>
                      chooseCalendarMonth(changeMonth(calendarMonth, -1))
                    }
                    style={[
                      styles.monthArrow,
                      calendarMonth <= '2000-01' && styles.disabled,
                    ]}
                  >
                    <ChevronLeft size={22} color={COLORS.ink} />
                  </Pressable>
                  <View style={styles.monthYearSelectors}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('Select month')}
                      accessibilityValue={{ text: monthName }}
                      onPress={() => setCalendarView('months')}
                      style={({ pressed }) => [
                        styles.monthYearButton,
                        pressed && styles.monthYearPressed,
                      ]}
                    >
                      <Text numberOfLines={1} style={styles.monthTitle}>
                        {monthName}
                      </Text>
                      <ChevronDown size={15} color={COLORS.green} />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('Select year')}
                      accessibilityValue={{ text: yearName }}
                      onPress={() => setCalendarView('years')}
                      style={({ pressed }) => [
                        styles.monthYearButton,
                        pressed && styles.monthYearPressed,
                      ]}
                    >
                      <Text style={styles.monthTitle}>{yearName}</Text>
                      <ChevronDown size={15} color={COLORS.green} />
                    </Pressable>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('Next month')}
                    accessibilityState={{
                      disabled: calendarMonth >= today.slice(0, 7),
                    }}
                    disabled={calendarMonth >= today.slice(0, 7)}
                    onPress={() =>
                      chooseCalendarMonth(changeMonth(calendarMonth, 1))
                    }
                    style={[
                      styles.monthArrow,
                      calendarMonth >= today.slice(0, 7) && styles.disabled,
                    ]}
                  >
                    <ChevronRight size={22} color={COLORS.ink} />
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('Back to calendar')}
                    onPress={() => setCalendarView('days')}
                    style={styles.monthArrow}
                  >
                    <ChevronLeft size={22} color={COLORS.ink} />
                  </Pressable>
                  <Text style={styles.pickerTitle}>
                    {t(
                      calendarView === 'months'
                        ? 'Select month'
                        : 'Select year',
                    )}
                  </Text>
                  <View style={styles.monthArrowSpacer} />
                </>
              )}
            </View>
            {calendarView === 'days' ? (
              <>
                <View style={styles.weekdays}>
                  {weekdays.map((label, index) => (
                    <Text key={index} numberOfLines={1} style={styles.weekday}>
                      {label}
                    </Text>
                  ))}
                </View>
                <View style={styles.calendarGrid}>
                  {Array.from({ length: calendarSize }, (_, index) => {
                    const value = index - leadingDays + 1;
                    if (value < 1 || value > daysInMonth)
                      return <View key={index} style={styles.daySlot} />;
                    const candidate = `${calendarMonth}-${String(
                      value,
                    ).padStart(2, '0')}`;
                    const selected = candidate === draft;
                    const isToday = candidate === today;
                    const future = candidate > today;
                    return (
                      <View key={index} style={styles.daySlot}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={new Date(
                            `${candidate}T00:00:00.000Z`,
                          ).toLocaleDateString(dateLocale, {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            timeZone: 'UTC',
                          })}
                          accessibilityState={{ selected, disabled: future }}
                          disabled={future}
                          onPress={() => setDraft(candidate)}
                          style={({ pressed }) => [
                            styles.dayButton,
                            isToday && styles.todayDay,
                            pressed && styles.pressedDay,
                            selected && styles.selectedDay,
                            future && styles.futureDay,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayNumber,
                              selected && styles.selectedDayNumber,
                              future && styles.futureDayNumber,
                            ]}
                          >
                            {new Date(
                              `${candidate}T00:00:00.000Z`,
                            ).toLocaleDateString(dateLocale, {
                              day: 'numeric',
                              timeZone: 'UTC',
                            })}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : calendarView === 'months' ? (
              <View style={styles.optionGrid}>
                {Array.from({ length: 12 }, (_, index) => {
                  const value = `${monthYear}-${String(index + 1).padStart(
                    2,
                    '0',
                  )}`;
                  const selected = value === calendarMonth;
                  const future = value > today.slice(0, 7);
                  const label = new Date(
                    Date.UTC(monthYear, index, 1),
                  ).toLocaleDateString(dateLocale, {
                    month: 'long',
                    timeZone: 'UTC',
                  });
                  return (
                    <View key={value} style={styles.monthOptionSlot}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={label}
                        accessibilityState={{ selected, disabled: future }}
                        disabled={future}
                        onPress={() => chooseCalendarMonth(value)}
                        style={[
                          styles.optionButton,
                          selected && styles.optionSelected,
                          future && styles.futureDay,
                        ]}
                      >
                        <Text
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.8}
                          style={[
                            styles.optionText,
                            selected && styles.optionTextSelected,
                          ]}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            ) : (
              <View style={styles.optionGrid}>
                {Array.from(
                  { length: Number(today.slice(0, 4)) - 1999 },
                  (_, index) => Number(today.slice(0, 4)) - index,
                ).map(year => {
                  const selected = year === monthYear;
                  return (
                    <View key={year} style={styles.yearOptionSlot}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={new Date(
                          Date.UTC(year, 0, 1),
                        ).toLocaleDateString(dateLocale, {
                          year: 'numeric',
                          timeZone: 'UTC',
                        })}
                        accessibilityState={{ selected }}
                        onPress={() => {
                          const month =
                            year === Number(today.slice(0, 4))
                              ? Math.min(monthNumber, Number(today.slice(5, 7)))
                              : monthNumber;
                          chooseCalendarMonth(
                            `${year}-${String(month).padStart(2, '0')}`,
                          );
                        }}
                        style={[
                          styles.optionButton,
                          selected && styles.optionSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.optionText,
                            selected && styles.optionTextSelected,
                          ]}
                        >
                          {new Date(Date.UTC(year, 0, 1)).toLocaleDateString(
                            dateLocale,
                            { year: 'numeric', timeZone: 'UTC' },
                          )}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
            <View style={styles.selectedDateRow}>
              <CalendarDays size={17} color={COLORS.green} />
              <Text style={styles.selectedDateText}>
                {formatCalendarDate(draft, dateLocale)}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setDraft(today);
                  setVisibleMonth(today.slice(0, 7));
                  setCalendarView('days');
                }}
                style={styles.jumpToday}
              >
                <Text style={styles.jumpTodayText}>{t('Today')}</Text>
              </Pressable>
            </View>
            {dateError ? (
              <Text accessibilityRole="alert" style={styles.error}>
                {dateError}
              </Text>
            ) : null}
            <View style={styles.dialogActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => setDateOpen(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>{t('Cancel')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={applyDate}
                style={styles.applyButton}
              >
                <Text style={styles.applyText}>{t('Show selected date')}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const COLORS = {
  green: '#006B52',
  ink: '#143947',
  line: '#DCE5E8',
};

const styles = StyleSheet.create({
  container: { gap: 10 },
  primaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  compactRow: { gap: 5 },
  dateNavigator: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  arrowButton: {
    width: 43,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactArrowButton: { width: 30, minHeight: 44 },
  disabled: { opacity: 0.35 },
  dateButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.line,
  },
  compactDateButton: { gap: 3, paddingHorizontal: 2 },
  dateText: {
    flexShrink: 1,
    color: COLORS.ink,
    fontSize: 15,
    fontWeight: '700',
  },
  compactDateText: { fontSize: 12, letterSpacing: -0.25 },
  compactDateNavigator: { minHeight: 44 },
  todayButton: {
    minHeight: 48,
    minWidth: 66,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: '#F7F9FA',
  },
  compactTodayButton: { minHeight: 44, minWidth: 50, paddingHorizontal: 5 },
  todayText: { fontSize: 13, fontWeight: '700', color: COLORS.green },
  compactTodayText: { fontSize: 12 },
  periodTabs: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    padding: 3,
    borderWidth: 1,
    borderColor: COLORS.line,
    borderRadius: 12,
    backgroundColor: '#F7F9FA',
  },
  compactTabs: { flex: 0, width: 120, minHeight: 44, padding: 2 },
  stackedTabs: { width: '100%' },
  periodTab: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    paddingHorizontal: 3,
  },
  compactPeriodTab: { paddingHorizontal: 0 },
  periodTabActive: { backgroundColor: COLORS.green },
  periodText: { color: COLORS.ink, fontSize: 13, fontWeight: '600' },
  compactPeriodText: { fontSize: 11 },
  periodTextActive: { color: '#FFFFFF', fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(7, 28, 34, 0.45)',
  },
  dialog: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 400,
    flexGrow: 0,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  dialogContent: { padding: 18, gap: 14 },
  dialogHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dialogIcon: {
    width: 39,
    height: 39,
    borderRadius: 11,
    backgroundColor: '#E8F5EF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogHeadingText: { flex: 1, gap: 2 },
  dialogTitle: { fontSize: 17, color: COLORS.ink, fontWeight: '800' },
  dialogSubtitle: { fontSize: 11, color: '#69828A' },
  monthNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    marginTop: 2,
  },
  monthArrow: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: '#F8FBF9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthArrowSpacer: { width: 40 },
  monthYearSelectors: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  monthYearButton: {
    minHeight: 40,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 4,
    borderRadius: 9,
  },
  monthYearPressed: { backgroundColor: '#E8F5EF' },
  monthTitle: { color: COLORS.ink, fontSize: 16, fontWeight: '800' },
  pickerTitle: { color: COLORS.ink, fontSize: 16, fontWeight: '800' },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
    marginVertical: 5,
  },
  monthOptionSlot: { width: '33.3333%', paddingHorizontal: 4 },
  yearOptionSlot: { width: '25%', paddingHorizontal: 4 },
  optionButton: {
    minHeight: 48,
    paddingHorizontal: 3,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: COLORS.line,
    backgroundColor: '#F8FBF9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionSelected: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  optionText: { color: COLORS.ink, fontSize: 13, fontWeight: '700' },
  optionTextSelected: { color: '#FFFFFF' },
  weekdays: { flexDirection: 'row', marginTop: 2 },
  weekday: {
    width: '14.2857%',
    color: '#71858C',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 3 },
  daySlot: { width: '14.2857%', paddingHorizontal: 2 },
  dayButton: {
    minHeight: 39,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayDay: { borderWidth: 1, borderColor: COLORS.green },
  selectedDay: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  futureDay: { opacity: 0.35 },
  pressedDay: { backgroundColor: '#DDF1E7' },
  dayNumber: { color: COLORS.ink, fontSize: 13, fontWeight: '600' },
  selectedDayNumber: { color: '#FFFFFF', fontWeight: '800' },
  futureDayNumber: { color: '#84939A' },
  selectedDateRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingLeft: 11,
    borderRadius: 11,
    backgroundColor: '#EAF7F0',
  },
  selectedDateText: {
    flex: 1,
    color: COLORS.green,
    fontSize: 13,
    fontWeight: '700',
  },
  jumpToday: {
    minHeight: 42,
    paddingHorizontal: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jumpTodayText: { color: COLORS.green, fontSize: 12, fontWeight: '800' },
  error: { color: '#A3203E', fontSize: 12, lineHeight: 18 },
  dialogActions: { flexDirection: 'row', gap: 8 },
  cancelButton: {
    minHeight: 44,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: '#F1F5F5',
  },
  cancelText: { color: COLORS.ink, fontWeight: '600' },
  applyButton: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: COLORS.green,
  },
  applyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
