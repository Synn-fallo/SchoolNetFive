import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import PublicHeader from '@/components/public/PublicHeader';

export default function PublicLayout() {
  return (
    <View style={styles.container}>
      <PublicHeader />
      <View style={styles.content}>
        <Stack screenOptions={{ headerShown: false }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
});