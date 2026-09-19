import React, { useState } from 'react';
import { Linking } from 'react-native';
import { NoorCard, NoorRow } from '../../components/Noor';
import { Notice, Page, Select } from '../../components/ui';
import { useManagement } from '../../context/ManagementContext';
import { useAction } from '../../hooks/useAction';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme';
import { contactUrl } from './parentUtils';
import { InfoRow } from './ParentUI';

export function ParentContactScreen() {
  const { t } = useTranslation();
  const { data, loading, error, refresh } = useManagement();
  const action = useAction();
  const [selectedId, setSelectedId] = useState('');
  const students = data?.students || [];
  const student = students.find(item => item.id === selectedId) || students[0];
  const office = data?.settings.phone || '';
  const whatsapp = data?.settings.whatsappNumber || office;
  const open = (phone: string, kind: 'call' | 'sms' | 'whatsapp') =>
    action.run(() => Linking.openURL(contactUrl(phone, kind)), '');
  return (
    <Page loading={loading} refresh={refresh} error={error}>
      {students.length > 1 ? (
        <Select
          label={t("Student's driver")}
          value={student?.id || ''}
          onChange={setSelectedId}
          options={students.map(item => ({
            value: item.id,
            label: item.studentName,
          }))}
        />
      ) : null}
      <Notice text={action.error} kind="error" />
      <NoorCard>
        <NoorRow
          icon="phone"
          title={t('Call the driver')}
          subtitle={
            student?.driverPhone
              ? `${student.driverName || t('Driver')} · ${student.driverPhone}`
              : t('Driver phone number not added')
          }
          onPress={
            student?.driverPhone && !action.busy
              ? () => open(student.driverPhone!, 'call')
              : undefined
          }
        />
        <NoorRow
          icon="whatsapp"
          title={t('WhatsApp the driver')}
          subtitle={
            student?.driverPhone
              ? t('Write a message on WhatsApp')
              : t('Driver phone number not added')
          }
          onPress={
            student?.driverPhone && !action.busy
              ? () => open(student.driverPhone!, 'whatsapp')
              : undefined
          }
        />
        <NoorRow
          icon="phone"
          title={t('Contact the office')}
          subtitle={office || t('Office phone number not added')}
          onPress={
            office && !action.busy ? () => open(office, 'call') : undefined
          }
        />
        <NoorRow
          icon="sms"
          title={t('Send SMS')}
          subtitle={
            office
              ? t('Message the office')
              : t('Office phone number not added')
          }
          onPress={
            office && !action.busy ? () => open(office, 'sms') : undefined
          }
        />
        <NoorRow
          icon="whatsapp"
          title={t('WhatsApp contact')}
          subtitle={whatsapp || t('WhatsApp number not added')}
          onPress={
            whatsapp && !action.busy
              ? () => open(whatsapp, 'whatsapp')
              : undefined
          }
        />
      </NoorCard>
      {data?.settings.emergencyPhone ? (
        <NoorCard>
          <NoorRow
            icon="bell"
            title={t('Emergency contact')}
            subtitle={data.settings.emergencyPhone}
            color={colors.danger}
            onPress={
              !action.busy
                ? () => open(data.settings.emergencyPhone, 'call')
                : undefined
            }
          />
        </NoorCard>
      ) : null}
      {data?.settings.address ? (
        <NoorCard>
          <InfoRow
            icon="pin"
            label={t('Office')}
            value={data.settings.address}
          />
        </NoorCard>
      ) : null}
    </Page>
  );
}
