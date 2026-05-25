import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, TouchableOpacity, Modal } from 'react-native';
import { useState } from 'react';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import RequestStatus from './RequestStatus';
import { supabase } from '@/lib/supabase';

interface AdminRequestReviewProps {
  request: any;
  type: 'etablissement' | 'partenariat';
  onProcessed: () => void;
  onClose: () => void;
}

export default function AdminRequestReview({ request, type, onProcessed, onClose }: AdminRequestReviewProps) {
  const [commentaire, setCommentaire] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [pendingAction, setPendingAction] = useState<'valider' | 'rejeter' | null>(null);

  const showConfirmModal = (action: 'valider' | 'rejeter') => {
    setPendingAction(action);
    setConfirmModalVisible(true);
  };

  const handleConfirm = async () => {
    if (!pendingAction) return;
    
    setConfirmModalVisible(false);
    setProcessing(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('process-institution-request', {
        body: {
          request_id: request.id,
          request_type: type,
          action: pendingAction,
          commentaire: commentaire || null,
        },
      });
      
      if (error) {
        throw new Error(error.message || 'Erreur lors de l\'appel');
      }
      
      if (data?.success) {
        const successMessage = pendingAction === 'valider' 
          ? 'La demande a été validée avec succès.' 
          : 'La demande a été rejetée.';
        
        Alert.alert('Succès', successMessage, [
          { 
            text: 'OK', 
            onPress: () => {
              // Fermer le modal et rafraîchir la liste
              onProcessed();
            } 
          }
        ]);
      } else {
        // Gestion des erreurs retournées par l'Edge Function
        const errorMessage = data?.message || data?.error || 'Erreur lors du traitement';
        Alert.alert('Erreur', errorMessage);
        setError(errorMessage);
      }
    } catch (err) {
      console.error('Erreur:', err);
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du traitement';
      setError(errorMessage);
      Alert.alert('Erreur', errorMessage);
    } finally {
      setProcessing(false);
      setPendingAction(null);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {type === 'etablissement' ? 'Demande d\'établissement' : 'Demande de partenariat'}
        </Text>
        <RequestStatus status={request.statut} />
      </View>

      {/* Message d'erreur */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Informations</Text>
        {type === 'etablissement' ? (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Établissement:</Text>
              <Text style={styles.value}>{request.nom_etablissement}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Type:</Text>
              <Text style={styles.value}>{request.type_etablissement === 'public' ? 'Public' : 'Privé'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Adresse:</Text>
              <Text style={styles.value}>{request.adresse}, {request.ville}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Téléphone:</Text>
              <Text style={styles.value}>{request.telephone}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{request.email_contact}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Plan souhaité:</Text>
              <Text style={styles.value}>{request.plan_souhaite}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Demandeur ID:</Text>
              <Text style={styles.value}>{request.demandeur_id?.substring(0, 8)}...</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Organisation:</Text>
              <Text style={styles.value}>{request.organisation_nom}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Type partenaire:</Text>
              <Text style={styles.value}>{request.type_partenaire}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Contact:</Text>
              <Text style={styles.value}>{request.contact_nom}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{request.contact_email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Téléphone:</Text>
              <Text style={styles.value}>{request.contact_telephone}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Collaboration:</Text>
              <Text style={styles.value}>{request.type_collaboration}</Text>
            </View>
          </>
        )}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Message / Proposition</Text>
        <Text style={styles.message}>
          {type === 'etablissement' ? request.message_demandeur : request.proposition || 'Aucun message'}
        </Text>
        {type === 'partenariat' && request.montant_propose && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Montant proposé:</Text>
            <Text style={styles.value}>{Number(request.montant_propose).toLocaleString()} FCFA</Text>
          </View>
        )}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Commentaire admin</Text>
        <Input
          placeholder="Ajouter un commentaire (optionnel)"
          value={commentaire}
          onChangeText={setCommentaire}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
      </Card>

      <View style={styles.buttonContainer}>
        <Button
          title="Rejeter"
          onPress={() => showConfirmModal('rejeter')}
          variant="danger"
          loading={processing}
          disabled={processing}
        />
        <Button
          title="Valider"
          onPress={() => showConfirmModal('valider')}
          variant="success"
          loading={processing}
          disabled={processing}
        />
        <Button title="Fermer" onPress={onClose} variant="secondary" />
      </View>

      {/* Modal de confirmation personnalisée */}
      <Modal
        visible={confirmModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {pendingAction === 'valider' ? 'Valider la demande' : 'Rejeter la demande'}
            </Text>
            <Text style={styles.modalMessage}>
              {pendingAction === 'valider' 
                ? 'Êtes-vous sûr de vouloir valider cette demande ?' 
                : 'Êtes-vous sûr de vouloir rejeter cette demande ?'}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setConfirmModalVisible(false)}
              >
                <Text style={styles.modalButtonCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, pendingAction === 'valider' ? styles.modalButtonConfirm : styles.modalButtonDanger]}
                onPress={handleConfirm}
              >
                <Text style={styles.modalButtonConfirmText}>
                  {pendingAction === 'valider' ? 'Valider' : 'Rejeter'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  message: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 24,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#F3F4F6',
  },
  modalButtonCancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  modalButtonConfirm: {
    backgroundColor: '#10B981',
  },
  modalButtonDanger: {
    backgroundColor: '#EF4444',
  },
  modalButtonConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});