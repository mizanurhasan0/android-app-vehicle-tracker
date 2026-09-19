import React from 'react';
import { Text, View } from 'react-native';
import { DashboardData } from '../../api/types';
import { TransportShift } from '../../api/management';
import { Badge, Empty } from '../../components/ui';
import { ReviewActions } from '../../components/ReviewActions';
import { TransportScheduleSummary } from '../../components/TransportSchedule';
import { useTranslation } from '../../i18n';
import { money, readable } from '../../utils/format';
import { styles } from '../../theme';
import { RequestCard, RequestSection, RequestTab } from './RequestLayout';
import { CallGuardian, RequestActions } from './RequestReview';
import { local } from './styles';

export function RequestLists({
  data,
  admin,
  tab,
  focusedId,
  targetId,
  shifts,
}: {
  data: DashboardData;
  admin: boolean;
  tab: RequestTab;
  focusedId?: string;
  targetId?: string;
  shifts: TransportShift[];
}) {
  const { t } = useTranslation();
  const requests = data.requests.filter(
    item => !focusedId || item.id === focusedId,
  );
  const complaints = data.complaints.filter(
    item => !focusedId || item.id === focusedId,
  );
  const stops = data.stops.filter(item => !focusedId || item.id === focusedId);
  return (
    <>
      <RequestSection label="Applications" visible={tab === 'Applications'}>
        {!requests.length ? (
          <Empty
            title={t('No applications yet')}
            detail={t(
              'Submitted service requests will appear here with their status.',
            )}
          />
        ) : (
          requests.map(request => (
            <RequestCard key={request.id} compact={admin}>
              <View style={admin ? local.cardHeader : styles.between}>
                <Text style={admin ? local.cardTitle : styles.heading}>
                  {request.studentName}
                </Text>
                <TransportScheduleSummary service={request} shifts={shifts} />
                <Badge status={request.status} />
              </View>
              <Text style={admin ? local.body : styles.body}>
                {request.routeName} · {request.stopName}
                {request.dropoffStopName ? ` → ${request.dropoffStopName}` : ''}
              </Text>
              <Text style={styles.muted}>
                {request.vehicleName}
                {admin ? ` · ${request.guardianName}` : ''}
              </Text>
              {request.monthlyAmount !== undefined ? (
                <Text style={styles.muted}>
                  {t('Monthly fare')}: {money(request.monthlyAmount)}
                </Text>
              ) : null}
              {request.note ? (
                <Text style={admin ? local.body : styles.body}>
                  {t('Admin note: ')}
                  {request.note}
                </Text>
              ) : null}
              {admin && request.status === 'PENDING' ? (
                <RequestActions
                  label={request.studentName}
                  initiallyExpanded={request.id === targetId}
                >
                  <CallGuardian id={request.id} phone={request.guardianPhone} />
                  <ReviewActions
                    path={`/admin/requests/${request.id}/decision`}
                    confirmation={t(
                      'Approve the selected route and stop? The guardian will gain tracking access to the assigned vehicle.',
                    )}
                  />
                </RequestActions>
              ) : null}
            </RequestCard>
          ))
        )}
      </RequestSection>
      <RequestSection label="Complaints" visible={tab === 'Complaints'}>
        {!complaints.length ? (
          <Text style={styles.muted}>{t('No complaints to show.')}</Text>
        ) : (
          complaints.map(complaint => (
            <RequestCard key={complaint.id} compact={admin}>
              <View style={admin ? local.cardHeader : styles.between}>
                <Text style={admin ? local.cardTitle : styles.heading}>
                  {readable(complaint.category)}
                </Text>
                <Badge status={complaint.status} />
              </View>
              <Text style={styles.muted}>
                {complaint.studentName}
                {admin ? ` · ${complaint.guardianName}` : ''}
              </Text>
              <Text style={admin ? local.body : styles.body}>
                {complaint.description}
              </Text>
              {complaint.note ? (
                <Text style={admin ? local.body : styles.body}>
                  {t('Admin note: ')}
                  {complaint.note}
                </Text>
              ) : null}
              {admin && complaint.status === 'OPEN' ? (
                <RequestActions
                  initiallyExpanded={complaint.id === targetId}
                  label={`${complaint.studentName} · ${readable(
                    complaint.category,
                  )}`}
                >
                  <ReviewActions
                    resolve
                    path={`/admin/complaints/${complaint.id}`}
                    confirmation={t(
                      'Mark this complaint as resolved and notify the guardian?',
                    )}
                  />
                </RequestActions>
              ) : null}
            </RequestCard>
          ))
        )}
      </RequestSection>
      <RequestSection label="Stop requests" visible={tab === 'Stop requests'}>
        {!stops.length ? (
          <Text style={styles.muted}>{t('No stop requests to show.')}</Text>
        ) : (
          stops.map(stop => (
            <RequestCard key={stop.id} compact={admin}>
              <View style={admin ? local.cardHeader : styles.between}>
                <Text style={admin ? local.cardTitle : styles.heading}>
                  {stop.studentName}
                </Text>
                <Badge status={stop.status} />
              </View>
              <Text style={admin ? local.body : styles.body}>
                {stop.reason}
              </Text>
              {stop.note ? (
                <Text style={admin ? local.body : styles.body}>
                  {t('Admin note: ')}
                  {stop.note}
                </Text>
              ) : null}
              {admin && stop.status === 'PENDING' ? (
                <RequestActions
                  initiallyExpanded={stop.id === targetId}
                  label={`${t('Stop requests')} · ${stop.studentName}`}
                >
                  <ReviewActions
                    path={`/admin/stop-requests/${stop.id}/decision`}
                    confirmation={t(
                      'Stop this service now? Tracking access will end, and existing bills will remain in payment history.',
                    )}
                  />
                </RequestActions>
              ) : null}
            </RequestCard>
          ))
        )}
      </RequestSection>
    </>
  );
}
