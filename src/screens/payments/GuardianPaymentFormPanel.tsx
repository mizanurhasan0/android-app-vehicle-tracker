import React from 'react';
import { useTranslation } from '../../i18n';
import { Bill } from '../../api/types';
import { TransportShift } from '../../api/management';
import { Card, Empty, Select } from '../../components/ui';
import { paymentShiftLabel } from '../../utils/paymentShift';
import { money } from '../../utils/format';
import { PaymentForm } from './PaymentForm';
import { PaymentInstructions } from './PaymentInstructions';
import { PaymentPanel } from './PaymentPanel';

export function GuardianPaymentFormPanel({
  active,
  hasAccounts,
  creditBalance,
  payableBills,
  selected,
  shifts,
  onSelect,
  onBusyChange,
  cancel,
}: {
  active: boolean;
  hasAccounts: boolean;
  creditBalance: number;
  payableBills: Bill[];
  selected?: Bill;
  shifts: TransportShift[];
  onSelect: (id: string | null) => void;
  onBusyChange: (busy: boolean) => void;
  cancel: () => void;
}) {
  const { t } = useTranslation();
  // Keep the selected form's draft and submission lock across tab changes.
  // PaymentPanel conditionally mounts its native children.
  if (
    payableBills.length &&
    selected &&
    (hasAccounts || creditBalance >= selected.amount)
  ) {
    return (
      <PaymentForm
        key={selected.id}
        bill={selected}
        creditBalance={creditBalance}
        shifts={shifts}
        active={active}
        onBusyChange={onBusyChange}
        cancel={cancel}
      />
    );
  }
  return (
    <PaymentPanel label="Payment form" active={active}>
      {!hasAccounts &&
      !payableBills.some(bill => creditBalance >= bill.amount) ? (
        <Empty
          title={t('Payment numbers are not set yet')}
          detail={t(
            'Please contact your admin before sending money. Payment submission will become available after setup.',
          )}
        />
      ) : !payableBills.length ? (
        <Empty
          title={t('No bills available for payment')}
          detail={t(
            'Only unpaid bills without a pending submission can be selected. Check Your bills for the current status.',
          )}
        />
      ) : (
        <>
          {hasAccounts ? <PaymentInstructions /> : null}
          <Card>
            <Select
              label={t('Select a bill')}
              value=""
              onChange={value => onSelect(value || null)}
              options={payableBills
                .filter(bill => hasAccounts || creditBalance >= bill.amount)
                .map(bill => ({
                  value: bill.id,
                  label: `${bill.studentName}${
                    bill.shiftId ? ` · ${paymentShiftLabel(bill, shifts)}` : ''
                  } · ${bill.month} · ${money(bill.amount)}`,
                }))}
            />
          </Card>
        </>
      )}
    </PaymentPanel>
  );
}
