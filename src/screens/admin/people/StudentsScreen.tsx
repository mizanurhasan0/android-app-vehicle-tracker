import { NoorIcon } from '../../../components/Noor';
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  ListRenderItemInfo,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  NavigationProp,
  ParamListBase,
  useFocusEffect,
  useNavigation,
} from '@react-navigation/native';
import { useManagement } from '../../../context/ManagementContext';
import { useCoreData } from '../../../context/DataContext';
import { useTranslation } from '../../../i18n';
import { numberLabel } from '../../../utils/format';
import { C, EmptyState, IconButton, Pill, SmallButton, s } from '../AdminUi';
import { StudentPhoto } from './StudentPhoto';
import { StudentForm } from './StudentForm';
import { Notice } from '../../../components/ui/Notice';
import { Student } from '../../../api/management';
import type {
  StudentListResponse,
  StudentListStatus,
} from '../../../api/management';
import { useAction } from '../ui/useAction';

const StudentRow = memo(function StudentListRow({
  student,
  status,
  onOpen,
  archived,
  busy,
  onRestore,
}: {
  student: Student;
  status: string;
  onOpen: (id: string) => void;
  archived?: boolean;
  busy?: boolean;
  onRestore: (student: Student) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={studentListStyles.studentRow}>
      <Pressable
        accessibilityRole={archived ? undefined : 'button'}
        accessibilityLabel={
          archived
            ? undefined
            : t('{{name}} profile', { name: student.studentName })
        }
        disabled={archived}
        style={[
          s.tableRow,
          s.personListRow,
          s.flex,
          studentListStyles.rowContent,
        ]}
        onPress={archived ? undefined : () => onOpen(student.id)}
      >
        <View style={[s.row, s.studentColumn]}>
          <StudentPhoto student={student} compact />
          <View style={s.flex}>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[s.body, s.semibold]}
            >
              {student.studentName}
            </Text>
            <Text numberOfLines={1} ellipsizeMode="middle" style={s.muted}>
              {student.studentCode || student.className || '—'}
            </Text>
          </View>
        </View>
        <Text style={s.cell}>{student.routeName}</Text>
        <Text style={s.cell}>{student.vehicleName}</Text>
        <Pill value={status} />
      </Pressable>
      {archived ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Restore {{name}}', {
            name: student.studentName,
          })}
          accessibilityState={{ disabled: !!busy, busy: !!busy }}
          disabled={busy}
          onPress={() => onRestore(student)}
          style={({ pressed }) => [
            studentListStyles.rowAction,
            (pressed || busy) && s.dim,
          ]}
        >
          <NoorIcon name="restore" size={18} color={C.green} />
        </Pressable>
      ) : null}
    </View>
  );
});

