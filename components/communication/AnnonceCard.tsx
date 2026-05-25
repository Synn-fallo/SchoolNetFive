import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useReactions } from '@/hooks/useReactions';
import { useAnnonces } from '@/hooks/useAnnonces';
import AnnonceReactions from './AnnonceReactions';
import AnnonceCommentaires from './AnnonceCommentaires';
import { Pin, Eye, MessageCircle, Calendar, Building2, Users, ChevronDown, ChevronUp } from 'lucide-react-native';
import theme from '@/constants/theme';

interface AnnonceCardProps {
  annonce: {
    id: string;
    titre: string;
    contenu: string;
    type: string;
    visibilite: string;
    classe_nom?: string;
    etablissement_nom?: string;
    created_at: string;
    est_epingle: boolean;
    commentaires_actifs: boolean;
    visibilite_commentaires: 'masques' | 'visibles';
    afficher_accuse_lecture: boolean;
    date_debut?: string;
    date_fin?: string;
    publie_par_nom?: string;
    publie_par_prenom?: string;
  };
  onRefresh?: () => void;
}

export default function AnnonceCard({ annonce, onRefresh }: AnnonceCardProps) {
  const { user } = useAuth();
  const { marquerLu } = useAnnonces();
  const { userReaction, reactionCounts, totalConfirmations, refetch: refreshReactions } = useReactions(annonce.id);
  const [showComments, setShowComments] = useState(false);
  const [isRead, setIsRead] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Vérifier si l'annonce a une date d'événement (pour afficher le bouton confirmation)
  const hasEvent = !!(annonce.date_debut || annonce.date_fin);

  // Marquer comme lu au premier affichage
  useEffect(() => {
    if (annonce.afficher_accuse_lecture && !isRead && user) {
      const markAsRead = async () => {
        await marquerLu(annonce.id);
        setIsRead(true);
      };
      markAsRead();
    }
  }, [annonce.id, annonce.afficher_accuse_lecture, isRead, user]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const jours = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (jours === 0) return "Aujourd'hui";
    if (jours === 1) return 'Hier';
    if (jours < 7) return `Il y a ${jours} jours`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  const getTypeIcon = () => {
    if (annonce.type === 'etablissement') return <Building2 size={16} color="#3B82F6" />;
    if (annonce.type === 'classe') return <Users size={16} color="#10B981" />;
    return <Building2 size={16} color={theme.colors.primary.DEFAULT} />;
  };

  const getTypeLabel = () => {
    if (annonce.type === 'etablissement') return 'Établissement';
    if (annonce.type === 'classe') return 'Classe';
    return 'Annonce';
  };

  const getSourceLabel = () => {
    if (annonce.type === 'classe' && annonce.classe_nom) return annonce.classe_nom;
    if (annonce.type === 'etablissement' && annonce.etablissement_nom) return annonce.etablissement_nom;
    return '';
  };

  const handleRefresh = () => {
    refreshReactions();
    if (onRefresh) onRefresh();
  };

  const canComment = annonce.commentaires_actifs;

  return (
    <View style={[
      styles.card,
      annonce.est_epingle && styles.cardPinned,
      annonce.type === 'etablissement' && styles.cardEtablissement,
      annonce.type === 'classe' && styles.cardClasse,
    ]}>
      {/* Badge épinglé */}
      {annonce.est_epingle && (
        <View style={styles.pinBadge}>
          <Pin size={12} color="#F59E0B" />
          <Text style={styles.pinText}>Épinglé</Text>
        </View>
      )}

      {/* En-tête */}
      <View style={styles.header}>
        <View style={styles.typeBadge}>
          {getTypeIcon()}
          <Text style={styles.typeText}>{getTypeLabel()}</Text>
        </View>
        <Text style={styles.date}>{formatDate(annonce.created_at)}</Text>
      </View>

      {/* Source */}
      {getSourceLabel() !== '' && (
        <View style={styles.sourceContainer}>
          {annonce.type === 'etablissement' ? (
            <Building2 size={12} color="#6B7280" />
          ) : (
            <Users size={12} color="#6B7280" />
          )}
          <Text style={styles.sourceText}>{getSourceLabel()}</Text>
        </View>
      )}

      {/* Titre */}
      <Text style={styles.title}>{annonce.titre}</Text>

      {/* Contenu (avec expansion) */}
      <Text
        style={styles.content}
        numberOfLines={isExpanded ? undefined : 3}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        {annonce.contenu}
      </Text>
      {annonce.contenu.length > 150 && (
        <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)} style={styles.expandButton}>
          <Text style={styles.expandText}>{isExpanded ? 'Voir moins' : 'Voir plus'}</Text>
          {isExpanded ? <ChevronUp size={14} color={theme.colors.primary.DEFAULT} /> : <ChevronDown size={14} color={theme.colors.primary.DEFAULT} />}
        </TouchableOpacity>
      )}

      {/* Auteur */}
      <Text style={styles.author}>
        Publié par {annonce.publie_par_prenom} {annonce.publie_par_nom}
      </Text>

      {/* Réactions (avec confirmation uniquement si événement) */}
      <AnnonceReactions
        annonceId={annonce.id}
        userReaction={userReaction}
        reactionCounts={reactionCounts}
        totalConfirmations={totalConfirmations}
        onReactionChange={handleRefresh}
        showConfirmation={hasEvent}
      />

      {/* Section commentaires */}
      {canComment && (
        <View style={styles.commentsSection}>
          <TouchableOpacity
            style={styles.commentsHeader}
            onPress={() => setShowComments(!showComments)}
          >
            <View style={styles.commentsHeaderLeft}>
              <MessageCircle size={16} color={theme.colors.neutral[500]} />
              <Text style={styles.commentsCount}>
                {annonce.visibilite_commentaires === 'masques' ? 'Commenter' : 'Commentaires'}
              </Text>
            </View>
            {showComments ? <ChevronUp size={16} color="#6B7280" /> : <ChevronDown size={16} color="#6B7280" />}
          </TouchableOpacity>

          {showComments && (
            <AnnonceCommentaires
              annonceId={annonce.id}
              visibilite={annonce.visibilite_commentaires}
              onCommentAdded={handleRefresh}
            />
          )}
        </View>
      )}

      {/* Accusé de lecture (info) */}
      {annonce.afficher_accuse_lecture && isRead && (
        <View style={styles.readBadge}>
          <Eye size={12} color="#10B981" />
          <Text style={styles.readText}>Lu</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardEtablissement: {
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  cardClasse: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  cardPinned: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  pinBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
  },
  pinText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#F59E0B',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.primary.DEFAULT,
  },
  date: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sourceText: {
    fontSize: 12,
    color: '#6B7280',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  content: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginBottom: 8,
  },
  expandText: {
    fontSize: 12,
    color: theme.colors.primary.DEFAULT,
  },
  author: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  commentsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  commentsCount: {
    fontSize: 13,
    color: '#6B7280',
  },
  readBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
  },
  readText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#065F46',
  },
});