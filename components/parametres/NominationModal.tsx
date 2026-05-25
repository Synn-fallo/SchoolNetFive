// /home/project/components/parametres/NominationModal.tsx
// Version corrigée – avec etablissementId en prop

import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { useState } from 'react';
import { X, Users, BookOpen, DollarSign, Briefcase, Shield, CheckCircle, AlertCircle } from 'lucide-react-native';
import UserSearchInput from '@/components/common/UserSearchInput';
import { UserSearchResult } from '@/utils/userSearch';
import { useNominations } from '@/hooks/useNominations';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/Button';
import theme from '@/constants/theme';

interface NominationModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  etablissementId?: string;  // 🆕 Ajouté
}

// Catégories de rôles
const ROLE_CATEGORIES = [
  {
    id: 'pedagogique',
    title: '📚 Pédagogique',
    icon: BookOpen,
    roles: [
      { value: 'de', label: 'Directeur des Études (DE)', description: 'Supervision pédagogique globale' },
      { value: 'ae', label: 'Animateur d\'Établissement (AE)', description: 'Gestion d\'un département (avec plafond)' },
    ],
  },
  {
    id: 'financier',
    title: '💰 Financier',
    icon: DollarSign,
    roles: [
      { value: 'comptable', label: 'Comptable', description: 'Gestion complète des finances, états OHADA' },
      { value: 'caissier', label: 'Caissier', description: 'Encaissements, reçus, clôture caisse, bordereaux' },
      { value: 'assistant_comptable', label: 'Assistant comptable', description: 'Saisie factures, rapprochement, fiscalité' },
    ],
  },
  {
    id: 'administratif',
    title: '📋 Administratif',
    icon: Briefcase,
    roles: [
      { value: 'administratif', label: 'Personnel Administratif', description: 'Inscriptions, paiements, documents' },
    ],
  },
  {
    id: 'vie_scolaire',
    title: '🛡️ Vie scolaire',
    icon: Shield,
    roles: [
      { value: 'vie_scolaire', label: 'Personnel Vie Scolaire', description: 'Absences, incidents, discipline' },
    ],
  },
];

// Champs supplémentaires selon le rôle
const getExtraFields = (roleValue: string) => {
  switch (roleValue) {
    case 'ae':
      return {
        showDepartement: true,
        showPlafond: true,
        plafondLabel: 'Plafond d\'enseignants',
      };
    default:
      return {
        showDepartement: false,
        showPlafond: false,
        plafondLabel: '',
      };
  }
};

// Obtenir le libellé du rôle
const getRoleLabel = (roleValue: string): string => {
  for (const category of ROLE_CATEGORIES) {
    const role = category.roles.find(r => r.value === roleValue);
    if (role) return role.label;
  }
  return roleValue;
};

