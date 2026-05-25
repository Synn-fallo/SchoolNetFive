// /home/project/components/notes/StatsGeneralesCard.tsx
// Carte des statistiques générales de l'établissement

import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown, Award, Users } from 'lucide-react-native';
import theme from '@/constants/theme';

interface StatsGeneralesCardProps {
  moyenneEtablissement: number;
  tauxReussite: number;
  meilleureClasse: { nom: string; moyenne: number };
  plusFaibleClasse: { nom: string; moyenne: number };
  isSubscribed: boolean;
}

export default function StatsGeneralesCard({
  moyenneEtablissement,
  tauxReussite,
  meilleureClasse,
  plusFaibleClasse,
  isSubscribed,
}: StatsGeneralesCardProps) {
  if (!isSubscribed) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>📈 Statistiques générales</Text>
        <Text style={styles.disabledText}>🔒 Abonnement requis pour voir les statistiques</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>📈 Statistiques générales</Text>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Award size={20} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.statValue}>{moyenneEtablissement.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Moyenne établissement</Text>
        </View>

        <View style={styles.statCard}>
          <TrendingUp size={20} color="#10B981" />
          <Text style={[styles.statValue, { color: '#10B981' }]}>{tauxReussite.toFixed(1)}%</Text>
          <Text style={styles.statLabel}>Taux de réussite</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.classeRow}>
        <View style={styles.classeItem}>
          <TrendingUp size={16} color="#10B981" />
          <Text style={styles.classeLabel}>Meilleure classe</Text>
          <Text style={styles.classeName}>{meilleureClasse.nom}</Text>
          <Text style={[styles.classeMoyenne, { color: '#10B981' }]}>{meilleureClasse.moyenne.toFixed(2)}</Text>
        </View>
        <View style={styles.classeItem}>
          <TrendingDown size={16} color="#EF4444" />
          <Text style={styles.classeLabel}>Classe à améliorer</Text>
          <Text style={styles.classeName}>{plusFaibleClasse.nom}</Text>
          <Text style={[styles.classeMoyenne, { color: '#EF4444' }]}>{plusFaibleClasse.moyenne.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 16,
  },
  classeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  classeItem: {
    flex: 1,
    alignItems: 'center',
  },
  classeLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 8,
  },
  classeName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
    marginTop: 4,
  },
  classeMoyenne: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 2,
  },
  disabledText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
});