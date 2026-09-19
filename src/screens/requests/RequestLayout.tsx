import React from 'react';
import { Keyboard, Pressable, Text, View } from 'react-native';
import { Card } from '../../components/ui';
import {
  RequestIconKind,
  RequestTabIcon,
} from '../../components/RequestTabIcon';
import { useTranslation } from '../../i18n';
import { local } from './styles';

const requestTabs = ['Applications', 'Complaints', 'Stop requests'] as const;
const guardianTabs = ['Form', ...requestTabs] as const;
export type RequestTab = (typeof guardianTabs)[number];
const guardianTabDetails: Record<
  RequestTab,
  { label: string; icon: RequestIconKind }
> = {
  Form: { label: 'Request forms', icon: 'form' },
  Applications: { label: 'My applications', icon: 'applications' },
  Complaints: { label: 'My complaints', icon: 'complaints' },
  'Stop requests': { label: 'Stop requests', icon: 'stop' },
};

export function RequestSection({
  label,
  visible,
  children,
}: React.PropsWithChildren<{
  label: RequestTab;
  visible: boolean;
}>) {
  // Keep form and review drafts mounted when switching tabs.
  return (
    <View
      testID={`request-section-${label}`}
      style={[local.section, !visible && local.hidden]}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
    >
      {children}
    </View>
  );
}

export function RequestCard({
  compact,
  children,
}: React.PropsWithChildren<{ compact: boolean }>) {
  return compact ? (
    <View style={local.card}>{children}</View>
  ) : (
    <Card>{children}</Card>
  );
}

export function RequestTabs({
  admin,
  section,
  tab,
  onChange,
}: {
  admin: boolean;
  section?: RequestTab;
  tab: RequestTab;
  onChange: (tab: RequestTab) => void;
}) {
  const { t } = useTranslation();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={t(
        admin ? 'Service requests' : 'Your transport service',
      )}
      style={local.tabs}
    >
      {(section
        ? admin
          ? [section]
          : (['Form', section] as RequestTab[])
        : admin
        ? requestTabs
        : guardianTabs
      ).map(label => (
        <Pressable
          key={label}
          accessibilityRole="tab"
          accessibilityLabel={t(
            admin ? label : guardianTabDetails[label].label,
          )}
          accessibilityState={{ selected: tab === label }}
          onPress={() => {
            Keyboard.dismiss();
            onChange(label);
          }}
          style={({ pressed }) => [
            local.tab,
            !admin && local.guardianTab,
            tab === label && local.selectedTab,
            pressed && local.pressed,
          ]}
        >
          {!admin ? (
            <RequestTabIcon
              kind={guardianTabDetails[label].icon}
              selected={tab === label}
            />
          ) : null}
          <Text style={[local.tabText, tab === label && local.selectedTabText]}>
            {t(admin ? label : guardianTabDetails[label].label)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
