import { NativeModules, Platform } from 'react-native';
import { ApiError } from './client';

export type ExportFormat = 'csv' | 'xlsx';
export type DataSet = 'vehicles' | 'routes' | 'stops' | 'drivers';

export interface PickedDataFile {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
  contentBase64: string;
}

export interface ImportPreview {
  previewToken: string;
  expiresAt: string;
  dataset: DataSet;
  rowCount: number;
  sample: Record<string, string>[];
}

export interface ImportResult {
  dataset: DataSet;
  imported: number;
}

export interface BackupStatus {
  enabled: boolean;
  scheduleEnabled: boolean;
  running: boolean;
  lastStartedAt?: string;
  lastCompletedAt?: string;
  lastFileName?: string;
  lastSizeBytes?: number;
  lastDriveFileId?: string;
  lastError?: string;
}

const mimeTypes: Record<ExportFormat, string> = {
  csv: 'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

async function request(
  baseUrl: string,
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
        ...init.headers,
      },
    });
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new ApiError(
        response.status >= 500
          ? 'The server could not complete this request. Please try again shortly.'
          : typeof data?.message === 'string'
          ? data.message
          : 'Something went wrong. Please try again.',
        response.status,
      );
    }
    return response;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error(
      'Cannot reach the server. Check your connection and server address, then try again.',
    );
  } finally {
    clearTimeout(timer);
  }
}

function bytesToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const alphabet =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let result = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const a = bytes[index];
    const hasB = index + 1 < bytes.length;
    const hasC = index + 2 < bytes.length;
    const b = hasB ? bytes[index + 1] : 0;
    const c = hasC ? bytes[index + 2] : 0;
    result += alphabet[Math.floor(a / 4)];
    result += alphabet[(a % 4) * 16 + Math.floor(b / 16)];
    result += hasB ? alphabet[(b % 16) * 4 + Math.floor(c / 64)] : '=';
    result += hasC ? alphabet[c % 64] : '=';
  }
  return result;
}

async function exportPayload(
  baseUrl: string,
  token: string,
  dataset: DataSet,
  format: ExportFormat,
) {
  const response = await request(
    baseUrl,
    `/admin/data-transfer/export?dataset=${dataset}&format=${format}`,
    token,
  );
  return {
    filename: `${dataset}-${new Date().toISOString().slice(0, 10)}.${format}`,
    mimeType: mimeTypes[format],
    base64: bytesToBase64(await response.arrayBuffer()),
  };
}

function requireAndroidMedia() {
  if (Platform.OS !== 'android' || !NativeModules.NoorMedia)
    throw new Error('Use the updated Android app for data files.');
  return NativeModules.NoorMedia;
}

export async function saveDataExport(
  baseUrl: string,
  token: string,
  dataset: DataSet,
  format: ExportFormat,
): Promise<boolean> {
  const payload = await exportPayload(baseUrl, token, dataset, format);
  const media = requireAndroidMedia();
  if (!media.saveBase64Document)
    throw new Error('Use the updated Android app to save data files.');
  return media.saveBase64Document(
    payload.filename,
    payload.base64,
    payload.mimeType,
  );
}

export async function shareDataExport(
  baseUrl: string,
  token: string,
  dataset: DataSet,
  format: ExportFormat,
): Promise<boolean> {
  const payload = await exportPayload(baseUrl, token, dataset, format);
  const media = requireAndroidMedia();
  if (!media.shareBase64Document)
    throw new Error('Use the updated Android app to share data files.');
  return media.shareBase64Document(
    payload.filename,
    payload.base64,
    payload.mimeType,
  );
}

export async function pickDataImport(): Promise<PickedDataFile | null> {
  const media = requireAndroidMedia();
  if (!media.pickDataFile)
    throw new Error('Use the updated Android app to select data files.');
  return media.pickDataFile();
}

export async function previewDataImport(
  baseUrl: string,
  token: string,
  dataset: DataSet,
  file: PickedDataFile,
): Promise<ImportPreview> {
  const format: ExportFormat = /\.xlsx$/i.test(file.name) ? 'xlsx' : 'csv';
  const response = await request(
    baseUrl,
    '/admin/data-transfer/import/preview',
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataset,
        format,
        contentBase64: file.contentBase64,
        filename: file.name,
      }),
    },
  );
  return response.json();
}

export async function confirmDataImport(
  baseUrl: string,
  token: string,
  previewToken: string,
): Promise<ImportResult> {
  const response = await request(
    baseUrl,
    '/admin/data-transfer/import/confirm',
    token,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ previewToken }),
    },
  );
  return response.json();
}

export async function startBackup(
  baseUrl: string,
  token: string,
): Promise<BackupStatus> {
  const response = await request(baseUrl, '/admin/backups', token, {
    method: 'POST',
  });
  return response.json();
}

export async function getBackupStatus(
  baseUrl: string,
  token: string,
): Promise<BackupStatus | null> {
  const response = await request(baseUrl, '/admin/backups/status', token);
  return response.json();
}