export function StudentsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { loading, error, refresh, mutate, listStudents } = useManagement();
  const { data: transport } = useCoreData();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<StudentListStatus>('ALL');
  const [vehicleId, setVehicleId] = useState('');
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [overflowPosition, setOverflowPosition] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const [page, setPage] = useState(1);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [listPage, setListPage] = useState<StudentListResponse | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [visibleTabsWidth, setVisibleTabsWidth] = useState(0);
  const tabPosition = useRef(new Animated.Value(0)).current;
  const tabIndicatorOpacity = useRef(new Animated.Value(1)).current;
  const listRef = useRef<FlatList<Student>>(null);
  const moreButtonRef = useRef<View>(null);
  const menuLayerRef = useRef<View>(null);
  const action = useAction();
  const students = listPage?.items ?? [];
  const counts = listPage?.counts ?? {
    all: 0,
    active: 0,
    absent: 0,
    leave: 0,
    archived: 0,
  };
  const visibleTabIndex =
    tab === 'ALL' ? 0 : tab === 'ACTIVE' ? 1 : tab === 'ABSENT' ? 2 : -1;
  const tabSlotWidth = Math.max(0, (visibleTabsWidth - 6) / 3);
  useEffect(() => {
    if (visibleTabIndex < 0) {
      Animated.timing(tabIndicatorOpacity, {
        toValue: 0,
        duration: 130,
        useNativeDriver: true,
      }).start();
      return;
    }
    Animated.parallel([
      Animated.spring(tabPosition, {
        toValue: visibleTabIndex,
        damping: 19,
        stiffness: 210,
        mass: 0.75,
        useNativeDriver: true,
      }),
      Animated.timing(tabIndicatorOpacity, {
        toValue: 1,
        duration: 130,
        useNativeDriver: true,
      }),
    ]).start();
  }, [tabIndicatorOpacity, tabPosition, visibleTabIndex]);
  useFocusEffect(
    useCallback(() => {
      let current = true;
      const timer = setTimeout(
        () => {
          setListLoading(true);
          setListError('');
          listStudents({
            page,
            pageSize: 10,
            status: tab,
            search: query.trim() || undefined,
            vehicleId: vehicleId || undefined,
          })
            .then(result => {
              if (!current) return;
              setListPage(result);
              if (result.page !== page) setPage(result.page);
            })
            .catch(problem => {
              if (current)
                setListError(
                  problem instanceof Error
                    ? problem.message
                    : 'Please try again.',
                );
            })
            .finally(() => {
              if (current) setListLoading(false);
            });
        },
        query.trim() ? 220 : 0,
      );
      return () => {
        current = false;
        clearTimeout(timer);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps -- Reload after a student mutation while this screen is focused.
    }, [listStudents, page, query, reloadVersion, tab, vehicleId]),
  );
  const refreshList = useCallback(async () => {
    setReloadVersion(current => current + 1);
    await refresh();
  }, [refresh]);
  const vehicleOptions = useMemo(() => {
    return [...transport.vehicles]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(vehicle => ({ value: vehicle.id, label: vehicle.name }));
  }, [transport.vehicles]);
  const selectedVehicleName =
    vehicleOptions.find(option => option.value === vehicleId)?.label ||
    t('All vehicles');
  const selectTab = useCallback((value: StudentListStatus) => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false });
    setTab(value);
    setPage(1);
    setOverflowOpen(false);
  }, []);
  const measureOverflowMenu = useCallback(() => {
    moreButtonRef.current?.measureInWindow(
      (buttonX, buttonY, buttonWidth, buttonHeight) => {
        menuLayerRef.current?.measureInWindow(
          (layerX, layerY, layerWidth, layerHeight) => {
            const menuHeight = 108;
            const below = buttonY + buttonHeight - layerY + 7;
            setOverflowPosition({
              top:
                below + menuHeight <= layerHeight - 12
                  ? below
                  : Math.max(12, buttonY - layerY - menuHeight - 7),
              right: Math.max(12, layerX + layerWidth - buttonX - buttonWidth),
            });
          },
        );
      },
    );
  }, []);
  const changePage = useCallback((direction: -1 | 1) => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    setPage(current => current + direction);
  }, []);
  const openStudent = useCallback(
    (id: string) => navigation.navigate('StudentDetails', { id }),
    [navigation],
  );
  const restoreStudent = useCallback(
    (student: Student) =>
      action.run(async () => {
        await mutate(
          `/admin/students/${student.id}/restore`,
          undefined,
          'PATCH',
        );
        setReloadVersion(current => current + 1);
      }, 'Student restored. Add a new transport service to reactivate tracking.'),
    [action, mutate],
  );
  const renderStudent = useCallback(
    ({ item }: ListRenderItemInfo<Student>) => (
      <StudentRow
        student={item}
        status={
          tab === 'ARCHIVED'
            ? 'ARCHIVED'
            : item.hasLeave
            ? 'LEAVE'
            : item.hasAbsent
            ? 'ABSENT'
            : item.status
        }
        onOpen={openStudent}
        archived={tab === 'ARCHIVED'}
        busy={action.busy}
        onRestore={restoreStudent}
      />
    ),
    [openStudent, tab, action.busy, restoreStudent],
  );
  const closeStudentForm = useCallback(() => {
    setAdding(false);
    setReloadVersion(current => current + 1);
  }, []);
  return (
    <SafeAreaView style={studentListStyles.screen} edges={['left', 'right']}>
      <KeyboardAvoidingView
        style={studentListStyles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={studentListStyles.controls}>
          <Notice text={error || listError} kind="error" />
          <View style={studentListStyles.toolbar}>
            {!searching ? (
              <View
                style={[studentListStyles.filter, studentListStyles.select]}
              >
                <View
                  pointerEvents="none"
                  style={studentListStyles.selectedVehicleLabel}
                >
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={studentListStyles.selectedVehicleText}
                  >
                    {selectedVehicleName}
                  </Text>
                </View>
                <Picker
                  mode="dropdown"
                  selectedValue={vehicleId}
                  onValueChange={item => {
                    setPage(1);
                    setVehicleId(String(item));
                  }}
                  accessibilityLabel={t('Filter by vehicle')}
                  style={studentListStyles.picker}
                  itemStyle={studentListStyles.pickerItem}
                >
                  <Picker.Item label={t('All vehicles')} value="" />
                  {vehicleOptions.map(option => (
                    <Picker.Item
                      key={option.value}
                      label={option.label}
                      value={option.value}
                    />
                  ))}
                </Picker>
              </View>
            ) : null}
            {searching ? (
              <View
                style={[
                  s.search,
                  studentListStyles.control,
                  studentListStyles.searchField,
                ]}
              >
                <NoorIcon name="search" size={18} color={C.muted} />
                <TextInput
                  autoFocus
                  value={query}
                  onChangeText={value => {
                    setPage(1);
                    setQuery(value);
                  }}
                  placeholder={t('Name, ID or guardian...')}
                  placeholderTextColor={C.muted}
                  accessibilityLabel={t('Search students')}
                  style={s.searchInput}
                  autoCorrect={false}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('Close search')}
                  onPress={() => {
                    setSearching(false);
                    setQuery('');
                    setPage(1);
                  }}
                  hitSlop={8}
                >
                  <NoorIcon name="close" size={20} color={C.muted} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('Search students')}
                onPress={() => {
                  setVehicleId('');
                  setPage(1);
                  setSearching(true);
                }}
                style={({ pressed }) => [
                  studentListStyles.iconButton,
                  pressed && s.dim,
                ]}
              >
                <NoorIcon name="search" size={20} color={C.green} />
              </Pressable>
            )}
            <SmallButton
              title={t('Add')}
              icon="plus"
              onPress={() => setAdding(true)}
            />
          </View>
          <View style={studentListStyles.tabBar}>
            <View
              onLayout={event =>
                setVisibleTabsWidth(event.nativeEvent.layout.width)
              }
              style={studentListStyles.visibleTabs}
            >
              <Animated.View
                pointerEvents="none"
                style={[
                  studentListStyles.tabIndicator,
                  {
                    width: tabSlotWidth,
                    opacity: tabIndicatorOpacity,
                    transform: [
                      {
                        translateX: tabPosition.interpolate({
                          inputRange: [0, 1, 2],
                          outputRange: [
                            0,
                            tabSlotWidth + 3,
                            (tabSlotWidth + 3) * 2,
                          ],
                        }),
                      },
                    ],
                  },
                ]}
              />
              {[
                {
                  value: 'ALL',
                  label: t('All ({{number}})', {
                    number: numberLabel(counts.all),
                  }),
                },
                {
                  value: 'ACTIVE',
                  label: t('Active ({{number}})', {
                    number: numberLabel(counts.active),
                  }),
                },
                {
                  value: 'ABSENT',
                  label: t('Absent ({{number}})', {
                    number: numberLabel(counts.absent),
                  }),
                },
              ].map(option => (
                <Pressable
                  key={option.value}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: tab === option.value }}
                  onPress={() => selectTab(option.value as StudentListStatus)}
                  style={studentListStyles.tab}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      studentListStyles.tabLabel,
                      tab === option.value &&
                        studentListStyles.tabLabelSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              ref={moreButtonRef}
              accessibilityRole="button"
              accessibilityLabel={t('More student filters')}
              accessibilityState={{ expanded: overflowOpen }}
              onPress={() => {
                setOverflowPosition(null);
                setOverflowOpen(open => !open);
              }}
              style={({ pressed }) => [
                studentListStyles.moreButton,
                (tab === 'LEAVE' || tab === 'ARCHIVED') &&
                  studentListStyles.moreButtonSelected,
                (pressed || overflowOpen) && s.dim,
              ]}
            >
              <View style={studentListStyles.moreDots}>
                <View style={studentListStyles.moreDot} />
                <View style={studentListStyles.moreDot} />
                <View style={studentListStyles.moreDot} />
              </View>
            </Pressable>
          </View>
        </View>
        <View style={studentListStyles.tableCard}>
          <View style={studentListStyles.tableHeading}>
            <View style={s.tableHeader}>
              <Text style={[s.cell, s.studentColumn]}>{t('Name')}</Text>
              <Text style={s.cell}>{t('Route')}</Text>
              <Text style={s.cell}>{t('Vehicle')}</Text>
              <Text style={s.smallCell}>{t('Status')}</Text>
            </View>
          </View>
          <FlatList
            ref={listRef}
            style={studentListStyles.tableBody}
            contentContainerStyle={
              students.length === 0 ? studentListStyles.emptyBody : undefined
            }
            data={students}
            keyExtractor={item => item.studentId || item.id}
            renderItem={renderStudent}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            refreshControl={
              <RefreshControl
                refreshing={loading || listLoading}
                onRefresh={refreshList}
                tintColor={C.green}
                colors={[C.green]}
              />
            }
            ListEmptyComponent={
              listLoading ? (
                <ActivityIndicator
                  color={C.green}
                  accessibilityLabel={t('Loading students…')}
                />
              ) : (
                <EmptyState
                  text={
                    tab === 'ARCHIVED'
                      ? t('No archived students')
                      : t('No students found')
                  }
                  detail={
                    tab === 'ARCHIVED'
                      ? t('Archived students can be restored here.')
                      : t('Add a new student or change your search.')
                  }
                />
              )
            }
          />
          {listPage?.total ? (
            <View style={studentListStyles.pagination}>
              <IconButton
                title="Previous page"
                icon="chevronLeft"
                disabled={listLoading || listPage.page <= 1}
                onPress={() => changePage(-1)}
                style={studentListStyles.paginationButton}
              />
              <Text style={studentListStyles.pageLabel}>
                {t('Page {{page}} of {{totalPages}}', {
                  page: numberLabel(listPage.page),
                  totalPages: numberLabel(listPage.totalPages),
                })}
              </Text>
              <IconButton
                title="Next page"
                icon="chevron"
                disabled={listLoading || listPage.page >= listPage.totalPages}
                onPress={() => changePage(1)}
                style={studentListStyles.paginationButton}
              />
            </View>
          ) : null}
        </View>
        <Modal
          visible={overflowOpen}
          transparent
          animationType="fade"
          onShow={measureOverflowMenu}
          onRequestClose={() => setOverflowOpen(false)}
        >
          <View
            ref={menuLayerRef}
            onLayout={measureOverflowMenu}
            style={studentListStyles.menuLayer}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Close')}
              onPress={() => setOverflowOpen(false)}
              style={StyleSheet.absoluteFill}
            />
            {overflowPosition ? (
              <View
                accessibilityViewIsModal
                style={[studentListStyles.overflowMenu, overflowPosition]}
              >
                {[
                  {
                    value: 'LEAVE',
                    icon: 'calendar',
                    label: t('Leave ({{number}})', {
                      number: numberLabel(counts.leave),
                    }),
                  },
                  {
                    value: 'ARCHIVED',
                    icon: 'history',
                    label: t('Archived ({{number}})', {
                      number: numberLabel(counts.archived),
                    }),
                  },
                ].map(option => (
                  <Pressable
                    key={option.value}
                    accessibilityRole="menuitem"
                    accessibilityState={{ selected: tab === option.value }}
                    onPress={() => selectTab(option.value as StudentListStatus)}
                    style={({ pressed }) => [
                      studentListStyles.overflowItem,
                      tab === option.value &&
                        studentListStyles.overflowItemSelected,
                      pressed && s.dim,
                    ]}
                  >
                    <NoorIcon
                      name={option.icon}
                      size={17}
                      color={tab === option.value ? C.green : C.muted}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        studentListStyles.overflowLabel,
                        tab === option.value &&
                          studentListStyles.overflowLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {tab === option.value ? (
                      <NoorIcon name="check" size={16} color={C.green} />
                    ) : null}
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        </Modal>
        <StudentForm visible={adding} onClose={closeStudentForm} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const studentListStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5FAF8' },
  controls: {
    gap: 11,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 11,
  },
  tableCard: {
    flex: 1,
    minHeight: 0,
    marginHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    backgroundColor: C.white,
    overflow: 'hidden',
  },
  tableHeading: { paddingHorizontal: 11, paddingTop: 11, paddingBottom: 8 },
  tableBody: { flex: 1 },
  emptyBody: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 12 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tabBar: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'stretch',
    padding: 3,
    borderRadius: 8,
    backgroundColor: '#EDF3F7',
    gap: 3,
  },
  visibleTabs: {
    position: 'relative',
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    gap: 3,
  },
  tabIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 6,
    backgroundColor: C.green,
  },
  tab: {
    zIndex: 1,
    flex: 1,
    minWidth: 0,
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    paddingVertical: 6,
    borderRadius: 6,
  },
  tabLabel: {
    color: C.text,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  tabLabelSelected: { color: C.white },
  moreButton: {
    width: 38,
    minHeight: 38,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreButtonSelected: { backgroundColor: '#D8EEE7' },
  moreDots: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  moreDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: C.green },
  overflowMenu: {
    position: 'absolute',
    width: 194,
    padding: 6,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 12,
    backgroundColor: C.white,
    shadowColor: '#10251F',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 16,
  },
  menuLayer: { flex: 1 },
  overflowItem: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  overflowItemSelected: { backgroundColor: '#E4F3EE' },
  overflowLabel: { flex: 1, color: C.text, fontSize: 12, fontWeight: '600' },
  overflowLabelSelected: { color: C.green },
  pagination: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: C.line,
    backgroundColor: '#FAFCFB',
  },
  paginationButton: { width: 42, height: 42, borderRadius: 12 },
  pageLabel: {
    flex: 1,
    textAlign: 'center',
    color: C.text,
    fontSize: 13,
    fontWeight: '700',
  },
  filter: { flex: 1, minWidth: 0 },
  control: { height: 40, minHeight: 40 },
  select: {
    height: 40,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 7,
    backgroundColor: C.white,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  picker: { height: 40, width: '100%', color: C.text },
  pickerItem: { color: C.text, fontSize: 13 },
  selectedVehicleLabel: {
    position: 'absolute',
    left: 11,
    right: 28,
    height: 40,
    justifyContent: 'center',
    backgroundColor: C.white,
    zIndex: 2,
    elevation: 2,
  },
  selectedVehicleText: { color: C.text, fontSize: 13 },
  searchField: { paddingLeft: 9, paddingRight: 9 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#EFF3F4',
  },
  rowContent: { borderBottomWidth: 0 },
  rowAction: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
});
