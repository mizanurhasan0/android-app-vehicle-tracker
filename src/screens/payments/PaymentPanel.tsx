import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PaymentTab } from './types';

export function PaymentPanel({
  label,
  active,
  children,
}: React.PropsWithChildren<{ label: PaymentTab; active: boolean }>) {
  // Unmount native controls while their owning components retain draft state.
  if (!active) return null;
  return (
    <View
      testID={`payment-panel-${label}`}
      style={local.panel}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
    >
      {children}
    </View>
  );
}

const local = StyleSheet.create({
  panel: { gap: 12 },
});
