import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { 
  BookOpen, 
  MessageCircle, 
  Brain, 
  ShoppingBag, 
  Users, 
  Shield 
} from 'lucide-react-native';
import theme from '@/constants/theme';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

interface Feature {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
  description: string;
}

const defaultFeatures: Feature[] = [
  {
    icon: BookOpen,
    title: 'Gestion pédagogique',
    description: 'Notes, devoirs, bulletins et suivi individualisé.',
  },
  {
    icon: MessageCircle,
    title: 'Communication instantanée',
    description: 'Messagerie sécurisée entre parents, enseignants et élèves.',
  },
  {
    icon: Brain,
    title: 'Assistant IA (Chool)',
    description: 'Aide aux devoirs et explications personnalisées.',
  },
  {
    icon: ShoppingBag,
    title: 'Marketplace éducative',
    description: 'Achat et vente de ressources pédagogiques.',
  },
  {
    icon: Users,
    title: 'Communauté scolaire',
    description: 'Forums de classe et groupes d\'entraide.',
  },
  {
    icon: Shield,
    title: 'Contrôle parental',
    description: 'Supervision des activités et restrictions.',
  },
];

interface FeaturesSectionProps {
  features?: Feature[];
}

export default function FeaturesSection({ features = defaultFeatures }: FeaturesSectionProps) {
  const columns = isMobile ? 1 : 3;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Fonctionnalités clés</Text>
      <Text style={styles.sectionSubtitle}>
        Tout ce dont vous avez besoin pour une gestion scolaire moderne et efficace
      </Text>

      <View style={styles.grid}>
        {features.map((feature, index) => {
          const IconComponent = feature.icon;
          return (
            <View key={index} style={styles.card}>
              <View style={styles.iconContainer}>
                <IconComponent size={28} color={theme.colors.primary.DEFAULT} />
              </View>
              <Text style={styles.title}>{feature.title}</Text>
              <Text style={styles.description}>{feature.description}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    backgroundColor: theme.colors.background.secondary,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.neutral[800],
    textAlign: 'center',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.colors.neutral[500],
    textAlign: 'center',
    marginBottom: 40,
    maxWidth: 600,
    alignSelf: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 20,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  card: {
    flex: 1,
    minWidth: 240,
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    ...theme.shadows.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.neutral[800],
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: theme.colors.neutral[500],
    lineHeight: 18,
  },
});