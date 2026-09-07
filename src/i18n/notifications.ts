import { Notification } from '../api/types';
import { i18n, translateMessage } from './index';

// Match the companion API's fixed notification templates, keeping all inserted
// names and administrator notes verbatim. Unknown notification text is retained.
const templates: Record<
  string,
  { pattern: RegExp; key: string; fields: string[] }
> = {
  'New service request': {
    pattern: /^(.+) requested transport for (.+)\.$/s,
    key: '{{guardian}} requested transport for {{student}}.',
    fields: ['guardian', 'student'],
  },
  'New complaint': {
    pattern: /^(.+) submitted a transport complaint\.$/s,
    key: '{{guardian}} submitted a transport complaint.',
    fields: ['guardian'],
  },
  'Stop service request': {
    pattern: /^(.+) requested to stop a transport service\.$/s,
    key: '{{guardian}} requested to stop a transport service.',
    fields: ['guardian'],
  },
  'Monthly bill ready': {
    pattern: /^(.+): your (\d{4}-\d{2}) transport bill is ready\.$/s,
    key: '{{student}}: your {{month}} transport bill is ready.',
    fields: ['student', 'month'],
  },
  'Payment needs verification': {
    pattern: /^(.+) submitted a (BKASH|ROCKET) payment for (\d{4}-\d{2})\.$/s,
    key: '{{guardian}} submitted a {{method}} payment for {{month}}.',
    fields: ['guardian', 'method', 'month'],
  },
  'Payment needs correction': {
    pattern: /^Admin note: (.*)\. You can submit corrected details\.$/s,
    key: 'Admin note: {{note}}. You can submit corrected details.',
    fields: ['note'],
  },
};

export function notificationText(
  notification: Pick<Notification, 'title' | 'body'>,
) {
  const template = templates[notification.title];
  const match = template?.pattern.exec(notification.body);
  const values = match
    ? Object.fromEntries(
        template.fields.map((field, index) => [field, match[index + 1]]),
      )
    : undefined;
  if (values?.method)
    values.method = i18n.t(values.method === 'BKASH' ? 'bKash' : 'Rocket');
  return {
    title: translateMessage(notification.title),
    body:
      template && values
        ? i18n.t(template.key, values)
        : translateMessage(notification.body),
  };
}
