import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useReactions } from '@/hooks/useReactions';
import { ThumbsUp, Calendar, HelpCircle, Bell, CheckCircle } from 'lucide-react-native';
import theme from '@/constants/theme';

interface AnnonceReactionsProps {
  annonceId: string;
  userReaction: any;
  reactionCounts: {
    like: number;
    participe: number;
    question: number;
    notify: number;
  };
  totalConfirmations: number;
  onReactionChange?: () => void;
  showConfirmation?: boolean;
}

export default function AnnonceReactions({
  annonceId,
  userReaction,
  reactionCounts,
  totalConfirmations,
  onReactionChange,
  showConfirmation = true,
}: AnnonceReactionsProps) {
  const { user } = useAuth();
  const { ajouterReaction, retirerReaction, confirmer, refetch } = useReactions(annonceId);
  const [loading, setLoading] = useState<string | null>(null);
  const [localReaction, setLocalReaction] = useState(userReaction?.reaction || null);
  const [localConfirmation, setLocalConfirmation] = useState(userReaction?.confirmation_presence || false);

  const handleReaction = async (reaction: 'like' | 'participe' | 'question' | 'notify') => {
    if (!user) return;

    setLoading(reaction);

    let success = false;
    if (localReaction === reaction) {
      success = await retirerReaction();
      if (success) {
        setLocalReaction(null);
        // Mettre à jour les compteurs localement
        if (onReactionChange) onReactionChange();
      }
    } else {
      success = await ajouterReaction(reaction);
      if (success) {
        setLocalReaction(reaction);
        if (onReactionChange) onReactionChange();
      }
    }

    setLoading(null);
  };

  const handleConfirmer = async () => {
    if (!user) return;

    setLoading('confirmer');
    const success = await confirmer(!localConfirmation);
    if (success) {
      setLocalConfirmation(!localConfirmation);
      if (onReactionChange) onReactionChange();
    }
    setLoading(null);
  };

  const reactions = [
    { key: 'like' as const, icon: ThumbsUp, label: 'like', count: reactionCounts.like, color: '#3B82F6' },
    { key: 'participe' as const, icon: Calendar, label: 'participe', count: reactionCounts.participe, color: '#10B981' },
    { key: 'question' as const, icon: HelpCircle, label: 'question', count: reactionCounts.question, color: '#F59E0B' },
    { key: 'notify' as const, icon: Bell, label: 'notifier', count: reactionCounts.notify, color: '#8B5CF6' },
  ];

  const totalReactions = reactionCounts.like + reactionCounts.participe + reactionCounts.question;

  return (
    <View style={styles.container}>
      <View style={styles.reactionsRow}>
        {reactions.map((r) => {
          const Icon = r.icon;
          const isActive = localReaction === r.key;
          const isLoading = loading === r.key;

          return (
            <TouchableOpacity
              key={r.key}
              style={[styles.reactionButton, isActive && styles.reactionButtonActive]}
              onPress={() => handleReaction(r.key)}
              disabled={!!loading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color={isActive ? '#FFFFFF' : r.color} />
              ) : (
                <>
                  <Icon size={16} color={isActive ? '#FFFFFF' : r.color} />
                  {r.count > 0 && (
                    <Text style={[styles.reactionCount, isActive && styles.reactionCountActive]}>
                      {r.count}
                    </Text>
                  )}
                </>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Total des réactions */}
      {totalReactions > 0 && (
        <Text style={styles.totalReactions}>
          {totalReactions} réaction{totalReactions > 1 ? 's' : ''}
        </Text>
      )}

      {/* Bouton confirmation présence (uniquement si showConfirmation = true) */}
      {showConfirmation && (
        <TouchableOpacity
          style={[styles.confirmButton, localConfirmation && styles.confirmButtonActive]}
          onPress={handleConfirmer}
          disabled={loading === 'confirmer'}
        >
          {loading === 'confirmer' ? (
            <ActivityIndicator size="small" color={localConfirmation ? '#065F46' : '#FFFFFF'} />
          ) : (
            <>
              <CheckCircle size={14} color={localConfirmation ? '#065F46' : '#FFFFFF'} />
              <Text style={[styles.confirmText, localConfirmation && styles.confirmTextActive]}>
                {localConfirmation ? 'Présence confirmée' : 'Confirmer ma présence'}
              </Text>
              {totalConfirmations > 0 && (
                <Text style={[styles.confirmCount, localConfirmation && styles.confirmCountActive]}>
                  ({totalConfirmations})
                </Text>
              )}
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  reactionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  reactionButtonActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  reactionCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  reactionCountActive: {
    color: '#FFFFFF',
  },
  totalReactions: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  confirmButtonActive: {
    backgroundColor: '#D1FAE5',
  },
  confirmText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  confirmTextActive: {
    color: '#065F46',
  },
  confirmCount: {
    fontSize: 11,
    color: '#FFFFFF',
  },
  confirmCountActive: {
    color: '#065F46',
  },
});