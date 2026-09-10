export type ReportCell = string | number;

/** Preserve Unicode in Excel, escape CSV, and neutralize spreadsheet formulas. */
export function reportCsv(rows: ReportCell[][]): string {
  return (
    '\uFEFF' +
    rows
      .map(row =>
        row
          .map(value => {
            const text =
              typeof value === 'number'
                ? String(value)
                : /^[\s\uFEFF]*[=+@-]/.test(value)
                ? `'${value}`
                : value;
            return `"${text.replace(/"/g, '""')}"`;
          })
          .join(','),
      )
      .join('\r\n')
  );
}

export function validReportMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function monthInDhaka(timestamp: string | null): string {
  if (!timestamp) return '';
  const time = Date.parse(timestamp);
  return Number.isFinite(time)
    ? new Date(time + 6 * 60 * 60_000).toISOString().slice(0, 7)
    : '';
}
