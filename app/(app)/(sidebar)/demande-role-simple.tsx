import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import SimpleRoleForm from '@/components/demande/SimpleRoleForm';
import theme from '@/constants/theme';

export default function DemandeRoleSimpleScreen() {
  const { role } = useLocalSearchParams<{ role: string }>();
  
  // Vérifier que le rôle est valide
  const validRoles = ['eleve', 'parent', 'enseignant'];
  const isValidRole = role && validRoles.includes(role);
  
  if (!isValidRole) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Rôle non trouvé</Text>
        <Text style={styles.errorText}>
          Le rôle que vous recherchez n'existe pas ou n'est pas accessible.
        </Text>
      </View>
    );
  }
  
  return <SimpleRoleForm role={role as 'eleve' | 'parent' | 'enseignant'} />;
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: theme.colors.background.secondary,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.neutral[800],
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.neutral[500],
    textAlign: 'center',
  },
});