import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NoorIcon } from '../../../components/Noor';
import { ToastHost } from '../../../components/Toast';
import { useTranslation } from '../../../i18n';
import { SmallButton } from './buttons';
import { ErrorText } from './layout';
import { s } from './styles';
import { C } from './tokens';

export function FormModal({
  title,
  visible,
  onClose,
  children,
  onSave,
  saveTitle = 'Save',
  busy,
  error,
}: React.PropsWithChildren<{
  title: string;
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  saveTitle?: string;
  busy?: boolean;
  error?: string;
}>) {
  const { t } = useTranslation();
  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <SafeAreaView style={s.safe}>
        <View style={s.modalHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Go back')}
            disabled={busy}
            onPress={onClose}
            style={s.back}
          >
            <NoorIcon name="back" color={C.white} size={22} />
          </Pressable>
          <Text style={s.modalTitle}>{t(title)}</Text>
        </View>
        <KeyboardAvoidingView
          style={s.safe}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={s.form}
            keyboardShouldPersistTaps="handled"
          >
            <ErrorText message={error} />
            {children}
            <SmallButton title={saveTitle} busy={busy} onPress={onSave} />
          </ScrollView>
        </KeyboardAvoidingView>
        {visible ? <ToastHost modal /> : null}
      </SafeAreaView>
    </Modal>
  );
}
