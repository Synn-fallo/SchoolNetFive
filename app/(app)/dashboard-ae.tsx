import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { Users, BookOpen, TrendingUp, ChevronRight, GraduationCap } from 'lucide-react-native';
import theme from '@/constants/theme';

interface DashboardData {
  totalEnseignants: number;
  totalClasses: number;
  totalEleves: number;
  departement: string;
}

export default function DashboardAEScreen() {
  const { user, getAdminMetadata } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData>({
    totalEnseignants: 0,
    totalClasses: 0,
    totalEleves: 0,
    departement: '',
  });
  const [loading, setLoading] = useState(true);
  const [etablissementId, setEtablissementId] = useState<string | null>(null);
  const metadata = getAdminMetadata();
  const departement = metadata?.departement || '';

  useEffect(() => {
    fetchEtablissementId();
  }, [user]);

  useEffect(() => {
    if (etablissementId) {
      fetchDashboardData();
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

  const fetchDashboardData = async () => {
    if (!etablissementId) return;

    setLoading(true);
    try {
      // Pour le MVP, on simule des données spécifiques au département
      setData({
        totalEnseignants: 8,
        totalClasses: 4,
        totalEleves: 120,
        departement: departement,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Tableau de bord</Text>
        <Text style={styles.subtitle}>Animateur d'Établissement</Text>
        {departement && (
          <View style={styles.departementBadge}>
            <GraduationCap size={16} color={theme.colors.primary.DEFAULT} />
            <Text style={styles.departementText}>Département: {departement}</Text>
          </View>
        )}
      </View>

      {/* Statistiques */}
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Users size={28} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.statNumber}>{data.totalEnseignants}</Text>
          <Text style={styles.statLabel}>Enseignants</Text>
        </Card>
        <Card style={styles.statCard}>
          <BookOpen size={28} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.statNumber}>{data.totalClasses}</Text>
          <Text style={styles.statLabel}>Classes</Text>
        </Card>
        <Card style={styles.statCard}>
          <TrendingUp size={28} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.statNumber}>{data.totalEleves}</Text>
          <Text style={styles.statLabel}>Élèves</Text>
        </Card>
      </View>

      {/* Actions rapides */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Actions rapides</Text>
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(app)/enseignants')}>
          <Users size={24} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.actionTitle}>Gérer les enseignants</Text>
          <ChevronRight size={16} color={theme.colors.neutral[400]} style={styles.actionIcon} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(app)/classes')}>
          <BookOpen size={24} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.actionTitle}>Gérer les classes</Text>
          <ChevronRight size={16} color={theme.colors.neutral[400]} style={styles.actionIcon} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(app)/notes')}>
          <TrendingUp size={24} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.actionTitle}>Notes et évaluations</Text>
          <ChevronRight size={16} color={theme.colors.neutral[400]} style={styles.actionIcon} />
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  content: {
    paddingBottom: 32,
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
    marginBottom: 12,
  },
  departementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.neutral[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  departementText: {
    fontSize: 12,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.neutral[800],
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.neutral[500],
    marginTop: 4,
  },
  actionsSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.neutral[700],
    marginBottom: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.neutral[800],
    marginLeft: 12,
    flex: 1,
  },
  actionIcon: {
    marginLeft: 8,
  },
});