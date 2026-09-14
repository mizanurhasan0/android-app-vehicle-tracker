import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { i18n, translateMessage } from '../src/i18n';
import { english as en, catalogs } from '../src/i18n/resources';
import { notificationText } from '../src/i18n/notifications';
import {
  dateLabel,
  money,
  normalizeDigits,
  readable,
  toPoisha,
} from '../src/utils/format';

const placeholders = (text: string) =>
  (text.match(/{{\s*\w+\s*}}/g) || []).sort();
afterEach(async () => {
  await i18n.changeLanguage('en');
});

it('has matching, nonempty dictionaries with identical interpolation variables', () => {
  for (const catalog of Object.values(catalogs)) {
    const english: Record<string, string> = catalog.en;
    const bangla: Record<string, string> = catalog.bn;
    expect(Object.keys(bangla).sort()).toEqual(Object.keys(english).sort());
    for (const key of Object.keys(english)) {
      expect(english[key].trim()).not.toBe('');
      expect(bangla[key].trim()).not.toBe('');
      expect(placeholders(bangla[key])).toEqual(placeholders(english[key]));
    }
  }
});

it('does not override a shared translation with different screen copy', () => {
  for (const language of ['en', 'bn'] as const) {
    const seen = new Map<string, string>();
    const conflicts: string[] = [];
    for (const catalog of Object.values(catalogs)) {
      for (const [key, value] of Object.entries(catalog[language])) {
        if (seen.has(key) && seen.get(key) !== value) conflicts.push(key);
        seen.set(key, value);
      }
    }
    expect(conflicts).toEqual([]);
  }
});

it('covers static and conditional translation keys used by the app', () => {
  const missing = new Set<string>();
  const untranslated: string[] = [];
  const root = path.join(__dirname, '..');
  function sourceFiles(directory: string): string[] {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
      const file = path.join(directory, entry.name);
      return entry.isDirectory()
        ? sourceFiles(file)
        : /\.tsx?$/.test(entry.name)
        ? [file]
        : [];
    });
  }
  const files = [
    path.join(root, 'App.tsx'),
    ...sourceFiles(path.join(root, 'src')),
  ];
  function keys(node: ts.Node): string[] {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
      return [node.text];
    return ts.isConditionalExpression(node)
      ? [...keys(node.whenTrue), ...keys(node.whenFalse)]
      : [];
  }
  for (const file of files) {
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    function visit(node: ts.Node) {
      if (
        (ts.isJsxText(node) ||
          (ts.isStringLiteral(node) && ts.isJsxAttribute(node.parent))) &&
        /[\u0985-\u09e5]/.test(node.text)
      ) {
        const { line } = source.getLineAndCharacterOfPosition(node.getStart());
        untranslated.push(
          `${path.relative(root, file)}:${line + 1}: ${node.text.trim()}`,
        );
      }
      if (
        ts.isCallExpression(node) &&
        ['t', 'i18n.t'].includes(node.expression.getText(source)) &&
        node.arguments[0]
      ) {
        keys(node.arguments[0]).forEach(key => {
          if (!(key in en)) missing.add(key);
        });
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  expect([...missing]).toEqual([]);
  expect(untranslated).toEqual([]);
});

it('localizes money, dates and statuses while preserving exact payment amounts', async () => {
  const englishDate = dateLabel('2026-09-08T12:00:00Z');
  await i18n.changeLanguage('bn');
  expect(money(150029)).toBe('৳১,৫০০.২৯');
  expect(dateLabel('2026-09-08T12:00:00Z')).not.toBe(englishDate);
  expect(readable('APPROVED')).toBe('অনুমোদিত');
  expect(readable('lastKnown')).toBe('সর্বশেষ তথ্য');
  expect(normalizeDigits('০১৭১২৩৪৫৬৭৮')).toBe('01712345678');
  expect(toPoisha('১৫০০.২৯')).toBe(150029);
  expect(() => toPoisha('১.০০১')).toThrow();
});

it('translates known errors and notifications without translating entered names or notes', async () => {
  await i18n.changeLanguage('bn');
  expect(translateMessage('Phone number or password is incorrect')).toBe(
    'ফোন নম্বর বা পাসওয়ার্ড সঠিক নয়',
  );
  expect(translateMessage('A custom note from school')).toBe(
    'A custom note from school',
  );
  expect(
    notificationText({
      title: 'New service request',
      body: 'Rafi requested transport for Ayesha.',
    }),
  ).toEqual({
    title: 'নতুন সেবার অনুরোধ',
    body: 'Rafi, Ayesha-এর জন্য পরিবহনের আবেদন করেছেন।',
  });
  expect(
    notificationText({
      title: 'Payment needs correction',
      body: 'Admin note: Wrong account. You can submit corrected details.',
    }).body,
  ).toContain('Wrong account');
  expect(
    notificationText({ title: 'School notice', body: 'Please use Gate A' }),
  ).toEqual({ title: 'School notice', body: 'Please use Gate A' });
});
