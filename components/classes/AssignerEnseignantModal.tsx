import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { X, Check, User, BookOpen } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import theme from '@/constants/theme';

interface Enseignant {
  id: string;
  nom: string;
  prenom: string;
  email: string;
}

interface Matiere {
  id: string;
  nom: string;
  coefficient: number;
}

interface AssignerEnseignantModalProps {
  visible: boolean;
  onClose: () => void;
  etablissementId: string;
  groupeId: string;
  groupeNom: string;
  onAssign: () => void;
}

export default function AssignerEnseignantModal({
  visible,
  onClose,
  etablissementId,
  groupeId,
  groupeNom,
  onAssign,
}: AssignerEnseignantModalProps) {
  const [enseignants, setEnseignants] = useState<Enseignant[]>([]);
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [selectedEnseignantId, setSelectedEnseignantId] = useState<string | null>(null);
  const [selectedMatiereId, setSelectedMatiereId] = useState<string | null>(null);
  const [existingAssignment, setExistingAssignment] = useState<{ enseignant_id: string; matiere_id: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && etablissementId) {
      loadEnseignants();
      loadMatieres();
      loadExistingAssignment();
    }
  }, [visible, etablissementId, groupeId]);

  const loadEnseignants = async () => {
    try {
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('etablissement_id', etablissementId)
        .eq('role', 'enseignant')
        .eq('is_active', true);

      if (rolesError) throw rolesError;

      if (!rolesData || rolesData.length === 0) {
        setEnseignants([]);
        return;
      }

      const userIds = rolesData.map(r => r.user_id);
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nom, prenom')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Récupérer les emails depuis auth.users
      const enseignantsWithEmail: Enseignant[] = [];
      for (const profile of (profilesData || [])) {
        const { data: userData } = await supabase
          .from('users')
          .select('email')
          .eq('id', profile.id)
          .single();
        
        enseignantsWithEmail.push({
          id: profile.id,
          nom: profile.nom || '',
          prenom: profile.prenom || '',
          email: userData?.email || '',
        });
      }

      setEnseignants(enseignantsWithEmail);
    } catch (error) {
      console.error('Error loading enseignants:', error);
    }
  };

  const loadMatieres = async () => {
    try {
      const { data, error } = await supabase
        .from('matieres')
        .select('id, nom, coefficient')
        .eq('etablissement_id', etablissementId)
        .eq('is_active', true);

      if (error) throw error;
      setMatieres(data || []);
    } catch (error) {
      console.error('Error loading matieres:', error);
    }
  };

  const loadExistingAssignment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('enseignant_groupes')
        .select('enseignant_id, matiere_id')
        .eq('groupe_id', groupeId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setExistingAssignment(data);
        setSelectedEnseignantId(data.enseignant_id);
        setSelectedMatiereId(data.matiere_id);
      } else {
        setExistingAssignment(null);
        setSelectedEnseignantId(null);
        setSelectedMatiereId(null);
      }
    } catch (error) {
      console.error('Error loading existing assignment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedEnseignantId || !selectedMatiereId) {
      return;
    }

    setSaving(true);
    try {
      if (existingAssignment) {
        // Mettre à jour
        const { error } = await supabase
          .from('enseignant_groupes')
          .update({
            enseignant_id: selectedEnseignantId,
            matiere_id: selectedMatiereId,
          })
          .eq('groupe_id', groupeId);

        if (error) throw error;
      } else {
        // Créer
        const { error } = await supabase
          .from('enseignant_groupes')
          .insert({
            groupe_id: groupeId,
            enseignant_id: selectedEnseignantId,
            matiere_id: selectedMatiereId,
            role: 'professeur',
          });

        if (error) throw error;
      }

      onAssign();
      onClose();
    } catch (error) {
      console.error('Error saving assignment:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!existingAssignment) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('enseignant_groupes')
        .delete()
        .eq('groupe_id', groupeId);

      if (error) throw error;

      onAssign();
      onClose();
    } catch (error) {
      console.error('Error removing assignment:', error);
    } finally {
      setSaving(false);
    }
  };

  const getEnseignantName = (enseignant: Enseignant) => {
    return `${enseignant.prenom} ${enseignant.nom}`;
  };

  if (loading) {
    return (
      <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
              <Text style={styles.loadingText}>Chargement...</Text>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Assigner un enseignant</Text>
              <Text style={styles.modalSubtitle}>Groupe : {groupeNom}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={theme.colors.neutral[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.sectionTitle}>Enseignant</Text>
            {enseignants.length === 0 ? (
              <Text style={styles.emptyText}>Aucun enseignant dans cet établissement</Text>
            ) : (
              enseignants.map((enseignant) => (
                <TouchableOpacity
                  key={enseignant.id}
                  style={[
                    styles.optionItem,
                    selectedEnseignantId === enseignant.id && styles.optionItemSelected,
                  ]}
                  onPress={() => setSelectedEnseignantId(enseignant.id)}
                >
                  <User size={18} color={selectedEnseignantId === enseignant.id ? theme.colors.primary.DEFAULT : '#6B7280'} />
                  <View style={styles.optionInfo}>
                    <Text style={[styles.optionName, selectedEnseignantId === enseignant.id && styles.optionNameSelected]}>
                      {getEnseignantName(enseignant)}
                    </Text>
                    <Text style={styles.optionEmail}>{enseignant.email}</Text>
                  </View>
                  {selectedEnseignantId === enseignant.id && <Check size={16} color={theme.colors.primary.DEFAULT} />}
                </TouchableOpacity>
              ))
            )}

            <Text style={styles.sectionTitle}>Matière</Text>
            {matieres.length === 0 ? (
              <Text style={styles.emptyText}>Aucune matière dans cet établissement</Text>
            ) : (
              matieres.map((matiere) => (
                <TouchableOpacity
                  key={matiere.id}
                  style={[
                    styles.optionItem,
                    selectedMatiereId === matiere.id && styles.optionItemSelected,
                  ]}
                  onPress={() => setSelectedMatiereId(matiere.id)}
                >
                  <BookOpen size={18} color={selectedMatiereId === matiere.id ? theme.colors.primary.DEFAULT : '#6B7280'} />
                  <View style={styles.optionInfo}>
                    <Text style={[styles.optionName, selectedMatiereId === matiere.id && styles.optionNameSelected]}>
                      {matiere.nom}
                    </Text>
                    <Text style={styles.optionEmail}>Coefficient : {matiere.coefficient}</Text>
                  </View>
                  {selectedMatiereId === matiere.id && <Check size={16} color={theme.colors.primary.DEFAULT} />}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            {existingAssignment && (
              <TouchableOpacity style={styles.removeButton} onPress={handleRemove} disabled={saving}>
                <Text style={styles.removeButtonText}>Supprimer</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (!selectedEnseignantId || !selectedMatiereId || saving) && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={!selectedEnseignantId || !selectedMatiereId || saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>{existingAssignment ? 'Modifier' : 'Assigner'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  modalBody: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
    marginTop: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
  },
  optionItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  optionNameSelected: {
    color: theme.colors.primary.DEFAULT,
  },
  optionEmail: {
    fontSize: 12,
    color: '#6B7280',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  removeButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
});