// /home/project/app/(app)/enseignant/_layout.tsx
// Layout spécifique pour l'espace enseignant

import { Stack } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import theme from '@/constants/theme';

export default function EnseignantLayout() {
  const { user, primaryRole, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement de l'espace enseignant...</Text>
      </View>
    );
  }

  if (!user || primaryRole !== 'enseignant') {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Accès non autorisé</Text>
        <Text style={styles.errorSubtext}>Vous n'avez pas les droits pour accéder à cet espace.</Text>
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerTintColor: '#1F2937',
        headerTitleStyle: {
          fontWeight: '600',
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: '#F9FAFB',
        },
      }}
    >
      {/* Route principale - Tableau de bord enseignant */}
      <Stack.Screen
        name="index"
        options={{
          title: 'Tableau de bord',
          headerShown: true,
        }}
      />

      {/* Mes classes */}
      <Stack.Screen
        name="mes-classes"
        options={{
          title: 'Mes classes',
          headerShown: true,
        }}
      />

      {/* Évaluations & Notes */}
      <Stack.Screen
        name="notes"
        options={{
          title: 'Évaluations & Notes',
          headerShown: true,
        }}
      />

      {/* ✅ NOUVEAU : Espace classes (canaux de communication) */}
      <Stack.Screen
        name="espaces-classes"
        options={{
          title: 'Espace classes',
          headerShown: true,
        }}
      />

      {/* ✅ NOUVEAU : Rendez-vous parents */}
      <Stack.Screen
        name="rendez-vous"
        options={{
          title: 'Rendez-vous parents',
          headerShown: true,
        }}
      />

      {/* ✅ NOUVEAU : Publier une annonce */}
      <Stack.Screen
        name="annonces-publier"
        options={{
          title: 'Publier une annonce',
          headerShown: true,
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
});