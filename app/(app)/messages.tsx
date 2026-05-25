import { View, Text, ScrollView, StyleSheet, TouchableOpacity, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { MessageSquare } from 'lucide-react-native';

export default function MessagesScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messageText, setMessageText] = useState('');

  useEffect(() => {
    loadMessages();
  }, [user]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`expediteur_id.eq.${user?.id},destinataire_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedConversation) return;

    try {
      const { error } = await supabase.from('messages').insert({
        expediteur_id: user?.id,
        destinataire_id: selectedConversation.id,
        contenu: messageText,
        is_read: false,
      });

      if (!error) {
        setMessageText('');
        loadMessages();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.messageList} contentContainerStyle={styles.listContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Messages</Text>
        </View>

        {messages.length > 0 ? (
          messages.map((msg: any) => (
            <TouchableOpacity key={msg.id} style={styles.messageCard}>
              <Card style={styles.card}>
                <View style={styles.messageHeader}>
                  <Text style={styles.sender}>
                    {msg.expediteur_id === user?.id ? 'Vous' : msg.expediteur_id?.slice(0, 8)}
                  </Text>
                  <Text style={styles.date}>
                    {new Date(msg.created_at).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                <Text style={styles.messageContent} numberOfLines={2}>
                  {msg.contenu}
                </Text>
              </Card>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <MessageSquare size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>Aucun message</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Écrire un message..."
          value={messageText}
          onChangeText={setMessageText}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>Envoyer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  messageList: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  messageCard: {
    marginBottom: 12,
  },
  card: {
    paddingVertical: 12,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sender: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  date: {
    fontSize: 12,
    color: '#6B7280',
  },
  messageContent: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 8,
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1F2937',
  },
  sendButton: {
    height: 44,
    paddingHorizontal: 16,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B7280',
  },
});
