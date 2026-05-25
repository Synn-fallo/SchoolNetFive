import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useGlobalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import theme from '@/constants/theme';

export default function Index() {
  const { user, loading, primaryRole } = useAuth();
  const router = useRouter();
  const params = useGlobalSearchParams();

  useEffect(() => {
    if (!loading) {
      // Si le paramètre forcePublic est présent, aller directement à (public)
      if (params.forcePublic === 'true') {
        router.replace('/(public)');
        return;
      }

      if (user && primaryRole) {
        router.replace('/(app)');
      } else if (user && !primaryRole) {
        router.replace('/(app)/profile');
      } else {
        router.replace('/(public)');
      }
    }
  }, [user, loading, primaryRole, params.forcePublic]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
  },
});