import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Building2, Settings, Eye, Calendar, CreditCard } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import theme from '@/constants/theme';

interface EtablissementCardVerticalProps {
  id: string;
  nom: string;
  ville?: string;
  statut: string;
  slug: string;
  plan?: string;
  created_at?: string;
}

const getStatutConfig = (statut: string) => {
  switch (statut) {
    case 'ACTIF':
    case 'ABONNE_ESSENTIEL':
    case 'ABONNE_PREMIUM':
      return { label: 'Actif', color: '#10B981', bg: '#D1FAE5', icon: '●' };
    case 'INFOS_COMPLETES':
      return { label: 'Prêt à activer', color: '#3B82F6', bg: '#EFF6FF', icon: '●' };
    case 'EN_ATTENTE_ACTIVATION':
      return { label: 'En attente', color: '#F59E0B', bg: '#FEF3C7', icon: '○' };
    case 'VERIFIE':
      return { label: 'Vérifié', color: '#8B5CF6', bg: '#F3E8FF', icon: '○' };
    default:
      return { label: statut, color: '#6B7280', bg: '#F3F4F6', icon: '●' };
  }
};

const getPlanLabel = (plan?: string) => {
  switch (plan) {
    case 'essentiel': return 'Essentiel';
    case 'premium': return 'Premium';
    case 'prestige': return 'Prestige';
    default: return null;
  }
};

export default function EtablissementCardVertical({
  id,
  nom,
  ville,
  statut,
  slug,
  plan,
  created_at,
}: EtablissementCardVerticalProps) {
  const router = useRouter();
  const statutConfig = getStatutConfig(statut);
  const planLabel = getPlanLabel(plan);
  const createdDate = created_at ? new Date(created_at).toLocaleDateString('fr-FR') : null;

  const handleGerer = () => {
    router.push(`/(app)/(sidebar)/etablissement/gestion?id=${id}`);
  };

  const handleApercu = () => {
    router.push(`/(app)/(sidebar)/etablissement/preview?id=${id}`);
  };

  return (
    <View style={styles.card}>
      <View style={styles.iconContainer}>
        <Building2 size={40} color={theme.colors.primary.DEFAULT} />
      </View>
      
      <Text style={styles.nom} numberOfLines={1}>{nom}</Text>
      {ville && <Text style={styles.ville} numberOfLines={1}>{ville}</Text>}
      
      <View style={styles.statusBadge}>
        <Text style={[styles.statusText, { color: statutConfig.color }]}>
          {statutConfig.icon} {statutConfig.label}
        </Text>
      </View>
      
      {(planLabel || createdDate) && (
        <View style={styles.metadataContainer}>
          {planLabel && (
            <View style={styles.metadataItem}>
              <CreditCard size={12} color={theme.colors.neutral[500]} />
              <Text style={styles.metadataText}>{planLabel}</Text>
            </View>
          )}
          {createdDate && (
            <View style={styles.metadataItem}>
              <Calendar size={12} color={theme.colors.neutral[500]} />
              <Text style={styles.metadataText}>{createdDate}</Text>
            </View>
          )}
        </View>
      )}
      
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={handleGerer}>
          <Settings size={16} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.actionText}>Gérer</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.previewButton]} onPress={handleApercu}>
          <Eye size={16} color={theme.colors.neutral[600]} />
          <Text style={styles.previewText}>Aperçu</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  nom: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  ville: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginBottom: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  metadataContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  metadataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
  },
  metadataText: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.primary.DEFAULT,
  },
  previewButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  previewText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },
});