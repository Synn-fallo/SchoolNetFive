// /home/project/components/notes/NotesHeader.tsx
// En-tête de la page Notes avec titre, établissement, année scolaire et période

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Building2, Calendar, Crown, AlertCircle } from 'lucide-react-native';
import { Periode, Regime } from '@/types/notes.types';
import theme from '@/constants/theme';

interface NotesHeaderProps {
  etablissementNom: string;
  anneeScolaireLibelle: string;
  periode: Periode;
  regime: Regime;
  isSubscribed: boolean;
  plan?: string | null;
  onPeriodChange?: (periode: Periode) => void;
  onRegimeChange?: (regime: Regime) => void;
}

const PERIODE_OPTIONS: { value: Periode; label: string }[] = [
  { value: 'S1', label: 'Semestre 1' },
  { value: 'S2', label: 'Semestre 2' },
  { value: 'T1', label: 'Trimestre 1' },
  { value: 'T2', label: 'Trimestre 2' },
  { value: 'T3', label: 'Trimestre 3' },
];

export default function NotesHeader({
  etablissementNom,
  anneeScolaireLibelle,
  periode,
  regime,
  isSubscribed,
  plan,
  onPeriodChange,
  onRegimeChange,
}: NotesHeaderProps) {
  const getPeriodLabel = () => {
    const option = PERIODE_OPTIONS.find(o => o.value === periode);
    return option?.label || periode;
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerTop}>
        <Text style={styles.title}>Notes</Text>
        {!isSubscribed && (
          <View style={styles.subscriptionWarning}>
            <AlertCircle size={14} color="#D97706" />
            <Text style={styles.subscriptionWarningText}>
              Abonnement requis
            </Text>
          </View>
        )}
        {isSubscribed && plan && (
          <View style={styles.planBadge}>
            <Crown size={12} color="#FFFFFF" />
            <Text style={styles.planText}>{plan}</Text>
          </View>
        )}
      </View>

      <View style={styles.etablissementInfo}>
        <Building2 size={14} color={theme.colors.neutral[500]} />
        <Text style={styles.etablissementNom}>{etablissementNom}</Text>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Calendar size={14} color={theme.colors.neutral[500]} />
          <Text style={styles.infoText}>{anneeScolaireLibelle}</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Période :</Text>
          <TouchableOpacity
            style={styles.periodSelector}
            onPress={() => onPeriodChange?.(periode === 'S1' ? 'S2' : 'S1')}
            disabled={!isSubscribed}
          >
            <Text style={[styles.periodText, !isSubscribed && styles.disabledText]}>
              {getPeriodLabel()}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Régime :</Text>
          <TouchableOpacity
            style={styles.regimeSelector}
            onPress={() => onRegimeChange?.(regime === 'semestre' ? 'trimestre' : 'semestre')}
            disabled={!isSubscribed}
          >
            <Text style={[styles.regimeText, !isSubscribed && styles.disabledText]}>
              {regime === 'semestre' ? 'Semestre' : 'Trimestre'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  subscriptionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  subscriptionWarningText: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '500',
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  planText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  etablissementInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  etablissementNom: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'wrap',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  infoText: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '500',
  },
  periodSelector: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary.DEFAULT,
  },
  regimeSelector: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  regimeText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary.DEFAULT,
  },
  disabledText: {
    color: '#9CA3AF',
  },
});