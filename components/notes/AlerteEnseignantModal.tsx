// /home/project/components/notes/AlerteEnseignantModal.tsx
// Modal d'envoi d'alerte aux enseignants

import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useState } from 'react';
import { X, Send, AlertTriangle, Bell, Mail } from 'lucide-react-native';
import theme from '@/constants/theme';

interface AlerteEnseignantModalProps {
  visible: boolean;
  onClose: () => void;
  onSend: (message: string, type: string) => Promise<void>;
  isSubscribed: boolean;
}

const ALERTE_TYPES = [
  { id: 'notes_manquantes', label: 'Notes manquantes', icon: Bell, color: '#F59E0B' },
  { id: 'notes_basses', label: 'Notes anormalement basses', icon: AlertTriangle, color: '#EF4444' },
  { id: 'retard_saisie', label: 'Retard de saisie', icon: Mail, color: '#3B82F6' },
];

export default function AlerteEnseignantModal({
  visible,
  onClose,
  onSend,
  isSubscribed,
}: AlerteEnseignantModalProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!selectedType) {
      Alert.alert('Sélection requise', 'Veuillez sélectionner un type d\'alerte.');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Message requis', 'Veuillez saisir un message.');
      return;
    }

    if (!isSubscribed) {
      Alert.alert('Abonnement requis', 'L\'envoi d\'alerte nécessite un abonnement actif.');
      return;
    }

    setSending(true);
    await onSend(message, selectedType);
    setSending(false);
    onClose();
    setSelectedType(null);
    setMessage('');
  };

  const getTypeLabel = (typeId: string) => {
    const found = ALERTE_TYPES.find(t => t.id === typeId);
    return found?.label || typeId;
  };

  if (!isSubscribed) {
    return (
      <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📧 Envoyer une alerte</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.disabledBody}>
              <Bell size={48} color="#9CA3AF" />
              <Text style={styles.disabledTitle}>Abonnement requis</Text>
              <Text style={styles.disabledText}>
                L'envoi d'alertes aux enseignants nécessite un abonnement actif.
              </Text>
              <TouchableOpacity style={styles.closeDisabledButton} onPress={onClose}>
                <Text style={styles.closeDisabledText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>📧 Envoyer une alerte aux enseignants</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.infoText}>
              Sélectionnez le type d'alerte et rédigez votre message. Les enseignants concernés recevront une notification.
            </Text>

            <View style={styles.optionGroup}>
              <Text style={styles.optionLabel}>Type d'alerte</Text>
              <View style={styles.typesRow}>
                {ALERTE_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <TouchableOpacity
                      key={type.id}
                      style={[
                        styles.typeButton,
                        selectedType === type.id && { borderColor: type.color, backgroundColor: `${type.color}10` },
                      ]}
                      onPress={() => setSelectedType(type.id)}
                    >
                      <Icon size={24} color={selectedType === type.id ? type.color : '#9CA3AF'} />
                      <Text style={[styles.typeText, selectedType === type.id && { color: type.color }]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {selectedType && (
              <View style={styles.optionGroup}>
                <Text style={styles.optionLabel}>Message</Text>
                <TextInput
                  style={styles.messageInput}
                  placeholder={`Message concernant ${getTypeLabel(selectedType)}...`}
                  placeholderTextColor="#9CA3AF"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            )}

            <View style={styles.noteBox}>
              <Text style={styles.noteTitle}>ℹ️ À propos</Text>
              <Text style={styles.noteText}>
                Les enseignants recevront cette alerte par notification push et par email. Un accusé de réception sera enregistré.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sendButton, (!selectedType || !message.trim() || sending) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!selectedType || !message.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Send size={18} color="#FFFFFF" />
                  <Text style={styles.sendText}>Envoyer</Text>
                </>
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
  },
  infoText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 20,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 10,
  },
  optionGroup: {
    marginBottom: 20,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 10,
  },
  typesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  typeText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  noteBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
  },
  noteTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 6,
  },
  noteText: {
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  sendButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 12,
    borderRadius: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  sendText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  disabledBody: {
    padding: 32,
    alignItems: 'center',
  },
  disabledTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  disabledText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  closeDisabledButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  closeDisabledText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});