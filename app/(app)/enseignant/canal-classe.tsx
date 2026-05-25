import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useCanalClasse } from '@/hooks/useCanalClasse';
import { supabase } from '@/lib/supabase';
import { Send, ChevronLeft, Lock, MessageCircle, Pin, User, Users, Settings, AlertCircle, Check, X, ChevronDown } from 'lucide-react-native';
import theme from '@/constants/theme';

export default function EnseignantCanalClasseScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { classeId, classeNom } = useLocalSearchParams<{ classeId: string; classeNom: string }>();
  const [message, setMessage] = useState('');
  const [showMembresModal, setShowMembresModal] = useState(false);
  const [showModeModal, setShowModeModal] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  
  const { 
    canal, 
    messages, 
    membres,
    peutEcrire,
    estAnimateur,
    loading, 
    sending, 
    error, 
    envoyerMessage,
    changerMode,
    exclureMembre,
    reintegrerMembre,
    pingerMessage,
    refetch 
  } = useCanalClasse(classeId);
  
  const [refreshing, setRefreshing] = useState(false);

  // Vérifier que l'utilisateur est bien animateur
  useEffect(() => {
    if (!loading && canal && !estAnimateur) {
      Alert.alert('Accès non autorisé', 'Vous n\'êtes pas l\'animateur de ce canal.');
      router.back();
    }
  }, [loading, canal, estAnimateur]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleSendMessage = async () => {
    if (!message.trim() || !peutEcrire) return;
    
    const success = await envoyerMessage(message);
    if (success) {
      setMessage('');
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } else {
      Alert.alert('Erreur', "Impossible d'envoyer le message");
    }
  };

  const handleChangerMode = async (mode: 'moderation' | 'libre' | 'ferme') => {
    const success = await changerMode(mode);
    if (success) {
      setShowModeModal(false);
      Alert.alert('Succès', `Mode changé en ${mode === 'libre' ? 'Libre' : mode === 'moderation' ? 'Modération' : 'Fermé'}`);
    } else {
      Alert.alert('Erreur', 'Impossible de changer le mode');
    }
  };

  const handleExclureMembre = async (userId: string, nom: string, prenom: string) => {
    Alert.alert(
      'Exclure un membre',
      `Voulez-vous exclure ${prenom} ${nom} du canal ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Exclure', 
          style: 'destructive',
          onPress: async () => {
            const success = await exclureMembre(userId);
            if (success) {
              Alert.alert('Succès', 'Membre exclu');
              setShowMembresModal(false);
              refetch();
            } else {
              Alert.alert('Erreur', 'Impossible d\'exclure le membre');
            }
          }
        }
      ]
    );
  };

  const handleReintegrerMembre = async (userId: string, nom: string, prenom: string) => {
    Alert.alert(
      'Réintégrer un membre',
      `Voulez-vous réintégrer ${prenom} ${nom} dans le canal ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Réintégrer',
          onPress: async () => {
            const success = await reintegrerMembre(userId);
            if (success) {
              Alert.alert('Succès', 'Membre réintégré');
              setShowMembresModal(false);
              refetch();
            } else {
              Alert.alert('Erreur', 'Impossible de réintégrer le membre');
            }
          }
        }
      ]
    );
  };

  const handlePingerMessage = async (messageId: string) => {
    const success = await pingerMessage(messageId);
    if (!success) {
      Alert.alert('Erreur', 'Impossible d\'épingler le message');
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (date.toDateString() === yesterday.toDateString()) return 'Hier';
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  // Grouper les messages par date
  const groupedMessages: { date: string; messages: typeof messages }[] = [];
  let lastDate = '';
  
  messages.forEach(msg => {
    const dateKey = formatDate(msg.created_at);
    if (dateKey !== lastDate) {
      groupedMessages.push({ date: dateKey, messages: [] });
      lastDate = dateKey;
    }
    groupedMessages[groupedMessages.length - 1].messages.push(msg);
  });

  const getModeLabel = () => {
    switch (canal?.mode) {
      case 'libre': return { label: 'Libre 💬', color: '#10B981', description: 'Tous peuvent écrire' };
      case 'moderation': return { label: 'Modération 🛡️', color: '#F59E0B', description: 'Seul vous pouvez écrire' };
      case 'ferme': return { label: 'Fermé 🔒', color: '#EF4444', description: 'Canal invisible pour les parents' };
      default: return { label: 'Modération', color: '#F59E0B', description: '' };
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement du canal...</Text>
      </View>
    );
  }

  if (!canal) {
    return (
      <View style={styles.centerContainer}>
        <Lock size={48} color={theme.colors.neutral[300]} />
        <Text style={styles.emptyTitle}>Canal non disponible</Text>
        <Text style={styles.emptyText}>
          Aucun canal n'a été créé pour cette classe.
        </Text>
        <TouchableOpacity style={styles.backButtonEmpty} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const mode = getModeLabel();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* En-tête avec contrôles */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={theme.colors.primary.DEFAULT} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{canal.nom}</Text>
          <TouchableOpacity onPress={() => setShowModeModal(true)} style={styles.modeButton}>
            <Text style={[styles.modeText, { color: mode.color }]}>{mode.label}</Text>
            <ChevronDown size={14} color={mode.color} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => setShowMembresModal(true)} style={styles.settingsButton}>
          <Users size={22} color={theme.colors.neutral[600]} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyMessages}>
            <MessageCircle size={40} color={theme.colors.neutral[300]} />
            <Text style={styles.emptyMessagesTitle}>Aucun message</Text>
            <Text style={styles.emptyMessagesText}>
              Envoyez un message pour démarrer la conversation.
            </Text>
          </View>
        ) : (
          groupedMessages.map((group, groupIdx) => (
            <View key={groupIdx}>
              <View style={styles.dateSeparator}>
                <Text style={styles.dateSeparatorText}>{group.date}</Text>
              </View>
              {group.messages.map((msg) => (
                <View key={msg.id} style={[styles.messageRow, msg.is_pinned && styles.messagePinned]}>
                  {msg.is_pinned && (
                    <View style={styles.pinIcon}>
                      <Pin size={12} color="#F59E0B" />
                    </View>
                  )}
                  <View style={styles.messageAvatar}>
                    <Text style={styles.messageAvatarText}>
                      {msg.expediteur_prenom?.charAt(0)}{msg.expediteur_nom?.charAt(0)}
                    </Text>
                  </View>
                  <View style={styles.messageContent}>
                    <View style={styles.messageHeader}>
                      <Text style={styles.messageSender}>
                        {msg.expediteur_prenom} {msg.expediteur_nom}
                        {msg.expediteur_id === canal.animateur_id && (
                          <Text style={styles.ppBadge}> (PP)</Text>
                        )}
                      </Text>
                      <Text style={styles.messageTime}>{formatTime(msg.created_at)}</Text>
                    </View>
                    <Text style={styles.messageText}>{msg.contenu}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.pinButton}
                    onPress={() => handlePingerMessage(msg.id)}
                  >
                    <Pin size={16} color={msg.is_pinned ? '#F59E0B' : '#D1D5DB'} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* Zone de saisie */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Écrivez votre message..."
          placeholderTextColor="#9CA3AF"
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={500}
          editable={!sending}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!message.trim() || sending) && styles.sendButtonDisabled
          ]}
          onPress={handleSendMessage}
          disabled={!message.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Send size={18} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Modal de gestion des membres */}
      <Modal visible={showMembresModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Gestion des membres</Text>
              <TouchableOpacity onPress={() => setShowMembresModal(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              <Text style={styles.modalSubtitle}>Membres actifs</Text>
              {membres.filter(m => m.est_actif).map((membre) => (
                <View key={membre.user_id} style={styles.membreItem}>
                  <View style={styles.membreInfo}>
                    <View style={styles.membreAvatar}>
                      <Text style={styles.membreAvatarText}>
                        {membre.prenom?.charAt(0)}{membre.nom?.charAt(0)}
                      </Text>
                    </View>
                    <Text style={styles.membreName}>{membre.prenom} {membre.nom}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.exclureButton}
                    onPress={() => handleExclureMembre(membre.user_id, membre.nom, membre.prenom)}
                  >
                    <Text style={styles.exclureButtonText}>Exclure</Text>
                  </TouchableOpacity>
                </View>
              ))}
              
              {membres.filter(m => !m.est_actif).length > 0 && (
                <>
                  <Text style={[styles.modalSubtitle, styles.excludedTitle]}>Membres exclus</Text>
                  {membres.filter(m => !m.est_actif).map((membre) => (
                    <View key={membre.user_id} style={styles.membreItemExcluded}>
                      <View style={styles.membreInfo}>
                        <View style={styles.membreAvatarExcluded}>
                          <Text style={styles.membreAvatarTextExcluded}>
                            {membre.prenom?.charAt(0)}{membre.nom?.charAt(0)}
                          </Text>
                        </View>
                        <Text style={styles.membreNameExcluded}>{membre.prenom} {membre.nom}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.reintegrerButton}
                        onPress={() => handleReintegrerMembre(membre.user_id, membre.nom, membre.prenom)}
                      >
                        <Text style={styles.reintegrerButtonText}>Réintégrer</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de changement de mode */}
      <Modal visible={showModeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Changer le mode</Text>
              <TouchableOpacity onPress={() => setShowModeModal(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.modeOptions}>
              <TouchableOpacity
                style={[styles.modeOption, canal.mode === 'libre' && styles.modeOptionActive]}
                onPress={() => handleChangerMode('libre')}
              >
                <Text style={styles.modeOptionEmoji}>💬</Text>
                <View style={styles.modeOptionTexts}>
                  <Text style={styles.modeOptionTitle}>Libre</Text>
                  <Text style={styles.modeOptionDesc}>Tous les membres peuvent écrire</Text>
                </View>
                {canal.mode === 'libre' && <Check size={20} color="#10B981" />}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modeOption, canal.mode === 'moderation' && styles.modeOptionActive]}
                onPress={() => handleChangerMode('moderation')}
              >
                <Text style={styles.modeOptionEmoji}>🛡️</Text>
                <View style={styles.modeOptionTexts}>
                  <Text style={styles.modeOptionTitle}>Modération</Text>
                  <Text style={styles.modeOptionDesc}>Seul vous pouvez écrire</Text>
                </View>
                {canal.mode === 'moderation' && <Check size={20} color="#10B981" />}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modeOption, canal.mode === 'ferme' && styles.modeOptionActive]}
                onPress={() => handleChangerMode('ferme')}
              >
                <Text style={styles.modeOptionEmoji}>🔒</Text>
                <View style={styles.modeOptionTexts}>
                  <Text style={styles.modeOptionTitle}>Fermé</Text>
                  <Text style={styles.modeOptionDesc}>Canal invisible pour les parents</Text>
                </View>
                {canal.mode === 'ferme' && <Check size={20} color="#10B981" />}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  backButtonEmpty: {
    marginTop: 24,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  settingsButton: {
    padding: 8,
    marginRight: -8,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyMessages: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyMessagesTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  emptyMessagesText: {
    marginTop: 4,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 12,
  },
  dateSeparatorText: {
    fontSize: 11,
    color: '#9CA3AF',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    position: 'relative',
  },
  messagePinned: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 8,
    marginHorizontal: -8,
  },
  pinIcon: {
    position: 'absolute',
    left: -4,
    top: -4,
    zIndex: 1,
  },
  messageAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary.DEFAULT + '20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  messageAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary.DEFAULT,
  },
  messageContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageSender: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  ppBadge: {
    fontSize: 11,
    fontWeight: '400',
    color: theme.colors.primary.DEFAULT,
  },
  messageTime: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  messageText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  pinButton: {
    padding: 6,
    marginLeft: 4,
    alignSelf: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1F2937',
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  excludedTitle: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  modalList: {
    paddingBottom: 16,
  },
  membreItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  membreItemExcluded: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FEF2F2',
  },
  membreInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  membreAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary.DEFAULT + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  membreAvatarExcluded: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  membreAvatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary.DEFAULT,
  },
  membreAvatarTextExcluded: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  membreName: {
    fontSize: 14,
    color: '#1F2937',
  },
  membreNameExcluded: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  exclureButton: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  exclureButtonText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  reintegrerButton: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  reintegrerButtonText: {
    fontSize: 12,
    color: '#065F46',
    fontWeight: '500',
  },
  modeOptions: {
    padding: 16,
    gap: 12,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  modeOptionActive: {
    borderColor: theme.colors.primary.DEFAULT,
    backgroundColor: '#EFF6FF',
  },
  modeOptionEmoji: {
    fontSize: 28,
  },
  modeOptionTexts: {
    flex: 1,
  },
  modeOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  modeOptionDesc: {
    fontSize: 12,
    color: '#6B7280',
  },
});