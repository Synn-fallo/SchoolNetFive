import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useMessagesParent } from '@/hooks/useMessagesParent';
import { Send, Mail, User, ChevronLeft, MessageSquare } from 'lucide-react-native';
import theme from '@/constants/theme';

export default function ParentMessagesScreen() {
  const router = useRouter();
  const [selectedEnseignant, setSelectedEnseignant] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { messages, enseignants, loading, sending, envoyerMessage, refetch, refetchEnseignants } = useMessagesParent();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchEnseignants()]);
    setRefreshing(false);
  }, [refetch, refetchEnseignants]);

  const handleSendMessage = async () => {
    if (!selectedEnseignant || !messageText.trim()) {
      Alert.alert('Erreur', 'Veuillez sélectionner un enseignant et saisir un message');
      return;
    }

    const result = await envoyerMessage(selectedEnseignant, messageText);
    if (result.success) {
      setMessageText('');
      setShowCompose(false);
      setSelectedEnseignant(null);
      Alert.alert('Succès', 'Message envoyé avec succès');
    } else {
      Alert.alert('Erreur', result.error || 'Impossible d\'envoyer le message');
    }
  };

  const getInitiales = (nom: string, prenom: string) => {
    return `${prenom?.charAt(0) || ''}${nom?.charAt(0) || ''}`.toUpperCase();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement des messages...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={theme.colors.primary.DEFAULT} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity onPress={() => setShowCompose(true)} style={styles.composeButton}>
          <MessageSquare size={20} color={theme.colors.primary.DEFAULT} />
        </TouchableOpacity>
      </View>

      {/* Liste des conversations */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💬 Conversations récentes</Text>
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Mail size={48} color={theme.colors.neutral[300]} />
            <Text style={styles.emptyText}>Aucun message</Text>
          </View>
        ) : (
          messages.map((message) => (
            <View key={message.id} style={[styles.messageCard, !message.is_read && styles.messageCardUnread]}>
              <View style={styles.messageAvatar}>
                <Text style={styles.messageAvatarText}>
                  {getInitiales(message.expediteur_nom || '', message.expediteur_prenom || '')}
                </Text>
              </View>
              <View style={styles.messageContent}>
                <Text style={styles.messageSender}>
                  {message.expediteur_prenom} {message.expediteur_nom}
                </Text>
                <Text style={styles.messageText} numberOfLines={2}>
                  {message.contenu}
                </Text>
                <Text style={styles.messageDate}>
                  {new Date(message.created_at).toLocaleDateString('fr-FR')}
                </Text>
              </View>
              {!message.is_read && <View style={styles.unreadDot} />}
            </View>
          ))
        )}
      </View>

      {/* Modal de composition (simplifiée - serait mieux en Modal séparé) */}
      {showCompose && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Nouveau message</Text>

            <Text style={styles.inputLabel}>Enseignant</Text>
            <ScrollView style={styles.enseignantsList} horizontal showsHorizontalScrollIndicator={false}>
              {enseignants.map((ens) => (
                <TouchableOpacity
                  key={ens.id}
                  style={[
                    styles.enseignantChip,
                    selectedEnseignant === ens.id && styles.enseignantChipActive,
                  ]}
                  onPress={() => setSelectedEnseignant(ens.id)}
                >
                  <User size={14} color={selectedEnseignant === ens.id ? '#FFFFFF' : '#6B7280'} />
                  <Text style={[
                    styles.enseignantChipText,
                    selectedEnseignant === ens.id && styles.enseignantChipTextActive,
                  ]}>
                    {ens.prenom} {ens.nom}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Message</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Écrivez votre message..."
              value={messageText}
              onChangeText={setMessageText}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowCompose(false)}>
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sendButton, sending && styles.sendButtonDisabled]}
                onPress={handleSendMessage}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Send size={16} color="#FFFFFF" />
                    <Text style={styles.sendButtonText}>Envoyer</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  composeButton: {
    padding: 8,
    marginRight: -8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  section: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  messageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageCardUnread: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  messageAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary.DEFAULT + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  messageAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary.DEFAULT,
  },
  messageContent: {
    flex: 1,
  },
  messageSender: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  messageDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary.DEFAULT,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  enseignantsList: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  enseignantChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  enseignantChipActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  enseignantChipText: {
    fontSize: 13,
    color: '#6B7280',
  },
  enseignantChipTextActive: {
    color: '#FFFFFF',
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
    minHeight: 100,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
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
  sendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});