import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { useState, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useEnfants } from '@/hooks/useEnfants';
import { useNotesParent } from '@/hooks/useNotesParent';
import MatiereLine from '@/components/parent/MatiereLine';
import NoteDetailModal from '@/components/parent/NoteDetailModal';
import { AlertCircle, ChevronLeft } from 'lucide-react-native';
import theme from '@/constants/theme';

export default function ParentNotesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { enfantId, enfantNom } = useLocalSearchParams<{ enfantId: string; enfantNom: string }>();
  const [selectedMatiere, setSelectedMatiere] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const { enfants, loading: loadingEnfants } = useEnfants();
  const { matieres, loading, error, refetch } = useNotesParent(enfantId || '');

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleMatierePress = (matiere: any) => {
    setSelectedMatiere(matiere);
    setModalVisible(true);
  };

  if (!enfantId) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Aucun enfant sélectionné</Text>
      </View>
    );
  }

  if (loading || loadingEnfants) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement des notes...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <AlertCircle size={48} color="#EF4444" />
        <Text style={styles.errorText}>Une erreur est survenue</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
      </View>
    );
  }

  const matieresPrioritaires = matieres.filter(m => m.moyenne < 10);
  const autresMatieres = matieres.filter(m => m.moyenne >= 10);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* En-tête avec retour */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={theme.colors.primary.DEFAULT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notes de {enfantNom || 'mon enfant'}</Text>
        <View style={styles.headerRight} />
      </View>

      {matieres.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Aucune note disponible</Text>
          <Text style={styles.emptyText}>
            Les notes de votre enfant n'ont pas encore été publiées.
          </Text>
        </View>
      ) : (
        <>
          {matieresPrioritaires.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>⚠️ Matières à surveiller</Text>
                <Text style={styles.sectionSubtitle}>Moyenne inférieure à 10/20</Text>
              </View>
              {matieresPrioritaires.map((matiere) => (
                <MatiereLine
                  key={matiere.id}
                  matiere={matiere}
                  onPress={() => handleMatierePress(matiere)}
                />
              ))}
            </View>
          )}

          {autresMatieres.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📚 Autres matières</Text>
              </View>
              {autresMatieres.map((matiere) => (
                <MatiereLine
                  key={matiere.id}
                  matiere={matiere}
                  onPress={() => handleMatierePress(matiere)}
                />
              ))}
            </View>
          )}
        </>
      )}

      <NoteDetailModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedMatiere(null);
        }}
        matiere={selectedMatiere}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerRight: {
    width: 40,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444',
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});