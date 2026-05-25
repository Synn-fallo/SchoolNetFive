import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Settings, Eye } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import theme from '@/constants/theme';

interface EtablissementTableRowProps {
  id: string;
  nom: string;
  ville?: string;
  statut: string;
  slug: string;
  plan?: string;
}

const getStatutConfig = (statut: string) => {
  switch (statut) {
    case 'ACTIF':
    case 'ABONNE_ESSENTIEL':
    case 'ABONNE_PREMIUM':
      return { label: 'Actif', color: '#10B981' };
    case 'INFOS_COMPLETES':
      return { label: 'Prêt à activer', color: '#3B82F6' };
    case 'EN_ATTENTE_ACTIVATION':
      return { label: 'En attente', color: '#F59E0B' };
    case 'VERIFIE':
      return { label: 'Vérifié', color: '#8B5CF6' };
    default:
      return { label: statut, color: '#6B7280' };
  }
};

const getPlanLabel = (plan?: string) => {
  switch (plan) {
    case 'essentiel': return 'Essentiel';
    case 'premium': return 'Premium';
    case 'prestige': return 'Prestige';
    default: return '-';
  }
};

export default function EtablissementTableRow({
  id,
  nom,
  ville,
  statut,
  slug,
  plan,
}: EtablissementTableRowProps) {
  const router = useRouter();
  const statutConfig = getStatutConfig(statut);

  const handleGerer = () => {
    router.push(`/(app)/(sidebar)/etablissement/gestion?id=${id}`);
  };

  const handleApercu = () => {
    router.push(`/(app)/(sidebar)/etablissement/preview?id=${id}`);
  };

  return (
    <View style={styles.row}>
      <View style={[styles.cell, styles.cellNom]}>
        <Text style={styles.nom} numberOfLines={1}>{nom}</Text>
      </View>
      <View style={[styles.cell, styles.cellVille]}>
        <Text style={styles.ville} numberOfLines={1}>{ville || '-'}</Text>
      </View>
      <View style={[styles.cell, styles.cellStatut]}>
        <Text style={[styles.statut, { color: statutConfig.color }]}>
          {statutConfig.label}
        </Text>
      </View>
      <View style={[styles.cell, styles.cellPlan]}>
        <Text style={styles.plan}>{getPlanLabel(plan)}</Text>
      </View>
      <View style={[styles.cell, styles.cellActions]}>
        <TouchableOpacity style={styles.actionIcon} onPress={handleGerer}>
          <Settings size={18} color={theme.colors.primary.DEFAULT} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionIcon} onPress={handleApercu}>
          <Eye size={18} color={theme.colors.neutral[600]} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    alignItems: 'center',
  },
  cell: {
    flex: 1,
  },
  cellNom: {
    flex: 2,
  },
  cellVille: {
    flex: 1.5,
  },
  cellStatut: {
    flex: 1.2,
  },
  cellPlan: {
    flex: 1,
  },
  cellActions: {
    flex: 0.8,
    flexDirection: 'row',
    gap: 12,
  },
  nom: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  ville: {
    fontSize: 13,
    color: '#6B7280',
  },
  statut: {
    fontSize: 13,
    fontWeight: '500',
  },
  plan: {
    fontSize: 13,
    color: '#4B5563',
  },
  actionIcon: {
    padding: 6,
  },
});