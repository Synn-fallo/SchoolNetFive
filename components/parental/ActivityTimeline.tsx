import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, BookOpen, MessageCircle, Award, AlertCircle, CheckCircle } from 'lucide-react-native';
import { Card } from '@/components/Card';
import theme from '@/constants/theme';

interface Activite {
  id: string;
  type: 'note' | 'absence' | 'message' | 'evenement' | 'devoir';
  titre: string;
  description: string;
  date: string;
  metadata?: any;
}

interface ActivityTimelineProps {
  eleveId: string;
}

export default function ActivityTimeline({ eleveId }: ActivityTimelineProps) {
  const [activites, setActivites] = useState<Activite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (eleveId) {
      fetchActivities();
    }
  }, [eleveId]);

  const fetchActivities = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const activitesList: Activite[] = [];

      // 1. Récupérer les notes récentes
      const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select('*, devoir:devoir_id(titre, matiere_id, matieres:matiere_id(nom))')
        .eq('eleve_id', eleveId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!notesError && notes) {
        notes.forEach((note: any) => {
          activitesList.push({
            id: `note-${note.id}`,
            type: 'note',
            titre: `Note en ${note.devoir?.matieres?.nom || 'Matière'}`,
            description: `Note: ${note.note}/${note.devoir?.note_sur || 20}`,
            date: note.created_at,
          });
        });
      }

      // 2. Récupérer les absences récentes
      const { data: absences, error: absencesError } = await supabase
        .from('absences')
        .select('*')
        .eq('eleve_id', eleveId)
        .order('date', { ascending: false })
        .limit(5);

      if (!absencesError && absences) {
        absences.forEach((absence: any) => {
          activitesList.push({
            id: `absence-${absence.id}`,
            type: 'absence',
            titre: 'Absence',
            description: absence.justifiee ? 'Absence justifiée' : 'Absence non justifiée',
            date: absence.date,
            metadata: { justifiee: absence.justifiee },
          });
        });
      }

      // 3. Récupérer les messages récents
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('destinataire_id', eleveId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (!messagesError && messages) {
        messages.forEach((message: any) => {
          activitesList.push({
            id: `message-${message.id}`,
            type: 'message',
            titre: 'Nouveau message',
            description: message.sujet || 'Message reçu',
            date: message.created_at,
            metadata: { lu: message.is_read },
          });
        });
      }

      // 4. Récupérer les événements à venir
      const { data: evenements, error: evenementsError } = await supabase
        .from('evenements')
        .select('*')
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true })
        .limit(5);

      if (!evenementsError && evenements) {
        evenements.forEach((event: any) => {
          activitesList.push({
            id: `event-${event.id}`,
            type: 'evenement',
            titre: event.titre,
            description: event.description || 'Événement à venir',
            date: event.date,
          });
        });
      }

      // Trier par date (du plus récent au plus ancien)
      activitesList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setActivites(activitesList.slice(0, 20));
      
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Impossible de charger les activités');
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'note':
        return <BookOpen size={16} color="#10B981" />;
      case 'absence':
        return <AlertCircle size={16} color="#EF4444" />;
      case 'message':
        return <MessageCircle size={16} color="#3B82F6" />;
      case 'evenement':
        return <Calendar size={16} color="#F59E0B" />;
      case 'devoir':
        return <Award size={16} color="#8B5CF6" />;
      default:
        return <CheckCircle size={16} color="#6B7280" />;
    }
  };

  const getIconBackground = (type: string) => {
    switch (type) {
      case 'note':
        return '#D1FAE5';
      case 'absence':
        return '#FEE2E2';
      case 'message':
        return '#EFF6FF';
      case 'evenement':
        return '#FEF3C7';
      case 'devoir':
        return '#F3E8FF';
      default:
        return '#F3F4F6';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return `Aujourd'hui à ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (days === 1) {
      return 'Hier';
    } else if (days < 7) {
      return `Il y a ${days} jours`;
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement des activités...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchActivities}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (activites.length === 0) {
    return (
      <Card style={styles.emptyCard}>
        <Calendar size={48} color={theme.colors.neutral[300]} />
        <Text style={styles.emptyTitle}>Aucune activité</Text>
        <Text style={styles.emptyText}>
          Aucune activité récente à afficher pour cet élève.
        </Text>
      </Card>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.timeline}>
        {activites.map((activite, index) => (
          <View key={activite.id} style={styles.timelineItem}>
            <View style={[styles.timelineIcon, { backgroundColor: getIconBackground(activite.type) }]}>
              {getIcon(activite.type)}
            </View>
            <View style={styles.timelineContent}>
              <View style={styles.timelineHeader}>
                <Text style={styles.timelineTitle}>{activite.titre}</Text>
                <Text style={styles.timelineDate}>{formatDate(activite.date)}</Text>
              </View>
              <Text style={styles.timelineDescription}>{activite.description}</Text>
            </View>
            {index < activites.length - 1 && <View style={styles.timelineLine} />}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  timeline: {
    position: 'relative',
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
    position: 'relative',
  },
  timelineIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    zIndex: 2,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  timelineDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  timelineDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  timelineLine: {
    position: 'absolute',
    left: 17,
    top: 36,
    bottom: -24,
    width: 2,
    backgroundColor: '#E5E7EB',
    zIndex: 1,
  },
});