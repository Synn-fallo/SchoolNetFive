import { View, Text, ScrollView, StyleSheet, TextInput, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { Send } from 'lucide-react-native';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  contenu: string;
  created_at: string;
}

export default function IAChatScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    loadSessions();
  }, [user]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('ai_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      setSessions(data || []);
      if (data && data.length > 0) {
        setSelectedSession(data[0]);
        loadMessages(data[0].id);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (sessionId: string) => {
    try {
      const { data } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !selectedSession || sendingMessage) return;

    try {
      setSendingMessage(true);

      const { data: newMessage, error } = await supabase
        .from('ai_messages')
        .insert({
          session_id: selectedSession.id,
          role: 'user',
          contenu: inputText,
        })
        .select();

      if (!error && newMessage) {
        setMessages([...messages, newMessage[0]]);
        setInputText('');

        // Simulate AI response
        setTimeout(async () => {
          const assistantMessage = {
            session_id: selectedSession.id,
            role: 'assistant' as const,
            contenu: 'Je suis en train de réfléchir à votre question. Simulation de réponse IA.',
          };

          await supabase.from('ai_messages').insert(assistantMessage);
          loadMessages(selectedSession.id);
        }, 500);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const createNewSession = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_sessions')
        .insert({
          user_id: user?.id,
          titre: 'Nouvelle conversation',
          is_active: true,
        })
        .select();

      if (!error && data) {
        setSessions([data[0], ...sessions]);
        setSelectedSession(data[0]);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error creating session:', error);
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
      <View style={styles.header}>
        <Text style={styles.title}>SchoolNet IA</Text>
        <TouchableOpacity style={styles.newButton} onPress={createNewSession}>
          <Text style={styles.newButtonText}>+ Nouvelle</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.sessionsPanel}>
          <ScrollView style={styles.sessionsList} contentContainerStyle={styles.sessionsContent}>
            {sessions.map((session: any) => (
              <TouchableOpacity
                key={session.id}
                style={[
                  styles.sessionItem,
                  selectedSession?.id === session.id && styles.activeSessionItem,
                ]}
                onPress={() => {
                  setSelectedSession(session);
                  loadMessages(session.id);
                }}
              >
                <Text
                  style={[
                    styles.sessionTitle,
                    selectedSession?.id === session.id && styles.activeSessionTitle,
                  ]}
                  numberOfLines={2}
                >
                  {session.titre}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.chatPanel}>
          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.messageContainer,
                  item.role === 'user' ? styles.userMessage : styles.assistantMessage,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    item.role === 'user' ? styles.userMessageText : styles.assistantMessageText,
                  ]}
                >
                  {item.contenu}
                </Text>
              </View>
            )}
            contentContainerStyle={styles.messagesContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Aucun message</Text>
                <Text style={styles.emptySubtext}>Commencez une conversation</Text>
              </View>
            }
          />

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Votre question..."
              value={inputText}
              onChangeText={setInputText}
              multiline
              editable={!sendingMessage}
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendMessage}
              disabled={sendingMessage || !inputText.trim()}
            >
              <Send size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  newButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#3B82F6',
    borderRadius: 6,
  },
  newButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  sessionsPanel: {
    width: '25%',
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  sessionsList: {
    flex: 1,
  },
  sessionsContent: {
    padding: 12,
  },
  sessionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  activeSessionItem: {
    backgroundColor: '#3B82F6',
  },
  sessionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeSessionTitle: {
    color: '#FFFFFF',
  },
  chatPanel: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
  },
  messageText: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    backgroundColor: '#3B82F6',
    color: '#FFFFFF',
  },
  assistantMessageText: {
    backgroundColor: '#E5E7EB',
    color: '#1F2937',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1F2937',
  },
  sendButton: {
    width: 40,
    height: 40,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});
