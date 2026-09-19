import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NoorIcon } from '../components/Noor';
import { useTranslation } from '../i18n';
import { colors } from '../theme';
import { NavigationTab, TabName } from './tabs';

type TabBarProps = {
  tabs: readonly NavigationTab[];
  activeRoute: string;
  onNavigate: (name: TabName) => void;
};

export function TabBar({ tabs, activeRoute, onNavigate }: TabBarProps) {
  const { t } = useTranslation();

  if (!tabs.some(([name]) => name === activeRoute)) return null;

  return (
    <SafeAreaView edges={['bottom']} style={styles.tabSafe}>
      <View style={styles.tabs}>
        {tabs.map(([name, title, icon]) => (
          <Pressable
            key={name}
            accessibilityRole="tab"
            accessibilityLabel={t(title)}
            accessibilityState={{ selected: activeRoute === name }}
            onPress={() => onNavigate(name)}
            style={styles.tab}
          >
            <NoorIcon
              name={icon}
              size={23}
              color={activeRoute === name ? colors.primary : '#677C88'}
            />
            <Text
              style={[styles.tabLabel, activeRoute === name && styles.selected]}
            >
              {t(title)}
            </Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tabSafe: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  tabs: {
    flexDirection: 'row',
    height: 62,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabLabel: { fontSize: 11, color: '#677C88', textAlign: 'center' },
  selected: { color: colors.primary, fontWeight: '700' },
});
