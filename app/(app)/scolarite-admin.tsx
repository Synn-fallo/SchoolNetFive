import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { Users, DollarSign, FileText, Download, Plus, ChevronRight } from 'lucide-react-native';
import theme from '@/constants/theme';

interface Statistiques {
  totalEleves: number;
  totalInscriptions: number;
  totalPaiements: number;
  montantTotal: number;
  montantRecu: number;
}

export default function ScolariteAdminScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Statistiques>({
    totalEleves: 0,
    totalInscriptions: 0,
    totalPaiements: 0,
    montantTotal: 0,
    montantRecu: 0,
  });
  const [loading, setLoading] = useState(true);
  const [etablissementId, setEtablissementId] = useState<string | null>(null);

  useEffect(() => {
    fetchEtablissementId();
  }, [user]);

  useEffect(() => {
    if (etablissementId) {
      fetchStats();
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

  const fetchStats = async () => {
    if (!etablissementId) return;

    setLoading(true);
    try {
      // Compter les élèves
      const { count: elevesCount } = await supabase
        .from('eleves')
        .select('*', { count: 'exact', head: true })
        .eq('etablissement_id', etablissementId);

      // Compter les inscriptions
      const { count: inscriptionsCount } = await supabase
        .from('inscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('etablissement_id', etablissementId);

      // Calculer les paiements
      const { data: paiements } = await supabase
        .from('paiements')
        .select('montant')
        .eq('etablissement_id', etablissementId);

      const montantRecu = paiements?.reduce((sum, p) => sum + (p.montant || 0), 0) || 0;

      setStats({
        totalEleves: elevesCount || 0,
        totalInscriptions: inscriptionsCount || 0,
        totalPaiements: paiements?.length || 0,
        montantTotal: 0, // À calculer depuis frais_scolarite
        montantRecu: montantRecu,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
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
        <Text style={styles.title}>Gestion de la scolarité</Text>
        <Text style={styles.subtitle}>
          Suivez les inscriptions, paiements et statistiques
        </Text>
      </View>

      {/* Statistiques */}
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Users size={28} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.statNumber}>{stats.totalEleves}</Text>
          <Text style={styles.statLabel}>Élèves inscrits</Text>
        </Card>
        <Card style={styles.statCard}>
          <FileText size={28} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.statNumber}>{stats.totalInscriptions}</Text>
          <Text style={styles.statLabel}>Inscriptions</Text>
        </Card>
        <Card style={styles.statCard}>
          <DollarSign size={28} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.statNumber}>{stats.montantRecu.toLocaleString()} FCFA</Text>
          <Text style={styles.statLabel}>Paiements reçus</Text>
        </Card>
      </View>

      {/* Actions rapides */}
      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Actions rapides</Text>
        <TouchableOpacity style={styles.actionCard} onPress={() => Alert.alert('Fonctionnalité à venir')}>
          <Plus size={24} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.actionTitle}>Nouvelle inscription</Text>
          <Text style={styles.actionDesc}>Inscrire un nouvel élève</Text>
          <ChevronRight size={16} color={theme.colors.neutral[400]} style={styles.actionIcon} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => Alert.alert('Fonctionnalité à venir')}>
          <Download size={24} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.actionTitle}>Exporter</Text>
          <Text style={styles.actionDesc}>Exporter les données en CSV</Text>
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
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: 100,
    alignItems: 'center',
    padding: 16,
  },
  statNumber: {
    fontSize: 20,
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
    fontWeight: '600',
    color: theme.colors.neutral[800],
    marginLeft: 12,
    flex: 1,
  },
  actionDesc: {
    fontSize: 12,
    color: theme.colors.neutral[500],
    marginLeft: 12,
  },
  actionIcon: {
    marginLeft: 8,
  },
});