import { View, Text, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MapPin, Phone, Mail, Globe, Users, BookOpen, Calendar, ChevronRight, Share2, Copy, Check, Building2, Key, LogIn } from 'lucide-react-native';
import theme from '@/constants/theme';

interface EtablissementDetail {
  id: string;
  nom: string;
  slug: string;
  description?: string;
  description_courte?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  logo_url?: string;
  couleur_primaire: string;
  statut: string;
  ville?: string;
  type_etablissement?: string;
  site_web?: string;
  sous_domaine?: string;
  annee_creation?: string;
  classes: Array<{ id: string; nom: string; niveau: string; capacite: number }>;
  effectif_total: number;
  metadata?: {
    galerie?: string[];
    regime?: 'public' | 'prive' | 'mixte';
    corps?: 'college' | 'lycee' | 'centre_metiers';
    enseignement?: 'general' | 'technique';
    cycle?: 'premier' | 'second';
    options?: string[];
    taux_reussite?: number;
  };
  has_active_subscription?: boolean;
  code_etablissement?: string;
}

export default function EtablissementVitrineScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [etablissement, setEtablissement] = useState<EtablissementDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchEtablissement();
    }
  }, [slug]);

  const fetchEtablissement = async () => {
    try {
      // Récupérer l'établissement depuis la vue publique
      const { data, error } = await supabase
        .from('public_etablissements')
        .select('*')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Établissement non trouvé');

      // Vérifier l'abonnement actif
      let hasActiveSubscription = false;
      const { data: subscription, error: subError } = await supabase
        .from('abonnements')
        .select('is_active')
        .eq('etablissement_id', data.id)
        .eq('is_active', true)
        .maybeSingle();

      if (!subError && subscription) {
        hasActiveSubscription = true;
      }

      setEtablissement({
        ...data,
        has_active_subscription: hasActiveSubscription,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleInscription = () => {
    router.push(`/auth/register?etablissement_slug=${slug}`);
  };

  const handleContact = (type: string, value: string) => {
    if (type === 'phone') {
      Linking.openURL(`tel:${value}`);
    } else if (type === 'email') {
      Linking.openURL(`mailto:${value}`);
    } else if (type === 'address') {
      Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(value)}`);
    } else if (type === 'website') {
      Linking.openURL(value.startsWith('http') ? value : `https://${value}`);
    }
  };

  const handleShare = () => {
    alert('Partage: ' + (etablissement?.sous_domaine || `https://schoolnet-official.bolt.host/etablissements/${slug}`));
  };

  const handleCopyUrl = () => {
    const url = etablissement?.sous_domaine || `https://schoolnet-official.bolt.host/etablissements/${slug}`;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    alert('URL copiée: ' + url);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('fr-FR').format(num);
  };

  const getRegimeLabel = (regime?: string): string => {
    switch (regime) {
      case 'public': return 'Public';
      case 'prive': return 'Privé';
      case 'mixte': return 'Mixte';
      default: return '';
    }
  };

  const getCorpsLabel = (corps?: string): string => {
    switch (corps) {
      case 'college': return 'Collège';
      case 'lycee': return 'Lycée';
      case 'centre_metiers': return 'Centre de Métiers';
      default: return '';
    }
  };

  const getEnseignementLabel = (enseignement?: string): string => {
    switch (enseignement) {
      case 'general': return 'Général';
      case 'technique': return 'Technique';
      default: return '';
    }
  };

  const getCycleLabel = (cycle?: string): string => {
    switch (cycle) {
      case 'premier': return '1er Cycle';
      case 'second': return '2nd Cycle';
      default: return '';
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
      </View>
    );
  }

  if (error || !etablissement) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || 'Établissement non trouvé'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ✅ Si pas d'abonnement actif, afficher "Site en construction"
  if (!etablissement.has_active_subscription) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.constructionCard}>
          <Building2 size={64} color="#9CA3AF" />
          <Text style={styles.constructionTitle}>Site en construction</Text>
          <Text style={styles.constructionText}>
            La vitrine de {etablissement.nom} n'est pas encore disponible.
          </Text>
          <Text style={styles.constructionSubtext}>
            Revenez plus tard pour découvrir cet établissement.
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Retour à l'annuaire</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const primaryColor = etablissement.couleur_primaire || theme.colors.primary.DEFAULT;
  const isActive = etablissement.statut === 'ACTIF';
  const galerieImages = etablissement.metadata?.galerie || [];
  const nombreClasses = etablissement.classes?.length || 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Bannière */}
      <View style={[styles.banner, { backgroundColor: primaryColor }]}>
        <View style={styles.bannerContent}>
          {etablissement.logo_url ? (
            <Image source={{ uri: etablissement.logo_url }} style={styles.logo} />
          ) : (
            <View style={[styles.logoPlaceholder, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <BookOpen size={40} color="#FFFFFF" />
            </View>
          )}
          <Text style={styles.bannerName}>{etablissement.nom}</Text>
          {etablissement.statut === 'INFOS_MINIMALES_COMPLETE' && (
            <View style={[styles.configBadge, { backgroundColor: '#FEF3C7' }]}>
              <Text style={[styles.configBadgeText, { color: '#F59E0B' }]}>En configuration</Text>
            </View>
          )}
          {isActive && etablissement.sous_domaine && (
            <View style={styles.urlBadge}>
              <Globe size={14} color={primaryColor} />
              <Text style={[styles.urlText, { color: primaryColor }]}>{etablissement.sous_domaine}</Text>
              <TouchableOpacity onPress={handleCopyUrl} style={styles.copyButton}>
                {copied ? <Check size={12} color="#10B981" /> : <Copy size={12} color={primaryColor} />}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Actions rapides */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Share2 size={18} color={theme.colors.neutral[600]} />
          <Text style={styles.actionButtonText}>Partager</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleInscription}>
          <Users size={18} color={theme.colors.primary.DEFAULT} />
          <Text style={[styles.actionButtonText, { color: theme.colors.primary.DEFAULT }]}>S'inscrire</Text>
        </TouchableOpacity>
      </View>

      {/* Description courte */}
      {etablissement.description_courte && (
        <View style={styles.section}>
          <Text style={styles.descriptionShort}>{etablissement.description_courte}</Text>
        </View>
      )}

      {/* Coordonnées en tags */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact</Text>
        <View style={styles.tagsContainer}>
          {etablissement.telephone && (
            <TouchableOpacity style={styles.tag} onPress={() => handleContact('phone', etablissement.telephone!)}>
              <Phone size={14} color={theme.colors.neutral[500]} />
              <Text style={styles.tagText}>{etablissement.telephone}</Text>
            </TouchableOpacity>
          )}
          {etablissement.email && (
            <TouchableOpacity style={styles.tag} onPress={() => handleContact('email', etablissement.email!)}>
              <Mail size={14} color={theme.colors.neutral[500]} />
              <Text style={styles.tagText}>{etablissement.email}</Text>
            </TouchableOpacity>
          )}
          {etablissement.adresse && (
            <TouchableOpacity style={styles.tag} onPress={() => handleContact('address', etablissement.adresse!)}>
              <MapPin size={14} color={theme.colors.neutral[500]} />
              <Text style={styles.tagText}>{etablissement.adresse}</Text>
            </TouchableOpacity>
          )}
          {etablissement.site_web && (
            <TouchableOpacity style={styles.tag} onPress={() => handleContact('website', etablissement.site_web!)}>
              <Globe size={14} color={theme.colors.neutral[500]} />
              <Text style={styles.tagText}>{etablissement.site_web}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Code établissement */}
      {etablissement.code_etablissement && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inscription en ligne</Text>
          <View style={styles.codeCard}>
            <Key size={20} color={theme.colors.primary.DEFAULT} />
            <View style={styles.codeContent}>
              <Text style={styles.codeLabel}>Code d'inscription</Text>
              <Text style={styles.codeValue}>{etablissement.code_etablissement}</Text>
              <Text style={styles.codeHelper}>
                Utilisez ce code pour inscrire votre enfant en ligne
              </Text>
            </View>
          </View>
          <TouchableOpacity 
            style={[styles.autoInscriptionButton, { backgroundColor: primaryColor }]}
            onPress={() => router.push(`/auto-inscription?code=${etablissement.code_etablissement}`)}
          >
            <LogIn size={18} color="#FFFFFF" />
            <Text style={styles.autoInscriptionButtonText}>
              Auto-inscription avec ce code
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Caractéristiques */}
      {(etablissement.metadata?.regime || etablissement.metadata?.corps || 
        etablissement.metadata?.enseignement || etablissement.metadata?.cycle || 
        (etablissement.metadata?.options?.length || 0) > 0) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Caractéristiques</Text>
          <View style={styles.caracteristiquesGrid}>
            {etablissement.metadata?.regime && (
              <View style={styles.caracteristiqueItem}>
                <Text style={styles.caracteristiqueLabel}>Régime</Text>
                <Text style={styles.caracteristiqueValue}>
                  {getRegimeLabel(etablissement.metadata.regime)}
                </Text>
              </View>
            )}
            {etablissement.metadata?.corps && (
              <View style={styles.caracteristiqueItem}>
                <Text style={styles.caracteristiqueLabel}>Corps</Text>
                <Text style={styles.caracteristiqueValue}>
                  {getCorpsLabel(etablissement.metadata.corps)}
                </Text>
              </View>
            )}
            {etablissement.metadata?.enseignement && (
              <View style={styles.caracteristiqueItem}>
                <Text style={styles.caracteristiqueLabel}>Enseignement</Text>
                <Text style={styles.caracteristiqueValue}>
                  {getEnseignementLabel(etablissement.metadata.enseignement)}
                </Text>
              </View>
            )}
            {etablissement.metadata?.cycle && (
              <View style={styles.caracteristiqueItem}>
                <Text style={styles.caracteristiqueLabel}>Cycle</Text>
                <Text style={styles.caracteristiqueValue}>
                  {getCycleLabel(etablissement.metadata.cycle)}
                </Text>
              </View>
            )}
          </View>
          {etablissement.metadata?.options && etablissement.metadata.options.length > 0 && (
            <View style={styles.optionsContainer}>
              <Text style={styles.optionsLabel}>Options proposées</Text>
              <View style={styles.optionsChips}>
                {etablissement.metadata.options.map((opt: string, idx: number) => (
                  <View key={idx} style={styles.optionChip}>
                    <Text style={styles.optionChipText}>{opt}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {etablissement.metadata?.taux_reussite && (
            <View style={styles.tauxReussiteContainer}>
              <Text style={styles.tauxReussiteLabel}>Taux de réussite</Text>
              <Text style={styles.tauxReussiteValue}>{etablissement.metadata.taux_reussite}%</Text>
            </View>
          )}
        </View>
      )}

      {/* Chiffres clés */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Chiffres clés</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Users size={24} color={primaryColor} />
            <Text style={styles.statNumber}>{formatNumber(etablissement.effectif_total || 0)}</Text>
            <Text style={styles.statLabel}>Élèves</Text>
          </View>
          <View style={styles.statCard}>
            <BookOpen size={24} color={primaryColor} />
            <Text style={styles.statNumber}>{nombreClasses}</Text>
            <Text style={styles.statLabel}>Classes</Text>
          </View>
          {etablissement.annee_creation && (
            <View style={styles.statCard}>
              <Calendar size={24} color={primaryColor} />
              <Text style={styles.statNumber}>{etablissement.annee_creation}</Text>
              <Text style={styles.statLabel}>Création</Text>
            </View>
          )}
        </View>
      </View>

      {/* Description complète */}
      {etablissement.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Présentation</Text>
          <Text style={styles.description}>{etablissement.description}</Text>
        </View>
      )}

      {/* Classes */}
      {etablissement.classes && etablissement.classes.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Classes offertes</Text>
          <View style={styles.chipsContainer}>
            {etablissement.classes.map((classe) => (
              <View key={classe.id} style={styles.chip}>
                <Text style={styles.chipText}>{classe.nom}</Text>
                <Text style={styles.chipLevel}>{classe.niveau}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Galerie (placeholder) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Galerie</Text>
        {galerieImages.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
            {galerieImages.map((img, idx) => (
              <Image key={idx} source={{ uri: img }} style={styles.galleryImage} />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.galleryPlaceholder}>
            <Text style={styles.galleryPlaceholderText}>
              Galerie bientôt disponible
            </Text>
          </View>
        )}
      </View>

      {/* CTA Inscription */}
      <TouchableOpacity style={[styles.ctaButton, { backgroundColor: primaryColor }]} onPress={handleInscription}>
        <Text style={styles.ctaButtonText}>Je m'inscris dans cet établissement</Text>
        <ChevronRight size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  content: {
    paddingBottom: 48,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.danger.DEFAULT,
    textAlign: 'center',
    marginBottom: 16,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: theme.borderRadius.DEFAULT,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  constructionCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    width: '100%',
  },
  constructionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.neutral[600],
    marginTop: 16,
    marginBottom: 8,
  },
  constructionText: {
    fontSize: 14,
    color: theme.colors.neutral[500],
    textAlign: 'center',
    marginBottom: 8,
  },
  constructionSubtext: {
    fontSize: 12,
    color: theme.colors.neutral[400],
    textAlign: 'center',
    marginBottom: 24,
  },
  banner: {
    paddingTop: 48,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  bannerContent: {
    alignItems: 'center',
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  bannerName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  configBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  configBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  urlBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  urlText: {
    fontSize: 12,
    fontWeight: '500',
  },
  copyButton: {
    padding: 2,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    color: theme.colors.neutral[600],
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.neutral[800],
    marginBottom: 16,
  },
  descriptionShort: {
    fontSize: 16,
    color: theme.colors.neutral[600],
    lineHeight: 24,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: theme.colors.neutral[600],
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.neutral[100],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
  },
  tagText: {
    fontSize: 13,
    color: theme.colors.neutral[600],
  },
  // Styles pour le code établissement
  codeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#F0FDF4',
    padding: 16,
    borderRadius: theme.borderRadius.md,
    marginBottom: 16,
  },
  codeContent: {
    flex: 1,
  },
  codeLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  codeValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: 1,
  },
  codeHelper: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  autoInscriptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: theme.borderRadius.lg,
  },
  autoInscriptionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  caracteristiquesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
  },
  caracteristiqueItem: {
    flex: 1,
    minWidth: 100,
  },
  caracteristiqueLabel: {
    fontSize: 12,
    color: theme.colors.neutral[500],
    marginBottom: 4,
  },
  caracteristiqueValue: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.neutral[800],
  },
  optionsContainer: {
    marginTop: 8,
  },
  optionsLabel: {
    fontSize: 12,
    color: theme.colors.neutral[500],
    marginBottom: 8,
  },
  optionsChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    backgroundColor: theme.colors.neutral[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.full,
  },
  optionChipText: {
    fontSize: 12,
    color: theme.colors.neutral[600],
  },
  tauxReussiteContainer: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
  },
  tauxReussiteLabel: {
    fontSize: 12,
    color: theme.colors.neutral[500],
  },
  tauxReussiteValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.success.DEFAULT,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.md,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.neutral[800],
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.neutral[500],
    marginTop: 4,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    backgroundColor: theme.colors.neutral[100],
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.full,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.neutral[700],
  },
  chipLevel: {
    fontSize: 11,
    color: theme.colors.neutral[500],
    marginTop: 2,
  },
  galleryScroll: {
    flexDirection: 'row',
  },
  galleryImage: {
    width: 100,
    height: 100,
    borderRadius: theme.borderRadius.md,
    marginRight: 12,
  },
  galleryPlaceholder: {
    backgroundColor: theme.colors.neutral[100],
    padding: 32,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  galleryPlaceholderText: {
    fontSize: 14,
    color: theme.colors.neutral[400],
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
    paddingVertical: 16,
    borderRadius: theme.borderRadius.lg,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
