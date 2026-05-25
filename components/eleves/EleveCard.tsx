import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { User, GraduationCap, Calendar, Mail, Phone } from 'lucide-react-native';
import theme from '@/constants/theme';

interface EleveCardProps {
  id: string;
  nom: string;
  prenom: string;
  matricule?: string;
  classe_nom?: string;
  statut?: string;
  onPress: () => void;
}

export default function EleveCard({
  nom,
  prenom,
  matricule,
  classe_nom,
  statut = 'actif',
  onPress,
}: EleveCardProps) {
  const isActif = statut === 'actif';
  
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.avatar}>
        <User size={24} color="#FFFFFF" />
      </View>
      
      <View style={styles.info}>
        <Text style={styles.name}>{prenom} {nom}</Text>
        {matricule && (
          <Text style={styles.matricule}>Matricule: {matricule}</Text>
        )}
        {classe_nom && (
          <View style={styles.row}>
            <GraduationCap size={14} color={theme.colors.neutral[500]} />
            <Text style={styles.detailText}>{classe_nom}</Text>
          </View>
        )}
      </View>
      
      <View style={[styles.statusBadge, isActif ? styles.statusActive : styles.statusInactive]}>
        <Text style={[styles.statusText, isActif ? styles.statusTextActive : styles.statusTextInactive]}>
          {isActif ? 'Actif' : 'Inactif'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  matricule: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#D1FAE5',
  },
  statusInactive: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusTextActive: {
    color: '#10B981',
  },
  statusTextInactive: {
    color: '#EF4444',
  },
});