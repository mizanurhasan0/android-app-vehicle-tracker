import { useTranslation } from '../i18n';
import React, { useState } from 'react';
import { Text } from 'react-native';
import { Button, Card, FadeIn, Field, Notice, Page } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useAction } from '../hooks/useAction';
import { styles } from '../theme';
export function AuthScreen() {
  const { t } = useTranslation();
  const { signIn, baseUrl, setServer, startupError } = useAuth();
  const [register, setRegister] = useState(false);
  const [settings, setSettings] = useState(!baseUrl);
  const [url, setUrl] = useState(baseUrl);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const action = useAction();
  return (
    <Page
      title={t('A calmer school journey.')}
      subtitle={t(
        'Transport, monthly bills and updates. Together in one place.',
      )}
    >
      <FadeIn>
        <Card tinted>
          <Text style={styles.label}>
            {t('Safe journeys, reassured guardians')}
          </Text>
          <Text style={styles.heading}>
            {t('Stay close, wherever they go.')}
          </Text>
          <Text style={styles.body}>
            {t(
              'Follow your assigned vehicle and keep every transport payment in view.',
            )}
          </Text>
        </Card>
      </FadeIn>
      <Notice text={startupError} kind="error" />
      <Notice text={action.success} />
      {settings ? (
        <Card>
          <Text style={styles.heading}>{t('Connect to your school')}</Text>
          <Field
            label={t('Server address')}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="https://tracker.example.com"
          />
          <Notice text={action.error} kind="error" />
          <Button
            title={t('Save server')}
            busy={action.busy}
            onPress={() => {
              action.run(async () => {
                await setServer(url);
                setSettings(false);
              }, 'Server saved. You can now sign in.');
            }}
          />
        </Card>
      ) : (
        <Card>
          <Text style={styles.heading}>
            {register ? t('Create a guardian account') : t('Welcome back')}
          </Text>
          {register ? (
            <Field
              label={t('Your name')}
              value={name}
              onChangeText={setName}
              autoComplete="name"
              maxLength={80}
            />
          ) : null}
          <Field
            label={t('Phone number')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            placeholder="01XXXXXXXXX"
            maxLength={11}
          />
          <Field
            label={t('Password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={register ? 'new-password' : 'current-password'}
            hint={t('At least 8 characters')}
            maxLength={128}
          />
          <Notice text={action.error} kind="error" />
          <Button
            title={register ? t('Create account') : t('Sign in')}
            busy={action.busy}
            onPress={() => {
              action.run(async () => {
                if (!/^01[3-9]\d{8}$/.test(phone.trim()))
                  throw new Error(
                    'Enter a valid 11-digit Bangladesh phone number.',
                  );
                if (password.length < 8)
                  throw new Error('Your password needs at least 8 characters.');
                if (register && name.trim().length < 2)
                  throw new Error('Please enter your name.');
                await signIn(phone, password, register ? name : undefined);
              });
            }}
          />
          <Button
            secondary
            title={
              register
                ? t('Already registered? Sign in')
                : t('New guardian? Create account')
            }
            disabled={action.busy}
            onPress={() => setRegister(!register)}
          />
        </Card>
      )}
      <Button
        secondary
        title={settings ? t('Back to sign in') : t('School server settings')}
        onPress={() => setSettings(!settings)}
      />
    </Page>
  );
}
