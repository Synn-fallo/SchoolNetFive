// /home/project/components/common/StatusBadge.tsx
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react-native';
import theme from '@/constants/theme';

export type StatusType = 'active' | 'inactive' | 'expired' | 'pending' | 'temporary';

interface StatusBadgeProps {
  status: StatusType;
  showIcon?: boolean;
  size?: 'small' | 'medium' | 'large';
  label?: string;
}

const statusConfig: Record<StatusType, { defaultLabel: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  active: {
    defaultLabel: 'Actif',
    color: '#10B981',
    bgColor: '#D1FAE5',
    icon: <CheckCircle size={12} color="#10B981" />,
  },
  inactive: {
    defaultLabel: 'Inactif',
    color: '#6B7280',
    bgColor: '#F3F4F6',
    icon: <XCircle size={12} color="#6B7280" />,
  },
  expired: {
    defaultLabel: 'Expiré',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    icon: <AlertCircle size={12} color="#F59E0B" />,
  },
  pending: {
    defaultLabel: 'En attente',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    icon: <Clock size={12} color="#3B82F6" />,
  },
  temporary: {
    defaultLabel: 'Temporaire',
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
    icon: <Clock size={12} color="#8B5CF6" />,
  },
};

const sizeStyles = {
  small: { paddingHorizontal: 6, paddingVertical: 2, fontSize: 9, iconSize: 10 },
  medium: { paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, iconSize: 12 },
  large: { paddingHorizontal: 10, paddingVertical: 6, fontSize: 12, iconSize: 14 },
};

export default function StatusBadge({ status, showIcon = true, size = 'medium', label }: StatusBadgeProps) {
  const config = statusConfig[status];
  const sizeConfig = sizeStyles[size];

  return (
    <View style={[styles.badge, { backgroundColor: config.bgColor }, sizeStyles[size]]}>
      {showIcon && (
        <View style={{ marginRight: 4 }}>
          {config.icon}
        </View>
      )}
      <Text style={[styles.text, { color: config.color }, { fontSize: sizeConfig.fontSize }]}>
        {label || config.defaultLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '500',
  },
});
