import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useAnnonces } from '@/hooks/useAnnonces';
import { Send, User } from 'lucide-react-native';
import theme from '@/constants/theme';

interface Commentaire {
  id: string;
  user_id: string;
  user_role: string;
  contenu: string;
  est_masque: boolean;
  created_at: string;
  user_nom?: string;
  user_prenom?: string;
}

interface AnnonceCommentairesProps {
  annonceId: string;
  visibilite: 'masques' | 'visibles';
  onCommentAdded?: () => void;
}

export default function AnnonceCommentaires({ annonceId, visibilite, onCommentAdded }: AnnonceCommentairesProps) {
  const { user } = useAuth();
  const { commenter } = useAnnonces();
  const [commentaires, setCommentaires] = useState<Commentaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [showForm, setShowForm] = useState(true);

  const chargerCommentaires = useCallback(async () => {
    if (!annonceId) return;

    setLoading(true);

    try {
      // Requête pour récupérer les commentaires visibles
      let query = supabase
        .from('annonces_commentaires')
        .select(`
          *,
          user:user_id (nom, prenom)
        `)
        .eq('annonce_id', annonceId)
        .order('created_at', { ascending: true });

      // En mode masqué, seul l'utilisateur voit ses propres commentaires
      if (visibilite === 'masques') {
        query = query.eq('user_id', user?.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formatted = (data || []).map((c: any) => ({
        id: c.id,
        user_id: c.user_id,
        user_role: c.user_role,
        contenu: c.contenu,
        est_masque: c.est_masque,
        created_at: c.created_at,
        user_nom: c.user?.nom,
        user_prenom: c.user?.prenom,
      }));

      setCommentaires(formatted);
    } catch (err) {
      console.error('Erreur chargement commentaires:', err);
    } finally {
      setLoading(false);
    }
  }, [annonceId, visibilite, user?.id]);

  const handleEnvoyer = async () => {
    if (!newComment.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un commentaire');
      return;
    }

    setSending(true);

    try {
      const result = await commenter(annonceId, newComment.trim());

      if (result.success) {
        setNewComment('');
        await chargerCommentaires();
        if (onCommentAdded) onCommentAdded();
        Alert.alert('Succès', 'Commentaire ajouté');
      } else {
        Alert.alert('Erreur', result.error || 'Impossible d\'ajouter le commentaire');
      }
    } catch (err) {
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    chargerCommentaires();
  }, [chargerCommentaires]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary.DEFAULT} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Liste des commentaires */}
      {commentaires.length > 0 && (
        <ScrollView style={styles.commentairesList} showsVerticalScrollIndicator={false}>
          {commentaires.map((c) => (
            <View key={c.id} style={styles.commentaireItem}>
              <View style={styles.commentaireAvatar}>
                <User size={14} color={theme.colors.primary.DEFAULT} />
              </View>
              <View style={styles.commentaireContent}>
                <View style={styles.commentaireHeader}>
                  <Text style={styles.commentaireAuthor}>
                    {c.user_prenom} {c.user_nom}
                  </Text>
                  <Text style={styles.commentaireDate}>{formatDate(c.created_at)}</Text>
                </View>
                <Text style={styles.commentaireText}>{c.contenu}</Text>
                {c.est_masque && (
                  <Text style={styles.masqueBadge}>Masqué pour les autres</Text>
                )}
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Formulaire d'ajout */}
      {showForm && (
        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Écrire un commentaire..."
            placeholderTextColor="#9CA3AF"
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!newComment.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleEnvoyer}
            disabled={!newComment.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Send size={16} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      )}

      {visibilite === 'masques' && commentaires.length === 0 && !loading && (
        <Text style={styles.emptyText}>Aucun commentaire. Soyez le premier à commenter.</Text>
      )}

      {visibilite === 'visibles' && commentaires.length === 0 && !loading && (
        <Text style={styles.emptyText}>Soyez le premier à commenter.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  loadingContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  commentairesList: {
    maxHeight: 300,
  },
  commentaireItem: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 10,
  },
  commentaireAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentaireContent: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 10,
  },
  commentaireHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentaireAuthor: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  commentaireDate: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  commentaireText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  masqueBadge: {
    fontSize: 10,
    color: '#F59E0B',
    marginTop: 4,
  },
  formContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1F2937',
    maxHeight: 80,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  emptyText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 12,
  },
});