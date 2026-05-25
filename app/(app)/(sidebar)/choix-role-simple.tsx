import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { GraduationCap, Users, BookOpen, ArrowLeft } from 'lucide-react-native';
import { Card } from '@/components/Card';
import theme from '@/constants/theme';

export default function ChoixRoleSimpleScreen() {
  const router = useRouter();

  const roles = [
    {
      id: 'eleve',
      label: 'Élève',
      description: 'Suivre mes notes, devoirs et emploi du temps',
      icon: GraduationCap,
      color: '#3B82F6',
      bgColor: '#EFF6FF',
    },
    {
      id: 'parent',
      label: 'Parent',
      description: 'Suivre la scolarité de mes enfants',
      icon: Users,
      color: '#10B981',
      bgColor: '#ECFDF5',
    },
    {
      id: 'enseignant',
      label: 'Enseignant',
      description: 'Gérer mes classes et saisir les notes',
      icon: BookOpen,
      color: '#F59E0B',
      bgColor: '#FFFBEB',
    },
  ];

  const handleSelectRole = (roleId: string) => {
    if (roleId === 'eleve') {
      router.push('/(app)/(sidebar)/demande-role-eleve');
    } else if (roleId === 'parent') {
      router.push('/(app)/(sidebar)/demande-role-parent');
    } else if (roleId === 'enseignant') {
      router.push('/(app)/(sidebar)/demande-role-enseignant');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.neutral[600]} />
        </TouchableOpacity>
        <Text style={styles.title}>Devenir membre</Text>
        <Text style={styles.subtitle}>
        </Text>
      </View>

      {/* Cartes des rôles */}
      <View style={styles.cardsContainer}>
        {roles.map((role) => (
          <TouchableOpacity
            key={role.id}
            style={styles.card}
            onPress={() => handleSelectRole(role.id)}
            activeOpacity={0.7}
          >
            <Card style={styles.cardInner}>
              <View style={[styles.iconWrapper, { backgroundColor: role.bgColor }]}>
                <role.icon size={32} color={role.color} />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.roleLabel}>{role.label}</Text>
                <Text style={styles.roleDescription}>{role.description}</Text>
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </View>

      {/* Note informative */}
      <View style={styles.noteContainer}>
        <Text style={styles.noteText}>
          💡 Une fois votre demande envoyée, vous serez notifié de sa validation.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  backButton: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    width: '100%',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  iconWrapper: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  roleLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  noteContainer: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
  },
  noteText: {
    fontSize: 13,
    color: '#92400E',
    textAlign: 'center',
  },
});