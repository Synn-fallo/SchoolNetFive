// /home/project/app/(app)/enseignant/index.tsx
// Route principale – Tableau de bord enseignant

import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { BookOpen, Users, BarChart, GraduationCap, MessageSquare, Calendar } from 'lucide-react-native';
import theme from '@/constants/theme';

export default function EnseignantDashboard() {
  const { user, profile } = useAuth();
  const router = useRouter();

  const menuItems = [
    {
      id: 'mes-classes',
      title: 'Mes classes',
      description: 'Voir vos classes et élèves',
      icon: Users,
      color: '#3B82F6',
      href: '/enseignant/mes-classes',
    },
    {
      id: 'evaluations-notes',
      title: 'Évaluations & Notes',
      description: 'Créer des évaluations et saisir les notes',
      icon: BookOpen,
      color: '#10B981',
      href: '/enseignant/notes',
    },
    {
      id: 'releves',
      title: 'Relevés de notes',
      description: 'Consulter les relevés par élève',
      icon: GraduationCap,
      color: '#8B5CF6',
      href: '/enseignant/releves-notes',
      disabled: true,
    },
    {
      id: 'statistiques',
      title: 'Statistiques',
      description: 'Analyser les performances',
      icon: BarChart,
      color: '#F59E0B',
      href: '/enseignant/statistiques-classe',
      disabled: true,
    },
    {
      id: 'messages',
      title: 'Messages',
      description: 'Communiquer avec la communauté',
      icon: MessageSquare,
      color: '#EF4444',
      href: '/messages',
    },
  ];

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.greeting}>{getGreeting()},</Text>
        <Text style={styles.userName}>
          {profile?.prenom || user?.email?.split('@')[0] || 'Enseignant'}
        </Text>
        <Text style={styles.subtitle}>
          Bienvenue sur votre espace enseignant
        </Text>
      </View>

      {/* Menu principal */}
      <View style={styles.menuContainer}>
        <Text style={styles.sectionTitle}>Accès rapide</Text>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.menuCard, item.disabled && styles.menuCardDisabled]}
            onPress={() => !item.disabled && router.push(item.href as any)}
            disabled={item.disabled}
          >
            <View style={[styles.menuIcon, { backgroundColor: `${item.color}15` }]}>
              <item.icon size={24} color={item.color} />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, item.disabled && styles.menuTitleDisabled]}>
                {item.title}
              </Text>
              <Text style={[styles.menuDescription, item.disabled && styles.menuDescriptionDisabled]}>
                {item.description}
              </Text>
            </View>
            {item.disabled && (
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Bientôt</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Calendrier des évaluations à venir */}
      <View style={styles.calendarContainer}>
        <Text style={styles.sectionTitle}>Évaluations à venir</Text>
        <View style={styles.emptyCalendar}>
          <Calendar size={32} color="#9CA3AF" />
          <Text style={styles.emptyCalendarText}>Aucune évaluation planifiée</Text>
        </View>
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
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: '#6B7280',
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  menuContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuCardDisabled: {
    backgroundColor: '#F9FAFB',
    opacity: 0.7,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  menuTitleDisabled: {
    color: '#9CA3AF',
  },
  menuDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  menuDescriptionDisabled: {
    color: '#9CA3AF',
  },
  comingSoonBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  comingSoonText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  emptyCalendar: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyCalendarText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
  },
});