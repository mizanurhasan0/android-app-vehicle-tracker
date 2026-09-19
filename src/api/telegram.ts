import { api } from './client';
import {
  TelegramConnectResponse,
  TelegramDelivery,
  TelegramStatus,
} from './types';

/** Telegram endpoints are kept here so screens do not need to know URL details. */
export function connectTelegram(
  baseUrl: string,
  token: string,
): Promise<TelegramConnectResponse> {
  // The API intentionally uses GET because this only issues a short-lived link.
  return api<TelegramConnectResponse>(baseUrl, '/telegram/connect', token);
}

export function getTelegramStatus(
  baseUrl: string,
  token: string,
): Promise<TelegramStatus> {
  return api<TelegramStatus>(baseUrl, '/telegram/status', token);
}

export function disconnectTelegram(
  baseUrl: string,
  token: string,
): Promise<void> {
  return api<void>(baseUrl, '/telegram', token, undefined, 'DELETE');
}

/** Admin-only delivery audit endpoint. */
export function listTelegramDeliveries(
  baseUrl: string,
  token: string,
): Promise<TelegramDelivery[]> {
  return api<TelegramDelivery[]>(
    baseUrl,
    '/notifications/admin/telegram-deliveries',
    token,
  );
}