export default function NominationModal({ visible, onClose, onSuccess, etablissementId }: NominationModalProps) {
  const { refreshProfile } = useAuth();
  const { nominateRole, loading, error } = useNominations();
  
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [justification, setJustification] = useState('');
  const [departement, setDepartement] = useState('');
  const [plafond, setPlafond] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleReset = () => {
    setSelectedUser(null);
    setSelectedRole(null);
    setJustification('');
    setDepartement('');
    setPlafond('');
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  // Afficher la modal de confirmation
  const handleShowConfirm = () => {
    if (!selectedUser) {
      Alert.alert('Information', 'Veuillez sélectionner un utilisateur');
      return;
    }

    if (!selectedRole) {
      Alert.alert('Information', 'Veuillez sélectionner un rôle');
      return;
    }

    if (!etablissementId) {
      Alert.alert('Erreur', 'Établissement non identifié');
      return;
    }

    setShowConfirmModal(true);
  };

  // Exécuter la nomination après confirmation
  const handleNominate = async () => {
    if (!selectedUser || !selectedRole) return;
    if (!etablissementId) {
      Alert.alert('Erreur', 'Établissement non identifié');
      return;
    }

    console.log('🔵 Nomination - début');
    console.log('🔵 selectedUser:', selectedUser.id, selectedUser.email);
    console.log('🔵 selectedRole:', selectedRole);
    console.log('🔵 etablissementId:', etablissementId);
    console.log('🔵 justification:', justification);
    console.log('🔵 departement:', departement);
    console.log('🔵 plafond:', plafond);

    setIsSubmitting(true);
    setShowConfirmModal(false);

    try {
      const extraFields = getExtraFields(selectedRole);
      
      // Passer etablissementId à nominateRole ?
      // La fonction nominateRole dans useNominations doit accepter etablissementId
      // Pour l'instant, on suppose qu'elle utilise activeEtablissementId du contexte
      // Mais on peut modifier le hook pour accepter un paramètre
      
      const success = await nominateRole(
        selectedUser.id,
        selectedRole,
        justification || undefined,
        extraFields.showDepartement ? departement || undefined : undefined,
        extraFields.showPlafond ? (plafond ? parseInt(plafond) : undefined) : undefined,
        etablissementId
      );

      console.log('🔵 nominateRole - success:', success);
      console.log('🔵 nominateRole - error:', error);

      if (success) {
        Alert.alert(
          'Succès',
          `${selectedUser.prenom} ${selectedUser.nom} a été nommé(e) avec succès.`,
          [{ text: 'OK', onPress: () => { 
            handleClose(); 
            refreshProfile(); 
            onSuccess?.(); 
          } }]
        );
      } else {
        Alert.alert('Erreur', error || 'Impossible de nommer le collaborateur');
      }
    } catch (err) {
      console.error('🔴 Nomination error:', err);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const extraFields = selectedRole ? getExtraFields(selectedRole) : null;
  const isValid = selectedUser !== null && selectedRole !== null;

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* En-tête */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Users size={22} color={theme.colors.primary.DEFAULT} />
                <Text style={styles.modalTitle}>Nommer un collaborateur</Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <X size={22} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* 1. Recherche utilisateur */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>1. Rechercher l'utilisateur</Text>
                <UserSearchInput
                  onUserSelected={setSelectedUser}
                  onUserCleared={() => setSelectedUser(null)}
                  placeholder="Email de l'utilisateur"
                />
                {selectedUser && (
                  <View style={styles.selectedUserInfo}>
                    <Text style={styles.selectedUserName}>
                      {selectedUser.prenom} {selectedUser.nom}
                    </Text>
                    <Text style={styles.selectedUserEmail}>{selectedUser.email}</Text>
                  </View>
                )}
              </View>

              {/* 2. Sélection du rôle */}
              {selectedUser && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>2. Choisir le rôle</Text>
                  {ROLE_CATEGORIES.map((category) => (
                    <View key={category.id} style={styles.categoryContainer}>
                      <View style={styles.categoryHeader}>
                        <category.icon size={18} color={theme.colors.neutral[600]} />
                        <Text style={styles.categoryTitle}>{category.title}</Text>
                      </View>
                      <View style={styles.rolesContainer}>
                        {category.roles.map((role) => {
                          const isSelected = selectedRole === role.value;
                          return (
                            <TouchableOpacity
                              key={role.value}
                              style={[styles.roleOption, isSelected && styles.roleOptionActive]}
                              onPress={() => setSelectedRole(role.value)}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.roleLabel, isSelected && styles.roleLabelActive]}>
                                  {role.label}
                                </Text>
                                <Text style={styles.roleDescription}>{role.description}</Text>
                              </View>
                              {isSelected && (
                                <CheckCircle size={16} color={theme.colors.primary.DEFAULT} />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* 3. Champs supplémentaires (AE) */}
              {selectedUser && selectedRole && extraFields && extraFields.showDepartement && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>3. Informations complémentaires</Text>
                  
                  {extraFields.showDepartement && (
                    <>
                      <Text style={styles.inputLabel}>Département (optionnel)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Ex: Sciences, Lettres, Génie Mécanique"
                        value={departement}
                        onChangeText={setDepartement}
                      />
                    </>
                  )}

                  {extraFields.showPlafond && (
                    <>
                      <Text style={styles.inputLabel}>Plafond d'enseignants (optionnel)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Nombre maximum d'enseignants"
                        value={plafond}
                        onChangeText={setPlafond}
                        keyboardType="numeric"
                      />
                      <Text style={styles.hintText}>Laissez vide pour un plafond par défaut</Text>
                    </>
                  )}
                </View>
              )}

              {/* 4. Justification */}
              {selectedUser && selectedRole && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>4. Justification (optionnelle)</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Motif de la nomination..."
                    multiline
                    numberOfLines={3}
                    value={justification}
                    onChangeText={setJustification}
                    textAlignVertical="top"
                  />
                </View>
              )}

              {/* Boutons d'action */}
              {selectedUser && selectedRole && (
                <View style={styles.buttonsContainer}>
                  <Button
                    title="Annuler"
                    onPress={handleClose}
                    variant="secondary"
                    style={styles.cancelButton}
                  />
                  <Button
                    title={isSubmitting || loading ? "Nomination en cours..." : "Nommer"}
                    onPress={handleShowConfirm}
                    variant="primary"
                    style={styles.submitButton}
                    disabled={isSubmitting || loading || !isValid}
                  />
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de confirmation personnalisée avec récapitulatif */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmContainer}>
            <View style={styles.confirmHeader}>
              <AlertCircle size={24} color={theme.colors.secondary.DEFAULT} />
              <Text style={styles.confirmTitle}>Confirmer la nomination</Text>
              <TouchableOpacity onPress={() => setShowConfirmModal(false)} style={styles.confirmClose}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.confirmMessage}>Vous êtes sur le point de nommer ce collaborateur :</Text>

            <View style={styles.confirmDetails}>
              <View style={styles.confirmDetailRow}>
                <Text style={styles.confirmDetailLabel}>Collaborateur :</Text>
                <Text style={styles.confirmDetailValue}>
                  {selectedUser?.prenom} {selectedUser?.nom}
                </Text>
              </View>
              <View style={styles.confirmDetailRow}>
                <Text style={styles.confirmDetailLabel}>Email :</Text>
                <Text style={styles.confirmDetailValue}>{selectedUser?.email}</Text>
              </View>
              <View style={styles.confirmDetailRow}>
                <Text style={styles.confirmDetailLabel}>Rôle :</Text>
                <Text style={styles.confirmDetailValue}>{selectedRole ? getRoleLabel(selectedRole) : ''}</Text>
              </View>
              {departement ? (
                <View style={styles.confirmDetailRow}>
                  <Text style={styles.confirmDetailLabel}>Département :</Text>
                  <Text style={styles.confirmDetailValue}>{departement}</Text>
                </View>
              ) : null}
              {plafond ? (
                <View style={styles.confirmDetailRow}>
                  <Text style={styles.confirmDetailLabel}>Plafond :</Text>
                  <Text style={styles.confirmDetailValue}>{plafond} enseignant(s)</Text>
                </View>
              ) : null}
              {justification ? (
                <View style={styles.confirmDetailRow}>
                  <Text style={styles.confirmDetailLabel}>Justification :</Text>
                  <Text style={styles.confirmDetailValue}>{justification}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmCancelButton]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.confirmCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.confirmSubmitButton]}
                onPress={handleNominate}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmSubmitText}>Nommer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  modalContainer: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
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
    backgroundColor: '#FFFFFF',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  selectedUserInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.colors.primary.light,
  },
  selectedUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  selectedUserEmail: {
    fontSize: 12,
    color: '#6B7280',
  },
  categoryContainer: {
    marginBottom: 20,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  rolesContainer: {
    gap: 8,
  },
  roleOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  roleOptionActive: {
    backgroundColor: '#EFF6FF',
    borderColor: theme.colors.primary.DEFAULT,
  },
  roleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  roleLabelActive: {
    color: theme.colors.primary.DEFAULT,
  },
  roleDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  hintText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 8,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmContainer: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  confirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 12,
  },
  confirmClose: {
    padding: 4,
  },
  confirmMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  confirmDetails: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  confirmDetailRow: {
    marginBottom: 10,
  },
  confirmDetailLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 2,
  },
  confirmDetailValue: {
    fontSize: 14,
    color: '#1F2937',
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmCancelButton: {
    backgroundColor: '#F3F4F6',
  },
  confirmCancelText: {
    fontSize: 14,
    color: '#6B7280',
  },
  confirmSubmitButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  confirmSubmitText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
