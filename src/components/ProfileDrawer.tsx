import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
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
import { useLanguageSettings } from '../i18n/LanguageContext';
import { ProfileMenuIcon } from './ProfileMenuIcon';
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
  const drawerWidth = Math.min(380, width - 24);
  const progress = useRef(new Animated.Value(0)).current;
  const editorProgress = useRef(new Animated.Value(1)).current;
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
        editorProgress.stopAnimation();
        editorProgress.setValue(1);
        progress.setValue(closing.current ? 0 : 1);
        if (closing.current) closeCallback.current();
      } else if (visible && !closing.current) {
        Animated.timing(progress, {
          toValue: 1,
          duration: 260,
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
  }, [editorProgress, progress, visible]);

  useEffect(() => {
    if (!editing || reducedMotion.current) {
      editorProgress.setValue(1);
      return;
    }
    editorProgress.setValue(0);
    Animated.timing(editorProgress, {
      toValue: 1,
      duration: 160,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    return () => editorProgress.stopAnimation();
  }, [editing, editorProgress]);

  const cancelEditing = () => {
    if (pending.current) return;
    setName(session?.user.name ?? '');
    setEditing(false);
    setError('');
    setSuccess('');
    Keyboard.dismiss();
  };

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
      onRequestClose={editing ? cancelEditing : requestClose}
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
          onAccessibilityEscape={editing ? cancelEditing : requestClose}
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
          <SafeAreaView style={local.panel} edges={['top', 'bottom', 'left']}>
            <View style={local.header}>
              {editing ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('Cancel')}
                  accessibilityState={{ disabled: busy }}
                  disabled={busy}
                  onPress={cancelEditing}
                  style={local.headerButton}
                >
                  <AppIcon kind="back" size={20} color={colors.ink} />
                </Pressable>
              ) : null}
              <Text accessibilityRole="header" style={local.headerTitle}>
                {t(editing ? 'Edit profile' : 'My account')}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('Close profile')}
                accessibilityState={{ disabled: busy }}
                disabled={busy}
                onPress={requestClose}
                style={({ pressed }) => [
                  local.headerButton,
                  (pressed || busy) && local.dimmed,
                ]}
              >
                <ProfileMenuIcon kind="close" color={colors.muted} />
              </Pressable>
            </View>
            <KeyboardAvoidingView
              style={local.panel}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <ScrollView
                style={local.panel}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={local.content}
              >
                <Notice text={error} kind="error" />
                <Notice text={success} />
                {editing ? (
                  <Animated.View
                    style={[
                      local.editPage,
                      {
                        opacity: editorProgress,
                        transform: [
                          {
                            translateY: editorProgress.interpolate({
                              inputRange: [0, 1],
                              outputRange: [8, 0],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <Text style={styles.muted}>
                      {t('Keep your account details up to date.')}
                    </Text>
                    <View style={local.formCard}>
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
                      <View style={local.readOnlyField}>
                        <Text style={local.fieldLabel}>
                          {t('Phone number')}
                        </Text>
                        <Text selectable style={styles.body}>
                          {user.phone}
                        </Text>
                        <Text style={local.help}>
                          {t(
                            'Your sign-in phone number cannot be changed here.',
                          )}
                        </Text>
                      </View>
                    </View>
                    <View style={local.editActions}>
                      <Button
                        title={t('Save changes')}
                        onPress={save}
                        busy={operation === 'save'}
                        disabled={busy || name.trim() === user.name.trim()}
                      />
                      <Button
                        title={t('Cancel')}
                        onPress={cancelEditing}
                        secondary
                        disabled={busy}
                      />
                    </View>
                  </Animated.View>
                ) : (
                  <>
                    <View style={local.identity}>
                      <View style={local.avatar} accessible={false}>
                        <Text style={local.initials}>{initials || 'P'}</Text>
                      </View>
                      <View style={local.identityText}>
                        <Text style={local.name}>{user.name}</Text>
                        <Text
                          selectable
                          accessibilityLabel={`${t('Phone number')}, ${
                            user.phone
                          }`}
                          style={local.phone}
                        >
                          {user.phone}
                        </Text>
                        <View style={local.role}>
                          <Text style={local.roleLabel}>
                            {user.role === 'ADMIN' ? t('Admin') : t('Guardian')}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={local.settingsCard}>
                      <DrawerAction
                        title={t('Edit profile')}
                        detail={t('Name and account details')}
                        icon="edit"
                        disabled={busy}
                        onPress={() => {
                          setName(user.name);
                          setError('');
                          setSuccess('');
                          setEditing(true);
                        }}
                      />
                      <View style={local.languageSection}>
                        <View style={local.settingHeading}>
                          <View style={local.menuIcon}>
                            <ProfileMenuIcon kind="language" />
                          </View>
                          <Text style={local.rowTitle}>{t('Language')}</Text>
                        </View>
                        <LanguageOptions />
                      </View>
                    </View>
                    <View style={local.footer}>
                      <DrawerAction
                        title={t('Sign out')}
                        icon="logout"
                        danger
                        busy={operation === 'signOut'}
                        disabled={busy}
                        onPress={handleSignOut}
                      />
                    </View>
                  </>
                )}
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function DrawerAction({
  title,
  detail,
  icon,
  danger = false,
  busy = false,
  disabled = false,
  onPress,
}: {
  title: string;
  detail?: string;
  icon: 'edit' | 'logout';
  danger?: boolean;
  busy?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        local.menuRow,
        pressed && local.rowPressed,
        (disabled || busy) && local.dimmed,
      ]}
    >
      <View style={[local.menuIcon, danger && local.dangerIcon]}>
        {busy ? (
          <ActivityIndicator color={colors.danger} />
        ) : (
          <ProfileMenuIcon
            kind={icon}
            color={danger ? colors.danger : colors.primary}
          />
        )}
      </View>
      <View style={local.rowText}>
        <Text style={[local.rowTitle, danger && local.dangerText]}>
          {title}
        </Text>
        {detail ? <Text style={local.help}>{detail}</Text> : null}
      </View>
      {!danger ? (
        <View style={local.chevron}>
          <AppIcon kind="back" color={colors.muted} size={16} />
        </View>
      ) : null}
    </Pressable>
  );
}

function LanguageOptions() {
  const { t, i18n } = useTranslation();
  const settings = useLanguageSettings();
  if (!settings) return null;
  return (
    <View style={local.languageOptions}>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={t('Language')}
        style={local.languageChoices}
      >
        {(
          [
            { code: 'en', label: 'English' },
            { code: 'bn', label: 'বাংলা' },
          ] as const
        ).map(language => {
          const selected = i18n.language === language.code;
          return (
            <Pressable
              key={language.code}
              accessibilityRole="radio"
              accessibilityLabel={language.label}
              accessibilityState={{
                checked: selected,
                disabled: settings.busy,
              }}
              disabled={settings.busy}
              onPress={() => {
                settings.changeLanguage(language.code);
              }}
              style={({ pressed }) => [
                local.languageChoice,
                selected && local.languageSelected,
                (pressed || settings.busy) && local.dimmed,
              ]}
            >
              <Text
                style={[
                  local.languageLabel,
                  selected && local.languageLabelSelected,
                ]}
              >
                {language.label}
              </Text>
              <View style={[local.radio, selected && local.radioSelected]}>
                {selected ? <View style={local.radioDot} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      <Notice text={settings.error} kind="error" />
    </View>
  );
}

const local = StyleSheet.create({
  modal: { flex: 1 },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: '#102A3280' },
  drawer: {
    height: '100%',
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    elevation: 16,
  },
  panel: { flex: 1 },
  header: {
    minHeight: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '700', color: colors.ink },
  headerButton: {
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  content: { flexGrow: 1, padding: 16, paddingTop: 4, gap: 20 },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  identityText: { flex: 1, gap: 6 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontSize: 22, fontWeight: '700', color: colors.primary },
  name: { fontSize: 19, lineHeight: 26, fontWeight: '700', color: colors.ink },
  phone: { fontSize: 14, lineHeight: 21, color: colors.muted },
  role: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: colors.mint,
  },
  roleLabel: { color: colors.primary, fontSize: 11, fontWeight: '600' },
  settingsCard: {
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 76,
    padding: 16,
    gap: 12,
  },
  menuIcon: {
    width: 40,
    height: 40,
    flexShrink: 0,
    borderRadius: 12,
    backgroundColor: colors.mint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: { flex: 1, gap: 3 },
  rowTitle: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    color: colors.ink,
    flexShrink: 1,
  },
  help: { fontSize: 13, lineHeight: 20, color: colors.muted },
  chevron: { transform: [{ rotate: '180deg' }] },
  rowPressed: { backgroundColor: colors.background },
  dimmed: { opacity: 0.55 },
  languageSection: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    padding: 16,
    gap: 14,
  },
  settingHeading: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  languageOptions: { gap: 8 },
  languageChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  languageChoice: {
    flex: 1,
    minWidth: 104,
    minHeight: 48,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  languageSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.mint,
  },
  languageLabel: {
    color: colors.muted,
    fontWeight: '600',
    fontSize: 14,
    lineHeight: 22,
    flexShrink: 1,
  },
  languageLabelSelected: { color: colors.primary },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: { borderColor: colors.primary },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  footer: {
    marginTop: 'auto',
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  dangerIcon: { backgroundColor: '#FBEAEC' },
  dangerText: { color: colors.danger },
  editPage: { flexGrow: 1, gap: 20 },
  formCard: {
    padding: 16,
    gap: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
  },
  readOnlyField: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 16,
  },
  fieldLabel: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  editActions: { marginTop: 'auto', gap: 10, paddingTop: 12 },
});
