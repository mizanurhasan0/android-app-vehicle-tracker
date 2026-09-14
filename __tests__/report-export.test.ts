import {
  monthInDhaka,
  reportCellLabel,
  reportCsv,
  validReportMonth,
} from '../src/screens/admin/reportUtils';
import { i18n } from '../src/i18n';

afterEach(async () => {
  await i18n.changeLanguage('en');
});

describe('Noor report export', () => {
  it('localizes display numbers while preserving CSV numbers, enums and user text', async () => {
    const rows = [['Name', '01712345678', '2026-09', 'ACTIVE', 2500.5]];
    await i18n.changeLanguage('en');
    const csv = reportCsv(rows);
    expect(reportCellLabel(2500.5)).toBe('2,500.5');
    await i18n.changeLanguage('bn');
    expect(reportCellLabel(2500.5)).toBe('২,৫০০.৫');
    for (const cell of ['Name', '01712345678', '2026-09', 'ACTIVE'])
      expect(reportCellLabel(cell)).toBe(cell);
    expect(reportCsv(rows)).toBe(csv);
  });
  it('attributes payments around midnight to the same Dhaka month as the API', () => {
    expect(monthInDhaka('2026-08-31T18:00:00Z')).toBe('2026-09');
    expect(monthInDhaka('2026-08-31T17:59:59Z')).toBe('2026-08');
    expect(monthInDhaka(null)).toBe('');
    expect(monthInDhaka('invalid')).toBe('');
  });
  it('preserves Bengali, escapes commas/quotes/newlines, and neutralizes spreadsheet formulas', () => {
    const csv = reportCsv([
      ['শিক্ষার্থী', 'নোট'],
      ['আব্দুল্লাহ', 'রাস্তা, "উত্তরা"\nঢাকা'],
      ['=HYPERLINK("https://example.com")', '  +SUM(1,2)'],
      [-2500, '@command'],
    ]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"রাস্তা, ""উত্তরা""\nঢাকা"');
    expect(csv).toContain('"\'=HYPERLINK');
    expect(csv).toContain('"\'  +SUM(1,2)"');
    expect(csv).toContain('"-2500","\'@command"');
  });
  it('accepts only a real calendar month', () => {
    expect(validReportMonth('2026-09')).toBe(true);
    for (const value of ['2026-00', '2026-13', '2026-9', '2026-09-01', 'abc'])
      expect(validReportMonth(value)).toBe(false);
  });
});
