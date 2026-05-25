import { Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { View, Text, ActivityIndicator } from 'react-native';

export default function AdminLayout() {
  const { user, hasRole, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!hasRole('admin')) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 16, color: '#EF4444', textAlign: 'center' }}>
          Accès non autorisé. Vous devez être administrateur pour accéder à cette page.
        </Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen 
        name="demandes-role" 
        options={{ title: 'Demandes de rôles', headerShown: false }} 
      />
      <Stack.Screen 
        name="demandes-etablissements" 
        options={{ title: 'Demandes d\'établissement', headerShown: false }} 
      />
      <Stack.Screen 
        name="demandes-partenariats" 
        options={{ title: 'Demandes de partenariat', headerShown: false }} 
      />
      <Stack.Screen 
        name="parametres" 
        options={{ title: 'Paramètres', headerShown: false }} 
      />
    </Stack>
  );
}