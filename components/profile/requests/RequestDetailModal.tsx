import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { X, Mail, Phone, MapPin, Building2, FileText, Calendar, User, Briefcase, Handshake } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import theme from '@/constants/theme';

interface RequestDetailModalProps {
  visible: boolean;
  request: any;
  type: 'role' | 'etablissement' | 'partenariat';
  onClose: () => void;
  onRefresh?: () => void;
}

export default function RequestDetailModal({ visible, request, type, onClose, onRefresh }: RequestDetailModalProps) {
  const { user } = useAuth();

  if (!request) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (statut: string) => {
    switch (statut) {
      case 'en_attente': return '#F59E0B';
      case 'en_cours': return '#3B82F6';
      case 'valide': return '#10B981';
      case 'rejete': return '#EF4444';
      case 'annule': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (statut: string) => {
    switch (statut) {
      case 'en_attente': return 'En attente';
      case 'en_cours': return 'En cours';
      case 'valide': return 'Validé';
      case 'rejete': return 'Rejeté';
      case 'annule': return 'Annulé';
      default: return statut;
    }
  };

  const handleCancel = async () => {
    Alert.alert(
      'Annuler la demande',
      'Êtes-vous sûr de vouloir annuler cette demande ?',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui',
          style: 'destructive',
          onPress: async () => {
            let table = '';
            let idField = 'id';

            if (type === 'role') {
              table = 'demandes_role';
            } else if (type === 'etablissement') {
              table = 'demandes_etablissement';
              idField = 'id';
            } else {
              table = 'demandes_partenariat';
              idField = 'id';
            }

            const { error } = await supabase
              .from(table)
              .update({ statut: 'annule' })
              .eq(idField, request.id);

            if (error) {
              Alert.alert('Erreur', 'Impossible d\'annuler la demande');
            } else {
              Alert.alert('Succès', 'Demande annulée');
              if (onRefresh) onRefresh();
              onClose();
            }
          },
        },
      ]
    );
  };

  const renderRoleContent = () => {
    const metadata = request.metadata || {};
    return (
      <>
        <View style={styles.infoRow}>
          <User size={16} color={theme.colors.neutral[500]} />
          <Text style={styles.infoText}>Rôle demandé: {request.role_souhaite}</Text>
        </View>
        {metadata.institution_nom && (
          <View style={styles.infoRow}>
            <Building2 size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.infoText}>Institution: {metadata.institution_nom}</Text>
          </View>
        )}
        {metadata.fonction && (
          <View style={styles.infoRow}>
            <Briefcase size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.infoText}>Fonction: {metadata.fonction}</Text>
          </View>
        )}
        {metadata.organisation_nom && (
          <View style={styles.infoRow}>
            <Handshake size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.infoText}>Organisation: {metadata.organisation_nom}</Text>
          </View>
        )}
        {request.message && (
          <View style={styles.messageContainer}>
            <Text style={styles.messageLabel}>Message :</Text>
            <Text style={styles.messageText}>{request.message}</Text>
          </View>
        )}
        {request.justificatif_url && (
          <TouchableOpacity
            style={styles.justificatifButton}
            onPress={() => Linking.openURL(request.justificatif_url)}
          >
            <FileText size={16} color={theme.colors.primary.DEFAULT} />
            <Text style={styles.justificatifText}>Voir le justificatif</Text>
          </TouchableOpacity>
        )}
      </>
    );
  };

  const renderEtablissementContent = () => {
    return (
      <>
        <View style={styles.infoRow}>
          <Building2 size={16} color={theme.colors.neutral[500]} />
          <Text style={styles.infoText}>Établissement: {request.nom_etablissement}</Text>
        </View>
        <View style={styles.infoRow}>
          <MapPin size={16} color={theme.colors.neutral[500]} />
          <Text style={styles.infoText}>Ville: {request.ville}</Text>
        </View>
        <View style={styles.infoRow}>
          <MapPin size={16} color={theme.colors.neutral[500]} />
          <Text style={styles.infoText}>Adresse: {request.adresse}</Text>
        </View>
        <View style={styles.infoRow}>
          <Phone size={16} color={theme.colors.neutral[500]} />
          <Text style={styles.infoText}>Téléphone: {request.telephone}</Text>
        </View>
        <View style={styles.infoRow}>
          <Mail size={16} color={theme.colors.neutral[500]} />
          <Text style={styles.infoText}>Email: {request.email_contact}</Text>
        </View>
        <View style={styles.infoRow}>
          <FileText size={16} color={theme.colors.neutral[500]} />
          <Text style={styles.infoText}>Plan souhaité: {request.plan_souhaite}</Text>
        </View>
        {request.message_demandeur && (
          <View style={styles.messageContainer}>
            <Text style={styles.messageLabel}>Message :</Text>
            <Text style={styles.messageText}>{request.message_demandeur}</Text>
          </View>
        )}
        {request.commentaire_admin && (
          <View style={styles.messageContainer}>
            <Text style={styles.messageLabel}>Commentaire admin :</Text>
            <Text style={styles.messageText}>{request.commentaire_admin}</Text>
          </View>
        )}
      </>
    );
  };

  const renderPartenariatContent = () => {
    return (
      <>
        <View style={styles.infoRow}>
          <Building2 size={16} color={theme.colors.neutral[500]} />
          <Text style={styles.infoText}>Organisation: {request.organisation_nom}</Text>
        </View>
        <View style={styles.infoRow}>
          <Briefcase size={16} color={theme.colors.neutral[500]} />
          <Text style={styles.infoText}>Type: {request.type_partenaire}</Text>
        </View>
        <View style={styles.infoRow}>
          <User size={16} color={theme.colors.neutral[500]} />
          <Text style={styles.infoText}>Contact: {request.contact_nom}</Text>
        </View>
        <View style={styles.infoRow}>
          <Mail size={16} color={theme.colors.neutral[500]} />
          <Text style={styles.infoText}>Email: {request.contact_email}</Text>
        </View>
        <View style={styles.infoRow}>
          <Phone size={16} color={theme.colors.neutral[500]} />
          <Text style={styles.infoText}>Téléphone: {request.contact_telephone}</Text>
        </View>
        <View style={styles.infoRow}>
          <Handshake size={16} color={theme.colors.neutral[500]} />
          <Text style={styles.infoText}>Collaboration: {request.type_collaboration}</Text>
        </View>
        {request.proposition && (
          <View style={styles.messageContainer}>
            <Text style={styles.messageLabel}>Proposition :</Text>
            <Text style={styles.messageText}>{request.proposition}</Text>
          </View>
        )}
        {request.notes_internes && (
          <View style={styles.messageContainer}>
            <Text style={styles.messageLabel}>Notes internes :</Text>
            <Text style={styles.messageText}>{request.notes_internes}</Text>
          </View>
        )}
      </>
    );
  };

  const isCancelable = request.statut === 'en_attente' || request.statut === 'en_cours';

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
            {type === 'role' && 'Demande de rôle'}
            {type === 'etablissement' && 'Demande d\'établissement'}
            {type === 'partenariat' && 'Demande de partenariat'}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={theme.colors.neutral[600]} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.statusContainer}>
            <Text style={[styles.statusText, { color: getStatusColor(request.statut) }]}>
              {getStatusLabel(request.statut)}
            </Text>
          </View>

          {type === 'role' && renderRoleContent()}
          {type === 'etablissement' && renderEtablissementContent()}
          {type === 'partenariat' && renderPartenariatContent()}

          <View style={styles.dateContainer}>
            <Calendar size={14} color={theme.colors.neutral[400]} />
            <Text style={styles.dateText}>
              Demandé le {formatDate(request.created_at)}
            </Text>
          </View>

          {isCancelable && (
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Annuler la demande</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
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
  modalContent: {
    padding: 20,
  },
  statusContainer: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  messageContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  messageLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },
  messageText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  justificatifButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 8,
  },
  justificatifText: {
    fontSize: 13,
    color: theme.colors.primary.DEFAULT,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  cancelButton: {
    marginTop: 20,
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
});