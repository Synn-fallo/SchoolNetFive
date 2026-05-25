import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Users, Building2, ChevronRight } from 'lucide-react-native';
import theme from '@/constants/theme';

interface ClassCardProps {
  id: string;
  nom: string;
  niveau: string;
  statut: 'personnel' | 'officiel' | 'archive';
  etablissementNom?: string;
  effectif: number;
  onPress: () => void;
  onRefresh?: () => void;
}

export default function ClassCard({
  nom,
  niveau,
  statut,
  etablissementNom,
  effectif,
  onPress,
}: ClassCardProps) {
  const getStatutConfig = () => {
    switch (statut) {
      case 'personnel':
        return { label: 'Personnel', color: '#F59E0B', bgColor: '#FEF3C7' };
      case 'officiel':
        return { label: 'Officiel', color: '#10B981', bgColor: '#D1FAE5' };
      case 'archive':
        return { label: 'Archivé', color: '#6B7280', bgColor: '#F3F4F6' };
      default:
        return { label: 'Personnel', color: '#F59E0B', bgColor: '#FEF3C7' };
    }
  };

  const statutConfig = getStatutConfig();

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.className}>{nom}</Text>
          <Text style={styles.classLevel}>{niveau}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statutConfig.bgColor }]}>
          <Text style={[styles.statusText, { color: statutConfig.color }]}>
            {statutConfig.label}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        {etablissementNom && (
          <View style={styles.detailItem}>
            <Building2 size={14} color={theme.colors.neutral[500]} />
            <Text style={styles.detailText}>{etablissementNom}</Text>
          </View>
        )}
        <View style={styles.detailItem}>
          <Users size={14} color={theme.colors.neutral[500]} />
          <Text style={styles.detailText}>{effectif} élève(s)</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <ChevronRight size={18} color={theme.colors.neutral[400]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  classLevel: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  details: {
    gap: 6,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
  },
  footer: {
    alignItems: 'flex-end',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
});