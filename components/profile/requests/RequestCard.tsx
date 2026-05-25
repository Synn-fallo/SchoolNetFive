import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Clock, CheckCircle, XCircle, Calendar, ChevronRight } from 'lucide-react-native';
import theme from '@/constants/theme';

export type RequestStatus = 'en_attente' | 'valide' | 'rejete' | 'annule' | 'en_cours';

interface RequestCardProps {
  id: string;
  title: string;
  subtitle?: string;
  status: RequestStatus;
  date: string;
  onPress: () => void;
  onCancel?: () => void;
  showCancelButton?: boolean;
}

const getStatusConfig = (status: RequestStatus) => {
  switch (status) {
    case 'en_attente':
      return { label: 'En attente', color: '#F59E0B', bg: '#FEF3C7', icon: Clock };
    case 'en_cours':
      return { label: 'En cours', color: '#3B82F6', bg: '#EFF6FF', icon: Clock };
    case 'valide':
      return { label: 'Validé', color: '#10B981', bg: '#D1FAE5', icon: CheckCircle };
    case 'rejete':
      return { label: 'Rejeté', color: '#EF4444', bg: '#FEE2E2', icon: XCircle };
    case 'annule':
      return { label: 'Annulé', color: '#6B7280', bg: '#F3F4F6', icon: XCircle };
    default:
      return { label: status, color: '#6B7280', bg: '#F3F4F6', icon: Clock };
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Hier';
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function RequestCard({
  title,
  subtitle,
  status,
  date,
  onPress,
  onCancel,
  showCancelButton = false,
}: RequestCardProps) {
  const statusConfig = getStatusConfig(status);
  const StatusIcon = statusConfig.icon;
  const isCancelable = status === 'en_attente' || status === 'en_cours';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          <StatusIcon size={12} color={statusConfig.color} />
          <Text style={[styles.statusText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.dateContainer}>
          <Calendar size={12} color={theme.colors.neutral[400]} />
          <Text style={styles.dateText}>{formatDate(date)}</Text>
        </View>
        <View style={styles.actions}>
          {showCancelButton && isCancelable && onCancel && (
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          )}
          <ChevronRight size={16} color={theme.colors.neutral[400]} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
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
    marginBottom: 10,
  },
  titleContainer: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
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
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
  },
  cancelButtonText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '500',
  },
});