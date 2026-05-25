// /home/project/components/demande/MotifRefusSelect.tsx
// Composant pour la sélection MULTIPLE des motifs de refus
// Version compatible avec JSONB

import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react-native';
import theme from '@/constants/theme';

export interface MotifRefus {
  value: string;
  label: string;
  requiresPrecision?: boolean;
}

export const MOTIFS_REFUS: MotifRefus[] = [
  { value: 'educmaster_invalide', label: 'EducMaster invalide ou non reconnu' },
  { value: 'documents_manquants', label: 'Documents justificatifs manquants' },
  { value: 'classe_indisponible', label: 'Classe demandée non disponible' },
  { value: 'age_non_conforme', label: 'Âge non conforme au niveau demandé' },
  { value: 'capacite_atteinte', label: 'Effectif maximum de la classe atteint' },
  { value: 'doublon_etablissement', label: 'Élève déjà inscrit dans cet établissement' },
  { value: 'irregularite_dossier', label: 'Irrégularité dans le dossier' },
  { value: 'autre', label: 'Autre motif', requiresPrecision: true },
];

interface MotifRefusSelectProps {
  visible: boolean;
  selectedMotifs?: string[];  // ✅ Changé: tableau de motifs
  motifPrecision?: string;
  onSelect: (motifs: string[], message: string) => void;  // ✅ Changé: reçoit tableau
  onClose: () => void;
}

export default function MotifRefusSelect({
  visible,
  selectedMotifs = [],
  motifPrecision = '',
  onSelect,
  onClose,
}: MotifRefusSelectProps) {
  // ✅ État pour les motifs sélectionnés (tableau)
  const [tempMotifs, setTempMotifs] = useState<string[]>(selectedMotifs);
  const [tempPrecision, setTempPrecision] = useState(motifPrecision);
  const [showAutreInput, setShowAutreInput] = useState(false);

  // Réinitialiser quand le modal s'ouvre
  useEffect(() => {
    if (visible) {
      setTempMotifs(selectedMotifs);
      setTempPrecision(motifPrecision);
      setShowAutreInput(selectedMotifs.includes('autre'));
    }
  }, [visible, selectedMotifs, motifPrecision]);

  // Ajouter ou retirer un motif
  const toggleMotif = (motifValue: string) => {
    if (tempMotifs.includes(motifValue)) {
      setTempMotifs(tempMotifs.filter(m => m !== motifValue));
      if (motifValue === 'autre') {
        setShowAutreInput(false);
        setTempPrecision('');
      }
    } else {
      setTempMotifs([...tempMotifs, motifValue]);
      if (motifValue === 'autre') {
        setShowAutreInput(true);
      }
    }
  };

  // Construire le message final
  const buildFinalMessage = (): string => {
    const selectedMotifsData = MOTIFS_REFUS.filter(m => tempMotifs.includes(m.value));
    const labels = selectedMotifsData.map(m => m.label);
    
    if (showAutreInput && tempPrecision.trim()) {
      return `${labels.filter(l => l !== 'Autre motif').join(', ')}${labels.includes('Autre motif') ? `, Autre: ${tempPrecision.trim()}` : ''}`;
    }
    
    return labels.join(', ');
  };

  const handleConfirm = () => {
    if (tempMotifs.length === 0) return;
    
    // Vérifier que "Autre" a une précision si sélectionné
    if (tempMotifs.includes('autre') && !tempPrecision.trim()) {
      return;
    }
    
    const finalMessage = buildFinalMessage();
    onSelect(tempMotifs, finalMessage);
    onClose();
  };

  const handleReset = () => {
    setTempMotifs([]);
    setTempPrecision('');
    setShowAutreInput(false);
  };

  const isSelected = (motifValue: string) => tempMotifs.includes(motifValue);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Motifs du refus</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.label}>Sélectionnez un ou plusieurs motifs *</Text>
            
            {MOTIFS_REFUS.map((motif) => (
              <TouchableOpacity
                key={motif.value}
                style={[
                  styles.motifOption,
                  isSelected(motif.value) && styles.motifOptionActive,
                ]}
                onPress={() => toggleMotif(motif.value)}
              >
                <View style={styles.checkboxContainer}>
                  <View style={[
                    styles.checkbox,
                    isSelected(motif.value) && styles.checkboxActive
                  ]}>
                    {isSelected(motif.value) && <Check size={12} color="#FFFFFF" />}
                  </View>
                  <Text
                    style={[
                      styles.motifOptionText,
                      isSelected(motif.value) && styles.motifOptionTextActive,
                    ]}
                  >
                    {motif.label}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            {showAutreInput && (
              <View style={styles.precisionContainer}>
                <Text style={styles.label}>Précisez le motif *</Text>
                <TextInput
                  style={styles.precisionInput}
                  placeholder="Ex: Document d'identité manquant, Âge non vérifié..."
                  value={tempPrecision}
                  onChangeText={setTempPrecision}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                handleReset();
                onClose();
              }}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmButton,
                (tempMotifs.length === 0 || (tempMotifs.includes('autre') && !tempPrecision.trim())) &&
                  styles.confirmButtonDisabled,
              ]}
              onPress={handleConfirm}
              disabled={
                tempMotifs.length === 0 ||
                (tempMotifs.includes('autre') && !tempPrecision.trim())
              }
            >
              <Text style={styles.confirmButtonText}>Confirmer le refus</Text>
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
    maxWidth: 400,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  motifOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  motifOptionActive: {
    backgroundColor: '#EFF6FF',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
    borderColor: theme.colors.primary.DEFAULT,
  },
  motifOptionText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  motifOptionTextActive: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  precisionContainer: {
    marginTop: 16,
  },
  precisionInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
    minHeight: 80,
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
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});