import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { ToastHost } from './Toast';
import { colors } from '../theme';

type SheetControls = {
  requestClose: () => void;
  closeAfterSave: () => void;
};

export function VehicleBottomSheet({
  busy,
  onClose,
  children,
}: {
  busy: boolean;
  onClose: () => void;
  children: (controls: SheetControls) => React.ReactNode;
}) {
  const { height } = useWindowDimensions();
  const progress = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    return () => progress.stopAnimation();
  }, [progress]);

  const startClose = () => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(progress, {
      toValue: 0,
      duration: 230,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onClose();
      else closing.current = false;
    });
  };
  const requestClose = () => {
    if (!busy) startClose();
  };

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={requestClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={sheet.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            sheet.scrim,
            {
              opacity: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.28],
              }),
            },
          ]}
        />
        <Pressable
          accessible={false}
          importantForAccessibility="no"
          disabled={busy}
          onPress={requestClose}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          style={[
            sheet.surface,
            {
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [height, 0],
                  }),
                },
              ],
            },
          ]}
          accessibilityViewIsModal
        >
          {children({ requestClose, closeAfterSave: startClose })}
        </Animated.View>
      </KeyboardAvoidingView>
      <ToastHost modal />
    </Modal>
  );
}

const sheet = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', paddingTop: 48 },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#102F2B',
  },
  surface: {
    width: '100%',
    maxWidth: 640,
    maxHeight: '100%',
    alignSelf: 'center',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    shadowColor: '#102F2B',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 12,
  },
});
