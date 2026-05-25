import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { GraduationCap } from 'lucide-react-native';
import StatsSection from '@/components/public/StatsSection';
import FeaturesSection from '@/components/public/FeaturesSection';
import { supabase } from '@/lib/supabase';
import EtablissementCard from '@/components/public/EtablissementCard';
import PublicFooter from '@/components/public/PublicFooter';
import EtablissementModal from '@/components/public/EtablissementModal';
import theme from '@/constants/theme';

const { width } = Dimensions.get('window');
const isMobile = width < 768;
const isTablet = width >= 768 && width < 1024;
const isDesktop = width >= 1024;

// Calcul du nombre de colonnes et de la largeur des cartes (comme dans l'annuaire)
const getNumColumns = () => {
  if (isDesktop) return 3;
  if (isTablet) return 2;
  return 1;
};

const getCardWidth = () => {
  const numColumns = getNumColumns();
  const padding = 48; // padding horizontal total (24 + 24)
  const gap = 16; // espace entre les cartes
  const availableWidth = width - padding;
  return (availableWidth - (numColumns - 1) * gap) / numColumns;
};

interface Etablissement {
  id: string;
  nom: string;
  slug: string;
  ville?: string | null;
  type_etablissement?: string | null;
  type_affichage?: string | null;
  logo_url?: string | null;
  taux_reussite?: number | null;
  likes_count?: number;
  vues_count?: number;
  note_moyenne?: number;
  badge_annuaire?: string | null;
  cycles?: string | null;
  options?: string | null;
  description_courte?: string | null;
  etoiles?: string;
  code_etablissement?: string | null;
  region?: string | null;
  departement?: string | null;
}

