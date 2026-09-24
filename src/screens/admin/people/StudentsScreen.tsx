import { studentIdentity } from '../../../utils/transport';
import { NoorIcon } from '../../../components/Noor';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ListRenderItemInfo,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { useManagement } from '../../../context/ManagementContext';
import { useCoreData } from '../../../context/DataContext';
import { useTranslation } from '../../../i18n';
import { numberLabel } from '../../../utils/format';
import { C, EmptyState, Pill, SmallButton, Tabs, s } from '../AdminUi';
import { useDhakaDate } from '../../../hooks/useDhakaDate';
import { StudentPhoto } from './StudentPhoto';
import { StudentForm } from './StudentForm';
import { Student } from '../../../api/management';
import { ToastMessage } from '../../../components/Toast';
import { useAction } from '../ui/useAction';
import {
  VirtualizedPage,
  VirtualizedCardSection,
} from '../../../components/VirtualizedPage';

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
    <VirtualizedCardSection style={s.box}>
      <View style={studentListStyles.studentRow}>
        <Pressable
          accessibilityRole={archived ? undefined : 'button'}
          accessibilityLabel={
            archived
              ? undefined
              : t('{{name}} profile', { name: student.studentName })
          }
          disabled={archived}
          style={[s.tableRow, s.personListRow, s.flex]}
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
              <Text style={s.muted}>
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
    </VirtualizedCardSection>
  );
});

