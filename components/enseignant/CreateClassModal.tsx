import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useState } from 'react';
import { X, Building2, BookOpen } from 'lucide-react-native';
import { useTeacherCahier } from '@/hooks/useTeacherCahier';
import theme from '@/constants/theme';

interface CreateClassModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  etablissements: { id: string; etablissement_nom: string }[];
}

export default function CreateClassModal({ visible, onClose, onSuccess, etablissements }: CreateClassModalProps) {
  const { createClasse, loading } = useTeacherCahier();
  const [nom, setNom] = useState('');
  const [niveau, setNiveau] = useState('');
  const [selectedEtablissementId, setSelectedEtablissementId] = useState<string | null>(null);
  const [isPersonnel, setIsPersonnel] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const niveaux = ['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Tle', 'Autre'];

  const handleSubmit = async () => {
    if (!nom.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un nom pour la classe');
      return;
    }

    if (!niveau) {
      Alert.alert('Erreur', 'Veuillez sélectionner un niveau');
      return;
    }

    setSubmitting(true);
    const result = await createClasse(
      nom.trim(),
      niveau,
      !isPersonnel && selectedEtablissementId ? selectedEtablissementId : undefined
    );
    setSubmitting(false);

    if (result.success) {
      Alert.alert('Succès', 'Classe créée avec succès');
      setNom('');
      setNiveau('');
      setSelectedEtablissementId(null);
      setIsPersonnel(true);
      onSuccess();
    } else {
      Alert.alert('Erreur', result.error || 'Impossible de créer la classe');
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nouvelle classe</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color={theme.colors.neutral[600]} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.inputLabel}>Nom de la classe *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Cours du soir - 3ème"
              value={nom}
              onChangeText={setNom}
            />

            <Text style={styles.inputLabel}>Niveau *</Text>
            <View style={styles.niveauxContainer}>
              {niveaux.map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.niveauTag, niveau === n && styles.niveauTagActive]}
                  onPress={() => setNiveau(n)}
                >
                  <Text style={[styles.niveauTagText, niveau === n && styles.niveauTagTextActive]}>
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Type de classe</Text>
            <View style={styles.typeContainer}>
              <TouchableOpacity
                style={[styles.typeButton, isPersonnel && styles.typeButtonActive]}
                onPress={() => setIsPersonnel(true)}
              >
                <BookOpen size={16} color={isPersonnel ? '#FFFFFF' : '#6B7280'} />
                <Text style={[styles.typeButtonText, isPersonnel && styles.typeButtonTextActive]}>
                  Personnel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, !isPersonnel && styles.typeButtonActive]}
                onPress={() => setIsPersonnel(false)}
              >
                <Building2 size={16} color={!isPersonnel ? '#FFFFFF' : '#6B7280'} />
                <Text style={[styles.typeButtonText, !isPersonnel && styles.typeButtonTextActive]}>
                  Rattacher
                </Text>
              </TouchableOpacity>
            </View>

            {!isPersonnel && etablissements.length > 0 && (
              <>
                <Text style={styles.inputLabel}>Établissement *</Text>
                <View style={styles.etablissementsContainer}>
                  {etablissements.map((etab) => (
                    <TouchableOpacity
                      key={etab.id}
                      style={[
                        styles.etablissementTag,
                        selectedEtablissementId === etab.id && styles.etablissementTagActive,
                      ]}
                      onPress={() => setSelectedEtablissementId(etab.id)}
                    >
                      <Building2 size={14} color={selectedEtablissementId === etab.id ? '#FFFFFF' : '#6B7280'} />
                      <Text style={[
                        styles.etablissementTagText,
                        selectedEtablissementId === etab.id && styles.etablissementTagTextActive,
                      ]}>
                        {etab.etablissement_nom}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {!isPersonnel && etablissements.length === 0 && (
              <View style={styles.infoContainer}>
                <Text style={styles.infoText}>
                  ℹ️ Vous n'êtes rattaché à aucun établissement. La classe sera créée comme classe personnelle.
                </Text>
              </View>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, (!nom || !niveau || submitting) && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={!nom || !niveau || submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>Créer</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
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
  niveauxContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  niveauTag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  niveauTagActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  niveauTagText: {
    fontSize: 13,
    color: '#6B7280',
  },
  niveauTagTextActive: {
    color: '#FFFFFF',
  },
  typeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
  },
  typeButtonActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  typeButtonText: {
    fontSize: 13,
    color: '#6B7280',
  },
  typeButtonTextActive: {
    color: '#FFFFFF',
  },
  etablissementsContainer: {
    gap: 8,
    marginBottom: 16,
  },
  etablissementTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
  },
  etablissementTagActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  etablissementTagText: {
    fontSize: 13,
    color: '#6B7280',
  },
  etablissementTagTextActive: {
    color: '#FFFFFF',
  },
  infoContainer: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 12,
    color: '#1E40AF',
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
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
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});