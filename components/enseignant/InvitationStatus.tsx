import { View, Text, StyleSheet } from 'react-native';

interface InvitationStatusProps {
  status: 'en_attente' | 'acceptee' | 'expiree' | 'annulee';
  size?: 'small' | 'medium';
}

export default function InvitationStatus({ status, size = 'medium' }: InvitationStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'en_attente':
        return {
          label: 'En attente',
          bg: '#FEF3C7',
          text: '#F59E0B',
          icon: '⏳',
        };
      case 'acceptee':
        return {
          label: 'Acceptée',
          bg: '#EFF6FF',
          text: '#3B82F6',
          icon: '✅',
        };
      case 'expiree':
        return {
          label: 'Expirée',
          bg: '#FEE2E2',
          text: '#EF4444',
          icon: '⚠️',
        };
      case 'annulee':
        return {
          label: 'Annulée',
          bg: '#F3F4F6',
          text: '#6B7280',
          icon: '❌',
        };
      default:
        return {
          label: 'Inconnu',
          bg: '#F3F4F6',
          text: '#6B7280',
          icon: '❓',
        };
    }
  };

  const config = getStatusConfig();
  const fontSize = size === 'small' ? 10 : 12;
  const padding = size === 'small' ? 4 : 6;

  return (
    <View style={[styles.container, { backgroundColor: config.bg, paddingHorizontal: padding, paddingVertical: padding / 1.5 }]}>
      <Text style={[styles.icon, { fontSize: fontSize + 2 }]}>{config.icon}</Text>
      <Text style={[styles.text, { color: config.text, fontSize }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    gap: 4,
  },
  icon: {
    fontWeight: '500',
  },
  text: {
    fontWeight: '500',
  },
});