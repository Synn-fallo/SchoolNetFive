import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { MetricsProvider } from '@/contexts/MetricsContext';
import { BadgesProvider } from '@/contexts/BadgesContext';
import Toast from '@/components/ui/Toast';
import { useToast } from '@/contexts/ToastContext';

// Ce composant doit être à l'intérieur de ToastProvider
function ToastWrapper() {
  const { visible, message, type, hideToast } = useToast();
  return <Toast visible={visible} message={message} type={type} onHide={hideToast} />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <MetricsProvider>
        <BadgesProvider>
          <ToastProvider>
            <View style={styles.container}>
              <StatusBar style="auto" />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(public)" />
                <Stack.Screen name="auth" />
                <Stack.Screen name="(app)" />
                <Stack.Screen name="index" />
                <Stack.Screen name="+not-found" />
              </Stack>
              <ToastWrapper />
            </View>
          </ToastProvider>
        </BadgesProvider>
      </MetricsProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});