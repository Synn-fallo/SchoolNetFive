import { View, Text, StyleSheet } from 'react-native';
import theme from '@/constants/theme';

type StatusType = 'paye' | 'partiel' | 'impaye' | 'en_attente' | 'en_cours' | 'valide' | 'rejete' | 'annule' | string;

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: 'small' | 'medium';
}

export function StatusBadge({ status, label, size = 'medium' }: StatusBadgeProps) {
  const getStatusStyle = () => {
    switch (status) {
      // Paiements
      case 'paye':
        return { backgroundColor: theme.colors.success.light, color: theme.colors.success.dark };
      case 'partiel':
        return { backgroundColor: theme.colors.warning.light, color: theme.colors.warning.dark };
      case 'impaye':
        return { backgroundColor: theme.colors.danger.light, color: theme.colors.danger.dark };
      // Demandes institutionnelles
      case 'en_attente':
        return { backgroundColor: theme.colors.warning.light, color: theme.colors.warning.dark };
      case 'en_cours':
        return { backgroundColor: theme.colors.info.light, color: theme.colors.info.dark };
      case 'valide':
        return { backgroundColor: theme.colors.success.light, color: theme.colors.success.dark };
      case 'rejete':
        return { backgroundColor: theme.colors.danger.light, color: theme.colors.danger.dark };
      case 'annule':
        return { backgroundColor: theme.colors.neutral[200], color: theme.colors.neutral[600] };
      default:
        return { backgroundColor: theme.colors.neutral[200], color: theme.colors.neutral[600] };
    }
  };

  const getStatusLabel = () => {
    if (label) return label;
    switch (status) {
      case 'paye': return 'Payé';
      case 'partiel': return 'Partiel';
      case 'impaye': return 'Impayé';
      case 'en_attente': return 'En attente';
      case 'en_cours': return 'En cours';
      case 'valide': return 'Validé';
      case 'rejete': return 'Rejeté';
      case 'annule': return 'Annulé';
      default: return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const statusStyle = getStatusStyle();
  
  const paddingHorizontal = size === 'small' ? theme.spacing[2] : theme.spacing[3];
  const paddingVertical = size === 'small' ? theme.spacing[1] : theme.spacing[1.5];
  const fontSize = size === 'small' ? 10 : 12;

  return (
    <View style={[
      styles.badge, 
      { 
        backgroundColor: statusStyle.backgroundColor,
        paddingHorizontal,
        paddingVertical,
      }
    ]}>
      <Text style={[
        styles.text, 
        { 
          color: statusStyle.color,
          fontSize,
        }
      ]}>
        {getStatusLabel()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
  },
});