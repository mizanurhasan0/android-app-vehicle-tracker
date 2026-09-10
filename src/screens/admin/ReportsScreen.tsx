import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api, ApiError } from '../../api/client';
import { ManagementReport } from '../../api/management';
import { NoorIcon } from '../../components/Noor';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useManagement } from '../../context/ManagementContext';
import { currentMonth, money } from '../../utils/format';
import { saveReportFile } from '../../utils/photo';
import {
  AdminPage,
  Box,
  C,
  Detail,
  EmptyState,
  ErrorText,
  Heading,
  Input,
  SmallButton,
  s,
  today,
  useAction,
} from './AdminUi';
import { ReportCell, reportCsv, validReportMonth } from './reportUtils';
import { categoryLabels } from './OperationsScreens';

const reportTypes = [
  { id: 'DAILY', label: 'দৈনিক রিপোর্ট' },
  { id: 'MONTHLY', label: 'মাসিক রিপোর্ট' },
  { id: 'STUDENTS', label: 'শিক্ষার্থী রিপোর্ট' },
  { id: 'VEHICLES', label: 'গাড়ি রিপোর্ট' },
  { id: 'DRIVERS', label: 'ড্রাইভার রিপোর্ট' },
  { id: 'ROUTES', label: 'রুট রিপোর্ট' },
  { id: 'PAYMENTS', label: 'পেমেন্ট রিপোর্ট' },
  { id: 'DUE', label: 'বকেয়া রিপোর্ট' },
  { id: 'INCOME', label: 'আয় রিপোর্ট' },
  { id: 'EXPENSE', label: 'ব্যয় রিপোর্ট' },
  { id: 'SALARY', label: 'বেতন রিপোর্ট' },
  { id: 'PROFIT', label: 'লাভ/ক্ষতি রিপোর্ট' },
];
export function ReportsScreen() {
  const {
    data,
    error: managementError,
    refresh: refreshManagement,
  } = useManagement();
  const { data: transport } = useData();
  const { baseUrl, session, expire } = useAuth();
  const [month, setMonth] = useState(currentMonth);
  const [date, setDate] = useState(today);
  const [report, setReport] = useState<ManagementReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('MONTHLY');
  const [saved, setSaved] = useState('');
  const action = useAction();
  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!validReportMonth(month)) {
        setReport(null);
        setError('মাস YYYY-MM ফরম্যাটে দিন।');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      setReport(null);
      try {
        const result = await api<ManagementReport>(
          baseUrl,
          `/admin/reports?month=${encodeURIComponent(month)}`,
          session?.token,
          undefined,
          'GET',
          signal,
        );
        if (!signal?.aborted) setReport(result);
      } catch (problem) {
        if (!signal?.aborted) {
          if (problem instanceof ApiError && problem.status === 401)
            await expire();
          setError(
            problem instanceof Error
              ? problem.message
              : 'রিপোর্ট লোড করা যায়নি।',
          );
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [baseUrl, session?.token, expire, month],
  );
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);
  const rows = (): ReportCell[][] => {
    if (!report) return [];
    const header: ReportCell[][] = [
      [data?.settings.businessName || 'NOOR TRANSPORT'],
      [
        reportTypes.find(item => item.id === selected)?.label || '',
        selected === 'DAILY' ? date : report.month,
      ],
    ];
    let body: ReportCell[][] = [];
    const ledger = report.ledger;
    if (selected === 'DAILY')
      body = [
        ['নাম', 'ধরন', 'অবস্থা', 'তারিখ'],
        ...(data?.attendance || [])
          .filter(item => item.date === date)
          .map(item => [
            item.studentId
              ? data?.students.find(student => student.id === item.studentId)
                  ?.studentName || item.studentId
              : data?.drivers.find(driver => driver.id === item.driverId)
                  ?.name ||
                item.driverId ||
                '',
            item.studentId ? 'শিক্ষার্থী' : 'ড্রাইভার',
            item.status,
            item.date,
          ]),
      ];
    else if (selected === 'STUDENTS')
      body = [
        [
          'শিক্ষার্থী',
          'আইডি',
          'শ্রেণি',
          'অভিভাবক',
          'ফোন',
          'রুট',
          'গাড়ি',
          'মাসিক ভাড়া (৳)',
          'অবস্থা',
        ],
        ...(data?.students || []).map(item => [
          item.studentName,
          item.studentCode,
          item.className,
          item.guardianName,
          item.guardianPhone,
          item.routeName,
          item.vehicleName,
          item.monthlyAmount / 100,
          item.status,
        ]),
      ];
    else if (selected === 'DRIVERS')
      body = [
        ['নাম', 'ফোন', 'গাড়ি', 'রুট', 'মাসিক বেতন (৳)', 'অবস্থা'],
        ...(data?.drivers || []).map(item => [
          item.name,
          item.phone,
          item.vehicleName || '',
          item.routeName || '',
          item.monthlySalary / 100,
          item.status,
        ]),
      ];
    else if (selected === 'VEHICLES')
      body = [
        ['গাড়ি', 'রেজিস্ট্রেশন', 'ড্রাইভার', 'ফোন'],
        ...transport.vehicles.map(item => [
          item.name,
          item.plate,
          item.driverName || '',
          item.driverPhone || '',
        ]),
      ];
    else if (selected === 'ROUTES')
      body = [
        ['রুট', 'গাড়ি', 'মাসিক ভাড়া (৳)', 'পিকআপ স্থান'],
        ...transport.routes.map(item => [
          item.name,
          item.vehicleName,
          item.monthlyAmount / 100,
          item.stops.map(stop => stop.name).join(' → '),
        ]),
      ];
    else if (selected === 'PAYMENTS' || selected === 'DUE')
      body = [
        ['শিক্ষার্থী', 'অভিভাবক', 'মাস', 'টাকা (৳)', 'অবস্থা'],
        ...transport.bills
          .filter(
            item =>
              item.month === report.month &&
              (selected !== 'DUE' || item.status !== 'PAID'),
          )
          .map(item => [
            item.studentName,
            item.guardianName,
            item.month,
            item.amount / 100,
            item.status,
          ]),
      ];
    else if (
      selected === 'INCOME' ||
      selected === 'EXPENSE' ||
      selected === 'SALARY'
    )
      body = [
        ['শিরোনাম', 'খাত', 'তারিখ', 'টাকা (৳)', 'নোট'],
        ...(selected === 'INCOME'
          ? [
              [
                'শিক্ষার্থীর ভাড়া আদায়',
                'পেমেন্ট',
                report.month,
                report.cashflow.fareReceived / 100,
                '',
              ],
            ]
          : []),
        ...ledger
          .filter(item =>
            selected === 'SALARY'
              ? item.type === 'EXPENSE' && item.category === 'SALARY'
              : item.type === selected,
          )
          .map(item => [
            item.title,
            categoryLabels[item.category] || item.category,
            item.date,
            item.amount / 100,
            item.note,
          ]),
      ];
    else
      body = [
        ['বিবরণ', 'পরিমাণ'],
        ['মোট শিক্ষার্থী', report.students.total],
        ['সক্রিয় শিক্ষার্থী', report.students.active],
        ['গাড়ি', report.vehicles],
        ['ড্রাইভার', report.drivers],
        ['এই মাসের বিল (৳)', report.billing.expected / 100],
        ['পরিশোধিত বিল (৳)', report.billing.paid / 100],
        ['বকেয়া (৳)', report.billing.due / 100],
        ['আগের বকেয়া (৳)', report.billing.previousDue / 100],
        ['ভাড়া আদায় (৳)', report.cashflow.fareReceived / 100],
        ['অন্যান্য আয় (৳)', report.cashflow.otherIncome / 100],
        ['মোট ব্যয় (৳)', report.cashflow.expenses / 100],
        ['বিনিয়োগ (৳)', report.cashflow.investment / 100],
        ['নিট লাভ/ক্ষতি (৳)', report.cashflow.net / 100],
        ['উপস্থিতি রেকর্ড', report.attendance.present],
        ['অনুপস্থিতির রেকর্ড', report.attendance.absent],
        ['ছুটির রেকর্ড', report.attendance.leave],
      ];
    return [...header, [], ...body];
  };
  const exportReport = (format: 'CSV' | 'PDF') =>
    action.run(async () => {
      if (!report || report.month !== month)
        throw new Error('রিপোর্ট লোড হওয়া পর্যন্ত অপেক্ষা করুন।');
      if (selected === 'DAILY' && !/^\d{4}-\d{2}-\d{2}$/.test(date))
        throw new Error('তারিখ YYYY-MM-DD ফরম্যাটে দিন।');
      const table = rows();
      const content =
        format === 'CSV'
          ? reportCsv(table)
          : table.map(row => row.join('  |  ')).join('\n');
      const done = await saveReportFile(
        `noor-${selected.toLowerCase()}-${
          selected === 'DAILY' ? date : month
        }.${format === 'CSV' ? 'csv' : 'pdf'}`,
        content,
        format === 'CSV' ? 'text/csv' : 'application/pdf',
      );
      setSaved(done ? 'রিপোর্ট সংরক্ষণ হয়েছে।' : '');
    });
  const preview = rows().slice(3, 11);
  return (
    <AdminPage
      loading={loading}
      error={error || managementError}
      refresh={async () => {
        await Promise.all([load(), refreshManagement()]);
      }}
    >
      <Input
        label="রিপোর্টের মাস (YYYY-MM)"
        value={month}
        onChangeText={value => {
          setMonth(value);
          setSaved('');
        }}
        maxLength={7}
      />
      <Box>
        {reportTypes.map(item => (
          <Pressable
            key={item.id}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected === item.id }}
            onPress={() => {
              setSelected(item.id);
              setSaved('');
              action.setError('');
            }}
            style={[s.row, s.reportRow]}
          >
            <NoorIcon
              name="reports"
              size={17}
              color={selected === item.id ? C.green : C.text}
            />
            <Text
              style={[
                s.body,
                s.flex,
                selected === item.id && [s.green, s.bold],
              ]}
            >
              {item.label}
            </Text>
            <Text style={selected === item.id ? s.green : s.muted}>
              {selected === item.id ? '✓' : '›'}
            </Text>
          </Pressable>
        ))}
      </Box>
      {selected === 'DAILY' ? (
        <Input
          label="উপস্থিতির তারিখ (YYYY-MM-DD)"
          value={date}
          onChangeText={setDate}
          maxLength={10}
        />
      ) : null}
      {report ? (
        <Box>
          <Heading
            title={
              reportTypes.find(item => item.id === selected)?.label || 'রিপোর্ট'
            }
          />
          {selected === 'MONTHLY' || selected === 'PROFIT' ? (
            <>
              <Detail
                label="মোট আয়"
                value={money(
                  report.cashflow.fareReceived + report.cashflow.otherIncome,
                )}
              />
              <Detail
                label="মোট ব্যয়"
                value={money(report.cashflow.expenses)}
              />
              <Detail
                label="নিট লাভ/ক্ষতি"
                value={money(report.cashflow.net)}
              />
              <Detail label="বকেয়া" value={money(report.billing.due)} />
            </>
          ) : preview.length > 1 ? (
            preview.map((row, index) => (
              <Text
                key={index}
                selectable
                style={index === 0 ? s.heading : s.body}
              >
                {row.join(' · ')}
              </Text>
            ))
          ) : (
            <EmptyState text="এই রিপোর্টে কোনো রেকর্ড নেই" />
          )}
          <ErrorText message={action.error} />
          {saved ? <Text style={s.note}>{saved}</Text> : null}
          <View style={s.row}>
            <View style={s.flex}>
              <SmallButton
                title="PDF Download"
                busy={action.busy}
                onPress={() => exportReport('PDF')}
              />
            </View>
            <View style={s.flex}>
              <SmallButton
                title="Excel (CSV)"
                busy={action.busy}
                onPress={() => exportReport('CSV')}
              />
            </View>
          </View>
        </Box>
      ) : null}
    </AdminPage>
  );
}
