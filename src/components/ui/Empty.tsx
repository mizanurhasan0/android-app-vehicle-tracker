import React from 'react';
import { Text } from 'react-native';
import { styles } from '../../theme';
import { Card } from './Card';

export function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <Card>
      <Text style={styles.heading}>{title}</Text>
      <Text style={styles.muted}>{detail}</Text>
    </Card>
  );
}
