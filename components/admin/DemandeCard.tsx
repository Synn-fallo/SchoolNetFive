import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Building2, Landmark, Handshake, Clock, CheckCircle, XCircle, ChevronRight, FileText } from 'lucide-react-native';
import { DemandeRole } from '@/hooks/useAdminDemandes';
import theme from '@/constants/theme';

interface DemandeCardProps {
  demande: DemandeRole;
  onPress: () => void;
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'chef_etablissement':
      return { icon: Building2, color: '#3B82F6', bg: '#EFF6FF' };
    case 'autorite':
      return { icon: Landmark, color: '#8B5CF6', bg: '#F3E8FF' };
    case 'partenaire':
      return { icon: Handshake, color: '#10B981', bg: '#ECFDF5' };
    default:
      return { icon: FileText, color: '#6B7280', bg: '#F3F4F6' };
  }
};

const getRoleLabel = (role: string): string => {
  switch (role) {
    case 'chef_etablissement': return 'Chef d\'établissement';
    case 'autorite': return 'Autorité';
    case 'partenaire': return 'Partenaire';
    default: return role;
  }
};

const getStatutConfig = (statut: string): { label: string; color: string; icon: any } => {
  switch (statut) {
    case 'en_attente':
      return { label: 'En attente', color: '#F59E0B', icon: Clock };
    case 'valide':
      return { label: 'Validé', color: '#10B981', icon: CheckCircle };
    case 'rejete':
      return { label: 'Rejeté', color: '#EF4444', icon: XCircle };
    default:
      return { label: statut, color: '#6B7280', icon: Clock };
  }
};

export default function DemandeCard({ demande, onPress }: DemandeCardProps) {
  const roleConfig = getRoleIcon(demande.role_souhaite);
  const RoleIcon = roleConfig.icon;
  const statutConfig = getStatutConfig(demande.statut);
  const StatutIcon = statutConfig.icon;
  const userName = `${demande.user_prenom || ''} ${demande.user_nom || ''}`.trim() || 'Utilisateur';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={[styles.roleIcon, { backgroundColor: roleConfig.bg }]}>
          <RoleIcon size={20} color={roleConfig.color} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.roleName}>{getRoleLabel(demande.role_souhaite)}</Text>
          <Text style={styles.userName}>{userName}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statutConfig.color}15` }]}>
          <StatutIcon size={12} color={statutConfig.color} />
          <Text style={[styles.statusText, { color: statutConfig.color }]}>
            {statutConfig.label}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.date}>
          Demande du {new Date(demande.created_at).toLocaleDateString('fr-FR')}
        </Text>
        <ChevronRight size={16} color={theme.colors.neutral[400]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    ...theme.shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.neutral[800],
    marginBottom: 2,
  },
  userName: {
    fontSize: 12,
    color: theme.colors.neutral[500],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[100],
  },
  date: {
    fontSize: 11,
    color: theme.colors.neutral[400],
  },
});