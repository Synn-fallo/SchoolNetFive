import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Crown } from 'lucide-react-native';
import theme from '@/constants/theme';

interface Props {
  onUpgrade?: () => void;
}

export default function UpgradeBanner({ onUpgrade }: Props) {
  return (
    <View style={styles.container}>
      <Crown size={24} color="#F59E0B" />
      <View style={styles.textContainer}>
        <Text style={styles.title}>Débloquez l’export PDF/Excel</Text>
        <Text style={styles.subtitle}>Passez à l’abonnement Premium</Text>
      </View>
      {onUpgrade && (
        <TouchableOpacity style={styles.button} onPress={onUpgrade}>
          <Text style={styles.buttonText}>Upgrade</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    margin: 16,
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  textContainer: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600', color: '#92400E' },
  subtitle: { fontSize: 12, color: '#B45309' },
  button: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
});