import { TransportScheduleSummary } from '../../components/TransportSchedule';
import { serviceShift, transportShifts } from '../../utils/transport';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { ServiceRequest } from '../../api/types';
import { NoorCard, NoorIcon } from '../../components/Noor';
import { Button, Empty, Page, Select } from '../../components/ui';
import { useData } from '../../context/DataContext';
import { useManagement } from '../../context/ManagementContext';
import { useTranslation } from '../../i18n';
import { styles } from '../../theme';
import { dateLabel } from '../../utils/format';
import { parent, StudentAvatar, TimelineItem } from './ParentUI';
import { Props } from './types';
import { local } from './screenStyles';

type Application = ServiceRequest & {
  createdAt?: string;
  reviewedAt?: string | null;
  className?: string;
  roll?: string;
  photoUrl?: string;
};

export function ApplicationStatusScreen({
  navigation,
  route,
}: Props<'ApplicationStatus'>) {
  const { t } = useTranslation();
  const management = useManagement();
  const shifts = transportShifts(management.data?.settings);
  const { data, loading, error, refresh } = useData();
  const [selectedId, setSelectedId] = useState(route.params?.id || '');
  const requests: Application[] = data.requests;
  const request =
    requests.find(item => item.id === selectedId) ||
    (!selectedId ? requests[0] : undefined);
  const approved = request?.status === 'APPROVED';
  const rejected = request?.status === 'REJECTED';
  return (
    <Page loading={loading} refresh={refresh} error={error}>
      {requests.length > 1 ? (
        <Select
          label={t('Select application')}
          value={request?.id || ''}
          onChange={setSelectedId}
          options={requests.map(item => ({
            value: item.id,
            label: `${item.studentName} · ${t(
              shifts.find(shift => shift.id === serviceShift(item))?.name ||
                serviceShift(item),
            )}`,
          }))}
        />
      ) : null}
      {!request ? (
        <>
          <Empty
            title={t('Application not found')}
            detail={t('Apply for transport service or refresh the list.')}
          />
          <Button
            title={t('New admission application')}
            onPress={() => navigation.navigate('Admission')}
          />
        </>
      ) : (
        <>
          <View style={parent.successPanel}>
            <View style={[parent.successIcon, rejected && local.rejected]}>
              <NoorIcon
                name={rejected ? 'close' : approved ? 'check' : 'document'}
                size={33}
                color="#FFFFFF"
              />
            </View>
            <Text style={[styles.heading, parent.center]}>
              {approved
                ? t('Application approved')
                : rejected
                ? t('Application not approved')
                : t('Application submitted')}
            </Text>
            <Text style={[styles.muted, parent.center]}>
              {approved
                ? t("Your child's transport service has been approved.")
                : rejected
                ? t('See the admin decision and reason below.')
                : t(
                    'The admin will review your application. You will be notified of the decision.',
                  )}
            </Text>
          </View>
          <NoorCard>
            <View style={parent.identity}>
              <StudentAvatar
                name={request.studentName}
                photoUrl={request.photoUrl}
              />
              <View style={parent.grow}>
                <Text style={styles.heading}>{request.studentName}</Text>
                <TransportScheduleSummary service={request} shifts={shifts} />
                <Text style={styles.muted}>
                  {request.routeName} · {request.vehicleName}
                </Text>
              </View>
            </View>
            <View style={parent.divider} />
            <TimelineItem
              icon="check"
              title={t('Application submission')}
              active
              detail={
                request.createdAt ? dateLabel(request.createdAt) : undefined
              }
            />
            <TimelineItem
              icon="document"
              title={
                approved || rejected
                  ? t('Review completed')
                  : t('Awaiting review')
              }
              active={approved || rejected}
              detail={
                request.reviewedAt ? dateLabel(request.reviewedAt) : undefined
              }
            />
            <TimelineItem
              icon={rejected ? 'close' : 'check'}
              title={
                approved
                  ? t('Approved')
                  : rejected
                  ? t('Rejected')
                  : t('Awaiting decision')
              }
              active={approved}
              last
            >
              {request.note ? (
                <View
                  style={[local.reviewNote, rejected && local.reviewNoteError]}
                >
                  <Text
                    accessibilityLiveRegion="polite"
                    style={[styles.body, rejected && local.reviewNoteErrorText]}
                  >
                    {request.note}
                  </Text>
                </View>
              ) : null}
            </TimelineItem>
          </NoorCard>
          {approved ? (
            <Button
              title={t('Student profile')}
              onPress={() => navigation.navigate('ParentProfile')}
            />
          ) : null}
          <Button
            secondary
            title={t('Go back')}
            onPress={() =>
              navigation.canGoBack()
                ? navigation.goBack()
                : navigation.navigate('Fleet')
            }
          />
        </>
      )}
    </Page>
  );
}
