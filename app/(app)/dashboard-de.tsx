import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { Users, BookOpen, Calendar, TrendingUp, ChevronRight } from 'lucide-react-native';
import theme from '@/constants/theme';

interface DashboardData {
  totalClasses: number;
  totalEnseignants: number;
  totalEleves: number;
  notesMoyennes: { matiere: string; moyenne: number }[];
}

export default function DashboardDEScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData>({
    totalClasses: 0,
    totalEnseignants: 0,
    totalEleves: 0,
    notesMoyennes: [],
  });
  const [loading, setLoading] = useState(true);
  const [etablissementId, setEtablissementId] = useState<string | null>(null);

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
      // Compter les classes
      const { count: classesCount } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('etablissement_id', etablissementId)
        .eq('is_active', true);

      // Compter les enseignants
      const { count: enseignantsCount } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('etablissement_id', etablissementId)
        .eq('role', 'enseignant')
        .eq('is_active', true);

      // Compter les élèves
      const { count: elevesCount } = await supabase
        .from('eleves')
        .select('*', { count: 'exact', head: true })
        .eq('etablissement_id', etablissementId);

      setData({
        totalClasses: classesCount || 0,
        totalEnseignants: enseignantsCount || 0,
        totalEleves: elevesCount || 0,
        notesMoyennes: [
          { matiere: 'Mathématiques', moyenne: 14.5 },
          { matiere: 'Français', moyenne: 13.2 },
          { matiere: 'Anglais', moyenne: 15.8 },
        ],
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
        <Text style={styles.subtitle}>Directeur des Études</Text>
      </View>

      {/* Statistiques */}
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Users size={28} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.statNumber}>{data.totalEleves}</Text>
          <Text style={styles.statLabel}>Élèves</Text>
        </Card>
        <Card style={styles.statCard}>
          <BookOpen size={28} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.statNumber}>{data.totalClasses}</Text>
          <Text style={styles.statLabel}>Classes</Text>
        </Card>
        <Card style={styles.statCard}>
          <TrendingUp size={28} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.statNumber}>{data.totalEnseignants}</Text>
          <Text style={styles.statLabel}>Enseignants</Text>
        </Card>
      </View>

      {/* Moyennes par matière */}
      <Card style={styles.moyennesCard}>
        <Text style={styles.cardTitle}>Moyennes par matière</Text>
        {data.notesMoyennes.map((item, idx) => (
          <View key={idx} style={styles.matiereRow}>
            <Text style={styles.matiereName}>{item.matiere}</Text>
            <View style={styles.moyenneBar}>
              <View style={[styles.moyenneFill, { width: `${(item.moyenne / 20) * 100}%` }]} />
            </View>
            <Text style={styles.moyenneValue}>{item.moyenne}/20</Text>
          </View>
        ))}
      </Card>

      {/* Actions rapides */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Actions rapides</Text>
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(app)/classes')}>
          <BookOpen size={24} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.actionTitle}>Gérer les classes</Text>
          <ChevronRight size={16} color={theme.colors.neutral[400]} style={styles.actionIcon} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(app)/enseignants')}>
          <Users size={24} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.actionTitle}>Gérer les enseignants</Text>
          <ChevronRight size={16} color={theme.colors.neutral[400]} style={styles.actionIcon} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(app)/emplois')}>
          <Calendar size={24} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.actionTitle}>Emplois du temps</Text>
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
  moyennesCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.neutral[800],
    marginBottom: 16,
  },
  matiereRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  matiereName: {
    width: 100,
    fontSize: 14,
    color: theme.colors.neutral[600],
  },
  moyenneBar: {
    flex: 1,
    height: 8,
    backgroundColor: theme.colors.neutral[200],
    borderRadius: 4,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  moyenneFill: {
    height: '100%',
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: 4,
  },
  moyenneValue: {
    width: 45,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.neutral[800],
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