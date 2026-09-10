import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Field, Notice } from '../components/ui';
import { AppIcon } from '../components/AppIcon';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { CopyrightFooter } from '../components/CopyrightFooter';
import { useAuth } from '../context/AuthContext';
import { useAction } from '../hooks/useAction';
import { useTranslation } from '../i18n';
import { normalizeDigits } from '../utils/format';
import { colors } from '../theme';

export function AuthScreen() {
  const { t } = useTranslation();
  const { signIn, baseUrl, setServer, startupError } = useAuth();

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
        <Image
          source={require('../../assets/branding/login-transport.png')}
          style={local.background}
          resizeMode="cover"
          accessible={false}
        />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={local.scroll}
        >
          <View style={local.topbar}>
            <LanguageSwitcher />
          </View>
          <View style={local.brand}>
            <View style={local.wordmark}>
              <Text style={local.brandName}>
                পথ<Text style={local.brandAccent}>সাথী</Text>
              </Text>
              <View style={local.brandIcon}>
                <AppIcon kind="vehicles" size={37} />
              </View>
            </View>
            <Text style={local.brandLabel}>PATHSATHI</Text>
          </View>
          <View style={local.main}>
            <Notice text={startupError} kind="error" />
            <Notice text={action.success} />
            {settings ? (
              <View style={local.settingsCard}>
                <Text accessibilityRole="header" style={local.title}>
                  {t('Connect to your school')}
                </Text>
                <Text style={local.subtitle}>
                  {t('Enter the server address provided by your school.')}
                </Text>
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
              </View>
            ) : (
              <>
                {register ? (
                  <Text accessibilityRole="header" style={local.title}>
                    {t('Create a guardian account')}
                  </Text>
                ) : null}
                {register ? (
                  <View style={local.inputRow}>
                    <AppIcon kind="students" size={20} color={colors.muted} />
                    <TextInput
                      accessibilityLabel={t('Your name')}
                      placeholder={t('Your name')}
                      placeholderTextColor={colors.muted}
                      value={name}
                      onChangeText={setName}
                      autoComplete="name"
                      autoCapitalize="words"
                      maxLength={80}
                      editable={!action.busy}
                      style={local.input}
                    />
                  </View>
                ) : null}
                <View style={local.inputRow}>
                  <AppIcon kind="user" size={20} color={colors.muted} />
                  <TextInput
                    accessibilityLabel={t('Phone number')}
                    placeholder={t('Phone number')}
                    placeholderTextColor={colors.muted}
                    value={phone}
                    onChangeText={value => setPhone(normalizeDigits(value))}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    maxLength={11}
                    editable={!action.busy}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordInput.current?.focus()}
                    style={local.input}
                  />
                </View>
                <View style={local.passwordGroup}>
                  <View
                    style={[
                      local.inputRow,
                      passwordFocused && local.focusedInput,
                    ]}
                  >
                    <AppIcon kind="lock" size={20} color={colors.muted} />
                    <TextInput
                      ref={passwordInput}
                      accessibilityLabel={t('Password')}
                      placeholder={t('Password')}
                      placeholderTextColor={colors.muted}
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
                      style={local.input}
                    />
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t(
                        showPassword ? 'Hide password' : 'Show password',
                      )}
                      accessibilityState={{
                        disabled: action.busy,
                        selected: showPassword,
                      }}
                      disabled={action.busy}
                      onPress={() => setShowPassword(!showPassword)}
                      style={local.visibilityButton}
                    >
                      <AppIcon
                        kind="eye"
                        size={18}
                        color={showPassword ? colors.primary : colors.muted}
                      />
                    </Pressable>
                  </View>
                  {register ? (
                    <Text style={local.hint}>{t('At least 8 characters')}</Text>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      disabled={action.busy}
                      onPress={() =>
                        Alert.alert(
                          t('Forgot password?'),
                          t(
                            'Contact your school administrator to reset your account password.',
                          ),
                        )
                      }
                      style={local.forgotButton}
                    >
                      <Text style={local.forgotText}>
                        {t('Forgot password?')}
                      </Text>
                    </Pressable>
                  )}
                </View>
                <Notice text={action.error} kind="error" />
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{
                    disabled: action.busy,
                    busy: action.busy,
                  }}
                  disabled={action.busy}
                  onPress={submit}
                  style={({ pressed }) => [
                    local.loginButton,
                    (pressed || action.busy) && local.dimmed,
                  ]}
                >
                  {action.busy ? (
                    <ActivityIndicator color={colors.surface} />
                  ) : null}
                  <Text style={local.loginText}>
                    {t(register ? 'Create account' : 'Sign in')}
                  </Text>
                </Pressable>
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
              </>
            )}
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
          <View style={local.footer}>
            <Text style={local.tagline}>{t('A calmer school journey.')}</Text>
            <CopyrightFooter />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const local = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  scroll: {
    flexGrow: 1,
    minHeight: 660,
    paddingHorizontal: 36,
    paddingBottom: 12,
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  topbar: { alignItems: 'flex-end', paddingTop: 8, marginHorizontal: -16 },
  brand: { alignItems: 'center', paddingTop: 45, paddingBottom: 72 },
  wordmark: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandName: { fontSize: 38, color: colors.ink, fontWeight: '500' },
  brandAccent: { color: colors.primary },
  brandIcon: { transform: [{ rotate: '-9deg' }] },
  brandLabel: {
    fontSize: 9,
    letterSpacing: 4,
    color: colors.muted,
    marginTop: 6,
  },
  main: { width: '100%', maxWidth: 340, alignSelf: 'center', gap: 17 },
  settingsCard: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 16,
  },
  title: {
    fontSize: 22,
    color: colors.ink,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: { fontSize: 13, lineHeight: 20, color: colors.muted },
  inputRow: {
    minHeight: 49,
    paddingLeft: 16,
    paddingRight: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E0DCE0',
    borderRadius: 28,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.17,
    shadowRadius: 2,
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 0,
    color: colors.ink,
    fontSize: 13,
  },
  passwordGroup: { marginTop: 14 },
  visibilityButton: {
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusedInput: { borderColor: colors.primary },
  hint: { color: colors.muted, fontSize: 12, paddingTop: 10, paddingLeft: 16 },
  forgotButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  forgotText: {
    color: colors.primary,
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  loginButton: {
    minHeight: 48,
    backgroundColor: colors.primary,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#CF1049',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  loginText: { fontSize: 14, fontWeight: '600', color: colors.surface },
  textButton: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  accountLink: { fontSize: 11, color: colors.primary, textAlign: 'center' },
  settingsLink: { fontSize: 11, color: colors.muted, textAlign: 'center' },
  footer: { flexGrow: 1, justifyContent: 'flex-end', paddingTop: 62 },
  tagline: { color: colors.muted, fontSize: 11, textAlign: 'center' },
  dimmed: { opacity: 0.6 },
});
