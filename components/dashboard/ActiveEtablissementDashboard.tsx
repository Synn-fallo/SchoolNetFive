import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { Users, BookOpen, DollarSign, Building2, TrendingUp, Calendar, Clock } from 'lucide-react-native';
import { useActiveEtablissement } from '@/hooks/useActiveEtablissement';
import { useAuth } from '@/contexts/AuthContext';
import theme from '@/constants/theme';

interface Stats {
  eleves: number;
  enseignants: number;
  classes: number;
  taux_reussite?: number;
}

interface PendingRequest {
  id: string;
  nom_etablissement: string;
  statut: string;
  created_at: string;
}

export default function ActiveEtablissementDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const { activeEtablissement, loading: etablissementLoading } = useActiveEtablissement();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingRequest, setPendingRequest] = useState<PendingRequest | null>(null);
  const [checkingRequest, setCheckingRequest] = useState(true);

  // Vérifier s'il y a une demande en attente
  useEffect(() => {
    const checkPendingRequest = async () => {
      if (!user) {
        setCheckingRequest(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('demandes_etablissement')
          .select('id, nom_etablissement, statut, created_at')
          .eq('demandeur_id', user.id)
          .eq('statut', 'en_attente')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        setPendingRequest(data);
      } catch (error) {
        console.error('Error checking pending request:', error);
      } finally {
        setCheckingRequest(false);
      }
    };

    checkPendingRequest();
  }, [user]);

  useEffect(() => {
    if (activeEtablissement) {
      fetchStats();
    }
  }, [activeEtablissement]);

  const fetchStats = async () => {
    if (!activeEtablissement) return;

    setLoading(true);
    try {
      const [elevesCount, enseignantsCount, classesCount] = await Promise.all([
        supabase.from('eleves').select('*', { count: 'exact', head: true }).eq('etablissement_id', activeEtablissement.id),
        supabase.from('user_roles').select('*', { count: 'exact', head: true }).eq('etablissement_id', activeEtablissement.id).eq('role', 'enseignant'),
        supabase.from('classes').select('*', { count: 'exact', head: true }).eq('etablissement_id', activeEtablissement.id),
      ]);

      setStats({
        eleves: elevesCount.count || 0,
        enseignants: enseignantsCount.count || 0,
        classes: classesCount.count || 0,
        taux_reussite: 85,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Affichage du chargement initial
  if (etablissementLoading || checkingRequest) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement du tableau de bord...</Text>
      </View>
    );
  }

  // Cas 1: Demande en attente de validation
  if (!activeEtablissement && pendingRequest) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.pendingIconContainer}>
          <Clock size={48} color="#F59E0B" />
        </View>
        <Text style={styles.pendingTitle}>Demande en attente</Text>
        <Text style={styles.pendingText}>
          Votre demande de création d'établissement "{pendingRequest.nom_etablissement}" 
          est en cours de validation par nos équipes.
        </Text>
        <Text style={styles.pendingSubtext}>
          Vous recevrez une notification dès que votre établissement sera activé.
        </Text>
        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={() => router.push('/(app)/profile')}
        >
          <Text style={styles.secondaryButtonText}>Voir le statut de ma demande</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Cas 2: Aucun établissement et aucune demande
  if (!activeEtablissement && !pendingRequest) {
    return (
      <View style={styles.centerContainer}>
        <Building2 size={48} color={theme.colors.neutral[300]} />
        <Text style={styles.emptyTitle}>Aucun établissement actif</Text>
        <Text style={styles.emptyText}>
          Vous n'êtes pas encore rattaché à un établissement.
        </Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => router.push('/(app)/(sidebar)/institution/demande-etablissement')}
        >
          <Text style={styles.createButtonText}>Créer un établissement</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Cas 3: Chargement des statistiques
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement du tableau de bord...</Text>
      </View>
    );
  }

  // Cas 4: Établissement actif - Affichage normal
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{activeEtablissement?.nom}</Text>
        <Text style={styles.subtitle}>Tableau de bord</Text>
      </View>

      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Users size={28} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.statNumber}>{stats?.eleves || 0}</Text>
          <Text style={styles.statLabel}>Élèves</Text>
        </Card>
        <Card style={styles.statCard}>
          <BookOpen size={28} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.statNumber}>{stats?.enseignants || 0}</Text>
          <Text style={styles.statLabel}>Enseignants</Text>
        </Card>
        <Card style={styles.statCard}>
          <Building2 size={28} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.statNumber}>{stats?.classes || 0}</Text>
          <Text style={styles.statLabel}>Classes</Text>
        </Card>
        {stats?.taux_reussite && (
          <Card style={styles.statCard}>
            <TrendingUp size={28} color={theme.colors.success?.DEFAULT || '#10B981'} />
            <Text style={styles.statNumber}>{stats.taux_reussite}%</Text>
            <Text style={styles.statLabel}>Taux de réussite</Text>
          </Card>
        )}
      </View>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>💰 Scolarité & Finance</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Taux de recouvrement</Text>
          <Text style={styles.value}>85%</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Échéancier en cours</Text>
          <Text style={styles.value}>1er trimestre</Text>
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>📅 Prochains événements</Text>
        <View style={styles.infoRow}>
          <Calendar size={16} color={theme.colors.neutral[500]} />
          <Text style={styles.eventText}>Conseil de classe - 15/04/2026</Text>
        </View>
        <View style={styles.infoRow}>
          <Calendar size={16} color={theme.colors.neutral[500]} />
          <Text style={styles.eventText}>Réunion parents - 22/04/2026</Text>
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
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
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  pendingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  pendingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#D97706',
    marginBottom: 8,
  },
  pendingText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
  },
  pendingSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  secondaryButtonText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '500',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    paddingVertical: 16,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  eventText: {
    fontSize: 13,
    color: '#4B5563',
    marginLeft: 8,
  },
});