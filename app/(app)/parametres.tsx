// /home/project/app/(app)/parametres.tsx
// Route principale pour la page des paramètres

import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveEtablissement } from '@/hooks/useActiveEtablissement';
import ParametresView from '@/components/parametres/ParametresView';
import { ActivityIndicator, Text } from 'react-native';
import theme from '@/constants/theme';

export default function ParametresScreen() {
  const { hasRole, loading: authLoading } = useAuth();
  const { activeEtablissement, loading: etablissementLoading } = useActiveEtablissement();
  
  const isChef = hasRole('chef_etablissement');

  if (authLoading || etablissementLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!isChef) {
    return (
      <View style={styles.accessDeniedContainer}>
        <Text style={styles.accessDeniedTitle}>⛔ Accès refusé</Text>
        <Text style={styles.accessDeniedText}>
          Vous n'avez pas les droits nécessaires pour accéder à cette page.
        </Text>
      </View>
    );
  }

  if (!activeEtablissement) {
    return (
      <View style={styles.accessDeniedContainer}>
        <Text style={styles.accessDeniedTitle}>🏢 Aucun établissement</Text>
        <Text style={styles.accessDeniedText}>
          Veuillez sélectionner un établissement pour accéder aux paramètres.
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ParametresView
        etablissementId={activeEtablissement.id}
        etablissementNom={activeEtablissement.nom}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
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
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F9FAFB',
  },
  accessDeniedTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  accessDeniedText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});