// /home/project/app/(public)/charte-enseignant.tsx
// Page web – Charte de bonne conduite enseignant SchoolNet

import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Shield, CheckCircle, AlertCircle, FileText, Users, Lock, MessageCircle, Flag } from 'lucide-react-native';
import theme from '@/constants/theme';

export default function CharteEnseignantScreen() {
  const router = useRouter();

  const handlePrint = () => {
    window.print();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.neutral[600]} />
        </TouchableOpacity>
        <View style={styles.headerIcon}>
          <Shield size={32} color={theme.colors.primary.DEFAULT} />
        </View>
        <Text style={styles.title}>Charte de bonne conduite</Text>
        <Text style={styles.subtitle}>Enseignant – SchoolNet</Text>
      </View>

      {/* Version et date */}
      <View style={styles.versionBadge}>
        <Text style={styles.versionText}>Version 1.0 – 26 avril 2026</Text>
      </View>

      {/* Préambule */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📖 Préambule</Text>
        <Text style={styles.sectionText}>
          SchoolNet est une plateforme éducative dédiée à l’écosystème scolaire ouest-africain. 
          En tant qu’enseignant, vous êtes un acteur clé de cette communauté. Cette charte définit 
          les principes et engagements que vous prenez en utilisant SchoolNet, afin de garantir 
          un environnement éducatif sain, sécurisé et respectueux pour tous.
        </Text>
      </View>

      {/* Principes fondamentaux */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Principes fondamentaux</Text>
        <View style={styles.card}>
          <CheckCircle size={18} color="#10B981" />
          <Text style={styles.cardText}>
            <Text style={styles.cardTitle}>Bienveillance éducative</Text>{'\n'}
            Je fais preuve de bienveillance envers les élèves, les parents et mes collègues.
          </Text>
        </View>
        <View style={styles.card}>
          <Lock size={18} color="#3B82F6" />
          <Text style={styles.cardText}>
            <Text style={styles.cardTitle}>Confidentialité</Text>{'\n'}
            Je respecte la confidentialité des données des élèves et des familles.
          </Text>
        </View>
        <View style={styles.card}>
          <MessageCircle size={18} color="#8B5CF6" />
          <Text style={styles.cardText}>
            <Text style={styles.cardTitle}>Communication professionnelle</Text>{'\n'}
            J’utilise un langage respectueux et adapté dans tous les échanges.
          </Text>
        </View>
        <View style={styles.card}>
          <Flag size={18} color="#F59E0B" />
          <Text style={styles.cardText}>
            <Text style={styles.cardTitle}>Signalement responsable</Text>{'\n'}
            Je signale tout comportement suspect ou abusif à l’équipe SchoolNet.
          </Text>
        </View>
      </View>

      {/* Engagements détaillés */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Engagements détaillés</Text>
        
        <Text style={styles.subsectionTitle}>1. Respect des élèves</Text>
        <Text style={styles.articleText}>
          • Je ne tiens aucun propos discriminatoire, humiliant ou violent envers un élève.{'\n'}
          • J’encourage la participation et valorise les efforts de chacun.{'\n'}
          • Je respecte le rythme d’apprentissage et les difficultés individuelles.
        </Text>

        <Text style={styles.subsectionTitle}>2. Utilisation des données</Text>
        <Text style={styles.articleText}>
          • Je n’utilise les données personnelles des élèves qu’à des fins pédagogiques.{'\n'}
          • Je ne partage pas d’informations confidentielles en dehors du cadre scolaire.{'\n'}
          • Je protège l’accès à mon compte et aux informations qui y sont liées.
        </Text>

        <Text style={styles.subsectionTitle}>3. Communication</Text>
        <Text style={styles.articleText}>
          • Je réponds aux messages des parents dans un délai raisonnable.{'\n'}
          • J’évite les échanges tardifs ou inappropriés.{'\n'}
          • J’utilise un ton courtois et constructif.
        </Text>

        <Text style={styles.subsectionTitle}>4. Contenus partagés</Text>
        <Text style={styles.articleText}>
          • Je ne publie aucun contenu illicite, choquant ou hors sujet.{'\n'}
          • Je respecte les droits d’auteur sur les ressources pédagogiques.{'\n'}
          • Je ne fais pas de promotion commerciale non autorisée.
        </Text>

        <Text style={styles.subsectionTitle}>5. Vie de la communauté</Text>
        <Text style={styles.articleText}>
          • Je contribue à un climat de confiance et d’entraide.{'\n'}
          • Je signale tout abus ou comportement inapproprié via le support SchoolNet.{'\n'}
          • Je participe aux actions de formation et de sensibilisation proposées.
        </Text>
      </View>

      {/* Sanctions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚠️ Manquements et sanctions</Text>
        <View style={styles.alertCard}>
          <AlertCircle size={20} color="#EF4444" />
          <Text style={styles.alertText}>
            Tout manquement avéré à la présente charte pourra entraîner, selon la gravité, 
            un avertissement, une suspension temporaire ou la suppression définitive du compte 
            enseignant, sans préjudice des poursuites judiciaires le cas échéant.
          </Text>
        </View>
      </View>

      {/* Engagement final */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>✅ Engagement solennel</Text>
        <View style={styles.engagementCard}>
          <Text style={styles.engagementText}>
            En utilisant SchoolNet, je déclare avoir pris connaissance de la présente charte 
            et m’engage solennellement à la respecter pleinement. Je comprends que mon compte 
            enseignant est soumis à ces règles et que je contribue, par mon comportement, 
            à la qualité et à la sécurité de la plateforme.
          </Text>
        </View>
      </View>

      {/* Liens utiles */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔗 Liens utiles</Text>
        <TouchableOpacity onPress={() => Linking.openURL('https://schoolnet.bj/contact')}>
          <Text style={styles.linkText}>Signaler un abus</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL('https://schoolnet.bj/faq')}>
          <Text style={styles.linkText}>Questions fréquentes</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL('https://schoolnet.bj/support')}>
          <Text style={styles.linkText}>Contacter le support</Text>
        </TouchableOpacity>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.printButton} onPress={handlePrint}>
          <FileText size={18} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.printButtonText}>Imprimer la charte</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        SchoolNet – Plateforme éducative ouest-africaine
      </Text>
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
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    position: 'absolute',
    top: 0,
    left: 0,
    padding: 8,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
  },
  versionBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'center',
    marginBottom: 20,
  },
  versionText: {
    fontSize: 11,
    color: '#6B7280',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 8,
  },
  articleText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontWeight: '700',
    fontSize: 14,
    color: '#1F2937',
  },
  cardText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FEF2F2',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    color: '#B91C1C',
    lineHeight: 18,
  },
  engagementCard: {
    backgroundColor: '#FEFCE8',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEF08A',
  },
  engagementText: {
    fontSize: 13,
    color: '#1F2937',
    lineHeight: 20,
    textAlign: 'center',
  },
  linkText: {
    fontSize: 14,
    color: theme.colors.primary.DEFAULT,
    textDecorationLine: 'underline',
    marginBottom: 8,
  },
  actions: {
    alignItems: 'center',
    marginBottom: 24,
  },
  printButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary.DEFAULT,
  },
  printButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary.DEFAULT,
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 20,
  },
});