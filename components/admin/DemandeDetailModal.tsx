import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Linking } from 'react-native';
import { useState } from 'react';
import { X, CheckCircle, XCircle, FileText, Eye, Download, User, Mail, Phone, Building2, MapPin, Briefcase } from 'lucide-react-native';
import { DemandeRole } from '@/hooks/useAdminDemandes';
import theme from '@/constants/theme';

interface DemandeDetailModalProps {
  visible: boolean;
  demande: DemandeRole | null;
  onClose: () => void;
  onValidate: (demandeId: string, commentaire?: string) => Promise<boolean>;
  onReject: (demandeId: string, motif: string) => Promise<boolean>;
  isLoading?: boolean;
}

const getRoleLabel = (role: string): string => {
  switch (role) {
    case 'chef_etablissement': return 'Chef d\'établissement';
    case 'autorite': return 'Autorité';
    case 'partenaire': return 'Partenaire';
    default: return role;
  }
};

export default function DemandeDetailModal({
  visible,
  demande,
  onClose,
  onValidate,
  onReject,
  isLoading = false,
}: DemandeDetailModalProps) {
  const [rejectMotif, setRejectMotif] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [validating, setValidating] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  if (!demande) return null;

  const handleValidate = async () => {
    setValidating(true);
    const success = await onValidate(demande.id);
    setValidating(false);
    if (success) {
      Alert.alert('Succès', 'La demande a été validée et le rôle a été attribué.');
      onClose();
    }
  };

  const handleReject = async () => {
    if (!rejectMotif.trim()) {
      Alert.alert('Motif requis', 'Veuillez indiquer un motif de rejet.');
      return;
    }
    setRejecting(true);
    const success = await onReject(demande.id, rejectMotif);
    setRejecting(false);
    if (success) {
      Alert.alert('Succès', 'La demande a été rejetée.');
      setShowRejectInput(false);
      setRejectMotif('');
      onClose();
    }
  };

  const openJustificatif = () => {
    if (demande.justificatif_url) {
      Linking.openURL(demande.justificatif_url);
    }
  };

  const renderMetadata = () => {
    const metadata = demande.metadata || {};
    
    if (demande.role_souhaite === 'chef_etablissement') {
      return (
        <View style={styles.metadataSection}>
          <Text style={styles.metadataTitle}>Informations du demandeur</Text>
          <View style={styles.metadataItem}>
            <User size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.metadataText}>
              Nom complet: {metadata.user_prenom || ''} {metadata.user_nom || 'Non renseigné'}
            </Text>
          </View>
          <View style={styles.metadataItem}>
            <Mail size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.metadataText}>Email: {metadata.user_email || 'Non renseigné'}</Text>
          </View>
          <View style={styles.metadataItem}>
            <Phone size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.metadataText}>Téléphone: {metadata.user_telephone || 'Non renseigné'}</Text>
          </View>
          {/* Plus d'informations établissement - la création d'établissement est séparée */}
        </View>
      );
    }
    
    if (demande.role_souhaite === 'autorite') {
      return (
        <View style={styles.metadataSection}>
          <Text style={styles.metadataTitle}>Informations autorité</Text>
          <View style={styles.metadataItem}>
            <User size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.metadataText}>Nom: {metadata.user_prenom || ''} {metadata.user_nom || 'Non renseigné'}</Text>
          </View>
          <View style={styles.metadataItem}>
            <Mail size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.metadataText}>Email: {metadata.user_email || 'Non renseigné'}</Text>
          </View>
          <View style={styles.metadataItem}>
            <Phone size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.metadataText}>Téléphone: {metadata.user_telephone || 'Non renseigné'}</Text>
          </View>
          <View style={styles.metadataItem}>
            <Building2 size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.metadataText}>Institution: {metadata.institution_nom || 'Non renseignée'}</Text>
          </View>
          <View style={styles.metadataItem}>
            <Briefcase size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.metadataText}>Fonction: {metadata.fonction || 'Non renseignée'}</Text>
          </View>
        </View>
      );
    }
    
    if (demande.role_souhaite === 'partenaire') {
      return (
        <View style={styles.metadataSection}>
          <Text style={styles.metadataTitle}>Informations partenaire</Text>
          <View style={styles.metadataItem}>
            <User size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.metadataText}>Nom: {metadata.user_prenom || ''} {metadata.user_nom || 'Non renseigné'}</Text>
          </View>
          <View style={styles.metadataItem}>
            <Mail size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.metadataText}>Email: {metadata.user_email || 'Non renseigné'}</Text>
          </View>
          <View style={styles.metadataItem}>
            <Phone size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.metadataText}>Téléphone: {metadata.user_telephone || 'Non renseigné'}</Text>
          </View>
          <View style={styles.metadataItem}>
            <Building2 size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.metadataText}>Organisation: {metadata.organisation_nom || 'Non renseignée'}</Text>
          </View>
          <View style={styles.metadataItem}>
            <Briefcase size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.metadataText}>Secteur: {metadata.secteur || 'Non renseigné'}</Text>
          </View>
        </View>
      );
    }
    
    return null;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            Demande {getRoleLabel(demande.role_souhaite)}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={theme.colors.neutral[600]} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {/* Métadonnées spécifiques */}
          {renderMetadata()}

          {/* Message complémentaire */}
          {demande.message && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📌 Message complémentaire</Text>
              <Text style={styles.messageText}>{demande.message}</Text>
            </View>
          )}

          {/* Justificatif */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📌 Pièce justificative</Text>
            {demande.justificatif_url ? (
              <TouchableOpacity style={styles.justificatifButton} onPress={openJustificatif}>
                <FileText size={20} color={theme.colors.primary.DEFAULT} />
                <Text style={styles.justificatifText}>Voir le justificatif</Text>
                <Eye size={16} color={theme.colors.primary.DEFAULT} />
              </TouchableOpacity>
            ) : (
              <Text style={styles.noJustificatif}>Aucun justificatif fourni</Text>
            )}
          </View>

          {/* Date de demande */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📌 Date de demande</Text>
            <Text style={styles.dateText}>
              {new Date(demande.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          {/* Actions admin */}
          {demande.statut === 'en_attente' && (
            <View style={styles.actionsSection}>
              <TouchableOpacity
                style={[styles.validateButton, (validating || isLoading) && styles.buttonDisabled]}
                onPress={handleValidate}
                disabled={validating || isLoading}
              >
                {validating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <CheckCircle size={18} color="#FFFFFF" />
                    <Text style={styles.validateButtonText}>Valider la demande</Text>
                  </>
                )}
              </TouchableOpacity>

              {!showRejectInput ? (
                <TouchableOpacity
                  style={styles.rejectButton}
                  onPress={() => setShowRejectInput(true)}
                  disabled={isLoading}
                >
                  <XCircle size={18} color={theme.colors.danger.DEFAULT} />
                  <Text style={styles.rejectButtonText}>Rejeter</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.rejectInputContainer}>
                  <TextInput
                    style={styles.rejectInput}
                    placeholder="Motif du rejet..."
                    value={rejectMotif}
                    onChangeText={setRejectMotif}
                    multiline
                    numberOfLines={3}
                  />
                  <View style={styles.rejectActions}>
                    <TouchableOpacity
                      style={styles.cancelRejectButton}
                      onPress={() => {
                        setShowRejectInput(false);
                        setRejectMotif('');
                      }}
                    >
                      <Text style={styles.cancelRejectText}>Annuler</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.confirmRejectButton}
                      onPress={handleReject}
                      disabled={rejecting}
                    >
                      {rejecting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.confirmRejectText}>Confirmer le rejet</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          )}

          {demande.statut !== 'en_attente' && demande.commentaire_admin && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {demande.statut === 'valide' ? '✅ Commentaire de validation' : '❌ Motif du rejet'}
              </Text>
              <Text style={styles.commentText}>{demande.commentaire_admin}</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.neutral[800],
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.neutral[700],
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.neutral[600],
    flex: 1,
  },
  metadataSection: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  metadataTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.neutral[700],
    marginBottom: 12,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  metadataText: {
    fontSize: 13,
    color: theme.colors.neutral[600],
    flex: 1,
  },
  messageText: {
    fontSize: 14,
    color: theme.colors.neutral[600],
    lineHeight: 20,
  },
  justificatifButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  justificatifText: {
    fontSize: 14,
    color: theme.colors.primary.DEFAULT,
    flex: 1,
  },
  noJustificatif: {
    fontSize: 14,
    color: theme.colors.neutral[400],
    fontStyle: 'italic',
  },
  dateText: {
    fontSize: 14,
    color: theme.colors.neutral[600],
  },
  actionsSection: {
    gap: 12,
    marginBottom: 16,
  },
  validateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.success.DEFAULT,
    borderRadius: 12,
    paddingVertical: 14,
  },
  validateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: theme.colors.danger.DEFAULT,
  },
  rejectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.danger.DEFAULT,
  },
  rejectInputContainer: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.danger.DEFAULT,
  },
  rejectInput: {
    backgroundColor: theme.colors.neutral[50],
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: theme.colors.neutral[800],
    textAlignVertical: 'top',
    minHeight: 80,
  },
  rejectActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  cancelRejectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelRejectText: {
    fontSize: 14,
    color: theme.colors.neutral[500],
  },
  confirmRejectButton: {
    backgroundColor: theme.colors.danger.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmRejectText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  commentText: {
    fontSize: 14,
    color: theme.colors.neutral[600],
    lineHeight: 20,
  },
});