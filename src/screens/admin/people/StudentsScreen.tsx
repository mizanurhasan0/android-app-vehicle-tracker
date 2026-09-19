import { studentIdentity, uniqueStudents } from '../../../utils/transport';
import { NoorIcon } from '../../../components/Noor';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { useManagement } from '../../../context/ManagementContext';
import { useData } from '../../../context/DataContext';
import { useTranslation } from '../../../i18n';
import { numberLabel } from '../../../utils/format';
import {
  AdminPage,
  Box,
  C,
  EmptyState,
  Pill,
  SmallButton,
  Tabs,
  s,
  today,
} from '../AdminUi';
import { StudentPhoto } from './StudentPhoto';
import { StudentForm } from './StudentForm';

export function StudentsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { data, loading, error, refresh } = useManagement();
  const { data: transport } = useData();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('ALL');
  const [vehicleId, setVehicleId] = useState('');
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(false);
  const enrollments = data?.students || [];
  const students = uniqueStudents(enrollments).map(profile => {
    const services = enrollments.filter(
      item => studentIdentity(item) === studentIdentity(profile),
    );
    return services.find(item => item.status === 'ACTIVE') || profile;
  });
  const vehicleNames: Record<string, string> = {};
  transport.vehicles.forEach(vehicle => {
    vehicleNames[vehicle.id] = vehicle.name;
  });
  students.forEach(student => {
    if (student.vehicleId && !vehicleNames[student.vehicleId])
      vehicleNames[student.vehicleId] = student.vehicleName;
  });
  const vehicleOptions = Object.entries(vehicleNames)
    .sort(([, left], [, right]) => left.localeCompare(right))
    .map(([id, name]) => ({ value: id, label: name }));
  const selectedVehicleName =
    vehicleOptions.find(option => option.value === vehicleId)?.label ||
    t('All vehicles');
  const canonicalId = (id: string | null) => {
    const service = enrollments.find(item => item.id === id);
    return service ? studentIdentity(service) : id;
  };
  const records = data?.attendance.filter(item => item.date === today()) || [];
  const absent = new Set(
    records
      .filter(item => item.studentId && item.status === 'ABSENT')
      .map(item => canonicalId(item.studentId)),
  );
  const leave = new Set(
    records
      .filter(item => item.studentId && item.status === 'LEAVE')
      .map(item => canonicalId(item.studentId)),
  );
  const matches = students.filter(
    item =>
      `${item.studentName} ${item.studentCode} ${item.guardianName} ${item.routeName}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()) &&
      (!vehicleId || item.vehicleId === vehicleId) &&
      (tab === 'ALL' ||
        (tab === 'ACTIVE' && item.status === 'ACTIVE') ||
        (tab === 'ABSENT' && absent.has(studentIdentity(item))) ||
        (tab === 'LEAVE' && leave.has(studentIdentity(item)))),
  );
  return (
    <AdminPage loading={loading} error={error} refresh={refresh}>
      <View style={studentListStyles.toolbar}>
        {!searching ? (
          <View style={[studentListStyles.filter, studentListStyles.select]}>
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
              number: numberLabel(
                students.filter(item => item.status === 'ACTIVE').length,
              ),
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
            label: t('Leave ({{number}})', { number: numberLabel(leave.size) }),
          },
        ]}
      />
      <Box>
        <View style={s.tableHeader}>
          <Text style={[s.cell, s.studentColumn]}>{t('Name')}</Text>
          <Text style={s.cell}>{t('Route')}</Text>
          <Text style={s.cell}>{t('Vehicle')}</Text>
          <Text style={s.smallCell}>{t('Status')}</Text>
        </View>
        {matches.map(student => (
          <Pressable
            key={student.id}
            accessibilityRole="button"
            accessibilityLabel={t('{{name}} profile', {
              name: student.studentName,
            })}
            style={[s.tableRow, s.personListRow]}
            onPress={() =>
              navigation.navigate('StudentDetails', { id: student.id })
            }
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
            <Pill
              value={
                leave.has(studentIdentity(student))
                  ? 'LEAVE'
                  : absent.has(studentIdentity(student))
                  ? 'ABSENT'
                  : student.status
              }
            />
          </Pressable>
        ))}
        {!matches.length ? (
          <EmptyState
            text={loading ? t('Loading students…') : t('No students found')}
            detail={t('Add a new student or change your search.')}
          />
        ) : null}
        <Text style={s.muted}>
          {t('Total students: {{number}}', {
            number: numberLabel(matches.length),
          })}
        </Text>
      </Box>
      <StudentForm visible={adding} onClose={() => setAdding(false)} />
    </AdminPage>
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
});
