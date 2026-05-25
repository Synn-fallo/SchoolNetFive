import { View, Text, StyleSheet } from 'react-native';
import { Wrench } from 'lucide-react-native';
import theme from '@/constants/theme';

interface ComingSoonProps {
  title?: string;
  description?: string;
}

export default function ComingSoon({ 
  title = "Page en construction", 
  description = "Cette fonctionnalité sera bientôt disponible." 
}: ComingSoonProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Wrench size={48} color={theme.colors.primary.DEFAULT} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
    padding: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.neutral[800],
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: theme.colors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
  },
});