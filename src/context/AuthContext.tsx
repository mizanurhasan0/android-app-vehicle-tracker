import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import { api, ApiError, normalizeServerUrl } from '../api/client';
import { Session, User } from '../api/types';
import { DEFAULT_SERVER_URL, restoredServerUrl } from '../api/server';
const credentialOptions = { service: 'transport.session' };
interface AuthValue {
  session: Session | null;
  ready: boolean;
  baseUrl: string;
  startupError: string;
  signIn: (phone: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
  expire: () => Promise<void>;
  setServer: (url: string) => Promise<void>;
}
const AuthContext = createContext<AuthValue | null>(null);
export function AuthProvider({ children }: React.PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [startupError, setStartupError] = useState('');
  const [baseUrl, setBaseUrl] = useState(DEFAULT_SERVER_URL);
  useEffect(() => {
    let mounted = true;
    async function restore() {
      try {
        const savedUrl = await AsyncStorage.getItem('transport.server');
        const migrated = await AsyncStorage.getItem('transport.server.vps-v1');
        const url = restoredServerUrl(savedUrl, migrated === '1');
        if (!savedUrl || url !== new URL(savedUrl.trim()).origin) {
          // Never send a session belonging to the old server to the new server.
          await Keychain.resetGenericPassword(credentialOptions);
        }
        await AsyncStorage.setItem('transport.server', url);
        await AsyncStorage.setItem('transport.server.vps-v1', '1');
        if (mounted) setBaseUrl(url);
        const credentials = await Keychain.getGenericPassword(
          credentialOptions,
        );
        if (credentials && url) {
          const saved: Session = JSON.parse(credentials.password);
          const user = await api<User>(url, '/auth/me', saved.token);
          if (mounted) setSession({ ...saved, user });
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401)
          await Keychain.resetGenericPassword(credentialOptions);
        if (mounted)
          setStartupError(
            error instanceof Error ? error.message : 'Please sign in again.',
          );
      } finally {
        if (mounted) setReady(true);
      }
    }
    restore().catch(() => {
      if (mounted) setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);
  const expire = useCallback(async () => {
    setSession(null);
    await Keychain.resetGenericPassword(credentialOptions);
  }, []);
  const signOut = useCallback(async () => {
    if (session)
      await api<void>(
        baseUrl,
        '/auth/logout',
        session.token,
        undefined,
        'POST',
      );
    await expire();
  }, [baseUrl, session, expire]);
  const signIn = useCallback(
    async (phone: string, password: string, name?: string) => {
      if (!baseUrl) throw new Error('Configure your server address first.');
      const result = await api<Session>(
        baseUrl,
        name ? '/auth/register' : '/auth/login',
        undefined,
        {
          phone: phone.trim(),
          password,
          ...(name ? { name: name.trim() } : {}),
        },
        'POST',
      );
      await Keychain.setGenericPassword(
        'session',
        JSON.stringify(result),
        credentialOptions,
      );
      setStartupError('');
      setSession(result);
    },
    [baseUrl],
  );
  const setServer = useCallback(
    async (url: string) => {
      const normalized = normalizeServerUrl(url);
      await AsyncStorage.setItem('transport.server', normalized);
      await expire();
      setBaseUrl(normalized);
    },
    [expire],
  );
  return (
    <AuthContext.Provider
      value={{
        session,
        ready,
        baseUrl,
        startupError,
        signIn,
        signOut,
        expire,
        setServer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('AuthProvider is required');
  return value;
}
