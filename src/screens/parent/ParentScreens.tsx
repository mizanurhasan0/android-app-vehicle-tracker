import React, { useState } from 'react';
import {
  Keyboard,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RouteSchedule } from '../../api/management';
import { ServiceRequest } from '../../api/types';
import { FleetMap } from '../../components/FleetMap';
import { VehicleCard } from '../../components/VehicleCard';
import { NoorBadge, NoorCard, NoorIcon, NoorRow } from '../../components/Noor';
import {
  Button,
  Empty,
  Field,
  Notice,
  Page,
  Select,
} from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useManagement } from '../../context/ManagementContext';
import { useAction } from '../../hooks/useAction';
import { HomeStackParams } from '../../navigation/types';
import { colors, styles } from '../../theme';
import { dateLabel, money, numberLabel } from '../../utils/format';
import { pickStudentPhoto } from '../../utils/photo';
import { contactUrl, dhakaDate, studentSchedule } from './parentUtils';
import {
  InfoRow,
  parent,
  Segment,
  StudentAvatar,
  TimelineItem,
} from './ParentUI';

type Props<N extends keyof HomeStackParams> = NativeStackScreenProps<
  HomeStackParams,
  N
>;
const admissionSteps = [
  'শিক্ষার্থীর তথ্য',
  'অভিভাবক ও ঠিকানা',
  'রুট ও ভাড়া',
  'সাবমিট',
];

