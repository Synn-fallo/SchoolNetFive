import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { Building2, Users, BookOpen, TrendingUp, Award, DollarSign } from 'lucide-react-native';
import { useActiveEtablissement } from '@/hooks/useActiveEtablissement';
import theme from '@/constants/theme';

interface GlobalStats {
  totalEtablissements: number;
  totalEleves: number;
  totalEnseignants: number;
  totalClasses: number;
  tauxReussiteMoyen: number;
  chiffreAffaire: number;
}

export default function GlobalDashboard() {
  const { allEtablissements, loading: etablissementLoading } = useActiveEtablissement();
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (allEtablissements.length > 0) {
      fetchGlobalStats();
    } else {
      setLoading(false);
    }
  }, [allEtablissements]);

  const fetchGlobalStats = async () => {
    if (allEtablissements.length === 0) return;

    setLoading(true);
    try {
      const etablissementIds = allEtablissements.map(e => e.id);

      // Récupérer tous les élèves de tous les établissements
      const { data: elevesData, error: elevesError } = await supabase
        .from('eleves')
        .select('etablissement_id')
        .in('etablissement_id', etablissementIds);

      if (elevesError) throw elevesError;

      // Récupérer tous les enseignants de tous les établissements
      const { data: enseignantsData, error: enseignantsError } = await supabase
        .from('user_roles')
        .select('etablissement_id')
        .in('etablissement_id', etablissementIds)
        .eq('role', 'enseignant');

      if (enseignantsError) throw enseignantsError;

      // Récupérer toutes les classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('etablissement_id')
        .in('etablissement_id', etablissementIds);

      if (classesError) throw classesError;

      // Calculer le taux de réussite moyen (simulé pour l'instant)
      const tauxReussiteMoyen = 82; // À remplacer par un vrai calcul

      setStats({
        totalEtablissements: allEtablissements.length,
        totalEleves: elevesData?.length || 0,
        totalEnseignants: enseignantsData?.length || 0,
        totalClasses: classesData?.length || 0,
        tauxReussiteMoyen: tauxReussiteMoyen,
        chiffreAffaire: allEtablissements.length * 45000, // Simulation
      });
    } catch (error) {
      console.error('Error fetching global stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (etablissementLoading || loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement de la vue globale...</Text>
      </View>
    );
  }

  if (allEtablissements.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Building2 size={48} color={theme.colors.neutral[300]} />
        <Text style={styles.emptyTitle}>Aucun établissement</Text>
        <Text style={styles.emptyText}>
          Vous n'êtes pas encore associé à un établissement.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Vue globale</Text>
        <Text style={styles.subtitle}>
          Synthèse de l'ensemble de vos établissements
        </Text>
      </View>

      {/* Cartes de statistiques globales */}
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Building2 size={28} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.statNumber}>{stats?.totalEtablissements || 0}</Text>
          <Text style={styles.statLabel}>Établissements</Text>
        </Card>
        <Card style={styles.statCard}>
          <Users size={28} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.statNumber}>{stats?.totalEleves || 0}</Text>
          <Text style={styles.statLabel}>Élèves</Text>
        </Card>
        <Card style={styles.statCard}>
          <BookOpen size={28} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.statNumber}>{stats?.totalEnseignants || 0}</Text>
          <Text style={styles.statLabel}>Enseignants</Text>
        </Card>
        <Card style={styles.statCard}>
          <Building2 size={28} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.statNumber}>{stats?.totalClasses || 0}</Text>
          <Text style={styles.statLabel}>Classes</Text>
        </Card>
      </View>

      {/* Performance globale */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Performance globale</Text>
        <View style={styles.infoRow}>
          <Award size={18} color={theme.colors.success.DEFAULT} />
          <Text style={styles.label}>Taux de réussite moyen</Text>
          <Text style={styles.value}>{stats?.tauxReussiteMoyen}%</Text>
        </View>
        <View style={styles.infoRow}>
          <TrendingUp size={18} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.label}>Progression annuelle</Text>
          <Text style={styles.value}>+12%</Text>
        </View>
      </Card>

      {/* Finances */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>💰 Finances</Text>
        <View style={styles.infoRow}>
          <DollarSign size={18} color={theme.colors.success.DEFAULT} />
          <Text style={styles.label}>Chiffre d'affaires total</Text>
          <Text style={styles.value}>{stats?.chiffreAffaire?.toLocaleString()} FCFA</Text>
        </View>
        <View style={styles.infoRow}>
          <DollarSign size={18} color={theme.colors.warning.DEFAULT} />
          <Text style={styles.label}>Moyenne par établissement</Text>
          <Text style={styles.value}>45 000 FCFA</Text>
        </View>
      </Card>

      {/* Liste des établissements */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>🏫 Vos établissements</Text>
        {allEtablissements.map((etab) => (
          <View key={etab.id} style={styles.etablissementRow}>
            <View>
              <Text style={styles.etablissementName}>{etab.nom}</Text>
              {etab.ville && (
                <Text style={styles.etablissementVille}>{etab.ville}</Text>
              )}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: etab.statut === 'ACTIF' ? '#D1FAE5' : '#FEF3C7' }]}>
              <Text style={[styles.statusText, { color: etab.statut === 'ACTIF' ? '#10B981' : '#F59E0B' }]}>
                {etab.statut === 'ACTIF' ? 'Actif' : 'En configuration'}
              </Text>
            </View>
          </View>
        ))}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
    marginLeft: 8,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  etablissementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  etablissementName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  etablissementVille: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
});