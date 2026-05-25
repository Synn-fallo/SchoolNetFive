import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { UserPlus, UserCheck, BookOpen, MessageCircle, Award, Shield } from 'lucide-react-native';
import PublicFooter from '@/components/public/PublicFooter';

export default function CommentCaMarcheScreen() {
  const steps = [
    {
      icon: UserPlus,
      title: '1. Créez votre compte',
      description: 'Inscrivez-vous gratuitement en quelques minutes.',
    },
    {
      icon: UserCheck,
      title: '2. Rejoignez votre établissement',
      description: 'Utilisez le code d\'invitation ou demandez votre rattachement.',
    },
    {
      icon: BookOpen,
      title: '3. Accédez à vos fonctionnalités',
      description: 'Selon votre rôle, accédez aux notes, paiements, messages et plus.',
    },
    {
      icon: MessageCircle,
      title: '4. Communiquez',
      description: 'Échangez avec vos enseignants, vos enfants ou vos parents d\'élèves.',
    },
    {
      icon: Award,
      title: '5. Suivez vos progrès',
      description: 'Consultez vos bulletins, statistiques et recommandations IA.',
    },
    {
      icon: Shield,
      title: '6. Gérez la sécurité',
      description: 'Les parents contrôlent l\'accès et les activités des enfants.',
    },
  ];

  const faq = [
    {
      question: 'SchoolNet est-il gratuit ?',
      answer: 'SchoolNet propose un accès freemium. Certaines fonctionnalités sont gratuites, tandis que des abonnements premium offrent des fonctionnalités avancées pour les établissements et les individus.',
    },
    {
      question: 'Comment mes enfants accèdent-ils à leurs notes ?',
      answer: 'Une fois inscrits et rattachés à leur établissement, les élèves et parents peuvent consulter les notes, devoirs et bulletins dans l\'onglet "Notes".',
    },
    {
      question: 'Qu\'est-ce que l\'assistant IA Chool ?',
      answer: 'Chool est un assistant intelligent qui aide les élèves dans leurs devoirs, explique les concepts difficiles et fournit des conseils méthodologiques.',
    },
    {
      question: 'Comment fonctionne le contrôle parental ?',
      answer: 'Les parents peuvent définir des restrictions d\'accès (forums, marketplace, publications), des plages horaires et choisir le mode d\'accès aux corrigés (libre, contrôlé, différé).',
    },
    {
      question: 'Mes données sont-elles sécurisées ?',
      answer: 'Absolument. SchoolNet utilise un chiffrement avancé, des politiques RLS strictes et est conforme au RGPD pour protéger vos données.',
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
        <Text style={styles.heroTitle}>Comment ça marche ?</Text>
        <Text style={styles.heroSubtitle}>
          Découvrez en quelques étapes comment SchoolNet simplifie la vie scolaire
        </Text>
      </View>

      {/* Steps */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Les étapes clés</Text>
        <View style={styles.stepsGrid}>
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <View key={index} style={styles.stepCard}>
                <View style={styles.stepIcon}>
                  <IconComponent size={32} color="#3B82F6" />
                </View>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* FAQ */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Questions fréquentes</Text>
        <View style={styles.faqGrid}>
          {faq.map((item, index) => (
            <View key={index} style={styles.faqCard}>
              <Text style={styles.faqQuestion}>{item.question}</Text>
              <Text style={styles.faqAnswer}>{item.answer}</Text>
            </View>
          ))}
        </View>
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
    maxWidth: 600,
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
    marginBottom: 24,
    textAlign: 'center',
  },
  stepsGrid: {
    gap: 16,
  },
  stepCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  stepIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  faqGrid: {
    gap: 16,
  },
  faqCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
});