export function AdmissionScreen({ navigation }: Props<'Admission'>) {
  const { session } = useAuth();
  const { data, loading, error, refresh, mutate } = useData();
  const management = useManagement();
  const action = useAction();
  const [step, setStep] = useState(0);
  const [studentName, setStudentName] = useState('');
  const [className, setClassName] = useState('');
  const [roll, setRoll] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');
  const [dropAddress, setDropAddress] = useState('');
  const [routeId, setRouteId] = useState('');
  const [stopId, setStopId] = useState('');
  const [routeSearch, setRouteSearch] = useState('');
  const [validation, setValidation] = useState('');
  const route = data.routes.find(item => item.id === routeId);
  const stop = route?.stops.find(item => item.id === stopId);
  const routes = data.routes.filter(item =>
    `${item.name} ${item.vehicleName}`
      .toLocaleLowerCase()
      .includes(routeSearch.trim().toLocaleLowerCase()),
  );

  const validate = (page: number) => {
    if (page === 0 && (studentName.trim().length < 2 || !className.trim()))
      return 'শিক্ষার্থীর নাম ও শ্রেণি লিখুন।';
    if (page === 1 && !pickupAddress.trim()) return 'পিকআপের ঠিকানা লিখুন।';
    if (
      page === 1 &&
      emergencyContact.trim() &&
      !/^(?:\+?88)?01[3-9]\d{8}$/.test(emergencyContact.trim())
    )
      return 'সঠিক জরুরি যোগাযোগ নম্বর লিখুন।';
    if (page === 2 && (!route || !stop))
      return 'রুট এবং পিকআপ স্টপ নির্বাচন করুন।';
    return '';
  };
  const next = () => {
    Keyboard.dismiss();
    const problem = validate(step);
    setValidation(problem);
    if (!problem) setStep(value => Math.min(3, value + 1));
  };
  return (
    <Page loading={loading} refresh={refresh} error={error}>
      <View style={local.stepper}>
        {admissionSteps.map((label, index) => (
          <View key={label} style={local.step}>
            <View style={local.stepTop}>
              {
                <View
                  style={[
                    local.connector,
                    index <= step && local.connectorDone,
                    index === 0 && local.connectorEdge,
                  ]}
                />
              }
              <View
                style={[
                  local.stepCircle,
                  index <= step && local.stepCircleActive,
                ]}
              >
                <Text
                  style={[
                    local.stepNumber,
                    index <= step && local.stepNumberActive,
                  ]}
                >
                  {index < step ? '✓' : numberLabel(index + 1)}
                </Text>
              </View>
              {
                <View
                  style={[
                    local.connector,
                    index < step && local.connectorDone,
                    index === 3 && local.connectorEdge,
                  ]}
                />
              }
            </View>
            <Text
              style={[local.stepLabel, index === step && local.stepLabelActive]}
            >
              {label}
            </Text>
          </View>
        ))}
      </View>
      <Notice text={validation || action.error} kind="error" />
      {step === 0 ? (
        <NoorCard>
          <Text style={styles.heading}>শিক্ষার্থীর তথ্য</Text>
          <Field
            label="শিক্ষার্থীর নাম *"
            value={studentName}
            onChangeText={setStudentName}
            maxLength={100}
            placeholder="শিক্ষার্থীর পূর্ণ নাম"
          />
          <Field
            label="শ্রেণি *"
            value={className}
            onChangeText={setClassName}
            maxLength={40}
            placeholder="যেমন: Class 6"
          />
          <Field
            label="রোল নম্বর"
            value={roll}
            onChangeText={setRoll}
            maxLength={20}
            keyboardType="number-pad"
          />
          <Text style={styles.label}>ছবি আপলোড</Text>
          <View style={local.photoRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="শিক্ষার্থীর ছবি নির্বাচন করুন"
              accessibilityState={{ busy: action.busy, disabled: action.busy }}
              disabled={action.busy}
              onPress={() =>
                action.run(async () => {
                  const photo = await pickStudentPhoto();
                  if (photo) setPhotoUrl(photo);
                }, '')
              }
              style={local.photoPicker}
            >
              <NoorIcon name="plus" size={24} color="#2185DA" />
              <Text style={styles.muted}>ছবি নির্বাচন</Text>
            </Pressable>
            <StudentAvatar
              name={studentName || 'শিক্ষার্থী'}
              photoUrl={photoUrl}
              size={84}
            />
          </View>
          {photoUrl ? (
            <Button
              secondary
              title="ছবি সরান"
              onPress={() => setPhotoUrl('')}
              disabled={action.busy}
            />
          ) : null}
        </NoorCard>
      ) : step === 1 ? (
        <NoorCard>
          <Text style={styles.heading}>অভিভাবকের তথ্য</Text>
          <InfoRow icon="user" label="অভিভাবক" value={session?.user.name} />
          <InfoRow icon="phone" label="মোবাইল" value={session?.user.phone} />
          <View style={parent.divider} />
          <Field
            label="জরুরি যোগাযোগ নম্বর"
            value={emergencyContact}
            onChangeText={setEmergencyContact}
            keyboardType="phone-pad"
            maxLength={14}
            placeholder="01XXXXXXXXX"
          />
          <Field
            label="পিকআপ ঠিকানা *"
            value={pickupAddress}
            onChangeText={setPickupAddress}
            maxLength={500}
            multiline
            placeholder="বাড়ি, সড়ক ও এলাকার নাম"
          />
          <Field
            label="ড্রপ ঠিকানা"
            value={dropAddress}
            onChangeText={setDropAddress}
            maxLength={500}
            placeholder="শিক্ষাপ্রতিষ্ঠানের নাম ও ঠিকানা"
          />
        </NoorCard>
      ) : step === 2 ? (
        <>
          <NoorCard>
            <Field
              label="আপনার এলাকার রুট নির্বাচন করুন"
              placeholder="এলাকা বা গাড়ির নাম খুঁজুন"
              value={routeSearch}
              onChangeText={setRouteSearch}
              maxLength={100}
            />
          </NoorCard>
          <Text style={styles.heading}>উপলব্ধ রুট</Text>
          {!routes.length ? (
            <Empty
              title="কোনো রুট পাওয়া যায়নি"
              detail={
                data.routes.length
                  ? 'অন্য নাম দিয়ে খুঁজুন।'
                  : 'অ্যাডমিন রুট যুক্ত করলে এখানে দেখা যাবে।'
              }
            />
          ) : (
            routes.map(item => (
              <Pressable
                key={item.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: routeId === item.id }}
                onPress={() => {
                  setRouteId(item.id);
                  setStopId('');
                }}
                style={[
                  local.routeCard,
                  item.id === routeId && local.routeSelected,
                ]}
              >
                <View
                  style={[
                    local.radio,
                    item.id === routeId && local.radioSelected,
                  ]}
                >
                  {item.id === routeId ? <View style={local.radioDot} /> : null}
                </View>
                <View style={parent.grow}>
                  <Text style={styles.heading}>{item.name}</Text>
                  <Text style={styles.muted}>{item.vehicleName}</Text>
                </View>
                <Text style={local.routeFare}>{money(item.monthlyAmount)}</Text>
              </Pressable>
            ))
          )}
          {route ? (
            <NoorCard>
              <Select
                label="পিকআপ স্টপ *"
                value={stopId}
                onChange={setStopId}
                options={route.stops.map(item => ({
                  value: item.id,
                  label: item.name,
                }))}
              />
              <Text style={styles.muted}>
                মাসিক ভাড়া {money(route.monthlyAmount)}। অ্যাডমিন অনুমোদনের পর
                সেবা শুরু হবে।
              </Text>
            </NoorCard>
          ) : null}
        </>
      ) : (
        <>
          <NoorCard>
            <Text style={styles.heading}>আবেদন পর্যালোচনা</Text>
            <View style={parent.identity}>
              <StudentAvatar name={studentName} photoUrl={photoUrl} />
              <View style={parent.grow}>
                <Text style={styles.heading}>{studentName.trim()}</Text>
                <Text style={styles.muted}>
                  {className}
                  {roll ? ` · রোল ${roll}` : ''}
                </Text>
              </View>
            </View>
            <InfoRow icon="user" label="অভিভাবক" value={session?.user.name} />
            <InfoRow icon="phone" label="মোবাইল" value={session?.user.phone} />
          </NoorCard>
          <NoorCard>
            <InfoRow
              icon="route"
              label="রুট ও ভাড়া"
              value={`${route?.name || '—'} · ${
                route ? money(route.monthlyAmount) : '—'
              }`}
            />
            <InfoRow icon="vehicle" label="গাড়ি" value={route?.vehicleName} />
            <InfoRow
              icon="pin"
              label="পিকআপ"
              value={`${stop?.name || ''}${
                pickupAddress ? ` · ${pickupAddress}` : ''
              }`}
            />
            <InfoRow icon="pin" label="ড্রপ" value={dropAddress} />
            {emergencyContact ? (
              <InfoRow
                icon="phone"
                label="জরুরি নম্বর"
                value={emergencyContact}
              />
            ) : null}
          </NoorCard>
        </>
      )}
      {step < 3 ? (
        <Button title="পরবর্তী" onPress={next} disabled={action.busy} />
      ) : (
        <Button
          title="আবেদন জমা দিন"
          busy={action.busy}
          onPress={() =>
            action.run(async () => {
              const problem = [0, 1, 2].map(validate).find(Boolean);
              if (problem) throw new Error(problem);
              const result = await mutate<{ id: string }>(
                '/requests/guardian/new',
                {
                  studentName: studentName.trim(),
                  routeId,
                  stopId,
                  className: className.trim(),
                  roll: roll.trim(),
                  photoUrl,
                  emergencyContact: emergencyContact.trim(),
                  pickupAddress: pickupAddress.trim(),
                  dropAddress: dropAddress.trim(),
                },
              );
              await management.refresh();
              navigation.replace('ApplicationStatus', { id: result.id });
            }, '')
          }
        />
      )}
      {step > 0 ? (
        <Button
          secondary
          title="আগের ধাপ"
          disabled={action.busy}
          onPress={() => {
            Keyboard.dismiss();
            setValidation('');
            setStep(value => value - 1);
          }}
        />
      ) : null}
    </Page>
  );
}

