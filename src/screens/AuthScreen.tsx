import { useTranslation } from '../i18n';
import React, { useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Field, Notice } from '../components/ui';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { CopyrightFooter } from '../components/CopyrightFooter';
import { useAuth } from '../context/AuthContext';
import { useAction } from '../hooks/useAction';
import { colors } from '../theme';

export function AuthScreen() {
  const { t } = useTranslation();
  const { signIn, baseUrl, setServer, startupError } = useAuth();
  const { width } = useWindowDimensions();
  const [register, setRegister] = useState(false);
  const [settings, setSettings] = useState(!baseUrl);
  const [url, setUrl] = useState(baseUrl);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const passwordInput = useRef<TextInput>(null);
  const action = useAction();

  function submit() {
    Keyboard.dismiss();
    action.run(async () => {
      if (!/^01[3-9]\d{8}$/.test(phone.trim()))
        throw new Error('Enter a valid 11-digit Bangladesh phone number.');
      if (password.length < 8)
        throw new Error('Your password needs at least 8 characters.');
      if (register && name.trim().length < 2)
        throw new Error('Please enter your name.');
      await signIn(phone, password, register ? name : undefined);
    });
  }

  return (
    <SafeAreaView style={local.safe}>
      <KeyboardAvoidingView
        style={local.safe}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            local.scroll,
            width < 380 && local.smallScroll,
          ]}
        >
          <View style={local.header}>
            <View style={local.brand}>
              <Text style={local.brandName}>পথসাথী</Text>
              <Text style={local.brandLabel}>PATHSATHI</Text>
            </View>
            <LanguageSwitcher />
          </View>
          <View style={local.main}>
            <View style={[local.card, width < 380 && local.smallCard]}>
              <View style={local.intro}>
                <Text accessibilityRole="header" style={local.title}>
                  {t(
                    settings
                      ? 'Connect to your school'
                      : register
                      ? 'Create a guardian account'
                      : 'Welcome back',
                  )}
                </Text>
                <Text style={local.subtitle}>
                  {t(
                    settings
                      ? 'Enter the server address provided by your school.'
                      : register
                      ? 'Set up your account to get started with school transport.'
                      : 'Sign in to manage your school transport.',
                  )}
                </Text>
              </View>
              <Notice text={startupError} kind="error" />
              <Notice text={action.success} />
              {settings ? (
                <>
                  <Field
                    label={t('Server address')}
                    value={url}
                    onChangeText={setUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    placeholder="https://tracker.example.com"
                    editable={!action.busy}
                  />
                  <Notice text={action.error} kind="error" />
                  <Button
                    title={t('Save server')}
                    busy={action.busy}
                    onPress={() => {
                      Keyboard.dismiss();
                      action.run(async () => {
                        await setServer(url);
                        setSettings(false);
                      }, 'Server saved. You can now sign in.');
                    }}
                  />
                </>
              ) : (
                <>
                  {register ? (
                    <Field
                      label={t('Your name')}
                      value={name}
                      onChangeText={setName}
                      autoComplete="name"
                      autoCapitalize="words"
                      maxLength={80}
                      editable={!action.busy}
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
                    editable={!action.busy}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordInput.current?.focus()}
                  />
                  <View style={local.passwordField}>
                    <View style={local.passwordHeader}>
                      <Text style={local.fieldLabel}>{t('Password')}</Text>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t(
                          showPassword ? 'Hide password' : 'Show password',
                        )}
                        accessibilityState={{ disabled: action.busy }}
                        disabled={action.busy}
                        onPress={() => setShowPassword(!showPassword)}
                        style={({ pressed }) => [
                          local.visibilityButton,
                          (pressed || action.busy) && local.dimmed,
                        ]}
                      >
                        <Text style={local.visibilityText}>
                          {t(showPassword ? 'Hide password' : 'Show password')}
                        </Text>
                      </Pressable>
                    </View>
                    <TextInput
                      ref={passwordInput}
                      accessibilityLabel={t('Password')}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      spellCheck={false}
                      autoComplete={
                        register ? 'new-password' : 'current-password'
                      }
                      maxLength={128}
                      editable={!action.busy}
                      returnKeyType="go"
                      onSubmitEditing={submit}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      style={[
                        local.passwordInput,
                        passwordFocused && local.focusedInput,
                      ]}
                    />
                    {register ? (
                      <Text style={local.hint}>
                        {t('At least 8 characters')}
                      </Text>
                    ) : null}
                  </View>
                  <Notice text={action.error} kind="error" />
                  <View style={local.submit}>
                    <Button
                      title={register ? t('Create account') : t('Sign in')}
                      busy={action.busy}
                      onPress={submit}
                    />
                  </View>
                  <View style={local.accountFooter}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ disabled: action.busy }}
                      disabled={action.busy}
                      onPress={() => {
                        setRegister(!register);
                        setShowPassword(false);
                      }}
                      style={({ pressed }) => [
                        local.textButton,
                        (pressed || action.busy) && local.dimmed,
                      ]}
                    >
                      <Text style={local.accountLink}>
                        {t(
                          register
                            ? 'Already registered? Sign in'
                            : 'New guardian? Create account',
                        )}
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: action.busy }}
              disabled={action.busy}
              onPress={() => {
                Keyboard.dismiss();
                setSettings(!settings);
                setShowPassword(false);
              }}
              style={({ pressed }) => [
                local.textButton,
                (pressed || action.busy) && local.dimmed,
              ]}
            >
              <Text style={local.settingsLink}>
                {t(settings ? 'Back to sign in' : 'School server settings')}
              </Text>
            </Pressable>
          </View>
          <Text style={local.tagline}>{t('A calmer school journey.')}</Text>
          <CopyrightFooter />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const local = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  smallScroll: { paddingHorizontal: 16 },
  header: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  brand: { gap: 2 },
  brandName: {
    color: colors.primary,
    fontSize: 24,
    lineHeight: 34,
    fontWeight: '700',
  },
  brandLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },
  main: {
    flexGrow: 1,
    justifyContent: 'center',
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    paddingVertical: 28,
    gap: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 24,
    padding: 24,
    gap: 16,
  },
  smallCard: { padding: 20 },
  intro: { gap: 8, marginBottom: 8 },
  title: { color: colors.ink, fontSize: 28, lineHeight: 38, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  passwordField: { gap: 7 },
  passwordHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 12,
  },
  fieldLabel: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  visibilityButton: { minHeight: 44, justifyContent: 'center' },
  visibilityText: {
    color: colors.primary,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
  },
  passwordInput: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.ink,
    backgroundColor: '#FAFCFA',
    fontSize: 16,
  },
  focusedInput: { borderColor: colors.primary },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  submit: { marginTop: 4 },
  accountFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 8,
  },
  textButton: {
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountLink: {
    color: colors.primary,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  settingsLink: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
  },
  tagline: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 21,
    textAlign: 'center',
  },
  dimmed: { opacity: 0.6 },
});
