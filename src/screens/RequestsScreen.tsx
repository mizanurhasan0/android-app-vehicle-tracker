import React, { useState } from 'react';
import { Button, Notice, Page } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useManagement } from '../context/ManagementContext';
import { useAction } from '../hooks/useAction';
import { useTranslation } from '../i18n';
import { transportShifts } from '../utils/transport';
import {
  RequestSection,
  RequestTab,
  RequestTabs,
} from './requests/RequestLayout';
import { RequestLists } from './requests/RequestLists';
import { ServiceRequestForm } from './requests/ServiceRequestForm';
import { ServiceSupportForm } from './requests/ServiceSupportForm';

export function RequestsScreen({
  section,
  targetId,
}: { section?: RequestTab; targetId?: string } = {}) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { data, loading, error, refresh } = useData();
  const management = useManagement();
  const admin = session!.user.role === 'ADMIN';
  const [tab, setTab] = useState<RequestTab>(
    section || (admin ? 'Applications' : 'Form'),
  );
  const [focusedId, setFocusedId] = useState(targetId);
  const action = useAction();
  const shifts = transportShifts(management.data?.settings);
  return (
    <Page loading={loading} refresh={refresh} error={error}>
      <Notice text={action.error} kind="error" />
      <Notice text={action.success} />
      {focusedId ? (
        <Button
          secondary
          title={t('Show all records')}
          onPress={() => setFocusedId(undefined)}
        />
      ) : null}
      <RequestTabs
        admin={admin}
        section={section}
        tab={tab}
        onChange={selected => {
          action.clearFeedback();
          setTab(selected);
        }}
      />
      {!admin ? (
        <RequestSection label="Form" visible={tab === 'Form'}>
          <ServiceRequestForm action={action} />
          <ServiceSupportForm action={action} />
        </RequestSection>
      ) : null}
      <RequestLists
        data={data}
        admin={admin}
        tab={tab}
        focusedId={focusedId}
        targetId={targetId}
        shifts={shifts}
      />
    </Page>
  );
}
