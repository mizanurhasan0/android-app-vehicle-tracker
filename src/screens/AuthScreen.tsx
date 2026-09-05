import React, { useState } from 'react';
import { Text } from 'react-native';
import { Button, Card, FadeIn, Field, Notice, Page } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useAction } from '../hooks/useAction';
import { styles } from '../theme';
export function AuthScreen() {
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
      title="A calmer school journey."
      subtitle="Transport, monthly bills and updates. Together in one place."
    >
      <FadeIn>
        <Card tinted>
          <Text style={styles.label}>নিরাপদ যাত্রা, নিশ্চিন্ত অভিভাবক</Text>
          <Text style={styles.heading}>Stay close, wherever they go.</Text>
          <Text style={styles.body}>
            Follow your assigned vehicle and keep every transport payment in
            view.
          </Text>
        </Card>
      </FadeIn>
      <Notice text={startupError} kind="error" />
      <Notice text={action.success} />
      {settings ? (
        <Card>
          <Text style={styles.heading}>Connect to your school</Text>
          <Field
            label="Server address"
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="https://tracker.example.com"
          />
          <Notice text={action.error} kind="error" />
          <Button
            title="Save server"
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
            {register ? 'Create a guardian account' : 'Welcome back'}
          </Text>
          {register ? (
            <Field
              label="Your name"
              value={name}
              onChangeText={setName}
              autoComplete="name"
              maxLength={80}
            />
          ) : null}
          <Field
            label="Phone number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoComplete="tel"
            placeholder="01XXXXXXXXX"
            maxLength={11}
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={register ? 'new-password' : 'current-password'}
            hint="At least 8 characters"
            maxLength={128}
          />
          <Notice text={action.error} kind="error" />
          <Button
            title={register ? 'Create account' : 'Sign in'}
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
                ? 'Already registered? Sign in'
                : 'New guardian? Create account'
            }
            disabled={action.busy}
            onPress={() => setRegister(!register)}
          />
        </Card>
      )}
      <Button
        secondary
        title={settings ? 'Back to sign in' : 'School server settings'}
        onPress={() => setSettings(!settings)}
      />
    </Page>
  );
}
