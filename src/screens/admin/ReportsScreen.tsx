import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api, ApiError } from '../../api/client';
import { ManagementReport } from '../../api/management';
import { NoorIcon } from '../../components/Noor';
import { useAuth } from '../../context/AuthContext';
import { useCoreData } from '../../context/DataContext';
import { useManagement } from '../../context/ManagementContext';
import { useTranslation } from '../../i18n';
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
  labelStatus,
  SmallButton,
  s,
  today,
  useAction,
} from './AdminUi';
import {
  ReportCell,
  reportCellLabel,
  reportCsv,
  validReportMonth,
} from './reportUtils';
import { categoryLabels } from './operations';

const reportTypes = [
  { id: 'DAILY', label: 'Daily report' },
  { id: 'MONTHLY', label: 'Monthly report' },
  { id: 'STUDENTS', label: 'Student report' },
  { id: 'VEHICLES', label: 'Vehicle report' },
  { id: 'DRIVERS', label: 'Driver report' },
  { id: 'ROUTES', label: 'Route report' },
  { id: 'PAYMENTS', label: 'Payment report' },
  { id: 'DUE', label: 'Due report' },
  { id: 'INCOME', label: 'Income report' },
  { id: 'EXPENSE', label: 'Expense report' },
  { id: 'SALARY', label: 'Salary report' },
  { id: 'PROFIT', label: 'Profit/loss report' },
];
export function ReportsScreen() {
  const { t } = useTranslation();
  const {
    data,
    error: managementError,
    refresh: refreshManagement,
  } = useManagement();
  const { data: transport } = useCoreData();
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
        setError('Enter the month in YYYY-MM format.');
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
              : 'Could not load the report.',
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
  const rows = (display = false): ReportCell[][] => {
    if (!report) return [];
    const header: ReportCell[][] = [
      [data?.settings.businessName || 'NOOR TRANSPORT'],
      [
        t(reportTypes.find(item => item.id === selected)?.label || 'Report'),
        selected === 'DAILY' ? date : report.month,
      ],
    ];
    let body: ReportCell[][] = [];
    const ledger = report.ledger;
    if (selected === 'DAILY')
      body = [
        [t('Name'), t('Type'), t('Status'), t('Date')],
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
            item.studentId ? t('Student') : t('Driver'),
            display ? labelStatus(item.status) : item.status,
            item.date,
          ]),
      ];
    else if (selected === 'STUDENTS')
      body = [
        [
          t('Student'),
          t('ID'),
          t('Class'),
          t('Guardian'),
          t('Phone'),
          t('Route'),
          t('Vehicle'),
          t('Monthly fee (৳)'),
          t('Status'),
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
          display ? labelStatus(item.status) : item.status,
        ]),
      ];
    else if (selected === 'DRIVERS')
      body = [
        [
          t('Name'),
          t('Phone'),
          t('Vehicle'),
          t('Route'),
          t('Monthly salary (৳)'),
          t('Status'),
        ],
        ...(data?.drivers || []).map(item => [
          item.name,
          item.phone,
          item.vehicleName || '',
          item.routeName || '',
          item.monthlySalary / 100,
          display ? labelStatus(item.status) : item.status,
        ]),
      ];
    else if (selected === 'VEHICLES')
      body = [
        [t('Vehicle'), t('Registration'), t('Driver'), t('Phone')],
        ...transport.vehicles.map(item => [
          item.name,
          item.plate,
          item.driverName || '',
          item.driverPhone || '',
        ]),
      ];
    else if (selected === 'ROUTES')
      body = [
        [t('Route'), t('Vehicle'), t('Monthly fee (৳)'), t('Pickup stops')],
        ...transport.routes.map(item => [
          item.name,
          item.vehicleName,
          item.monthlyAmount / 100,
          item.stops.map(stop => stop.name).join(' → '),
        ]),
      ];
    else if (selected === 'PAYMENTS' || selected === 'DUE')
      body = [
        [t('Student'), t('Guardian'), t('Month'), t('Amount (৳)'), t('Status')],
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
            display ? labelStatus(item.status) : item.status,
          ]),
      ];
    else if (
      selected === 'INCOME' ||
      selected === 'EXPENSE' ||
      selected === 'SALARY'
    )
      body = [
        [t('Title'), t('Category'), t('Date'), t('Amount (৳)'), t('Note')],
        ...(selected === 'INCOME'
          ? [
              [
                t('Student fare collected'),
                t('Payment'),
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
            categoryLabels[item.category]
              ? t(categoryLabels[item.category])
              : item.category,
            item.date,
            item.amount / 100,
            item.note,
          ]),
      ];
    else
      body = [
        [t('Item'), t('Quantity')],
        [t('Total students'), report.students.total],
        [t('Active students'), report.students.active],
        [t('Vehicle'), report.vehicles],
        [t('Driver'), report.drivers],
        [t("This month's bills (৳)"), report.billing.expected / 100],
        [t('Paid bills (৳)'), report.billing.paid / 100],
        [t('Due (৳)'), report.billing.due / 100],
        [t('Previous due (৳)'), report.billing.previousDue / 100],
        [t('Fare collected (৳)'), report.cashflow.fareReceived / 100],
        [t('Other income (৳)'), report.cashflow.otherIncome / 100],
        [t('Total expenses (৳)'), report.cashflow.expenses / 100],
        [t('Investment (৳)'), report.cashflow.investment / 100],
        [t('Net profit/loss (৳)'), report.cashflow.net / 100],
        [t('Present records'), report.attendance.present],
        [t('Absent records'), report.attendance.absent],
        [t('Leave records'), report.attendance.leave],
      ];
    return [...header, [], ...body];
  };
  const exportReport = (format: 'CSV' | 'PDF') =>
    action.run(async () => {
      if (!report || report.month !== month)
        throw new Error('Wait for the report to load.');
      if (selected === 'DAILY' && !/^\d{4}-\d{2}-\d{2}$/.test(date))
        throw new Error('Enter the date in YYYY-MM-DD format.');
      const table = rows(format === 'PDF');
      const content =
        format === 'CSV'
          ? reportCsv(table)
          : table.map(row => row.map(reportCellLabel).join('  |  ')).join('\n');
      const done = await saveReportFile(
        `noor-${selected.toLowerCase()}-${
          selected === 'DAILY' ? date : month
        }.${format === 'CSV' ? 'csv' : 'pdf'}`,
        content,
        format === 'CSV' ? 'text/csv' : 'application/pdf',
      );
      setSaved(done ? 'Report saved.' : '');
    });
  const preview = rows(true).slice(3, 11);
  return (
    <AdminPage
      loading={loading}
      error={error || managementError}
      refresh={async () => {
        await Promise.all([load(), refreshManagement()]);
      }}
    >
      <Input
        label={t('Report month (YYYY-MM)')}
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
              {t(item.label)}
            </Text>
            <Text style={selected === item.id ? s.green : s.muted}>
              {selected === item.id ? '✓' : '›'}
            </Text>
          </Pressable>
        ))}
      </Box>
      {selected === 'DAILY' ? (
        <Input
          label={t('Attendance date (YYYY-MM-DD)')}
          value={date}
          onChangeText={setDate}
          maxLength={10}
        />
      ) : null}
      {report ? (
        <Box>
          <Heading
            title={t(
              reportTypes.find(item => item.id === selected)?.label || 'Report',
            )}
          />
          {selected === 'MONTHLY' || selected === 'PROFIT' ? (
            <>
              <Detail
                label={t('Total income')}
                value={money(
                  report.cashflow.fareReceived + report.cashflow.otherIncome,
                )}
              />
              <Detail
                label={t('Total expenses')}
                value={money(report.cashflow.expenses)}
              />
              <Detail
                label={t('Net profit/loss')}
                value={money(report.cashflow.net)}
              />
              <Detail label={t('Due')} value={money(report.billing.due)} />
            </>
          ) : preview.length > 1 ? (
            preview.map((row, index) => (
              <Text
                key={index}
                selectable
                style={index === 0 ? s.heading : s.body}
              >
                {row.map(reportCellLabel).join(' · ')}
              </Text>
            ))
          ) : (
            <EmptyState text={t('No records in this report')} />
          )}
          <ErrorText message={action.error} />
          {saved ? <Text style={s.note}>{t(saved)}</Text> : null}
          <View style={s.row}>
            <View style={s.flex}>
              <SmallButton
                title={t('Download PDF')}
                busy={action.busy}
                onPress={() => exportReport('PDF')}
              />
            </View>
            <View style={s.flex}>
              <SmallButton
                title={t('Excel (CSV)')}
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
