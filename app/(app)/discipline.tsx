import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { AlertTriangle, CheckCircle, Clock, User, Plus, X } from 'lucide-react-native';
import theme from '@/constants/theme';

interface Incident {
  id: string;
  eleve_id: string;
  eleve_nom: string;
  eleve_prenom: string;
  type: string;
  description: string;
  date: string;
  statut: 'en_attente' | 'traite' | 'cloture';
  sanction?: string;
  created_at: string;
}

export default function DisciplineScreen() {
  const { user, isPersonnelVieScolaire } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [formData, setFormData] = useState({
    eleve_email: '',
    type: '',
    description: '',
  });
  const [sanction, setSanction] = useState('');
  const [etablissementId, setEtablissementId] = useState<string | null>(null);

  useEffect(() => {
    fetchEtablissementId();
  }, [user]);

  useEffect(() => {
    if (etablissementId) {
      fetchIncidents();
    }
  }, [etablissementId]);

  const fetchEtablissementId = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('etablissement_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        setEtablissementId(data[0].etablissement_id);
      }
    } catch (error) {
      console.error('Error fetching etablissement:', error);
    }
  };

  const fetchIncidents = async () => {
    if (!etablissementId) return;

    setLoading(true);
    try {
      // Simuler des incidents pour le MVP
      // En production, il faudrait une table `incidents`
      setIncidents([
        {
          id: '1',
          eleve_id: '1',
          eleve_nom: 'KOUASSI',
          eleve_prenom: 'Jean',
          type: 'Retard',
          description: 'Retard de 15 minutes sans justification',
          date: new Date().toISOString(),
          statut: 'en_attente',
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          eleve_id: '2',
          eleve_nom: 'KONE',
          eleve_prenom: 'Aminata',
          type: 'Absence',
          description: 'Absence non justifiée',
          date: new Date().toISOString(),
          statut: 'traite',
          sanction: 'Avertissement',
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Error fetching incidents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddIncident = async () => {
    if (!formData.eleve_email || !formData.type || !formData.description) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    try {
      // Simuler l'ajout
      Alert.alert('Succès', 'Incident enregistré');
      setShowAddForm(false);
      setFormData({ eleve_email: '', type: '', description: '' });
      fetchIncidents();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'enregistrer l\'incident');
    }
  };

  const handleProcessIncident = async (incident: Incident) => {
    Alert.alert(
      'Traiter l\'incident',
      'Souhaitez-vous marquer cet incident comme traité ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Traiter',
          onPress: async () => {
            // Simuler le traitement
            Alert.alert('Succès', 'Incident traité');
            fetchIncidents();
          },
        },
      ]
    );
  };

  const getStatusIcon = (statut: string) => {
    switch (statut) {
      case 'en_attente':
        return <Clock size={16} color={theme.colors.warning.DEFAULT} />;
      case 'traite':
        return <CheckCircle size={16} color={theme.colors.success.DEFAULT} />;
      case 'cloture':
        return <CheckCircle size={16} color={theme.colors.neutral[400]} />;
      default:
        return null;
    }
  };

  const getStatusLabel = (statut: string) => {
    switch (statut) {
      case 'en_attente': return 'En attente';
      case 'traite': return 'Traité';
      case 'cloture': return 'Clôturé';
      default: return statut;
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestion de la discipline</Text>
        <Text style={styles.subtitle}>
          Gérez les incidents, retards et absences des élèves
        </Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddForm(true)}>
          <Plus size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Signaler un incident</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={incidents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={styles.incidentCard}>
            <View style={styles.incidentHeader}>
              <View style={styles.incidentType}>
                <AlertTriangle size={18} color={theme.colors.warning.DEFAULT} />
                <Text style={styles.incidentTypeText}>{item.type}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: item.statut === 'en_attente' ? '#FEF3C7' : '#D1FAE5' }]}>
                {getStatusIcon(item.statut)}
                <Text style={[styles.statusText, { color: item.statut === 'en_attente' ? '#D97706' : '#10B981' }]}>
                  {getStatusLabel(item.statut)}
                </Text>
              </View>
            </View>

            <Text style={styles.eleveName}>
              {item.eleve_prenom} {item.eleve_nom}
            </Text>
            <Text style={styles.description}>{item.description}</Text>
            <Text style={styles.date}>
              {new Date(item.date).toLocaleDateString('fr-FR')}
            </Text>

            {item.sanction && (
              <View style={styles.sanctionContainer}>
                <Text style={styles.sanctionLabel}>Sanction:</Text>
                <Text style={styles.sanctionText}>{item.sanction}</Text>
              </View>
            )}

            {item.statut === 'en_attente' && (
              <Button
                title="Traiter"
                onPress={() => handleProcessIncident(item)}
                variant="primary"
                fullWidth
              />
            )}
          </Card>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucun incident signalé</Text>
          </View>
        }
      />

      {/* Modal d'ajout - à implémenter */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: theme.colors.background.primary,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.neutral[800],
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.neutral[500],
    marginBottom: 20,
    lineHeight: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    padding: 16,
    gap: 12,
  },
  incidentCard: {
    marginBottom: 0,
  },
  incidentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  incidentType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  incidentTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.neutral[700],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  eleveName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.neutral[800],
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: theme.colors.neutral[600],
    marginBottom: 8,
    lineHeight: 20,
  },
  date: {
    fontSize: 12,
    color: theme.colors.neutral[400],
    marginBottom: 12,
  },
  sanctionContainer: {
    backgroundColor: theme.colors.neutral[100],
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  sanctionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.neutral[500],
    marginBottom: 2,
  },
  sanctionText: {
    fontSize: 13,
    color: theme.colors.neutral[700],
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.neutral[400],
  },
});