import React from 'react';
import { Text } from 'react-native';
import { styles } from '../../theme';

export function SectionTitle({ children }: React.PropsWithChildren) {
  return (
    <Text accessibilityRole="header" style={styles.heading}>
      {children}
    </Text>
  );
}
