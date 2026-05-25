// /home/project/components/classes/GenererGroupesModal.tsx
// Modal pour générer des groupes à partir d'un modèle - Version autonome (charge ses propres données)

import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { ModeleGroupe } from '@/hooks/useGroupes';
import Selector from '@/components/common/Selector';
import SelectorModal from '@/components/common/SelectorModal';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import theme from '@/constants/theme';

interface GenererGroupesModalProps {
  visible: boolean;
  onClose: () => void;
  onGenerate: (modele: ModeleGroupe) => Promise<void>;
  isLoading?: boolean;
}

export default function GenererGroupesModal({
  visible,
  onClose,
  onGenerate,
  isLoading = false,
}: GenererGroupesModalProps) {
  const [modeles, setModeles] = useState<ModeleGroupe[]>([]);
  const [loadingModeles, setLoadingModeles] = useState(true);
  const [selectedModeleId, setSelectedModeleId] = useState<string>('');
  const [showModeleSelector, setShowModeleSelector] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Charger les modèles directement depuis la base quand le modal s'ouvre
  useEffect(() => {
    if (visible) {
      loadModeles();
    }
  }, [visible]);

  const loadModeles = async () => {
    setLoadingModeles(true);
    try {
      console.log('🔍 [GenererGroupesModal] Début chargement modèles...');
      
      const { data, error } = await supabase
        .from('modeles_groupes')
        .select('*')
        .eq('is_active', true)
        .order('nom', { ascending: true });

      if (error) {
        console.error('🔍 [GenererGroupesModal] Erreur Supabase:', error);
        throw error;
      }
      
      console.log('🔍 [GenererGroupesModal] Modèles chargés:', data);
      console.log('🔍 [GenererGroupesModal] Nombre de modèles:', data?.length);
      setModeles(data || []);
    } catch (error) {
      console.error('Erreur chargement modèles:', error);
      setModeles([]);
    } finally {
      setLoadingModeles(false);
    }
  };

  // Réinitialiser l'état quand le modal se ferme
  useEffect(() => {
    if (!visible) {
      setSelectedModeleId('');
    }
  }, [visible]);

  const selectedModele = modeles.find(m => m.id === selectedModeleId);

  const handleSelectModele = (id: string) => {
    setSelectedModeleId(id);
  };

  const handleGenerate = () => {
    if (!selectedModele) return;
    setShowConfirm(true);
  };

  const handleConfirmGenerate = async () => {
    if (!selectedModele) return;
    setShowConfirm(false);
    await onGenerate(selectedModele);
    setSelectedModeleId('');
    onClose();
  };

  const handleClose = () => {
    setSelectedModeleId('');
    onClose();
  };

  const hasModeles = modeles.length > 0;

  return (
    <>
      <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={handleClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Générer des groupes</Text>
                <Text style={styles.modalSubtitle}>Choisissez un modèle pour créer automatiquement les groupes</Text>
              </View>
              <TouchableOpacity onPress={handleClose}>
                <X size={20} color={theme.colors.neutral[600]} />
              </TouchableOpacity>
            </View>

            {loadingModeles ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
                <Text style={styles.loadingText}>Chargement des modèles...</Text>
              </View>
            ) : isLoading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
                <Text style={styles.loadingText}>Génération en cours...</Text>
              </View>
            ) : !hasModeles ? (
              <View style={styles.emptyContainer}>
                <RefreshCw size={40} color={theme.colors.neutral[300]} />
                <Text style={styles.emptyTitle}>Aucun modèle disponible</Text>
                <Text style={styles.emptySubtext}>
                  Veuillez d'abord créer des modèles de groupes dans les paramètres.
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.form}>
                  <Selector
                    label="Modèle de groupes"
                    value={selectedModele?.nom || ''}
                    onPress={() => setShowModeleSelector(true)}
                    placeholder="Choisir un modèle"
                    required
                  />

                  {selectedModele && (
                    <View style={styles.previewContainer}>
                      <Text style={styles.previewLabel}>Aperçu du modèle :</Text>
                      <Text style={styles.previewName}>{selectedModele.nom}</Text>
                      <Text style={styles.previewValues}>
                        Groupes générés : {selectedModele.valeurs?.join(', ') || 'Aucune valeur'}
                      </Text>
                    </View>
                  )}

                  <View style={styles.noteContainer}>
                    <RefreshCw size={14} color="#D97706" />
                    <Text style={styles.noteText}>
                      Les groupes existants seront remplacés par les nouveaux.
                    </Text>
                  </View>
                </View>

                <View style={styles.modalFooter}>
                  <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                    <Text style={styles.cancelButtonText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.generateButton, !selectedModele && styles.generateButtonDisabled]}
                    onPress={handleGenerate}
                    disabled={!selectedModele || isLoading}
                  >
                    <Text style={styles.generateButtonText}>Générer</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de sélection des modèles */}
      {hasModeles && (
        <SelectorModal
          visible={showModeleSelector}
          onClose={() => setShowModeleSelector(false)}
          title="Sélectionner un modèle de groupes"
          items={modeles}
          selectedId={selectedModeleId}
          onSelect={handleSelectModele}
          getItemLabel={(item) => item.nom}
          getItemSubLabel={(item) => item.valeurs?.length > 0 ? `Groupes: ${item.valeurs.join(', ')}` : ''}
        />
      )}

      {/* Modal de confirmation */}
      <ConfirmationModal
        visible={showConfirm}
        title="Générer les groupes"
        message={`Générer les groupes à partir du modèle "${selectedModele?.nom || ''}" ?\n\nLes groupes existants seront remplacés.`}
        confirmText="Générer"
        variant="warning"
        onConfirm={handleConfirmGenerate}
        onCancel={() => setShowConfirm(false)}
      />
    </>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  form: {
    padding: 20,
  },
  previewContainer: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  previewLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  previewName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  previewValues: {
    fontSize: 12,
    color: '#4B5563',
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
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
  generateButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: 10,
    alignItems: 'center',
  },
  generateButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  generateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
});