// /home/project/components/nominations/NominationCard.tsx
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Edit2, Trash2, RefreshCw, User, Calendar, Building2, Shield } from 'lucide-react-native';
import StatusBadge from '@/components/common/StatusBadge';
import theme from '@/constants/theme';

interface NominationCardProps {
  id: string;
  userId: string;
  nom: string;
  prenom: string;
  email: string;
  typeAdmin: string;
  typeLabel: string;
  fonction?: string;
  departement?: string;
  isActive: boolean;
  validatedAt: string;
  validatedBy?: string;
  validatedByName?: string;
  onEdit?: () => void;
  onRevoke?: () => void;
  onReactivate?: () => void;
  showActions?: boolean;
}

const getTypeCategoryLabel = (typeAdmin: string): string => {
  switch (typeAdmin) {
    case 'de': return 'Directeur des Études';
    case 'ae': return 'Animateur d\'Établissement';
    case 'comptable': return 'Comptable';
    case 'caissier': return 'Caissier';
    case 'assistant_comptable': return 'Assistant comptable';
    case 'administratif': return 'Personnel Administratif';
    case 'vie_scolaire': return 'Personnel Vie Scolaire';
    default: return typeAdmin;
  }
};

const getCategoryIcon = (typeAdmin: string) => {
  switch (typeAdmin) {
    case 'de':
    case 'ae':
      return <Shield size={14} color={theme.colors.primary.DEFAULT} />;
    case 'comptable':
    case 'caissier':
    case 'assistant_comptable':
      return <Building2 size={14} color={theme.colors.primary.DEFAULT} />;
    default:
      return <User size={14} color={theme.colors.primary.DEFAULT} />;
  }
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function NominationCard({
  id,
  nom,
  prenom,
  email,
  typeAdmin,
  typeLabel,
  fonction,
  departement,
  isActive,
  validatedAt,
  validatedByName,
  onEdit,
  onRevoke,
  onReactivate,
  showActions = true,
}: NominationCardProps) {
  const status = isActive ? 'active' : 'inactive';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <User size={16} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.userName}>
              {prenom} {nom}
            </Text>
            <Text style={styles.userEmail}>{email}</Text>
          </View>
        </View>
        <StatusBadge status={status} size="small" />
      </View>

      <View style={styles.roleContainer}>
        <View style={styles.roleIcon}>
          {getCategoryIcon(typeAdmin)}
        </View>
        <Text style={styles.roleLabel}>{typeLabel}</Text>
      </View>

      {fonction && (
        <View style={styles.detailRow}>
          <Shield size={14} color={theme.colors.neutral[500]} />
          <Text style={styles.detailText}>Fonction: {fonction}</Text>
        </View>
      )}

      {departement && (
        <View style={styles.detailRow}>
          <Building2 size={14} color={theme.colors.neutral[500]} />
          <Text style={styles.detailText}>Département: {departement}</Text>
        </View>
      )}

      <View style={styles.dateRow}>
        <View style={styles.dateItem}>
          <Calendar size={12} color={theme.colors.neutral[500]} />
          <Text style={styles.dateText}>Nomination: {formatDate(validatedAt)}</Text>
        </View>
        {validatedByName && (
          <Text style={styles.nominatedByText}>par {validatedByName}</Text>
        )}
      </View>

      {showActions && (
        <View style={styles.actions}>
          {isActive && onEdit && (
            <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
              <Edit2 size={16} color={theme.colors.primary.DEFAULT} />
              <Text style={styles.actionText}>Modifier</Text>
            </TouchableOpacity>
          )}
          {isActive && onRevoke && (
            <TouchableOpacity style={[styles.actionButton, styles.dangerButton]} onPress={onRevoke}>
              <Trash2 size={16} color="#EF4444" />
              <Text style={[styles.actionText, styles.dangerText]}>Révoquer</Text>
            </TouchableOpacity>
          )}
          {!isActive && onReactivate && (
            <TouchableOpacity style={styles.actionButton} onPress={onReactivate}>
              <RefreshCw size={16} color="#10B981" />
              <Text style={[styles.actionText, { color: '#10B981' }]}>Réactiver</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  roleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.primary.DEFAULT,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  nominatedByText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dangerButton: {},
  actionText: {
    fontSize: 12,
    color: '#6B7280',
  },
  dangerText: {
    color: '#EF4444',
  },
});
