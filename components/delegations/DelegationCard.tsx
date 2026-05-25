// /home/project/components/delegations/DelegationCard.tsx
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Edit2, Trash2, RefreshCw, User, Calendar, Building2, Users } from 'lucide-react-native';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import theme from '@/constants/theme';

interface DelegationCardProps {
  id: string;
  delegueNom: string;
  deleguePrenom: string;
  roleLabel: string;
  typeLabel: string;
  isActive: boolean;
  dateDebut?: string;
  dateFin?: string | null;
  departement?: string;
  plafond?: number;
  isExpired?: boolean;
  onEdit?: () => void;
  onRevoke?: () => void;
  onReactivate?: () => void;
  showActions?: boolean;
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function DelegationCard({
  id,
  delegueNom,
  deleguePrenom,
  roleLabel,
  typeLabel,
  isActive,
  dateDebut,
  dateFin,
  departement,
  plafond,
  isExpired = false,
  onEdit,
  onRevoke,
  onReactivate,
  showActions = true,
}: DelegationCardProps) {
  const status = isExpired ? 'expired' : isActive ? 'active' : 'inactive';
  const isPermanent = !dateFin;
  const hasDateFin = !!dateFin && !isExpired;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <User size={16} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.userName}>
              {deleguePrenom} {delegueNom}
            </Text>
            <Text style={styles.roleInfo}>
              {roleLabel} • {typeLabel}
            </Text>
          </View>
        </View>
        <StatusBadge status={status} size="small" />
      </View>

      {departement && (
        <View style={styles.detailRow}>
          <Building2 size={14} color={theme.colors.neutral[500]} />
          <Text style={styles.detailText}>Département: {departement}</Text>
        </View>
      )}

      {plafond !== undefined && plafond !== null && (
        <View style={styles.detailRow}>
          <Users size={14} color={theme.colors.neutral[500]} />
          <Text style={styles.detailText}>Plafond: {plafond} enseignants</Text>
        </View>
      )}

      <View style={styles.dateRow}>
        {dateDebut && (
          <View style={styles.dateItem}>
            <Calendar size={12} color={theme.colors.neutral[500]} />
            <Text style={styles.dateText}>Début: {formatDate(dateDebut)}</Text>
          </View>
        )}
        {hasDateFin && (
          <View style={styles.dateItem}>
            <Calendar size={12} color={theme.colors.neutral[500]} />
            <Text style={styles.dateText}>Fin: {formatDate(dateFin)}</Text>
          </View>
        )}
        {isPermanent && isActive && !isExpired && (
          <View style={styles.dateItem}>
            <Text style={styles.permanentText}>🔒 Permanente</Text>
          </View>
        )}
      </View>

      {showActions && (
        <View style={styles.actions}>
          {isActive && !isExpired && onEdit && (
            <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
              <Edit2 size={16} color={theme.colors.primary.DEFAULT} />
              <Text style={styles.actionText}>Modifier</Text>
            </TouchableOpacity>
          )}
          {isActive && !isExpired && onRevoke && (
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
  roleInfo: {
    fontSize: 12,
    color: '#6B7280',
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
    flexWrap: 'wrap',
    gap: 12,
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
  permanentText: {
    fontSize: 11,
    color: '#10B981',
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
