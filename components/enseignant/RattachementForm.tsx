import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Users, BookOpen, Save, X } from 'lucide-react-native';

interface RattachementFormProps {
  enseignantId: string;
  etablissementId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface Classe {
  id: string;
  nom: string;
  niveau: string;
}

interface Matiere {
  id: string;
  nom: string;
  code: string;
}

export default function RattachementForm({ enseignantId, etablissementId, onSuccess, onCancel }: RattachementFormProps) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [classes, setClasses] = useState<Classe[]>([]);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [existingClasses, setExistingClasses] = useState<string[]>([]);
  const [existingMatieres, setExistingMatieres] = useState<string[]>([]);
  
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [selectedMatieres, setSelectedMatieres] = useState<string[]>([]);
  const [selectedRole, setSelectedRole] = useState<'responsable' | 'intervenant'>('intervenant');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoadingData(true);
      
      // Charger les classes de l'établissement
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, nom, niveau')
        .eq('etablissement_id', etablissementId)
        .eq('is_active', true)
        .order('nom');
      
      setClasses(classesData || []);
      
      // Charger les matières de l'établissement
      const { data: matieresData } = await supabase
        .from('matieres')
        .select('id, nom, code')
        .eq('etablissement_id', etablissementId)
        .order('nom');
      
      setMatieres(matieresData || []);
      
      // Charger les rattachements existants
      const { data: existingClassesData } = await supabase
        .from('enseignant_classes')
        .select('classe_id')
        .eq('enseignant_id', enseignantId);
      
      setExistingClasses(existingClassesData?.map(c => c.classe_id) || []);
      setSelectedClasses(existingClassesData?.map(c => c.classe_id) || []);
      
      const { data: existingMatieresData } = await supabase
        .from('enseignant_matieres')
        .select('matiere_id')
        .eq('enseignant_id', enseignantId);
      
      setExistingMatieres(existingMatieresData?.map(m => m.matiere_id) || []);
      setSelectedMatieres(existingMatieresData?.map(m => m.matiere_id) || []);
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const toggleClasse = (classeId: string) => {
    setSelectedClasses(prev =>
      prev.includes(classeId)
        ? prev.filter(id => id !== classeId)
        : [...prev, classeId]
    );
  };

  const toggleMatiere = (matiereId: string) => {
    setSelectedMatieres(prev =>
      prev.includes(matiereId)
        ? prev.filter(id => id !== matiereId)
        : [...prev, matiereId]
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Mettre à jour les classes
      const toAdd = selectedClasses.filter(id => !existingClasses.includes(id));
      const toRemove = existingClasses.filter(id => !selectedClasses.includes(id));
      
      if (toAdd.length > 0) {
        await supabase
          .from('enseignant_classes')
          .insert(toAdd.map(classeId => ({
            enseignant_id: enseignantId,
            classe_id: classeId,
            role: selectedRole,
          })));
      }
      
      if (toRemove.length > 0) {
        await supabase
          .from('enseignant_classes')
          .delete()
          .eq('enseignant_id', enseignantId)
          .in('classe_id', toRemove);
      }
      
      // Mettre à jour les matières
      const toAddMat = selectedMatieres.filter(id => !existingMatieres.includes(id));
      const toRemoveMat = existingMatieres.filter(id => !selectedMatieres.includes(id));
      
      if (toAddMat.length > 0) {
        await supabase
          .from('enseignant_matieres')
          .insert(toAddMat.map(matiereId => ({
            enseignant_id: enseignantId,
            matiere_id: matiereId,
          })));
      }
      
      if (toRemoveMat.length > 0) {
        await supabase
          .from('enseignant_matieres')
          .delete()
          .eq('enseignant_id', enseignantId)
          .in('matiere_id', toRemoveMat);
      }
      
      Alert.alert('Succès', 'Rattachements mis à jour avec succès');
      if (onSuccess) onSuccess();
      
    } catch (error) {
      console.error('Error saving rattachements:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les modifications');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <Card style={styles.loadingCard}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </Card>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Users size={28} color="#3B82F6" />
        <Text style={styles.title}>Rattachements</Text>
        <Text style={styles.subtitle}>Affectez l'enseignant aux classes et matières</Text>
      </View>

      <Card style={styles.card}>
        <View style={styles.roleSelector}>
          <Text style={styles.roleLabel}>Rôle dans les classes:</Text>
          <View style={styles.roleButtons}>
            <TouchableOpacity
              style={[styles.roleButton, selectedRole === 'responsable' && styles.roleButtonActive]}
              onPress={() => setSelectedRole('responsable')}
            >
              <Text style={[styles.roleButtonText, selectedRole === 'responsable' && styles.roleButtonTextActive]}>
                Responsable
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleButton, selectedRole === 'intervenant' && styles.roleButtonActive]}
              onPress={() => setSelectedRole('intervenant')}
            >
              <Text style={[styles.roleButtonText, selectedRole === 'intervenant' && styles.roleButtonTextActive]}>
                Intervenant
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Classes</Text>
        <View style={styles.optionsGrid}>
          {classes.map((classe) => (
            <TouchableOpacity
              key={classe.id}
              style={[
                styles.optionChip,
                selectedClasses.includes(classe.id) && styles.optionChipActive,
              ]}
              onPress={() => toggleClasse(classe.id)}
            >
              <Text style={[
                styles.optionChipText,
                selectedClasses.includes(classe.id) && styles.optionChipTextActive,
              ]}>
                {classe.nom}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Matières</Text>
        <View style={styles.optionsGrid}>
          {matieres.map((matiere) => (
            <TouchableOpacity
              key={matiere.id}
              style={[
                styles.optionChip,
                selectedMatieres.includes(matiere.id) && styles.optionChipActive,
              ]}
              onPress={() => toggleMatiere(matiere.id)}
            >
              <Text style={[
                styles.optionChipText,
                selectedMatieres.includes(matiere.id) && styles.optionChipTextActive,
              ]}>
                {matiere.nom}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <View style={styles.buttonContainer}>
        {onCancel && (
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <X size={18} color="#6B7280" />
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Save size={18} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Enregistrer</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 12,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  loadingCard: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  card: {
    marginBottom: 16,
    padding: 16,
  },
  roleSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleLabel: {
    fontSize: 14,
    color: '#4B5563',
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  roleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  roleButtonActive: {
    backgroundColor: '#3B82F6',
  },
  roleButtonText: {
    fontSize: 14,
    color: '#4B5563',
  },
  roleButtonTextActive: {
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  optionChipActive: {
    backgroundColor: '#3B82F6',
  },
  optionChipText: {
    fontSize: 13,
    color: '#4B5563',
  },
  optionChipTextActive: {
    color: '#FFFFFF',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
  },
  submitButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
});