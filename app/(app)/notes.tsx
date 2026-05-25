// /home/project/app/(app)/notes.tsx
// Page Notes – Vue adaptée selon le rôle de l'utilisateur

import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveEtablissement } from '@/hooks/useActiveEtablissement';
import ChefNotesView from '@/components/notes/ChefNotesView';
import EleveNotesView from '@/components/notes/EleveNotesView';
import EnseignantNotesView from '@/components/notes/EnseignantNotesView';
import { Card } from '@/components/Card';
import theme from '@/constants/theme';

export default function NotesScreen() {
  const { primaryRole, user, loading: authLoading } = useAuth();
  const { activeEtablissement, loading: etablissementLoading } = useActiveEtablissement();

  if (authLoading || etablissementLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  // Vue Chef d'établissement
  if (primaryRole === 'chef_etablissement' && activeEtablissement) {
    return (
      <ChefNotesView
        etablissementId={activeEtablissement.id}
        etablissementNom={activeEtablissement.nom}
      />
    );
  }

  // Vue Élève / Parent
  if (primaryRole === 'eleve' || primaryRole === 'parent') {
    return <EleveNotesView />;
  }

  // Vue Enseignant
  if (primaryRole === 'enseignant') {
    return <EnseignantNotesView />;
  }

  // Vue Admin
  if (primaryRole === 'admin') {
    return (
      <View style={styles.centerContainer}>
        <Card style={styles.card}>
          <Text style={styles.infoTitle}>Administrateur</Text>
          <Text style={styles.infoText}>
            Vous êtes connecté en tant qu'administrateur.{'\n\n'}
            Pour consulter les notes, utilisez la vue Chef d'établissement.
          </Text>
        </Card>
      </View>
    );
  }

  // Fallback
  return (
    <View style={styles.centerContainer}>
      <Card style={styles.card}>
        <Text style={styles.infoText}>
          Vous n'avez pas accès à cette page avec votre rôle actuel.
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  card: {
    padding: 24,
    alignItems: 'center',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
});