import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { Phone, User, Check, X, Mail } from 'lucide-react-native';
import theme from '@/constants/theme';

interface ParentConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => Promise<boolean>;
  parentNom: string;
  parentPrenom: string;
  parentTelephone?: string;
  parentEmail?: string;
  type: 'telephone' | 'email';
  isLoading?: boolean;
}

export default function ParentConfirmationModal({
  visible,
  onClose,
  onConfirm,
  parentNom,
  parentPrenom,
  parentTelephone,
  parentEmail,
  type,
  isLoading = false,
}: ParentConfirmationModalProps) {
  const [confirming, setConfirming] = useState(false);

  const handleConfirm = async () => {
    setConfirming(true);
    const success = await onConfirm();
    setConfirming(false);
    
    if (success) {
      onClose();
    }
  };

  const handleClose = () => {
    onClose();
  };

  const getIcon = () => {
    if (type === 'telephone') {
      return <Phone size={28} color="#FFFFFF" />;
    }
    return <Mail size={28} color="#FFFFFF" />;
  };

  const getContactInfo = () => {
    if (type === 'telephone') {
      return parentTelephone;
    }
    return parentEmail;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* En-tête */}
          <View style={styles.header}>
            <View style={styles.successIcon}>
              {getIcon()}
            </View>
            <Text style={styles.title}>Parent détecté</Text>
            <TouchableOpacity style={styles.closeIcon} onPress={handleClose}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Informations du parent existant */}
          <View style={styles.parentInfo}>
            <View style={styles.infoRow}>
              <User size={16} color={theme.colors.neutral[500]} />
              <Text style={styles.parentName}>
                {parentPrenom} {parentNom}
              </Text>
            </View>
            <View style={styles.infoRow}>
              {type === 'telephone' ? (
                <Phone size={16} color={theme.colors.neutral[500]} />
              ) : (
                <Mail size={16} color={theme.colors.neutral[500]} />
              )}
              <Text style={styles.parentContact}>{getContactInfo()}</Text>
            </View>
          </View>

          {/* Message de confirmation */}
          <View style={styles.confirmationContainer}>
            <Text style={styles.confirmationText}>
              Ce {type === 'telephone' ? 'numéro' : 'email'} correspond déjà à un parent dans notre système.
            </Text>
            <Text style={styles.confirmationSubtext}>
              Confirmez-vous que c'est le même parent ?
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={confirming || isLoading}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, (confirming || isLoading) && styles.confirmButtonDisabled]}
              onPress={handleConfirm}
              disabled={confirming || isLoading}
            >
              {confirming || isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Check size={16} color="#FFFFFF" />
                  <Text style={styles.confirmButtonText}>Confirmer</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Note */}
          <View style={styles.noteContainer}>
            <Text style={styles.noteText}>
              ℹ️ Si vous confirmez, les informations du parent seront automatiquement liées au nouvel élève.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
  },
  successIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E40AF',
    flex: 1,
  },
  closeIcon: {
    padding: 8,
  },
  parentInfo: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  parentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  parentContact: {
    fontSize: 14,
    color: '#1F2937',
  },
  confirmationContainer: {
    padding: 16,
  },
  confirmationText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
  },
  confirmationSubtext: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
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
    fontWeight: '500',
    color: '#6B7280',
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: 10,
  },
  confirmButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  noteContainer: {
    backgroundColor: '#F0FDF4',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  noteText: {
    fontSize: 11,
    color: '#065F46',
    textAlign: 'center',
  },
});