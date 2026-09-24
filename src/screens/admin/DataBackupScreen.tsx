import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import {
  BackupStatus,
  DataSet,
  ExportFormat,
  ImportPreview,
  ImportResult,
  confirmDataImport,
  getBackupStatus,
  pickDataImport,
  previewDataImport,
  saveDataExport,
  shareDataExport,
  startBackup,
} from '../../api/dataTransfer';
import { ApiError } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import {
  AdminPage,
  Box,
  Detail,
  Heading,
  Pill,
  SmallButton,
  Tabs,
  s,
} from './AdminUi';

type Task =
  | 'save-csv'
  | 'save-xlsx'
  | 'share-csv'
  | 'share-xlsx'
  | 'preview'
  | 'confirm'
  | 'backup';

export function DataBackupScreen() {
  const { t } = useTranslation();
  const { baseUrl, session, expire } = useAuth();
  const token = session?.token;
  const [task, setTask] = useState<Task>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [backup, setBackup] = useState<BackupStatus | null>(null);
  const [dataset, setDataset] = useState<DataSet>('vehicles');

  const handleError = useCallback(
    async (problem: unknown) => {
      if (problem instanceof ApiError && problem.status === 401) await expire();
      setError(
        problem instanceof Error
          ? problem.message
          : 'Something went wrong. Please try again.',
      );
    },
    [expire],
  );

  const run = useCallback(
    async (nextTask: Task, operation: () => Promise<void>) => {
      if (!token || task) return;
      setTask(nextTask);
      setError('');
      setNotice('');
      try {
        await operation();
      } catch (problem) {
        await handleError(problem);
      } finally {
        setTask(undefined);
      }
    },
    [handleError, task, token],
  );

  const refreshBackup = useCallback(async () => {
    if (!token) return;
    try {
      setBackup(await getBackupStatus(baseUrl, token));
    } catch (problem) {
      await handleError(problem);
    }
  }, [baseUrl, token, handleError]);

  useEffect(() => {
    refreshBackup();
  }, [refreshBackup]);

  useEffect(() => {
    if (!backup?.running) return;
    const timer = setTimeout(refreshBackup, 5000);
    return () => clearTimeout(timer);
  }, [backup?.running, refreshBackup]);

  const exportFile = (format: ExportFormat, share: boolean) =>
    run(`${share ? 'share' : 'save'}-${format}` as Task, async () => {
      const completed = await (share ? shareDataExport : saveDataExport)(
        baseUrl,
        token!,
        dataset,
        format,
      );
      if (completed)
        setNotice(share ? 'Export opened for sharing.' : 'Export saved.');
    });

  const selectImport = () =>
    run('preview', async () => {
      setPreview(null);
      setResult(null);
      const file = await pickDataImport();
      if (!file) return;
      if (!/\.(csv|xlsx)$/i.test(file.name))
        throw new Error('Choose a CSV or XLSX file.');
      if (file.size && file.size > 512 * 1024)
        throw new Error('The import file must be 512 KB or smaller.');
      setPreview(await previewDataImport(baseUrl, token!, dataset, file));
    });

  const confirmImport = () => {
    if (!preview) return;
    Alert.alert(
      t('Confirm import'),
      t('Validated rows will be added or updated. Continue?'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Import'),
          onPress: () =>
            run('confirm', async () => {
              const imported = await confirmDataImport(
                baseUrl,
                token!,
                preview.previewToken,
              );
              setResult(imported);
              setPreview(null);
              setNotice('Import completed.');
            }),
        },
      ],
    );
  };

  const createBackup = () =>
    run('backup', async () => {
      setBackup(await startBackup(baseUrl, token!));
      setNotice('Backup started. You may leave this screen.');
    });

  return (
    <AdminPage error={error} refresh={refreshBackup}>
      {notice ? <Text style={s.note}>{t(notice)}</Text> : null}

      <Box>
        <Heading title={t('Export data')} />
        <Text style={s.muted}>
          {t('Download or share a copy of your business data.')}
        </Text>
        <Tabs
          value={dataset}
          options={[
            { value: 'vehicles', label: 'Vehicles' },
            { value: 'routes', label: 'Routes' },
            { value: 'stops', label: 'Stops' },
            { value: 'drivers', label: 'Drivers' },
          ]}
          onChange={value => {
            setDataset(value as DataSet);
            setPreview(null);
            setResult(null);
          }}
        />
        <View style={s.row}>
          <View style={s.flex}>
            <SmallButton
              title="Save CSV"
              secondary
              busy={task === 'save-csv'}
              disabled={!!task}
              onPress={() => exportFile('csv', false)}
            />
          </View>
          <View style={s.flex}>
            <SmallButton
              title="Share CSV"
              secondary
              busy={task === 'share-csv'}
              disabled={!!task}
              onPress={() => exportFile('csv', true)}
            />
          </View>
        </View>
        <View style={s.row}>
          <View style={s.flex}>
            <SmallButton
              title="Save Excel"
              busy={task === 'save-xlsx'}
              disabled={!!task}
              onPress={() => exportFile('xlsx', false)}
            />
          </View>
          <View style={s.flex}>
            <SmallButton
              title="Share Excel"
              busy={task === 'share-xlsx'}
              disabled={!!task}
              onPress={() => exportFile('xlsx', true)}
            />
          </View>
        </View>
      </Box>

      <Box>
        <Heading title={t('Import data')} />
        <Text style={s.muted}>
          {t(
            'Choose a CSV or XLSX file. Nothing changes until you confirm the preview.',
          )}
        </Text>
        <SmallButton
          title="Choose file and preview"
          secondary
          busy={task === 'preview'}
          disabled={!!task}
          onPress={selectImport}
        />
        {preview ? (
          <View style={s.stack}>
            <Text style={s.title}>{t('Import preview')}</Text>
            <Detail label="Dataset" value={t(preview.dataset)} />
            <Detail
              label="Rows"
              value={t('{{number}} rows', { number: preview.rowCount })}
            />
            {preview.sample.length ? (
              <Text style={s.muted}>
                {t('First row: {{row}}', {
                  row: Object.values(preview.sample[0]).join(' · '),
                })}
              </Text>
            ) : null}
            <Text style={s.muted}>
              {t('Preview expires at {{time}}', {
                time: new Date(preview.expiresAt).toLocaleString(),
              })}
            </Text>
            <SmallButton
              title="Confirm import"
              busy={task === 'confirm'}
              disabled={!!task}
              onPress={confirmImport}
            />
          </View>
        ) : null}
        {result ? (
          <View style={s.stack}>
            <Text style={s.title}>{t('Imported records')}</Text>
            <Detail label={result.dataset} value={result.imported} />
          </View>
        ) : null}
      </Box>

      <Box>
        <Heading title={t('Google Drive backup')} />
        <Text style={s.muted}>
          {t(
            'The encrypted database backup is uploaded by the server. Secrets never enter this app.',
          )}
        </Text>
        {backup ? (
          <View style={s.stack}>
            <Pill
              value={
                backup.running
                  ? 'RUNNING'
                  : backup.lastError
                  ? 'FAILED'
                  : backup.lastCompletedAt
                  ? 'COMPLETED'
                  : backup.enabled
                  ? 'READY'
                  : 'DISABLED'
              }
            />
            {backup.lastStartedAt ? (
              <Detail
                label="Started"
                value={new Date(backup.lastStartedAt).toLocaleString()}
              />
            ) : null}
            {backup.lastCompletedAt ? (
              <Detail
                label="Completed"
                value={new Date(backup.lastCompletedAt).toLocaleString()}
              />
            ) : null}
            {backup.lastFileName ? (
              <Detail label="Drive file" value={backup.lastFileName} />
            ) : null}
            {backup.lastError ? (
              <Text style={s.red}>{backup.lastError}</Text>
            ) : null}
          </View>
        ) : (
          <Text style={s.muted}>{t('No backup has run yet.')}</Text>
        )}
        <SmallButton
          title="Back up now"
          busy={task === 'backup' || backup?.running}
          disabled={!!task || backup?.running || backup?.enabled === false}
          onPress={createBackup}
        />
      </Box>
    </AdminPage>
  );
}