type Application = ServiceRequest & {
  createdAt?: string;
  reviewedAt?: string | null;
  className?: string;
  roll?: string;
  photoUrl?: string;
};
export function ApplicationStatusScreen({
  navigation,
  route,
}: Props<'ApplicationStatus'>) {
  const { data, loading, error, refresh } = useData();
  const [selectedId, setSelectedId] = useState(route.params?.id || '');
  const requests: Application[] = data.requests;
  const request =
    requests.find(item => item.id === selectedId) ||
    (!selectedId ? requests[0] : undefined);
  const approved = request?.status === 'APPROVED';
  const rejected = request?.status === 'REJECTED';
  return (
    <Page loading={loading} refresh={refresh} error={error}>
      {requests.length > 1 ? (
        <Select
          label="আবেদন নির্বাচন"
          value={request?.id || ''}
          onChange={setSelectedId}
          options={requests.map(item => ({
            value: item.id,
            label: item.studentName,
          }))}
        />
      ) : null}
      {!request ? (
        <>
          <Empty
            title="আবেদন পাওয়া যায়নি"
            detail="পরিবহন সেবার জন্য নতুন আবেদন করুন অথবা তালিকা রিফ্রেশ করুন।"
          />
          <Button
            title="নতুন ভর্তি আবেদন"
            onPress={() => navigation.navigate('Admission')}
          />
        </>
      ) : (
        <>
          <View style={parent.successPanel}>
            <View style={[parent.successIcon, rejected && local.rejected]}>
              <NoorIcon
                name={rejected ? 'close' : approved ? 'check' : 'document'}
                size={33}
                color="#FFFFFF"
              />
            </View>
            <Text style={[styles.heading, parent.center]}>
              {approved
                ? 'আবেদন গৃহীত হয়েছে'
                : rejected
                ? 'আবেদন অনুমোদিত হয়নি'
                : 'আবেদন জমা হয়েছে'}
            </Text>
            <Text style={[styles.muted, parent.center]}>
              {approved
                ? 'আপনার সন্তানের পরিবহন সেবা অনুমোদিত হয়েছে।'
                : rejected
                ? 'অ্যাডমিনের সিদ্ধান্ত ও কারণ নিচে দেখুন।'
                : 'অ্যাডমিন আপনার আবেদন পর্যালোচনা করবেন। সিদ্ধান্ত হলে নোটিফিকেশন পাবেন।'}
            </Text>
          </View>
          <NoorCard>
            <View style={parent.identity}>
              <StudentAvatar
                name={request.studentName}
                photoUrl={request.photoUrl}
              />
              <View style={parent.grow}>
                <Text style={styles.heading}>{request.studentName}</Text>
                <Text style={styles.muted}>
                  {request.routeName} · {request.vehicleName}
                </Text>
              </View>
            </View>
            <View style={parent.divider} />
            <TimelineItem
              icon="check"
              title="আবেদন জমা"
              active
              detail={
                request.createdAt ? dateLabel(request.createdAt) : undefined
              }
            />
            <TimelineItem
              icon="document"
              title={
                approved || rejected
                  ? 'পর্যালোচনা সম্পন্ন'
                  : 'পর্যালোচনার অপেক্ষায়'
              }
              active={approved || rejected}
              detail={
                request.reviewedAt ? dateLabel(request.reviewedAt) : undefined
              }
            />
            <TimelineItem
              icon={rejected ? 'close' : 'check'}
              title={
                approved
                  ? 'অনুমোদিত'
                  : rejected
                  ? 'প্রত্যাখ্যাত'
                  : 'সিদ্ধান্তের অপেক্ষায়'
              }
              active={approved}
              last
            >
              {request.note ? (
                <Notice
                  text={request.note}
                  kind={rejected ? 'error' : 'success'}
                />
              ) : null}
            </TimelineItem>
          </NoorCard>
          {approved ? (
            <Button
              title="শিক্ষার্থীর প্রোফাইল"
              onPress={() => navigation.navigate('ParentProfile')}
            />
          ) : null}
          <Button
            secondary
            title="ফিরে যান"
            onPress={() =>
              navigation.canGoBack()
                ? navigation.goBack()
                : navigation.navigate('Fleet')
            }
          />
        </>
      )}
    </Page>
  );
}

