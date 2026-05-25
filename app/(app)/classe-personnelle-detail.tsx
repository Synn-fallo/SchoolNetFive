import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/Card';
import BackButton from '@/components/common/BackButton';
import GestionElevesPersonnels from '@/components/classes/GestionElevesPersonnels';
import GestionMatieresPersonnelles from '@/components/classes/GestionMatieresPersonnelles';
import ExportClasseCSV from '@/components/classes/ExportClasseCSV';
import { BookOpen, Users, FileText, ArrowLeft, Edit2, Save, X } from 'lucide-react-native';
import theme from '@/constants/theme';

type TabType = 'eleves' | 'matieres';

export default function ClassePersonnelleDetailScreen() {
  const { id, tab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [classe, setClasse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>((tab as TabType) || 'eleves');
  const [isEditing, setIsEditing] = useState(false);
  const [editNom, setEditNom] = useState('');
  const [editDescription, setEditDescription] = useState('');

  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerLeft: () => <BackButton />,
      title: 'Détail de la classe',
      headerTitleAlign: 'center',
      headerStyle: {
        backgroundColor: '#FFFFFF',
      },
      headerShadowVisible: false,
      headerTitleStyle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
      },
    });
  }, [navigation]);

  useEffect(() => {
    if (id) {
      loadClasse();
    }
  }, [id]);

  const loadClasse = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('classes_personnelles')
        .select('*')
        .eq('id', id)
        .eq('enseignant_id', user?.id)
        .single();

      if (error) throw error;
      setClasse(data);
      setEditNom(data.nom);
      setEditDescription(data.description || '');
    } catch (error) {
      console.error('Error loading class:', error);
      Alert.alert('Erreur', 'Impossible de charger la classe');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editNom.trim()) {
      Alert.alert('Erreur', 'Le nom de la classe est requis');
      return;
    }

    try {
      const { error } = await supabase
        .from('classes_personnelles')
        .update({
          nom: editNom.trim(),
          description: editDescription.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('enseignant_id', user?.id);

      if (error) throw error;
      
      setClasse({
        ...classe,
        nom: editNom.trim(),
        description: editDescription.trim() || null
      });
      setIsEditing(false);
      Alert.alert('Succès', 'Classe modifiée');
    } catch (error) {
      console.error('Error saving class:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    }
  };

  const handleRefresh = () => {
    loadClasse();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!classe) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Classe non trouvée</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* En-tête */}
      <Card style={styles.headerCard}>
        {isEditing ? (
          <View>
            <TextInput
              style={styles.editInput}
              value={editNom}
              onChangeText={setEditNom}
              placeholder="Nom de la classe"
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              style={[styles.editInput, styles.editTextArea]}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Description (optionnelle)"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
            />
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelEditButton} onPress={() => setIsEditing(false)}>
                <X size={16} color="#6B7280" />
                <Text style={styles.cancelEditText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveEditButton} onPress={handleSaveEdit}>
                <Save size={16} color="#FFFFFF" />
                <Text style={styles.saveEditText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.headerRow}>
              <BookOpen size={24} color="#8B5CF6" />
              <Text style={styles.classeNom}>{classe.nom}</Text>
              <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editIconButton}>
                <Edit2 size={18} color={theme.colors.primary.DEFAULT} />
              </TouchableOpacity>
            </View>
            {classe.description && (
              <Text style={styles.classeDescription}>{classe.description}</Text>
            )}
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Users size={14} color="#6B7280" />
                <Text style={styles.statText}>{classe.eleves?.length || 0} élèves</Text>
              </View>
              <View style={styles.stat}>
                <FileText size={14} color="#6B7280" />
                <Text style={styles.statText}>{classe.matieres?.length || 0} matières</Text>
              </View>
            </View>
          </>
        )}
      </Card>

      {/* Export */}
      <View style={styles.exportContainer}>
        <ExportClasseCSV
          classe={{
            id: classe.id,
            nom: classe.nom,
            eleves: classe.eleves || [],
            matieres: classe.matieres || []
          }}
          onExport={() => Alert.alert('Export', 'Export en cours...')}
        />
      </View>

      {/* Onglets */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'eleves' && styles.tabActive]}
          onPress={() => setActiveTab('eleves')}
        >
          <Users size={16} color={activeTab === 'eleves' ? '#FFFFFF' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'eleves' && styles.tabTextActive]}>
            Élèves ({classe.eleves?.length || 0})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'matieres' && styles.tabActive]}
          onPress={() => setActiveTab('matieres')}
        >
          <FileText size={16} color={activeTab === 'matieres' ? '#FFFFFF' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'matieres' && styles.tabTextActive]}>
            Matières ({classe.matieres?.length || 0})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenu des onglets */}
      {activeTab === 'eleves' && (
        <GestionElevesPersonnels
          classeId={classe.id}
          eleves={classe.eleves || []}
          onRefresh={handleRefresh}
        />
      )}

      {activeTab === 'matieres' && (
        <GestionMatieresPersonnelles
          classeId={classe.id}
          matieres={classe.matieres || []}
          onRefresh={handleRefresh}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  headerCard: {
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#8B5CF6',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  classeNom: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  editIconButton: {
    padding: 8,
  },
  classeDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: '#6B7280',
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  editTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  cancelEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelEditText: {
    fontSize: 14,
    color: '#6B7280',
  },
  saveEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveEditText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  exportContainer: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
});