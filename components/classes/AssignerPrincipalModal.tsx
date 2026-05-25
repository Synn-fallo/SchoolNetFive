import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useState, useEffect } from 'react';
import { X, User, Check } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import theme from '@/constants/theme';

interface Enseignant {
  id: string;
  nom: string;
  prenom: string;
  email: string;
}

interface AssignerPrincipalModalProps {
  visible: boolean;
  onClose: () => void;
  classeId: string;
  classeNom: string;
  currentPrincipalId?: string;
  currentPrincipalNom?: string;
  onSave: () => void;
}

export default function AssignerPrincipalModal({
  visible,
  onClose,
  classeId,
  classeNom,
  currentPrincipalId,
  currentPrincipalNom,
  onSave,
}: AssignerPrincipalModalProps) {
  const [enseignants, setEnseignants] = useState<Enseignant[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(currentPrincipalId || null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (visible) {
      loadEnseignants();
      setSelectedId(currentPrincipalId || null);
    }
  }, [visible, classeId]);

  const loadEnseignants = async () => {
    setLoading(true);
    try {
      // Récupérer d'abord l'établissement de la classe
      const { data: classe, error: classeError } = await supabase
        .from('classes')
        .select('etablissement_id')
        .eq('id', classeId)
        .single();

      if (classeError) throw classeError;

      // Récupérer les enseignants de l'établissement
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('etablissement_id', classe.etablissement_id)
        .eq('role', 'enseignant')
        .eq('is_active', true);

      if (rolesError) throw rolesError;

      if (!rolesData || rolesData.length === 0) {
        setEnseignants([]);
        setLoading(false);
        return;
      }

      const userIds = rolesData.map(r => r.user_id);
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nom, prenom')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Récupérer les emails
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
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('classes')
        .update({ enseignant_principal_id: selectedId })
        .eq('id', classeId);

      if (error) throw error;

      onSave();
      onClose();
    } catch (error) {
      console.error('Error assigning principal:', error);
      Alert.alert('Erreur', 'Impossible d\'assigner le professeur principal');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('classes')
        .update({ enseignant_principal_id: null })
        .eq('id', classeId);

      if (error) throw error;

      setSelectedId(null);
      onSave();
      onClose();
    } catch (error) {
      console.error('Error removing principal:', error);
      Alert.alert('Erreur', 'Impossible de retirer le professeur principal');
    } finally {
      setSaving(false);
    }
  };

  const filteredEnseignants = enseignants.filter(enseignant => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      enseignant.nom.toLowerCase().includes(query) ||
      enseignant.prenom.toLowerCase().includes(query) ||
      enseignant.email.toLowerCase().includes(query)
    );
  });

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Professeur principal</Text>
              <Text style={styles.modalSubtitle}>Classe : {classeNom}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={theme.colors.neutral[600]} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {currentPrincipalId && (
              <View style={styles.currentCard}>
                <Text style={styles.currentLabel}>Professeur principal actuel :</Text>
                <Text style={styles.currentName}>{currentPrincipalNom || 'Non défini'}</Text>
                <TouchableOpacity style={styles.removeButton} onPress={handleRemove} disabled={saving}>
                  <Text style={styles.removeButtonText}>Retirer</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.sectionTitle}>Nouveau professeur principal</Text>

            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher un enseignant..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {loading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
              </View>
            ) : filteredEnseignants.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Aucun enseignant trouvé</Text>
              </View>
            ) : (
              <ScrollView style={styles.enseignantsList}>
                {filteredEnseignants.map((enseignant) => (
                  <TouchableOpacity
                    key={enseignant.id}
                    style={[
                      styles.enseignantItem,
                      selectedId === enseignant.id && styles.enseignantItemSelected,
                    ]}
                    onPress={() => setSelectedId(enseignant.id)}
                  >
                    <View style={styles.enseignantInfo}>
                      <User size={18} color={selectedId === enseignant.id ? theme.colors.primary.DEFAULT : '#6B7280'} />
                      <View>
                        <Text style={[
                          styles.enseignantName,
                          selectedId === enseignant.id && styles.enseignantNameSelected,
                        ]}>
                          {enseignant.prenom} {enseignant.nom}
                        </Text>
                        <Text style={styles.enseignantEmail}>{enseignant.email}</Text>
                      </View>
                    </View>
                    {selectedId === enseignant.id && <Check size={16} color={theme.colors.primary.DEFAULT} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, (!selectedId || saving) && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!selectedId || saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Assigner</Text>
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
    padding: 16,
    maxHeight: 500,
  },
  currentCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  currentLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  currentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  removeButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
  },
  removeButtonText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  centerContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  enseignantsList: {
    maxHeight: 300,
  },
  enseignantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  enseignantItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  enseignantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  enseignantName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  enseignantNameSelected: {
    color: theme.colors.primary.DEFAULT,
  },
  enseignantEmail: {
    fontSize: 11,
    color: '#6B7280',
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
    borderRadius: 10,
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
    borderRadius: 10,
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
});