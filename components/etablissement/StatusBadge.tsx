import { View, Text, StyleSheet } from 'react-native';

type EtablissementStatut = 'EN_ATTENTE_ACTIVATION' | 'INFOS_COMPLETES' | 'ACTIF' | 'SUSPENDU';

interface StatusBadgeProps {
  statut: EtablissementStatut;
  size?: 'small' | 'medium';
}

export default function EtablissementStatusBadge({ statut, size = 'medium' }: StatusBadgeProps) {
  const getStatusStyle = () => {
    switch (statut) {
      case 'EN_ATTENTE_ACTIVATION':
        return { backgroundColor: '#FEF3C7', color: '#D97706', label: 'En configuration' };
      case 'INFOS_COMPLETES':
        return { backgroundColor: '#FEF3C7', color: '#D97706', label: 'En configuration' };
      case 'ACTIF':
        return { backgroundColor: '#D1FAE5', color: '#10B981', label: 'Actif' };
      case 'SUSPENDU':
        return { backgroundColor: '#FEE2E2', color: '#EF4444', label: 'Suspendu' };
      default:
        return { backgroundColor: '#F3F4F6', color: '#6B7280', label: 'Inconnu' };
    }
  };

  const style = getStatusStyle();
  const paddingHorizontal = size === 'small' ? 8 : 12;
  const paddingVertical = size === 'small' ? 4 : 6;
  const fontSize = size === 'small' ? 10 : 12;

  return (
    <View style={[styles.badge, { backgroundColor: style.backgroundColor, paddingHorizontal, paddingVertical }]}>
      <Text style={[styles.text, { color: style.color, fontSize }]}>
        {style.label}
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