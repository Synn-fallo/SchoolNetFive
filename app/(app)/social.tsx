import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { Heart, MessageCircle, Share2 } from 'lucide-react-native';

interface Publication {
  id: string;
  user_id: string;
  contenu: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

export default function SocialScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [publications, setPublications] = useState<Publication[]>([]);
  const [newPostText, setNewPostText] = useState('');
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    loadPublications();
  }, [user]);

  const loadPublications = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('publications')
        .select('*')
        .eq('visibilite', 'public')
        .order('created_at', { ascending: false })
        .limit(20);

      setPublications(data || []);
    } catch (error) {
      console.error('Error loading publications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!newPostText.trim() || posting) return;

    try {
      setPosting(true);
      const { data, error } = await supabase
        .from('publications')
        .insert({
          user_id: user?.id,
          contenu: newPostText,
          visibilite: 'public',
        })
        .select();

      if (!error && data) {
        setPublications([data[0], ...publications]);
        setNewPostText('');
      }
    } catch (error) {
      console.error('Error posting:', error);
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (publicationId: string) => {
    try {
      const { error } = await supabase.from('likes').insert({
        publication_id: publicationId,
        user_id: user?.id,
      });

      if (!error) {
        loadPublications();
      }
    } catch (error) {
      console.error('Error liking post:', error);
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
        <Text style={styles.title}>Réseau Social</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Compose Box */}
        <Card style={styles.composeCard}>
          <TextInput
            style={styles.composeInput}
            placeholder="Quoi de neuf?"
            value={newPostText}
            onChangeText={setNewPostText}
            multiline
            editable={!posting}
          />
          <TouchableOpacity
            style={styles.publishButton}
            onPress={handlePublish}
            disabled={posting || !newPostText.trim()}
          >
            <Text style={styles.publishButtonText}>
              {posting ? 'Envoi...' : 'Publier'}
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Publications Feed */}
        {publications.length > 0 ? (
          publications.map((pub: Publication) => (
            <Card key={pub.id} style={styles.postCard}>
              <View style={styles.postHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {pub.user_id.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.postMeta}>
                  <Text style={styles.postAuthor}>Utilisateur</Text>
                  <Text style={styles.postTime}>
                    {new Date(pub.created_at).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
              </View>

              <Text style={styles.postContent}>{pub.contenu}</Text>

              <View style={styles.postActions}>
                <TouchableOpacity style={styles.actionButton}>
                  <Heart size={18} color="#EF4444" />
                  <Text style={styles.actionText}>{pub.likes_count}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <MessageCircle size={18} color="#3B82F6" />
                  <Text style={styles.actionText}>{pub.comments_count}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton}>
                  <Share2 size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </Card>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucune publication</Text>
          </View>
        )}
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  composeCard: {
    marginBottom: 16,
    paddingBottom: 12,
  },
  composeInput: {
    minHeight: 80,
    paddingBottom: 12,
    fontSize: 14,
    color: '#1F2937',
  },
  publishButton: {
    height: 40,
    backgroundColor: '#3B82F6',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  publishButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  postCard: {
    marginBottom: 16,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  postMeta: {
    flex: 1,
  },
  postAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  postTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  postContent: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    gap: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
});
