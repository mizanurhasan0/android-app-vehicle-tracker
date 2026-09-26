import { dhakaDate } from './dates';
import { normalizeDigits } from './format';
import { isValidDate, ValidationError } from './validation';

export interface ServiceSettlementInput {
  stopDate: string;
  finalMonthlyFee: number;
  reason?: string;
}

export function finalMonthlyFeeToPoisha(value: string) {
  const normalized = normalizeDigits(value).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized))
    throw new ValidationError({
      finalMonthlyFee: 'Enter a valid final monthly fee.',
    });
  const [whole, fraction = ''] = normalized.split('.');
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(amount) || amount > 100_000_000)
    throw new ValidationError({
      finalMonthlyFee: 'Enter a valid final monthly fee.',
    });
  return amount;
}

export function serviceSettlementInput({
  stopDate,
  finalMonthlyFee,
  reason,
  startedAt,
}: {
  stopDate: string;
  finalMonthlyFee: string;
  reason?: string;
  startedAt?: string;
}): ServiceSettlementInput {
  const currentDate = dhakaDate();
  const errors: Record<string, string> = {};
  if (!isValidDate(stopDate)) errors.stopDate = 'Enter a valid stop date.';
  else if (stopDate > currentDate)
    errors.stopDate = 'Stop date cannot be in the future.';
  else if (stopDate.slice(0, 7) !== currentDate.slice(0, 7))
    errors.stopDate = 'Stop date must be in the current billing month';
  else if (startedAt && stopDate < startedAt.slice(0, 10))
    errors.stopDate = 'Stop date cannot be before the service start date.';
  let amount = 0;
  try {
    amount = finalMonthlyFeeToPoisha(finalMonthlyFee);
  } catch (problem) {
    if (problem instanceof ValidationError)
      Object.assign(errors, problem.fieldErrors);
    else throw problem;
  }
  if (Object.keys(errors).length) throw new ValidationError(errors);
  return {
    stopDate,
    finalMonthlyFee: amount,
    ...(reason?.trim() ? { reason: reason.trim() } : {}),
  };
}
