import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Target, Heart, Users, Eye, Award } from 'lucide-react-native';
import PublicFooter from '@/components/public/PublicFooter';

export default function AProposScreen() {
  const values = [
    {
      icon: Target,
      title: 'Notre mission',
      description: 'Connecter tous les acteurs de l\'éducation pour une gestion scolaire plus efficace et accessible.',
    },
    {
      icon: Eye,
      title: 'Notre vision',
      description: 'Devenir le réseau social académique de référence en Afrique de l\'Ouest.',
    },
    {
      icon: Heart,
      title: 'Nos valeurs',
      description: 'Innovation, accessibilité, transparence et excellence éducative.',
    },
    {
      icon: Users,
      title: 'Notre communauté',
      description: 'Plus de 1000 établissements et 50 000 utilisateurs nous font confiance.',
    },
    {
      icon: Award,
      title: 'Notre engagement',
      description: 'Fournir des outils numériques adaptés aux réalités locales.',
    },
  ];

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>À propos de SchoolNet</Text>
        <Text style={styles.heroSubtitle}>
          Une plateforme éducative née à Porto-Novo en 2022
        </Text>
      </View>

      {/* Story */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notre histoire</Text>
        <Text style={styles.text}>
          SchoolNet est né d'un constat simple : les établissements scolaires en Afrique de l'Ouest
          manquent d'outils numériques adaptés à leurs réalités. En 2022, à Porto-Novo, nous avons
          décidé de changer cela.
        </Text>
        <Text style={[styles.text, { marginTop: 12 }]}>
          Aujourd'hui, SchoolNet est la plateforme éducative de référence qui connecte élèves,
          parents, enseignants et administrations scolaires dans un écosystème unique et sécurisé.
        </Text>
      </View>

      {/* Values Grid */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Nos fondements</Text>
        <View style={styles.valuesGrid}>
          {values.map((value, index) => {
            const IconComponent = value.icon;
            return (
              <View key={index} style={styles.valueCard}>
                <View style={styles.valueIcon}>
                  <IconComponent size={32} color="#3B82F6" />
                </View>
                <Text style={styles.valueTitle}>{value.title}</Text>
                <Text style={styles.valueDescription}>{value.description}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Team */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notre équipe</Text>
        <Text style={styles.text}>
          Une équipe passionnée d'éducateurs, de développeurs et d'innovants,
          unis par la même conviction : la technologie peut transformer l'éducation.
        </Text>
      </View>

      {/* Footer - À l'intérieur du ScrollView, après tout le contenu */}
      <PublicFooter />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    flexGrow: 1,
  },
  hero: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 48,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#E0E7FF',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
  },
  valuesGrid: {
    marginTop: 8,
    gap: 20,
  },
  valueCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  valueIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  valueTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  valueDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});