import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  FlatListProps,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { useTranslation } from '../i18n';
import { Notice } from './ui/Notice';

type Props<T> = Pick<
  FlatListProps<T>,
  'data' | 'renderItem' | 'keyExtractor' | 'extraData' | 'ListEmptyComponent'
> & {
  header: React.ReactElement;
  footer?: React.ReactElement;
  children?: React.ReactNode;
  loading?: boolean;
  error?: string;
  refresh?: () => Promise<void>;
  admin?: boolean;
};

/** A page with one scrolling owner; modal forms stay mounted beside the list. */
export function VirtualizedPage<T>({
  header,
  footer,
  children,
  loading = false,
  error,
  refresh,
  admin = false,
  ...list
}: Props<T>) {
  const { t } = useTranslation();
  return (
    <SafeAreaView
      style={[v.safe, admin && v.adminSafe]}
      edges={['bottom', 'left', 'right']}
    >
      <KeyboardAvoidingView
        style={[v.safe, admin && v.adminSafe]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          {...list}
          style={v.list}
          contentContainerStyle={[v.content, admin && v.adminContent]}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          refreshControl={
            refresh ? (
              <RefreshControl
                refreshing={loading}
                onRefresh={refresh}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            ) : undefined
          }
          ListHeaderComponent={
            <View style={admin ? v.adminHeader : v.header}>
              <Notice text={error} kind="error" />
              {admin && loading ? (
                <ActivityIndicator
                  color={colors.primary}
                  accessibilityLabel={t('Loading data')}
                />
              ) : null}
              {header}
            </View>
          }
          ListFooterComponent={footer}
        />
        {children}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Adjacent virtual cells retain the outline of a single card/table. */
export function VirtualizedCardSection({
  children,
  style,
  first = false,
  last = false,
}: React.PropsWithChildren<{
  style: StyleProp<ViewStyle>;
  first?: boolean;
  last?: boolean;
}>) {
  const base = StyleSheet.flatten(style);
  return (
    <View
      style={[
        style,
        !first && v.continued,
        !last && v.continues,
        !last && typeof base?.gap === 'number' && { paddingBottom: base.gap },
      ]}
    >
      {children}
    </View>
  );
}

const v = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  adminSafe: { backgroundColor: '#F5FAF8' },
  list: { flex: 1 },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 744,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 16,
  },
  adminContent: { maxWidth: undefined, paddingTop: 12, paddingBottom: 24 },
  header: { gap: 10, paddingBottom: 10 },
  adminHeader: { gap: 11 },
  continued: {
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingTop: 0,
  },
  continues: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
});
