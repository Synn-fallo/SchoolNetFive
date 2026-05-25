import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { BookOpen, MessageCircle, Calendar, User, FileText, Building2, Newspaper, Eye } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import theme from '@/constants/theme';

interface EpuredDashboardProps {
  onNavigateToPublic?: () => void;
}

export default function EpuredDashboard({ onNavigateToPublic }: EpuredDashboardProps) {
  const router = useRouter();
  const { profile } = useAuth();

  const quickLinks = [
    {
      id: 'profile',
      label: 'Mon profil',
      icon: User,
      href: '/(app)/profile',
      color: '#3B82F6',
      bgColor: '#EFF6FF',
    },
    {
      id: 'requests',
      label: 'Mes demandes',
      icon: FileText,
      href: '/(app)/(sidebar)/demandes-role',
      color: '#F59E0B',
      bgColor: '#FFFBEB',
    },
    {
      id: 'annuaire',
      label: 'Annuaire',
      icon: Building2,
      href: '/(public)/etablissements',
      color: '#10B981',
      bgColor: '#ECFDF5',
    },
    {
      id: 'actualites',
      label: 'Actualités',
      icon: Newspaper,
      href: '/(public)',
      color: '#8B5CF6',
      bgColor: '#F3E8FF',
    },
  ];

  const widgets = [
    {
      id: 'cours',
      label: 'Cours',
      icon: BookOpen,
      description: 'Accédez aux ressources pédagogiques',
      href: '/(public)',
    },
    {
      id: 'forum',
      label: 'Forum',
      icon: MessageCircle,
      description: 'Échangez avec la communauté',
      href: '/(public)',
    },
    {
      id: 'agenda',
      label: 'Agenda',
      icon: Calendar,
      description: 'Calendrier des événements',
      href: '/(public)',
    },
  ];

  const actualites = [
    {
      id: '1',
      titre: 'Nouvelle fonctionnalité : Suivi des notes',
      date: '04/04/2026',
      description: 'Découvrez le nouveau module de suivi des performances.',
    },
    {
      id: '2',
      titre: 'Journée portes ouvertes',
      date: '10/04/2026',
      description: 'Plusieurs établissements ouvrent leurs portes ce week-end.',
    },
  ];

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
      {/* En-tête */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bienvenue, {profile?.prenom || 'Visiteur'}!</Text>
          <Text style={styles.subtitle}>Votre espace SchoolNet</Text>
        </View>
        {onNavigateToPublic && (
          <TouchableOpacity style={styles.publicButton} onPress={onNavigateToPublic}>
            <Eye size={18} color={theme.colors.primary.DEFAULT} />
            <Text style={styles.publicButtonText}>Voir l'accueil</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Widgets */}
      <View style={styles.widgetsContainer}>
        {widgets.map((widget) => (
          <TouchableOpacity
            key={widget.id}
            style={styles.widgetCard}
            onPress={() => router.push(widget.href)}
            activeOpacity={0.7}
          >
            <widget.icon size={32} color={theme.colors.primary.DEFAULT} />
            <Text style={styles.widgetLabel}>{widget.label}</Text>
            <Text style={styles.widgetDescription}>{widget.description}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Liens utiles */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Liens utiles</Text>
        <View style={styles.linksContainer}>
          {quickLinks.map((link) => (
            <TouchableOpacity
              key={link.id}
              style={styles.linkCard}
              onPress={() => router.push(link.href)}
              activeOpacity={0.7}
            >
              <View style={[styles.linkIconWrapper, { backgroundColor: link.bgColor }]}>
                <link.icon size={18} color={link.color} />
              </View>
              <Text style={styles.linkLabel}>{link.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Actualités récentes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📢 Dernières actualités</Text>
        {actualites.map((actu) => (
          <View key={actu.id} style={styles.actuCard}>
            <Text style={styles.actuTitle}>{actu.titre}</Text>
            <Text style={styles.actuDate}>{actu.date}</Text>
            <Text style={styles.actuDescription}>{actu.description}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.neutral[800],
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.neutral[500],
  },
  publicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.neutral[100],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  publicButtonText: {
    fontSize: 12,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  widgetsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  widgetCard: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    ...theme.shadows.sm,
  },
  widgetLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.neutral[800],
    marginTop: 8,
    marginBottom: 4,
  },
  widgetDescription: {
    fontSize: 11,
    color: theme.colors.neutral[500],
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.neutral[800],
    marginBottom: 12,
  },
  linksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    ...theme.shadows.sm,
  },
  linkIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.neutral[700],
  },
  actuCard: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    ...theme.shadows.sm,
  },
  actuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.neutral[800],
    marginBottom: 4,
  },
  actuDate: {
    fontSize: 11,
    color: theme.colors.neutral[400],
    marginBottom: 6,
  },
  actuDescription: {
    fontSize: 13,
    color: theme.colors.neutral[600],
  },
});