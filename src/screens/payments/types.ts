export type DeskTab = 'review' | 'bills' | 'history';

export const paymentTabs = [
  'Your bills',
  'Payment history',
  'Payment form',
] as const;
export type PaymentTab = (typeof paymentTabs)[number];
