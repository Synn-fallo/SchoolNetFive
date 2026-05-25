import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { GraduationCap, Users, BookOpen } from 'lucide-react-native';

interface SimpleRoleButtonsProps {
  variant?: 'default' | 'compact';
}

export default function SimpleRoleButtons({ variant = 'default' }: SimpleRoleButtonsProps) {
  const router = useRouter();

  const handlePress = (role: string) => {
    if (role === 'enseignant') {
      router.push('/(app)/(sidebar)/demande-role-enseignant');
    } else if (role === 'parent') {
      router.push('/(app)/(sidebar)/demande-role-parent');
    } else if (role === 'eleve') {
      router.push('/(app)/(sidebar)/demande-role-eleve');
    } else {
      router.push(`/(app)/(sidebar)/demande-role-simple?role=${role}`);
    }
  };

  const buttons = [
    {
      id: 'eleve',
      label: 'Élève',
      subtitle: 'Suivre mes notes, devoirs et emploi du temps',
      icon: GraduationCap,
      color: '#3B82F6',
      bgColor: '#EFF6FF',
    },
    {
      id: 'parent',
      label: 'Parent',
      subtitle: 'Suivre la scolarité de mes enfants',
      icon: Users,
      color: '#10B981',
      bgColor: '#ECFDF5',
    },
    {
      id: 'enseignant',
      label: 'Enseignant',
      subtitle: 'Gérer mes classes et saisir les notes',
      icon: BookOpen,
      color: '#F59E0B',
      bgColor: '#FFFBEB',
    },
  ];

  if (variant === 'compact') {
    return (
      <View style={styles.compactContainer}>
        {buttons.map((button) => (
          <TouchableOpacity
            key={button.id}
            style={styles.compactButton}
            onPress={() => handlePress(button.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.compactIconWrapper, { backgroundColor: button.bgColor }]}>
              <button.icon size={20} color={button.color} />
            </View>
            <Text style={styles.compactLabel}>{button.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎯 Que souhaitez-vous faire ?</Text>
      <View style={styles.buttonsContainer}>
        {buttons.map((button) => (
          <TouchableOpacity
            key={button.id}
            style={styles.roleButton}
            onPress={() => handlePress(button.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconWrapper, { backgroundColor: button.bgColor }]}>
              <button.icon size={28} color={button.color} />
            </View>
            <View style={styles.buttonContent}>
              <Text style={styles.roleButtonTitle}>{button.label}</Text>
              <Text style={styles.roleButtonSubtitle}>{button.subtitle}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  buttonsContainer: {
    gap: 12,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContent: {
    flex: 1,
  },
  roleButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  roleButtonSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  compactContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  compactButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  compactIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
  },
});