import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, FlatList, TextInput } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { MessageSquare, Send } from 'lucide-react-native';

interface ForumMessage {
  id: string;
  forum_id: string;
  user_id: string;
  contenu: string;
  created_at: string;
}

export default function CommunityScreen() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [forums, setForums] = useState<any[]>([]);
  const [selectedForum, setSelectedForum] = useState<any>(null);
  const [messages, setMessages] = useState<ForumMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    loadForums();
  }, [user, profile]);

  const loadForums = async () => {
    try {
      setLoading(true);

      if (profile?.etablissement_id) {
        const { data } = await supabase
          .from('forums')
          .select('*')
          .eq('etablissement_id', profile.etablissement_id)
          .eq('is_active', true);

        setForums(data || []);
        if (data && data.length > 0) {
          setSelectedForum(data[0]);
          loadMessages(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error loading forums:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (forumId: string) => {
    try {
      const { data } = await supabase
        .from('forum_messages')
        .select('*')
        .eq('forum_id', forumId)
        .order('created_at', { ascending: true });

      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handlePostMessage = async () => {
    if (!newMessage.trim() || !selectedForum || posting) return;

    try {
      setPosting(true);

      const { error } = await supabase.from('forum_messages').insert({
        forum_id: selectedForum.id,
        user_id: user?.id,
        contenu: newMessage,
      });

      if (!error) {
        setNewMessage('');
        loadMessages(selectedForum.id);
      }
    } catch (error) {
      console.error('Error posting message:', error);
    } finally {
      setPosting(false);
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
        <Text style={styles.title}>Communauté</Text>
      </View>

      <View style={styles.content}>
        {/* Forums List */}
        <View style={styles.forumsList}>
          <ScrollView contentContainerStyle={styles.forumsContent}>
            {forums.map((forum: any) => (
              <TouchableOpacity
                key={forum.id}
                style={[
                  styles.forumItem,
                  selectedForum?.id === forum.id && styles.activeForumItem,
                ]}
                onPress={() => {
                  setSelectedForum(forum);
                  loadMessages(forum.id);
                }}
              >
                <MessageSquare size={16} color={selectedForum?.id === forum.id ? '#FFFFFF' : '#6B7280'} />
                <Text
                  style={[
                    styles.forumName,
                    selectedForum?.id === forum.id && styles.activeForumName,
                  ]}
                  numberOfLines={2}
                >
                  {forum.titre}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Messages */}
        <View style={styles.messagesPanel}>
          {selectedForum ? (
            <>
              <View style={styles.forumHeader}>
                <Text style={styles.forumTitle}>{selectedForum.titre}</Text>
              </View>

              <ScrollView style={styles.messagesList} contentContainerStyle={styles.messagesContent}>
                {messages.length > 0 ? (
                  messages.map((msg) => (
                    <View key={msg.id} style={styles.messageContainer}>
                      <View style={styles.messageAvatar}>
                        <Text style={styles.messageAvatarText}>
                          {msg.user_id.slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.messageBubble}>
                        <Text style={styles.messageAuthor}>Utilisateur</Text>
                        <Text style={styles.messageText}>{msg.contenu}</Text>
                        <Text style={styles.messageTime}>
                          {new Date(msg.created_at).toLocaleDateString('fr-FR')}
                        </Text>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>Aucun message</Text>
                  </View>
                )}
              </ScrollView>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Votre message..."
                  value={newMessage}
                  onChangeText={setNewMessage}
                  multiline
                  editable={!posting}
                />
                <TouchableOpacity
                  style={styles.sendButton}
                  onPress={handlePostMessage}
                  disabled={posting || !newMessage.trim()}
                >
                  <Send size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={styles.noForumContainer}>
              <Text style={styles.noForumText}>Sélectionnez un forum</Text>
            </View>
          )}
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
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  forumsList: {
    width: '30%',
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  forumsContent: {
    padding: 12,
  },
  forumItem: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    alignItems: 'center',
    gap: 8,
  },
  activeForumItem: {
    backgroundColor: '#3B82F6',
  },
  forumName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeForumName: {
    color: '#FFFFFF',
  },
  messagesPanel: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
  },
  forumHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  forumTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  messageAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  messageBubble: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  messageAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    marginBottom: 6,
  },
  messageTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
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
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
  noForumContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noForumText: {
    fontSize: 16,
    color: '#6B7280',
  },
});