export default function PublicHomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [recentEtablissements, setRecentEtablissements] = useState<Etablissement[]>([]);
  const [selectedEtablissement, setSelectedEtablissement] = useState<Etablissement | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const numColumns = getNumColumns();
  const cardWidth = getCardWidth();

  useEffect(() => {
    fetchRecentEtablissements();
  }, []);

  // ✅ CORRECTION : Utiliser la même vue que l'annuaire (public_etablissements_cards)
  const fetchRecentEtablissements = async () => {
    try {
      const { data, error } = await supabase
        .from('public_etablissements_cards')  // ← Changé de 'public_etablissements' à 'public_etablissements_cards'
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;
      setRecentEtablissements(data || []);
    } catch (error) {
      console.error('Error fetching recent etablissements:', error);
    }
  };

  const handleCardPress = (slug: string) => {
    router.push(`/(public)/etablissements/${slug}`);
  };

  const handleQuickView = (etablissement: Etablissement) => {
    setSelectedEtablissement(etablissement);
    setModalVisible(true);
  };

  // Organiser les cartes en lignes pour la grille
  const renderGrid = () => {
    const rows = [];
    for (let i = 0; i < recentEtablissements.length; i += numColumns) {
      const rowItems = recentEtablissements.slice(i, i + numColumns);
      rows.push(
        <View key={i} style={styles.row}>
          {rowItems.map((etab, index) => (
            <View key={etab.id} style={[styles.cardWrapper, { width: cardWidth, marginRight: index === rowItems.length - 1 ? 0 : 16 }]}>
              <EtablissementCard
                id={etab.id}
                nom={etab.nom}
                slug={etab.slug}
                ville={etab.ville}
                region={etab.region}
                departement={etab.departement}
                type_affichage={etab.type_affichage}
                logo_url={etab.logo_url}
                taux_reussite={etab.taux_reussite}
                likes_count={etab.likes_count}
                vues_count={etab.vues_count}
                note_moyenne={etab.note_moyenne}
                badge_annuaire={etab.badge_annuaire}
                cycles={etab.cycles}
                options={etab.options}
                description_courte={etab.description_courte}
                etoiles={etab.etoiles}
                code_etablissement={etab.code_etablissement}  // ✅ AJOUTÉ
                onPress={() => handleCardPress(etab.slug)}
                onQuickView={() => handleQuickView(etab)}
              />
            </View>
          ))}
        </View>
      );
    }
    return rows;
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Hero Section */}
      <View style={styles.hero}>
        <View style={styles.heroContent}>
          <View style={styles.heroTextContainer}>
            <Text style={styles.heroTitle}>SchoolNet</Text>
            <Text style={styles.heroSubtitle}>La plateforme éducative digitale</Text>
            <Text style={styles.heroDescription}>
              Connectez, gérez et optimisez votre établissement scolaire en un seul endroit
            </Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/auth/login')}>
                <Text style={styles.primaryButtonText}>Se connecter</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/auth/register')}>
                <Text style={styles.secondaryButtonText}>S'inscrire</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Illustration décorative */}
          <View style={styles.heroIllustration}>
            <View style={styles.illustrationBlob} />
            <View style={styles.illustrationBlob2} />
            <View style={styles.illustrationIconContainer}>
              <GraduationCap size={80} color="rgba(255,255,255,0.9)" />
            </View>
          </View>
        </View>
      </View>

      {/* Stats Section */}
      <StatsSection />

      {/* Features Section */}
      <FeaturesSection />

      {/* Recent Establishments Section */}
      {recentEtablissements.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Établissements récents</Text>
          <Text style={styles.sectionSubtitle}>
            Découvrez les derniers établissements à rejoindre SchoolNet
          </Text>
          <View style={styles.gridContainer}>
            {renderGrid()}
          </View>
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => router.push('/(public)/etablissements')}
          >
            <Text style={styles.viewAllButtonText}>Voir tous les établissements</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* CTA */}
      <View style={styles.ctaSection}>
        <Text style={styles.ctaTitle}>Prêt à commencer?</Text>
        <Text style={styles.ctaDescription}>
          Rejoignez des milliers d'établissements qui font confiance à SchoolNet
        </Text>
        <TouchableOpacity style={styles.ctaButton} onPress={() => router.push('/auth/register')}>
          <Text style={styles.ctaButtonText}>Créer un compte gratuit</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <PublicFooter />

      {/* Modal pour aperçu rapide */}
      <EtablissementModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        etablissement={selectedEtablissement}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.primary,
  },
  contentContainer: {
    flexGrow: 1,
  },
  hero: {
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 24,
    paddingVertical: 64,
    position: 'relative',
    overflow: 'hidden',
  },
  heroContent: {
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
    gap: 40,
  },
  heroTextContainer: {
    flex: 1,
    zIndex: 2,
  },
  heroTitle: {
    fontSize: theme.typography.h1.fontSize,
    fontWeight: theme.typography.h1.fontWeight as any,
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: isMobile ? 'center' : 'left',
  },
  heroSubtitle: {
    fontSize: theme.typography.h4.fontSize,
    fontWeight: theme.typography.h4.fontWeight as any,
    color: '#E0E7FF',
    marginBottom: 12,
    textAlign: isMobile ? 'center' : 'left',
  },
  heroDescription: {
    fontSize: theme.typography.body.fontSize,
    color: '#E0E7FF',
    textAlign: isMobile ? 'center' : 'left',
    marginBottom: 32,
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: isMobile ? 'column' : 'row',
    gap: 12,
    width: '100%',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.DEFAULT,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: theme.colors.primary.DEFAULT,
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: theme.borderRadius.DEFAULT,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  heroIllustration: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    position: 'relative',
    zIndex: 1,
  },
  illustrationBlob: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: -20,
    right: -20,
  },
  illustrationBlob2: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.15)',
    bottom: -30,
    left: -30,
  },
  illustrationIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentSection: {
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  sectionTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight as any,
    color: theme.colors.neutral[800],
    textAlign: 'center',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.neutral[500],
    textAlign: 'center',
    marginBottom: 32,
  },
  gridContainer: {
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 16,
  },
  cardWrapper: {
    marginBottom: 0,
  },
  viewAllButton: {
    marginTop: 32,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: theme.colors.neutral[100],
    borderRadius: theme.borderRadius.DEFAULT,
  },
  viewAllButtonText: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.neutral[600],
    fontWeight: '500',
  },
  ctaSection: {
    marginHorizontal: 24,
    marginBottom: 40,
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
  },
  ctaTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight as any,
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  ctaDescription: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: '#E0E7FF',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  ctaButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.DEFAULT,
  },
  ctaButtonText: {
    color: theme.colors.primary.DEFAULT,
    fontSize: theme.typography.button.fontSize,
    fontWeight: theme.typography.button.fontWeight as any,
  },
});