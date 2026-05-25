import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { User, GraduationCap, Calendar, Mail, Phone, Edit2 } from 'lucide-react-native';
import theme from '@/constants/theme';

interface EleveDetailHeaderProps {
  nom: string;
  prenom: string;
  matricule?: string;
  identifiantConnexion?: string;
  educmaster?: string;
  classe_nom?: string;
  statut?: string;
  date_naissance?: string;
  email?: string;
  telephone?: string;
  onEdit?: () => void;
}

export default function EleveDetailHeader({
  nom,
  prenom,
  matricule,
  identifiantConnexion,
  educmaster,
  classe_nom,
  statut = 'actif',
  date_naissance,
  email,
  telephone,
  onEdit,
}: EleveDetailHeaderProps) {
  const isActif = statut === 'actif';
  
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <User size={40} color="#FFFFFF" />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.name}>{prenom} {nom}</Text>
          {matricule && <Text style={styles.matricule}>Matricule: {matricule}</Text>}
          <View style={[styles.statusBadge, isActif ? styles.statusActive : styles.statusInactive]}>
            <Text style={[styles.statusText, isActif ? styles.statusTextActive : styles.statusTextInactive]}>
              {isActif ? 'Actif' : 'Inactif'}
            </Text>
          </View>
        </View>
        {onEdit && (
          <TouchableOpacity style={styles.editButton} onPress={onEdit}>
            <Edit2 size={18} color={theme.colors.neutral[600]} />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.details}>
        {identifiantConnexion && (
          <View style={styles.detailRow}>
            <User size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.detailLabel}>Identifiant:</Text>
            <Text style={styles.detailValue}>{identifiantConnexion}</Text>
          </View>
        )}
        {educmaster && (
          <View style={styles.detailRow}>
            <GraduationCap size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.detailLabel}>EducMaster:</Text>
            <Text style={styles.detailValue}>{educmaster}</Text>
          </View>
        )}
        {classe_nom && (
          <View style={styles.detailRow}>
            <GraduationCap size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.detailLabel}>Classe:</Text>
            <Text style={styles.detailValue}>{classe_nom}</Text>
          </View>
        )}
        {date_naissance && (
          <View style={styles.detailRow}>
            <Calendar size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.detailLabel}>Naissance:</Text>
            <Text style={styles.detailValue}>{formatDate(date_naissance)}</Text>
          </View>
        )}
        {email && (
          <View style={styles.detailRow}>
            <Mail size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.detailLabel}>Email:</Text>
            <Text style={styles.detailValue}>{email}</Text>
          </View>
        )}
        {telephone && (
          <View style={styles.detailRow}>
            <Phone size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.detailLabel}>Téléphone:</Text>
            <Text style={styles.detailValue}>{telephone}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  matricule: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  statusBadge: {
    alignSelf: 'flex-start',
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
  editButton: {
    padding: 8,
  },
  details: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6B7280',
    width: 80,
    marginLeft: 8,
  },
  detailValue: {
    fontSize: 13,
    color: '#1F2937',
    flex: 1,
  },
});