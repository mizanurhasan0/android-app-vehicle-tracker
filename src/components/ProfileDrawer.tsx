import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../i18n';
import { colors, styles } from '../theme';
import { AppIcon } from './AppIcon';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Button, Field, Notice } from './ui';

export function ProfileDrawer({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { session, updateProfile, signOut } = useAuth();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(400, Math.max(240, width - 32), width);
  const progress = useRef(new Animated.Value(0)).current;
  const reducedMotion = useRef(true);
  const mounted = useRef(false);
  const closing = useRef(false);
  const pending = useRef(false);
  const closeCallback = useRef(onClose);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(session?.user.name ?? '');
  const [operation, setOperation] = useState<'save' | 'signOut' | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const busy = operation !== null;

  useEffect(() => {
    closeCallback.current = onClose;
  }, [onClose]);

  useEffect(() => {
    mounted.current = true;
    closing.current = false;
    progress.setValue(0);
    let active = true;
    let receivedMotionChange = false;
    const applyMotion = (reduce: boolean) => {
      if (!active) return;
      reducedMotion.current = reduce;
      if (reduce) {
        progress.stopAnimation();
        progress.setValue(closing.current ? 0 : 1);
        if (closing.current) closeCallback.current();
      } else if (visible && !closing.current) {
        Animated.timing(progress, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }
    };
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      reduce => {
        receivedMotionChange = true;
        applyMotion(reduce);
      },
    );
    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduce => {
        if (!receivedMotionChange) applyMotion(reduce);
      })
      .catch(() => applyMotion(true));
    return () => {
      active = false;
      mounted.current = false;
      subscription.remove();
      progress.stopAnimation();
    };
  }, [progress, visible]);

  const requestClose = () => {
    if (pending.current || closing.current) return;
    closing.current = true;
    Keyboard.dismiss();
    if (reducedMotion.current) {
      closeCallback.current();
      return;
    }
    Animated.timing(progress, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && mounted.current) closeCallback.current();
    });
  };

  const save = async () => {
    if (pending.current || closing.current) return;
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed.length > 80) {
      setError('Enter a name between 2 and 80 characters.');
      return;
    }
    pending.current = true;
    setOperation('save');
    setError('');
    setSuccess('');
    try {
      await updateProfile({ name: trimmed });
      if (mounted.current) {
        setEditing(false);
        setSuccess('Profile updated.');
        Keyboard.dismiss();
      }
    } catch (cause) {
      if (mounted.current)
        setError(
          cause instanceof Error
            ? cause.message
            : 'Could not update your profile. Please try again.',
        );
    } finally {
      pending.current = false;
      if (mounted.current) setOperation(null);
    }
  };

  const handleSignOut = async () => {
    if (pending.current || closing.current) return;
    pending.current = true;
    setOperation('signOut');
    setError('');
    setSuccess('');
    try {
      await signOut();
      if (mounted.current) closeCallback.current();
    } catch (cause) {
      if (mounted.current)
        setError(
          cause instanceof Error
            ? cause.message
            : 'Could not sign out. Please try again.',
        );
    } finally {
      pending.current = false;
      if (mounted.current) setOperation(null);
    }
  };

  if (!session) return null;
  const { user } = session;
  const initials = user.name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => Array.from(part)[0] ?? '')
    .join('')
    .toUpperCase();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={requestClose}
      statusBarTranslucent
    >
      <View style={local.modal}>
        <Animated.View style={[local.scrim, { opacity: progress }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Close profile drawer')}
            accessibilityState={{ disabled: busy }}
            disabled={busy}
            onPress={requestClose}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View
          accessibilityViewIsModal
          onAccessibilityEscape={requestClose}
          style={[
            local.drawer,
            {
              width: drawerWidth,
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-drawerWidth, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <SafeAreaView style={local.safe} edges={['top', 'bottom', 'left']}>
            <View style={local.header}>
              <Text
                accessibilityRole="header"
                style={[styles.heading, local.headerTitle]}
              >
                {t('Profile')}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('Close profile')}
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={requestClose}
                style={({ pressed }) => [
                  local.close,
                  (pressed || busy) && local.dimmed,
                ]}
              >
                <AppIcon kind="back" color={colors.ink} size={22} />
              </Pressable>
            </View>
            <KeyboardAvoidingView
              style={local.safe}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={local.content}
              >
                <View style={local.identity}>
                  <View style={local.avatar} accessible={false}>
                    {initials ? (
                      <Text style={local.initials}>{initials}</Text>
                    ) : (
                      <AppIcon kind="user" size={30} />
                    )}
                  </View>
                  <Text style={local.name}>{user.name}</Text>
                  <View style={local.role}>
                    <Text style={local.roleLabel}>
                      {user.role === 'ADMIN' ? t('Admin') : t('Guardian')}
                    </Text>
                  </View>
                </View>

                <Notice text={error} kind="error" />
                <Notice text={success} />

                <View style={local.section}>
                  {editing ? (
                    <>
                      <Field
                        label={t('Full name')}
                        value={name}
                        onChangeText={setName}
                        maxLength={80}
                        editable={!busy}
                        autoCapitalize="words"
                        autoComplete="name"
                        textContentType="name"
                        returnKeyType="done"
                        onSubmitEditing={save}
                      />
                      <Button
                        title={t('Save changes')}
                        onPress={save}
                        busy={operation === 'save'}
                        disabled={busy || name.trim() === user.name.trim()}
                      />
                      <Button
                        title={t('Cancel')}
                        secondary
                        disabled={busy}
                        onPress={() => {
                          setName(user.name);
                          setEditing(false);
                          setError('');
                          Keyboard.dismiss();
                        }}
                      />
                    </>
                  ) : (
                    <Button
                      title={t('Edit profile')}
                      secondary
                      disabled={busy}
                      onPress={() => {
                        setName(user.name);
                        setError('');
                        setSuccess('');
                        setEditing(true);
                      }}
                    />
                  )}
                  <View style={local.phone}>
                    <Text style={local.fieldLabel}>{t('Phone number')}</Text>
                    <Text selectable style={styles.body}>
                      {user.phone}
                    </Text>
                    <Text style={styles.muted}>
                      {t('Your sign-in phone number cannot be changed here.')}
                    </Text>
                  </View>
                </View>

                <View style={local.section}>
                  <Text accessibilityRole="header" style={local.fieldLabel}>
                    {t('Language')}
                  </Text>
                  <LanguageSwitcher />
                </View>

                <View style={local.footer}>
                  <Button
                    title={t('Sign out')}
                    secondary
                    busy={operation === 'signOut'}
                    disabled={busy}
                    onPress={handleSignOut}
                  />
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const local = StyleSheet.create({
  modal: { flex: 1 },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: '#071C28A6' },
  drawer: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  safe: { flex: 1 },
  header: {
    minHeight: 68,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: { flex: 1, flexShrink: 1 },
  close: {
    minHeight: 44,
    minWidth: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: { opacity: 0.5 },
  content: { flexGrow: 1, padding: 24, paddingTop: 12, gap: 24 },
  identity: { alignItems: 'flex-start', gap: 12 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontSize: 25, fontWeight: '800', color: colors.primary },
  name: { fontSize: 25, lineHeight: 33, fontWeight: '800', color: colors.ink },
  role: {
    paddingVertical: 5,
    paddingHorizontal: 11,
    backgroundColor: colors.mint,
    borderRadius: 12,
  },
  roleLabel: { fontSize: 12, fontWeight: '700', color: colors.primary },
  section: {
    gap: 14,
    paddingTop: 22,
    borderTopWidth: 1,
    borderColor: colors.line,
  },
  phone: { gap: 6, paddingTop: 6 },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: colors.ink },
  footer: { marginTop: 'auto', paddingTop: 12 },
});
