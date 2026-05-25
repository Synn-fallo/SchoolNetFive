import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCanalClasse } from '@/hooks/useCanalClasse';
import { useEnfants } from '@/hooks/useEnfants';
import { Send, ChevronLeft, Lock, MessageCircle, Pin, User, AlertCircle } from 'lucide-react-native';
import theme from '@/constants/theme';

export default function ParentCanalClasseScreen() {
  const router = useRouter();
  const { enfantId } = useLocalSearchParams<{ enfantId: string }>();
  const [message, setMessage] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  
  // Récupérer la classe de l'enfant
  const { enfants, loading: loadingEnfants } = useEnfants();
  const enfant = enfants.find(e => e.id === enfantId);
  const classeId = enfant?.classe_id;
  
  const { 
    canal, 
    messages, 
    peutEcrire, 
    loading, 
    sending, 
    error, 
    envoyerMessage, 
    refetch 
  } = useCanalClasse(classeId);
  
  const [refreshing, setRefreshing] = useState(false);

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
      // Scroll vers le bas après l'envoi
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } else {
      Alert.alert('Erreur', "Impossible d'envoyer le message");
    }
  };

  // Formatage de l'heure
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

  // Chargement
  if ((loading || loadingEnfants) && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement du canal...</Text>
      </View>
    );
  }

  // Pas de canal (mode Fermé ou classe sans PP)
  if (!canal) {
    return (
      <View style={styles.centerContainer}>
        <Lock size={48} color={theme.colors.neutral[300]} />
        <Text style={styles.emptyTitle}>Canal non disponible</Text>
        <Text style={styles.emptyText}>
          Aucun canal de communication n'est actif pour cette classe.
        </Text>
        <Text style={styles.emptySubtext}>
          Le professeur principal n'a pas encore été assigné ou le canal est fermé.
        </Text>
        <TouchableOpacity style={styles.backButtonEmpty} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Canal en mode Fermé
  if (canal.mode === 'ferme') {
    return (
      <View style={styles.centerContainer}>
        <Lock size={48} color={theme.colors.neutral[300]} />
        <Text style={styles.emptyTitle}>Canal fermé</Text>
        <Text style={styles.emptyText}>
          Le canal de communication est actuellement fermé par le professeur principal.
        </Text>
        <TouchableOpacity style={styles.backButtonEmpty} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color={theme.colors.primary.DEFAULT} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{canal.nom}</Text>
          <View style={styles.modeBadge}>
            <Text style={styles.modeText}>
              {canal.mode === 'libre' ? '💬 Mode libre' : '🛡️ Mode modération'}
            </Text>
          </View>
        </View>
        <View style={styles.headerRight} />
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
              Soyez le premier à envoyer un message dans ce canal.
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
                      </Text>
                      <Text style={styles.messageTime}>{formatTime(msg.created_at)}</Text>
                    </View>
                    <Text style={styles.messageText}>{msg.contenu}</Text>
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      {/* Zone de saisie */}
      {canal.mode === 'moderation' && !peutEcrire ? (
        <View style={styles.disabledInputContainer}>
          <Lock size={16} color="#9CA3AF" />
          <Text style={styles.disabledInputText}>
            Mode modération – Seul le professeur principal peut écrire
          </Text>
        </View>
      ) : (
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Écrivez votre message..."
            placeholderTextColor="#9CA3AF"
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={500}
            editable={peutEcrire && !sending}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!message.trim() || !peutEcrire || sending) && styles.sendButtonDisabled
            ]}
            onPress={handleSendMessage}
            disabled={!message.trim() || !peutEcrire || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Send size={18} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      )}
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
  emptySubtext: {
    marginTop: 4,
    fontSize: 13,
    color: '#9CA3AF',
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
  modeBadge: {
    marginTop: 2,
  },
  modeText: {
    fontSize: 11,
    color: '#6B7280',
  },
  headerRight: {
    width: 40,
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
  messageTime: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  messageText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
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
  disabledInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  disabledInputText: {
    fontSize: 12,
    color: '#6B7280',
  },
});