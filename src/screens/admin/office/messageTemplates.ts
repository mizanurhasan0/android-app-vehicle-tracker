import { BusinessSettings } from '../../../api/management';

export type TextSettingKey = Exclude<
  keyof BusinessSettings,
  'operatingDays' | 'transportShifts'
>;

export const templateLabels: { key: TextSettingKey; title: string }[] = [
  { key: 'paymentReminder', title: 'Payment reminder' },
  { key: 'absenceMessage', title: 'Absence message' },
  { key: 'delayMessage', title: 'Vehicle delay' },
  { key: 'holidayMessage', title: 'Holiday message' },
  { key: 'emergencyMessage', title: 'Emergency message' },
];
