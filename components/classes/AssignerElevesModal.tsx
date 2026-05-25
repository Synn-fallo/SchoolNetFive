// /home/project/components/classes/AssignerElevesModal.tsx

import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { X, Check, Users } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import theme from '@/constants/theme';

interface Eleve {
  id: string;
  matricule: string;
  prenom?: string;
  nom?: string;
}

interface AssignerElevesModalProps {
  visible: boolean;
  onClose: () => void;
  classeId: string;
  groupeId: string;
  groupeNom: string;
  onAssign: () => void;
}

export default function AssignerElevesModal({
  visible,
  onClose,
  classeId,
  groupeId,
  groupeNom,
  onAssign,
}: AssignerElevesModalProps) {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [selectedEleves, setSelectedEleves] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && classeId) {
      loadEleves();
      loadExistingAssignments();
    }
  }, [visible, classeId, groupeId]);

  // ✅ LOGIQUE IDENTIQUE À CELLE DE GroupeDetailModal (qui fonctionne)
  const loadEleves = async () => {
    setLoading(true);
    try {
      // 1. Récupérer tous les groupes de la classe
      const { data: tousLesGroupes, error: groupesError } = await supabase
        .from('groupes_eleves')
        .select('id')
        .eq('classe_id', classeId);

      if (groupesError) throw groupesError;

      const tousLesGroupesIds = tousLesGroupes?.map(g => g.id) || [];

      // 2. Récupérer les élèves qui ont déjà un groupe (dans n'importe quel groupe de la classe)
      let elevesAvecGroupeIds = new Set<string>();
      
      if (tousLesGroupesIds.length > 0) {
        const { data: elevesAvecGroupe, error: elevesAvecGroupeError } = await supabase
          .from('eleve_groupes')
          .select('eleve_id')
          .in('groupe_id', tousLesGroupesIds);

        if (!elevesAvecGroupeError && elevesAvecGroupe) {
          elevesAvecGroupeIds = new Set(elevesAvecGroupe.map(eg => eg.eleve_id));
        }
      }

      // 3. Récupérer tous les élèves de la classe
      const { data: elevesData, error: elevesError } = await supabase
        .from('eleves')
        .select('id, matricule, user_id')
        .eq('classe_id', classeId)
        .eq('statut', 'actif');

      if (elevesError) throw elevesError;

      if (!elevesData || elevesData.length === 0) {
        setEleves([]);
        return;
      }

      // 4. Filtrer les élèves qui n'ont AUCUN groupe
      const elevesSansGroupe = elevesData.filter(e => !elevesAvecGroupeIds.has(e.id));

      if (elevesSansGroupe.length === 0) {
        setEleves([]);
        return;
      }

      // 5. Récupérer les profils
      const userIds = elevesSansGroupe.map(e => e.user_id).filter(Boolean);
      let profileMap = new Map();

      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, nom, prenom')
          .in('id', userIds);

        if (!profilesError && profilesData) {
          profilesData.forEach(p => {
            profileMap.set(p.id, { nom: p.nom || '', prenom: p.prenom || '' });
          });
        }
      }

      // 6. Formater les élèves disponibles
      const formattedEleves: Eleve[] = elevesSansGroupe.map(e => {
        const profile = profileMap.get(e.user_id);
        return {
          id: e.id,
          matricule: e.matricule || '',
          prenom: profile?.prenom,
          nom: profile?.nom,
        };
      });

      setEleves(formattedEleves);
    } catch (error) {
      console.error('Error loading eleves:', error);
      setEleves([]);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('eleve_groupes')
        .select('eleve_id')
        .eq('groupe_id', groupeId);

      if (error) throw error;

      const assignedIds = new Set(data?.map(d => d.eleve_id) || []);
      setSelectedEleves(assignedIds);
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
  };

  const toggleEleve = (eleveId: string) => {
    const newSelected = new Set(selectedEleves);
    if (newSelected.has(eleveId)) {
      newSelected.delete(eleveId);
    } else {
      newSelected.add(eleveId);
    }
    setSelectedEleves(newSelected);
  };

  const selectAll = () => {
    if (selectedEleves.size === eleves.length) {
      setSelectedEleves(new Set());
    } else {
      setSelectedEleves(new Set(eleves.map(e => e.id)));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Récupérer les assignations existantes
      const { data: existing } = await supabase
        .from('eleve_groupes')
        .select('eleve_id')
        .eq('groupe_id', groupeId);

      const existingIds = new Set(existing?.map(e => e.eleve_id) || []);

      // Élèves à ajouter
      const toAdd = Array.from(selectedEleves).filter(id => !existingIds.has(id));
      // Élèves à retirer
      const toRemove = Array.from(existingIds).filter(id => !selectedEleves.has(id));

      // Ajouter les nouveaux
      if (toAdd.length > 0) {
        const { error: addError } = await supabase
          .from('eleve_groupes')
          .insert(toAdd.map(eleveId => ({ eleve_id: eleveId, groupe_id: groupeId })));

        if (addError) throw addError;
      }

      // Retirer les anciens
      if (toRemove.length > 0) {
        const { error: removeError } = await supabase
          .from('eleve_groupes')
          .delete()
          .eq('groupe_id', groupeId)
          .in('eleve_id', toRemove);

        if (removeError) throw removeError;
      }

      onAssign();
      onClose();
    } catch (error) {
      console.error('Error saving assignments:', error);
    } finally {
      setSaving(false);
    }
  };

  const getEleveName = (eleve: Eleve) => {
    if (eleve.prenom && eleve.nom) {
      return `${eleve.prenom} ${eleve.nom}`;
    }
    return eleve.matricule;
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Assigner des élèves</Text>
              <Text style={styles.modalSubtitle}>Groupe : {groupeNom}</Text>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={theme.colors.neutral[600]} />
            </TouchableOpacity>
          </View>

          <View style={styles.toolbar}>
            <TouchableOpacity style={styles.selectAllButton} onPress={selectAll}>
              <Users size={16} color={theme.colors.primary.DEFAULT} />
              <Text style={styles.selectAllText}>
                {selectedEleves.size === eleves.length ? 'Désélectionner tout' : 'Tout sélectionner'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.selectedCount}>
              {selectedEleves.size} / {eleves.length} sélectionné(s)
            </Text>
          </View>

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
              <Text style={styles.loadingText}>Chargement des élèves...</Text>
            </View>
          ) : eleves.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucun élève disponible</Text>
              <Text style={styles.emptySubtext}>
                Tous les élèves de la classe ont déjà un groupe.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.elevesList}>
              {eleves.map((eleve) => {
                const isSelected = selectedEleves.has(eleve.id);
                return (
                  <TouchableOpacity
                    key={eleve.id}
                    style={[styles.eleveItem, isSelected && styles.eleveItemSelected]}
                    onPress={() => toggleEleve(eleve.id)}
                  >
                    <View style={styles.eleveInfo}>
                      <Text style={styles.eleveName}>{getEleveName(eleve)}</Text>
                      <Text style={styles.eleveMatricule}>{eleve.matricule}</Text>
                    </View>
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Check size={12} color="#FFFFFF" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Enregistrer</Text>
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
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectAllText: {
    fontSize: 13,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  selectedCount: {
    fontSize: 12,
    color: '#6B7280',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  elevesList: {
    flex: 1,
    padding: 8,
  },
  eleveItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  eleveItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  eleveInfo: {
    flex: 1,
  },
  eleveName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  eleveMatricule: {
    fontSize: 12,
    color: '#6B7280',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: theme.colors.primary.DEFAULT,
    borderColor: theme.colors.primary.DEFAULT,
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
});