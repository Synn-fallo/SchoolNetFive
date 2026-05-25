import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { X, Save, Calendar, ChevronDown } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import theme from '@/constants/theme';

interface EditClasseModalProps {
  visible: boolean;
  onClose: () => void;
  classeId: string;
  classeNom: string;
  classeNiveau: string;
  classeCycleId?: string;
  classeCapacite?: number;
  anneeScolaireId?: string;
  onSave: () => void;
}

interface AnneeScolaire {
  id: string;
  libelle: string;
  is_active: boolean;
}

interface Cycle {
  id: string;
  nom: string;
  ordre: number;
}

export default function EditClasseModal({
  visible,
  onClose,
  classeId,
  classeNom,
  classeNiveau,
  classeCycleId,
  classeCapacite,
  anneeScolaireId,
  onSave,
}: EditClasseModalProps) {
  const [nom, setNom] = useState(classeNom);
  const [capacite, setCapacite] = useState(classeCapacite?.toString() || '');
  const [cycleId, setCycleId] = useState(classeCycleId || '');
  const [anneeScolaireIdState, setAnneeScolaireIdState] = useState(anneeScolaireId || '');
  const [anneesScolaires, setAnneesScolaires] = useState<AnneeScolaire[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAnnees, setLoadingAnnees] = useState(true);
  const [loadingCycles, setLoadingCycles] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCyclePicker, setShowCyclePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setNom(classeNom);
      setCapacite(classeCapacite?.toString() || '');
      setCycleId(classeCycleId || '');
      setAnneeScolaireIdState(anneeScolaireId || '');
      loadAnneesScolaires();
      loadCycles();
    }
  }, [visible, classeNom, classeCapacite, classeCycleId, anneeScolaireId]);

  const loadAnneesScolaires = async () => {
    setLoadingAnnees(true);
    try {
      const { data, error } = await supabase
        .from('annees_scolaires')
        .select('id, libelle, is_active')
        .order('libelle', { ascending: false });

      if (error) throw error;
      setAnneesScolaires(data || []);
    } catch (error) {
      console.error('Error loading annees scolaires:', error);
    } finally {
      setLoadingAnnees(false);
    }
  };

  const loadCycles = async () => {
    setLoadingCycles(true);
    try {
      const { data, error } = await supabase
        .from('cycles')
        .select('id, nom, ordre')
        .eq('is_active', true)
        .order('ordre', { ascending: true });

      if (error) throw error;
      setCycles(data || []);
    } catch (error) {
      console.error('Error loading cycles:', error);
    } finally {
      setLoadingCycles(false);
    }
  };

  const getCycleNom = (id: string) => {
    const cycle = cycles.find(c => c.id === id);
    return cycle ? cycle.nom : 'Sélectionner un cycle';
  };

  const handleSave = async () => {
    if (!nom.trim()) {
      setError('Le nom de la classe est obligatoire');
      return;
    }

    if (!cycleId) {
      setError('Le cycle est obligatoire');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const updateData: any = {
        nom: nom.trim(),
        capacite: capacite ? parseInt(capacite) : null,
        cycle_id: cycleId,
      };

      if (anneeScolaireIdState) {
        updateData.annee_scolaire_id = anneeScolaireIdState;
      }

      const { error } = await supabase
        .from('classes')
        .update(updateData)
        .eq('id', classeId);

      if (error) throw error;

      onSave();
      onClose();
    } catch (error) {
      console.error('Error updating class:', error);
      setError('Impossible de modifier la classe');
    } finally {
      setLoading(false);
    }
  };

  const selectedCycleNom = getCycleNom(cycleId);

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Modifier la classe</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={theme.colors.neutral[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.inputLabel}>Nom de la classe *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Tle Technique F1/1"
              value={nom}
              onChangeText={setNom}
            />

            <Text style={styles.inputLabel}>Niveau</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={classeNiveau}
              editable={false}
            />

            {/* Champ Cycle - AJOUTÉ */}
            <Text style={styles.inputLabel}>Cycle *</Text>
            {loadingCycles ? (
              <ActivityIndicator size="small" color={theme.colors.primary.DEFAULT} />
            ) : (
              <TouchableOpacity
                style={[styles.pickerButton, !cycleId && styles.pickerButtonError]}
                onPress={() => setShowCyclePicker(true)}
              >
                <Text style={[styles.pickerButtonText, !cycleId && styles.pickerButtonPlaceholder]}>
                  {selectedCycleNom}
                </Text>
                <ChevronDown size={20} color="#6B7280" />
              </TouchableOpacity>
            )}

            <Text style={styles.inputLabel}>Capacité (optionnel)</Text>
            <TextInput
              style={styles.input}
              placeholder="Nombre d'élèves"
              value={capacite}
              onChangeText={setCapacite}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Année scolaire</Text>
            {loadingAnnees ? (
              <ActivityIndicator size="small" color={theme.colors.primary.DEFAULT} />
            ) : (
              <View style={styles.selectContainer}>
                {anneesScolaires.map((annee) => (
                  <TouchableOpacity
                    key={annee.id}
                    style={[
                      styles.selectOption,
                      anneeScolaireIdState === annee.id && styles.selectOptionActive,
                    ]}
                    onPress={() => setAnneeScolaireIdState(annee.id)}
                  >
                    <Calendar size={16} color={anneeScolaireIdState === annee.id ? theme.colors.primary.DEFAULT : '#6B7280'} />
                    <Text style={[
                      styles.selectOptionText,
                      anneeScolaireIdState === annee.id && styles.selectOptionTextActive,
                    ]}>
                      {annee.libelle}
                    </Text>
                    {annee.is_active && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>Active</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {error && <Text style={styles.errorText}>{error}</Text>}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, loading && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Save size={16} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>Enregistrer</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Modal de sélection du cycle */}
      <Modal visible={showCyclePicker} transparent={true} animationType="slide" onRequestClose={() => setShowCyclePicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner un cycle</Text>
              <TouchableOpacity onPress={() => setShowCyclePicker(false)}>
                <X size={20} color={theme.colors.neutral[600]} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              {cycles.map((cycle) => (
                <TouchableOpacity
                  key={cycle.id}
                  style={[
                    styles.pickerOption,
                    cycleId === cycle.id && styles.pickerOptionActive,
                  ]}
                  onPress={() => {
                    setCycleId(cycle.id);
                    setShowCyclePicker(false);
                  }}
                >
                  <Text style={[
                    styles.pickerOptionText,
                    cycleId === cycle.id && styles.pickerOptionTextActive,
                  ]}>
                    {cycle.nom}
                  </Text>
                  {cycleId === cycle.id && (
                    <Text style={styles.pickerCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  pickerModalContent: {
    width: '80%',
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  modalBody: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  disabledInput: {
    backgroundColor: '#F3F4F6',
    color: '#9CA3AF',
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  pickerButtonError: {
    borderColor: '#EF4444',
  },
  pickerButtonText: {
    fontSize: 14,
    color: '#1F2937',
  },
  pickerButtonPlaceholder: {
    color: '#9CA3AF',
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerOptionActive: {
    backgroundColor: '#EFF6FF',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#1F2937',
  },
  pickerOptionTextActive: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  pickerCheck: {
    fontSize: 18,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '600',
  },
  selectContainer: {
    gap: 8,
    marginBottom: 16,
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectOptionActive: {
    backgroundColor: '#EFF6FF',
    borderColor: theme.colors.primary.DEFAULT,
  },
  selectOptionText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  selectOptionTextActive: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  activeBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginBottom: 8,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: 10,
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