export function ParentStudentScreen({
  navigation,
  route,
}: Props<'ParentProfile'>) {
  const { data, loading, error, refresh } = useManagement();
  const action = useAction();
  const [selectedId, setSelectedId] = useState(route.params?.id || '');
  const students = data?.students || [];
  const student =
    students.find(item => item.id === selectedId) ||
    (!selectedId ? students[0] : undefined);
  return (
    <Page loading={loading} refresh={refresh} error={error}>
      <Notice text={action.error} kind="error" />
      {students.length > 1 ? (
        <Select
          label="আমার সন্তান"
          value={student?.id || ''}
          onChange={setSelectedId}
          options={students.map(item => ({
            value: item.id,
            label: item.studentName,
          }))}
        />
      ) : null}
      {!student ? (
        <>
          <Empty
            title="শিক্ষার্থীর তথ্য পাওয়া যায়নি"
            detail="ভর্তি আবেদন অনুমোদিত হলে শিক্ষার্থীর প্রোফাইল এখানে দেখা যাবে।"
          />
          <Button
            title="ভর্তি আবেদন করুন"
            onPress={() => navigation.navigate('Admission')}
          />
        </>
      ) : (
        <>
          <NoorCard>
            <View style={parent.identity}>
              <StudentAvatar
                name={student.studentName}
                photoUrl={student.photoUrl}
                size={65}
              />
              <View style={parent.grow}>
                <Text style={styles.heading}>{student.studentName}</Text>
                <Text style={styles.muted}>
                  {student.className || 'শ্রেণি দেওয়া হয়নি'}
                  {student.roll ? ` · রোল: ${student.roll}` : ''}
                </Text>
                {student.studentCode ? (
                  <Text style={styles.muted}>{student.studentCode}</Text>
                ) : null}
              </View>
              <NoorBadge
                label={student.status === 'ACTIVE' ? 'Active' : 'বন্ধ'}
                tone={student.status === 'ACTIVE' ? 'green' : 'gray'}
              />
            </View>
            <View style={parent.divider} />
            <InfoRow icon="vehicle" label="গাড়ি" value={student.vehicleName} />
            <InfoRow icon="user" label="ড্রাইভার" value={student.driverName} />
            <InfoRow icon="route" label="রুট" value={student.routeName} />
            <InfoRow
              icon="money"
              label="মাসিক ভাড়া"
              value={money(student.monthlyAmount)}
            />
            <View style={parent.divider} />
            <Text style={styles.heading}>অভিভাবকের তথ্য</Text>
            <InfoRow icon="user" label="নাম" value={student.guardianName} />
            <InfoRow
              icon="phone"
              label="মোবাইল"
              value={student.guardianPhone}
            />
            <InfoRow
              icon="pin"
              label="পিকআপ"
              value={student.pickupAddress || student.stopName}
            />
            <InfoRow icon="pin" label="ড্রপ" value={student.dropAddress} />
            <View style={parent.divider} />
            <Text style={styles.heading}>ড্রাইভারের সঙ্গে যোগাযোগ</Text>
            <View style={parent.compactActions}>
              {(['call', 'whatsapp', 'sms'] as const).map(kind => (
                <Pressable
                  key={kind}
                  accessibilityRole="button"
                  accessibilityLabel={`${kind} — ${
                    student.driverName || 'ড্রাইভার'
                  }`}
                  accessibilityState={{
                    disabled: !student.driverPhone || action.busy,
                  }}
                  disabled={!student.driverPhone || action.busy}
                  onPress={() =>
                    action.run(
                      () =>
                        Linking.openURL(contactUrl(student.driverPhone!, kind)),
                      '',
                    )
                  }
                  style={[
                    parent.compactAction,
                    (!student.driverPhone || action.busy) && parent.disabled,
                  ]}
                >
                  <NoorIcon
                    name={kind === 'call' ? 'phone' : kind}
                    size={22}
                    color="#FFFFFF"
                  />
                  <Text style={parent.compactActionText}>
                    {kind === 'call'
                      ? 'Call'
                      : kind === 'whatsapp'
                      ? 'WhatsApp'
                      : 'SMS'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </NoorCard>
          <NoorCard>
            <NoorRow
              icon="calendar"
              title="আজকের যাত্রা ও উপস্থিতি"
              onPress={() => navigation.navigate('TodayJourney')}
            />
            <NoorRow
              icon="receipt"
              title="পেমেন্ট ইতিহাস"
              onPress={() => navigation.navigate('Bills')}
            />
            <NoorRow
              icon="bell"
              title="নোটিশ"
              onPress={() => navigation.navigate('Inbox')}
            />
          </NoorCard>
        </>
      )}
    </Page>
  );
}

export function ParentJourneyScreen({ navigation }: Props<'TodayJourney'>) {
  const { data, loading, error, refresh } = useManagement();
  const [selectedId, setSelectedId] = useState('');
  const [period, setPeriod] = useState<RouteSchedule['period']>('MORNING');
  const students = data?.students || [];
  const student = students.find(item => item.id === selectedId) || students[0];
  const entries = student
    ? studentSchedule(data?.schedules || [], student, period)
    : [];
  const attendance = student
    ? data?.attendance.find(
        item => item.studentId === student.id && item.date === dhakaDate(),
      )
    : undefined;
  return (
    <Page loading={loading} refresh={refresh} error={error}>
      {students.length > 1 ? (
        <Select
          label="শিক্ষার্থী"
          value={student?.id || ''}
          onChange={setSelectedId}
          options={students.map(item => ({
            value: item.id,
            label: item.studentName,
          }))}
        />
      ) : null}
      <Segment
        labels={['সকাল', 'বিকাল']}
        value={period === 'MORNING' ? 'সকাল' : 'বিকাল'}
        onChange={value =>
          setPeriod(value === 'সকাল' ? 'MORNING' : 'AFTERNOON')
        }
      />
      {!student ? (
        <Empty
          title="এখনও পরিবহন সেবা নেই"
          detail="ভর্তি অনুমোদিত হলে নির্ধারিত রুটের সময়সূচি এখানে দেখা যাবে।"
        />
      ) : (
        <>
          <NoorCard>
            <View style={styles.between}>
              <Text style={styles.heading}>{student.studentName}</Text>
              <Text style={styles.muted}>{dhakaDate()}</Text>
            </View>
            <Text style={styles.muted}>
              {student.routeName} · {student.vehicleName}
            </Text>
            <View style={parent.divider} />
            <View style={styles.between}>
              <Text style={styles.body}>আজকের উপস্থিতি</Text>
              <NoorBadge
                label={
                  attendance
                    ? {
                        PRESENT: 'উপস্থিত',
                        ABSENT: 'অনুপস্থিত',
                        LEAVE: 'ছুটি',
                      }[attendance.status]
                    : 'এখনও নথিভুক্ত হয়নি'
                }
                tone={
                  !attendance
                    ? 'gray'
                    : attendance.status === 'PRESENT'
                    ? 'green'
                    : attendance.status === 'ABSENT'
                    ? 'red'
                    : 'amber'
                }
              />
            </View>
            {attendance?.note ? (
              <Text style={styles.muted}>{attendance.note}</Text>
            ) : null}
          </NoorCard>
          <NoorCard>
            <Text style={styles.heading}>নির্ধারিত যাত্রার সময়সূচি</Text>
            {entries.length ? (
              entries.map((entry, index) => (
                <TimelineItem
                  key={entry.id}
                  icon={
                    index === 0
                      ? 'pin'
                      : index === entries.length - 1
                      ? 'school'
                      : 'clock'
                  }
                  title={entry.label}
                  detail={entry.time}
                  last={index === entries.length - 1}
                >
                  <NoorBadge label="নির্ধারিত সময়" tone="gray" />
                </TimelineItem>
              ))
            ) : (
              <Text style={styles.muted}>
                অ্যাডমিন এই রুটের {period === 'MORNING' ? 'সকালের' : 'বিকালের'}{' '}
                সময়সূচি যুক্ত করেননি।
              </Text>
            )}
            <Text style={styles.muted}>
              সময়গুলো নির্ধারিত সূচি। গাড়ির বর্তমান অবস্থান লাইভ ট্র্যাকিংয়ে
              দেখুন।
            </Text>
          </NoorCard>
          <Button
            title="লাইভ লোকেশন দেখুন"
            onPress={() =>
              navigation.navigate('LiveTracking', {
                vehicleId: student.vehicleId,
              })
            }
          />
          <NoorCard>
            <Text style={styles.heading}>উপস্থিতির ইতিহাস</Text>
            {(data?.attendance || [])
              .filter(item => item.studentId === student.id)
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 15)
              .map(item => (
                <View key={item.id} style={styles.between}>
                  <Text style={styles.body}>{item.date}</Text>
                  <NoorBadge
                    label={
                      {
                        PRESENT: 'উপস্থিত',
                        ABSENT: 'অনুপস্থিত',
                        LEAVE: 'ছুটি',
                      }[item.status]
                    }
                    tone={
                      item.status === 'PRESENT'
                        ? 'green'
                        : item.status === 'ABSENT'
                        ? 'red'
                        : 'amber'
                    }
                  />
                </View>
              ))}
            {!data?.attendance.some(item => item.studentId === student.id) ? (
              <Text style={styles.muted}>এখনও উপস্থিতির রেকর্ড নেই।</Text>
            ) : null}
          </NoorCard>
        </>
      )}
    </Page>
  );
}

export function ParentContactScreen() {
  const { data, loading, error, refresh } = useManagement();
  const action = useAction();
  const [selectedId, setSelectedId] = useState('');
  const students = data?.students || [];
  const student = students.find(item => item.id === selectedId) || students[0];
  const office = data?.settings.phone || '';
  const whatsapp = data?.settings.whatsappNumber || office;
  const open = (phone: string, kind: 'call' | 'sms' | 'whatsapp') =>
    action.run(() => Linking.openURL(contactUrl(phone, kind)), '');
  return (
    <Page loading={loading} refresh={refresh} error={error}>
      {students.length > 1 ? (
        <Select
          label="শিক্ষার্থীর ড্রাইভার"
          value={student?.id || ''}
          onChange={setSelectedId}
          options={students.map(item => ({
            value: item.id,
            label: item.studentName,
          }))}
        />
      ) : null}
      <Notice text={action.error} kind="error" />
      <NoorCard>
        <NoorRow
          icon="phone"
          title="ড্রাইভারের সাথে কথা বলুন"
          subtitle={
            student?.driverPhone
              ? `${student.driverName || 'ড্রাইভার'} · ${student.driverPhone}`
              : 'ড্রাইভারের নম্বর যুক্ত হয়নি'
          }
          onPress={
            student?.driverPhone && !action.busy
              ? () => open(student.driverPhone!, 'call')
              : undefined
          }
        />
        <NoorRow
          icon="whatsapp"
          title="ড্রাইভারকে WhatsApp করুন"
          subtitle={
            student?.driverPhone
              ? 'WhatsApp-এ বার্তা লিখুন'
              : 'ড্রাইভারের নম্বর যুক্ত হয়নি'
          }
          onPress={
            student?.driverPhone && !action.busy
              ? () => open(student.driverPhone!, 'whatsapp')
              : undefined
          }
        />
        <NoorRow
          icon="phone"
          title="অফিসের সাথে যোগাযোগ"
          subtitle={office || 'অফিসের নম্বর যুক্ত হয়নি'}
          onPress={
            office && !action.busy ? () => open(office, 'call') : undefined
          }
        />
        <NoorRow
          icon="sms"
          title="SMS পাঠান"
          subtitle={office ? 'অফিসকে বার্তা পাঠান' : 'অফিসের নম্বর যুক্ত হয়নি'}
          onPress={
            office && !action.busy ? () => open(office, 'sms') : undefined
          }
        />
        <NoorRow
          icon="whatsapp"
          title="WhatsApp যোগাযোগ"
          subtitle={whatsapp || 'WhatsApp নম্বর যুক্ত হয়নি'}
          onPress={
            whatsapp && !action.busy
              ? () => open(whatsapp, 'whatsapp')
              : undefined
          }
        />
      </NoorCard>
      {data?.settings.emergencyPhone ? (
        <NoorCard>
          <NoorRow
            icon="bell"
            title="জরুরি যোগাযোগ"
            subtitle={data.settings.emergencyPhone}
            color={colors.danger}
            onPress={
              !action.busy
                ? () => open(data.settings.emergencyPhone, 'call')
                : undefined
            }
          />
        </NoorCard>
      ) : null}
      {data?.settings.address ? (
        <NoorCard>
          <InfoRow icon="pin" label="অফিস" value={data.settings.address} />
        </NoorCard>
      ) : null}
    </Page>
  );
}

export function ParentTrackingScreen({ route }: Props<'LiveTracking'>) {
  const { data, loading, error, refresh } = useData();
  const action = useAction();
  const [selectedId, setSelectedId] = useState(route.params?.vehicleId || '');
  const vehicle =
    data.vehicles.find(item => item.id === selectedId) ||
    (!selectedId ? data.vehicles[0] : undefined);
  const location = data.locations.find(item => item.imei === vehicle?.imei);
  const service = data.subscriptions.find(
    item => item.vehicleId === vehicle?.id && item.status === 'ACTIVE',
  );
  const fresh =
    location?.status === 'live' &&
    Date.now() - Date.parse(location.lastSeen) < 180_000;
  return (
    <Page loading={loading} refresh={refresh} error={error}>
      <Notice text={action.error} kind="error" />
      {data.vehicles.length > 1 ? (
        <Select
          label="গাড়ি নির্বাচন"
          value={vehicle?.id || ''}
          onChange={setSelectedId}
          options={data.vehicles.map(item => ({
            value: item.id,
            label: item.name,
          }))}
        />
      ) : null}
      {!vehicle ? (
        <Empty
          title="ট্র্যাকিংয়ের জন্য গাড়ি নেই"
          detail="সক্রিয় পরিবহন সেবা অনুমোদিত হলে নির্ধারিত গাড়ির অবস্থান দেখা যাবে।"
        />
      ) : (
        <>
          <NoorCard>
            <View style={parent.identity}>
              <View style={local.vehicleIcon}>
                <NoorIcon name="vehicle" size={28} color="#FFFFFF" />
              </View>
              <View style={parent.grow}>
                <Text style={styles.heading}>{vehicle.name}</Text>
                <Text style={styles.muted}>
                  Driver: {vehicle.driverName || '—'}
                </Text>
                <Text style={styles.muted}>
                  Route: {service?.routeName || '—'}
                </Text>
              </View>
              <NoorBadge
                label={fresh ? 'Live' : 'সর্বশেষ'}
                tone={fresh ? 'green' : 'gray'}
              />
            </View>
          </NoorCard>
          <FleetMap
            vehicles={[vehicle]}
            locations={location ? [location] : []}
            selectedId={vehicle.id}
            onSelect={setSelectedId}
            style={parent.map}
          />
          <NoorCard>
            <Text style={styles.heading}>বর্তমান অবস্থান</Text>
            <Text style={styles.body}>
              {location?.latitude != null && location.longitude != null
                ? `${location.latitude.toFixed(
                    5,
                  )}, ${location.longitude.toFixed(5)}`
                : 'ট্র্যাকার থেকে অবস্থান পাওয়া যায়নি।'}
            </Text>
            {location?.lastSeen ? (
              <Text style={styles.muted}>
                সর্বশেষ আপডেট: {dateLabel(location.lastSeen)}
              </Text>
            ) : null}
            {location && !fresh ? (
              <Text style={local.stale}>
                পুরোনো অবস্থান দেখানো হচ্ছে। নতুন GPS আপডেটের অপেক্ষায়।
              </Text>
            ) : null}
          </NoorCard>
          <VehicleCard
            vehicle={vehicle}
            location={location}
            busy={action.busy}
            onOpenURL={url => action.run(() => Linking.openURL(url), '')}
          />
        </>
      )}
    </Page>
  );
}

const local = StyleSheet.create({
  stepper: { flexDirection: 'row', paddingVertical: 5 },
  step: { flex: 1, alignItems: 'center', gap: 7 },
  stepTop: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircle: {
    width: 29,
    height: 29,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#EDF1EF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  stepNumber: { color: colors.muted, fontSize: 14, fontWeight: '700' },
  stepNumberActive: { color: '#FFFFFF' },
  stepLabel: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
    maxWidth: 70,
  },
  stepLabelActive: { color: colors.primary, fontWeight: '700' },
  connector: { height: 2, backgroundColor: '#DDE7E1', flex: 1 },
  connectorDone: { backgroundColor: colors.primary },
  connectorEdge: { opacity: 0 },
  photoRow: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoPicker: {
    backgroundColor: '#F5FAFF',
    borderWidth: 1,
    borderColor: colors.line,
    flex: 1,
    minHeight: 84,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 7,
    gap: 6,
  },
  routeCard: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 13,
    minHeight: 75,
  },
  routeSelected: { borderColor: colors.primary, backgroundColor: '#F0FAF5' },
  routeFare: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  radio: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#ABBAB2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  rejected: { backgroundColor: colors.danger },
  vehicleIcon: {
    backgroundColor: colors.primary,
    width: 46,
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stale: { color: '#98701F', fontSize: 12, lineHeight: 19 },
});
