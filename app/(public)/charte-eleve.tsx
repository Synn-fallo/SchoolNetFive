import { View, Text, StyleSheet, ScrollView, Linking, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Shield, CheckCircle, AlertCircle, FileText, Users, Lock, GraduationCap } from 'lucide-react-native';
import theme from '@/constants/theme';

export default function CharteEleveScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.neutral[600]} />
        </TouchableOpacity>
        <View style={styles.headerIcon}>
          <GraduationCap size={32} color={theme.colors.primary.DEFAULT} />
        </View>
        <Text style={styles.title}>Charte élève</Text>
        <Text style={styles.subtitle}>SchoolNet – Engagement scolaire</Text>
      </View>

      <View style={styles.versionBadge}>
        <Text style={styles.versionText}>Version 1.0 – 27 avril 2026</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📖 Préambule</Text>
        <Text style={styles.sectionText}>
          En tant qu’élève sur SchoolNet, tu as accès à des outils pour réussir ta scolarité.
          Cette charte t’aide à utiliser la plateforme de façon responsable et respectueuse.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎯 Principes fondamentaux</Text>
        <View style={styles.card}>
          <Lock size={18} color="#3B82F6" />
          <Text style={styles.cardText}>Je protège mes identifiants de connexion.</Text>
        </View>
        <View style={styles.card}>
          <Users size={18} color="#10B981" />
          <Text style={styles.cardText}>Je respecte mes camarades et mes enseignants.</Text>
        </View>
        <View style={styles.card}>
          <Shield size={18} color="#8B5CF6" />
          <Text style={styles.cardText}>Je signale tout comportement inapproprié.</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Engagements</Text>
        <Text style={styles.articleText}>• Je ne partage pas mon mot de passe.</Text>
        <Text style={styles.articleText}>• Je ne publie pas de contenus choquants ou violents.</Text>
        <Text style={styles.articleText}>• J’utilise l’IA Chool pour m’aider dans mes devoirs, pas pour tricher.</Text>
        <Text style={styles.articleText}>• Je préviens mes parents ou un enseignant en cas de problème.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚠️ Manquements</Text>
        <View style={styles.alertCard}>
          <AlertCircle size={20} color="#EF4444" />
          <Text style={styles.alertText}>
            Tout manquement aux règles peut entraîner la suspension temporaire du compte.
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔗 Liens utiles</Text>
        <TouchableOpacity onPress={() => Linking.openURL('https://schoolnet.bj/contact')}>
          <Text style={styles.linkText}>Signaler un problème</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL('https://schoolnet.bj/faq')}>
          <Text style={styles.linkText}>Aide pour les élèves</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>SchoolNet – Plateforme éducative ouest-africaine</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 24 },
  backButton: { position: 'absolute', top: 0, left: 0, padding: 8 },
  headerIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#1F2937', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 4 },
  versionBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16, alignSelf: 'center', marginBottom: 20 },
  versionText: { fontSize: 11, color: '#6B7280' },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  sectionText: { fontSize: 14, color: '#4B5563', lineHeight: 22 },
  articleText: { fontSize: 14, color: '#4B5563', marginBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  cardText: { flex: 1, fontSize: 13, color: '#4B5563' },
  alertCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FEF2F2', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#FEE2E2' },
  alertText: { flex: 1, fontSize: 13, color: '#B91C1C' },
  linkText: { fontSize: 14, color: theme.colors.primary.DEFAULT, textDecorationLine: 'underline', marginBottom: 8 },
  footer: { textAlign: 'center', fontSize: 11, color: '#9CA3AF', marginTop: 20 },
});