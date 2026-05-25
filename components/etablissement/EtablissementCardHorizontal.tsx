import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Building2, Settings, Eye, Calendar, CreditCard } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import theme from '@/constants/theme';

interface EtablissementCardHorizontalProps {
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

export default function EtablissementCardHorizontal({
  id,
  nom,
  ville,
  statut,
  slug,
  plan,
  created_at,
}: EtablissementCardHorizontalProps) {
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
      <View style={styles.cardContent}>
        {/* Icône */}
        <View style={styles.iconContainer}>
          <Building2 size={32} color={theme.colors.primary.DEFAULT} />
        </View>

        {/* Infos principales */}
        <View style={styles.infoContainer}>
          <Text style={styles.nom}>{nom}</Text>
          {ville && <Text style={styles.ville}>{ville}</Text>}
          
          {/* Badges */}
          <View style={styles.badgesContainer}>
            <View style={[styles.statusBadge, { backgroundColor: statutConfig.bg }]}>
              <Text style={[styles.statusText, { color: statutConfig.color }]}>
                {statutConfig.icon} {statutConfig.label}
              </Text>
            </View>
            {planLabel && (
              <View style={styles.planBadge}>
                <CreditCard size={12} color={theme.colors.neutral[500]} />
                <Text style={styles.planText}>{planLabel}</Text>
              </View>
            )}
            {createdDate && (
              <View style={styles.dateBadge}>
                <Calendar size={12} color={theme.colors.neutral[500]} />
                <Text style={styles.dateText}>Créé le {createdDate}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleGerer}>
            <Settings size={18} color={theme.colors.primary.DEFAULT} />
            <Text style={styles.actionText}>Gérer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.previewButton]} onPress={handleApercu}>
            <Eye size={18} color={theme.colors.neutral[600]} />
            <Text style={styles.previewText}>Aperçu</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
    gap: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
  },
  nom: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  ville: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  planText: {
    fontSize: 11,
    color: '#4B5563',
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  dateText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  actionsContainer: {
    justifyContent: 'center',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.primary.DEFAULT,
  },
  previewButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  previewText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
});