export function StudentsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { data, loading, error, refresh, mutate, listArchivedStudents } =
    useManagement();
  const { data: transport } = useCoreData();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('ALL');
  const [vehicleId, setVehicleId] = useState('');
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const [archivedStudents, setArchivedStudents] = useState<Student[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(false);
  const [archivedError, setArchivedError] = useState('');
  const action = useAction();
  const { students, canonicalIds, activeCount } = useMemo(() => {
    const profiles = new Map<string, Student>();
    const ids = new Map<string, string>();
    (data?.students || []).forEach(student => {
      const identity = studentIdentity(student);
      ids.set(student.id, identity);
      // Preserve first active service, or last service if none are active.
      if (profiles.get(identity)?.status !== 'ACTIVE')
        profiles.set(identity, student);
    });
    const values = [...profiles.values()];
    return {
      students: values,
      canonicalIds: ids,
      activeCount: values.filter(student => student.status === 'ACTIVE').length,
    };
  }, [data?.students]);
  const archivedProfiles = useMemo(() => {
    const profiles = new Map<string, Student>();
    archivedStudents.forEach(student => {
      const identity = studentIdentity(student);
      if (!profiles.has(identity)) profiles.set(identity, student);
    });
    return [...profiles.values()];
  }, [archivedStudents]);
  useEffect(() => {
    if (tab !== 'ARCHIVED') return;
    let current = true;
    setArchivedLoading(true);
    setArchivedError('');
    listArchivedStudents()
      .then(items => {
        if (current) setArchivedStudents(items);
      })
      .catch(problem => {
        if (current)
          setArchivedError(
            problem instanceof Error ? problem.message : 'Please try again.',
          );
      })
      .finally(() => {
        if (current) setArchivedLoading(false);
      });
    return () => {
      current = false;
    };
  }, [tab, listArchivedStudents]);
  const vehicleOptions = useMemo(() => {
    const names = new Map(
      transport.vehicles.map(vehicle => [vehicle.id, vehicle.name]),
    );
    students.forEach(student => {
      if (student.vehicleId && !names.get(student.vehicleId))
        names.set(student.vehicleId, student.vehicleName);
    });
    return [...names.entries()]
      .sort(([, left], [, right]) => left.localeCompare(right))
      .map(([id, name]) => ({ value: id, label: name }));
  }, [transport.vehicles, students]);
  const selectedVehicleName =
    vehicleOptions.find(option => option.value === vehicleId)?.label ||
    t('All vehicles');
  const date = useDhakaDate();
  const { absent, leave } = useMemo(() => {
    const absentIds = new Set<string>(),
      leaveIds = new Set<string>();
    (data?.attendance || []).forEach(record => {
      if (record.date !== date || !record.studentId) return;
      const identity = canonicalIds.get(record.studentId) || record.studentId;
      if (record.status === 'ABSENT') absentIds.add(identity);
      if (record.status === 'LEAVE') leaveIds.add(identity);
    });
    return { absent: absentIds, leave: leaveIds };
  }, [data?.attendance, canonicalIds, date]);
  const matches = useMemo(
    () =>
      (tab === 'ARCHIVED' ? archivedProfiles : students).filter(
        item =>
          `${item.studentName} ${item.studentCode} ${item.guardianName} ${item.routeName}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()) &&
          (!vehicleId || item.vehicleId === vehicleId) &&
          (tab === 'ALL' ||
            tab === 'ARCHIVED' ||
            (tab === 'ACTIVE' && item.status === 'ACTIVE') ||
            (tab === 'ABSENT' && absent.has(studentIdentity(item))) ||
            (tab === 'LEAVE' && leave.has(studentIdentity(item)))),
      ),
    [students, archivedProfiles, query, vehicleId, tab, absent, leave],
  );
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
        const identity = studentIdentity(student);
        setArchivedStudents(current =>
          current.filter(item => studentIdentity(item) !== identity),
        );
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
            : leave.has(studentIdentity(item))
            ? 'LEAVE'
            : absent.has(studentIdentity(item))
            ? 'ABSENT'
            : item.status
        }
        onOpen={openStudent}
        archived={tab === 'ARCHIVED'}
        busy={action.busy}
        onRestore={restoreStudent}
      />
    ),
    [
      openStudent,
      absent,
      leave,
      tab,
      action.busy,
      restoreStudent,
    ],
  );
  return (
    <VirtualizedPage
      admin
      loading={loading}
      error={error}
      refresh={refresh}
      data={matches}
      keyExtractor={studentIdentity}
      renderItem={renderStudent}
      header={
        <>
          <ToastMessage message={archivedError} />
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
                  onValueChange={item => setVehicleId(String(item))}
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
                  onChangeText={setQuery}
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
          <Tabs
            value={tab}
            onChange={setTab}
            options={[
              {
                value: 'ALL',
                label: t('All ({{number}})', {
                  number: numberLabel(students.length),
                }),
              },
              {
                value: 'ACTIVE',
                label: t('Active ({{number}})', {
                  number: numberLabel(activeCount),
                }),
              },
              {
                value: 'ABSENT',
                label: t('Absent ({{number}})', {
                  number: numberLabel(absent.size),
                }),
              },
              {
                value: 'LEAVE',
                label: t('Leave ({{number}})', {
                  number: numberLabel(leave.size),
                }),
              },
              {
                value: 'ARCHIVED',
                label: t('Archived ({{number}})', {
                  number: numberLabel(archivedProfiles.length),
                }),
              },
            ]}
          />
          <VirtualizedCardSection style={s.box} first>
            <View style={s.tableHeader}>
              <Text style={[s.cell, s.studentColumn]}>{t('Name')}</Text>
              <Text style={s.cell}>{t('Route')}</Text>
              <Text style={s.cell}>{t('Vehicle')}</Text>
              <Text style={s.smallCell}>{t('Status')}</Text>
            </View>
          </VirtualizedCardSection>
        </>
      }
      ListEmptyComponent={
        <VirtualizedCardSection style={s.box}>
          {archivedLoading ? (
            <ActivityIndicator
              color={C.green}
              accessibilityLabel={t('Loading archived students…')}
            />
          ) : (
            <EmptyState
              text={
                loading
                  ? t('Loading students…')
                  : tab === 'ARCHIVED'
                  ? t('No archived students')
                  : t('No students found')
              }
              detail={
                tab === 'ARCHIVED'
                  ? t('Archived students can be restored here.')
                  : t('Add a new student or change your search.')
              }
            />
          )}
        </VirtualizedCardSection>
      }
      footer={
        <VirtualizedCardSection style={s.box} last>
          <Text style={s.muted}>
            {t('Total students: {{number}}', {
              number: numberLabel(matches.length),
            })}
          </Text>
        </VirtualizedCardSection>
      }
    >
      <StudentForm visible={adding} onClose={() => setAdding(false)} />
    </VirtualizedPage>
  );
}

const studentListStyles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  studentRow: { flexDirection: 'row', alignItems: 'center' },
  rowAction: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
});
