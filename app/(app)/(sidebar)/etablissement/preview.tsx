import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert, TouchableOpacity, Linking, Share } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Building2, MapPin, Phone, Mail, Globe, Calendar, GraduationCap, BookOpen, Award, Share2, Eye, ArrowLeft, Copy, CheckCircle } from 'lucide-react-native';
import EtablissementStatusBadge from '@/components/etablissement/StatusBadge';
import theme from '@/constants/theme';

interface EtablissementData {
  id: string;
  nom: string;
  slug: string;
  statut: string;
  is_active: boolean;
  description?: string;
  logo_url?: string;
  ville?: string;
  telephone?: string;
  email?: string;
  site_web?: string;
  sous_domaine?: string;
  metadata: any;
}

const DOMAIN = 'schoolnet.bj';

export default function PreviewEtablissementScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { id: urlEtablissementId } = useLocalSearchParams<{ id: string }>();
  const [etablissement, setEtablissement] = useState<EtablissementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchEtablissement();
  }, [user, urlEtablissementId]);

  const fetchEtablissement = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      let etablissementIdToFetch = urlEtablissementId;

      // Si aucun id dans l'URL, récupérer le premier établissement du chef
      if (!etablissementIdToFetch) {
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('etablissement_id')
          .eq('user_id', user.id)
          .eq('role', 'chef_etablissement')
          .eq('is_active', true)
          .not('etablissement_id', 'is', null)
          .maybeSingle();

        if (roleError) throw roleError;
        etablissementIdToFetch = roleData?.etablissement_id;
      }

      if (!etablissementIdToFetch) {
        setError('Aucun établissement trouvé');
        setLoading(false);
        return;
      }

      const { data: etabData, error: etabError } = await supabase
        .from('etablissements')
        .select('*')
        .eq('id', etablissementIdToFetch)
        .single();

      if (etabError) throw etabError;
      
      setEtablissement(etabData);
    } catch (error) {
      console.error('Error fetching etablissement:', error);
      setError('Impossible de charger les informations de l\'établissement');
      Alert.alert('Erreur', 'Impossible de charger les informations de l\'établissement');
    } finally {
      setLoading(false);
    }
  };

  const getSiteUrl = () => {
    if (etablissement?.sous_domaine) {
      return `https://${etablissement.sous_domaine}`;
    }
    if (etablissement?.slug) {
      return `https://${etablissement.slug}.${DOMAIN}`;
    }
    return null;
  };

  const handleShare = async () => {
    const url = getSiteUrl();
    if (!url) return;

    try {
      await Share.share({
        message: `Découvrez ${etablissement?.nom} sur SchoolNet : ${url}`,
        title: `Partager ${etablissement?.nom}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleCopyUrl = async () => {
    const url = getSiteUrl();
    if (!url) return;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      Alert.alert('URL copiée', url);
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de copier l\'URL');
    }
  };

  const handleOpenUrl = () => {
    const url = getSiteUrl();
    if (url) {
      Linking.openURL(url);
    }
  };

  const getRegimeLabel = (regime?: string): string => {
    switch (regime) {
      case 'public': return 'Public';
      case 'prive': return 'Privé';
      case 'mixte': return 'Mixte';
      default: return 'Non renseigné';
    }
  };

  const getCorpsLabel = (corps?: string): string => {
    switch (corps) {
      case 'college': return 'Collège';
      case 'lycee': return 'Lycée';
      case 'centre_metiers': return 'Centre de Métiers';
      default: return 'Non renseigné';
    }
  };

  const getEnseignementLabel = (enseignement?: string): string => {
    switch (enseignement) {
      case 'general': return 'Général';
      case 'technique': return 'Technique';
      default: return 'Non renseigné';
    }
  };

  const getCyclesLabels = (cycles?: string[]): string => {
    if (!cycles || cycles.length === 0) return 'Non renseigné';
    const labels = cycles.map(c => {
      switch (c) {
        case 'premier': return '1er Cycle';
        case 'second': return '2nd Cycle';
        default: return c;
      }
    });
    return labels.join(' • ');
  };

  const getOptionsLabels = (options?: string[]): string => {
    if (!options || options.length === 0) return 'Aucune option';
    const labels = options.map(o => {
      switch (o) {
        case 'sti': return 'STI';
        case 'stag': return 'STAG';
        case 'technologie': return 'Technologie';
        case 'lettres': return 'Lettres';
        case 'sciences': return 'Sciences';
        default: return o;
      }
    });
    return labels.join(', ');
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement de l'aperçu...</Text>
      </View>
    );
  }

  if (error || !etablissement) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.errorCard}>
          <Building2 size={48} color={theme.colors.danger.DEFAULT} />
          <Text style={styles.errorTitle}>Aperçu non disponible</Text>
          <Text style={styles.errorText}>
            {error || 'L\'établissement que vous recherchez n\'existe pas ou vous n\'y avez pas accès.'}
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push('/(app)/(sidebar)/mes-etablissements')}
          >
            <Text style={styles.backButtonText}>Voir mes établissements</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const metadata = etablissement.metadata || {};
  const siteUrl = getSiteUrl();
  const isActive = etablissement.statut === 'ACTIF';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* En-tête */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButtonHeader}>
          <ArrowLeft size={24} color={theme.colors.neutral[600]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Aperçu du site</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Bannière de prévisualisation */}
      <View style={styles.previewBanner}>
        <Eye size={18} color={theme.colors.warning.DEFAULT} />
        <Text style={styles.previewBannerText}>
          Mode aperçu – Ce que les visiteurs verront
        </Text>
      </View>

      {/* Logo et nom */}
      <View style={styles.logoSection}>
        <View style={styles.logoContainer}>
          {etablissement.logo_url ? (
            <Image source={{ uri: etablissement.logo_url }} style={styles.logo} />
          ) : (
            <View style={styles.logoPlaceholder}>
              <Building2 size={48} color={theme.colors.primary.DEFAULT} />
            </View>
          )}
        </View>
        <Text style={styles.etablissementNom}>{etablissement.nom}</Text>
        <EtablissementStatusBadge statut={etablissement.statut} size="medium" />
      </View>

      {/* Description courte */}
      {metadata.description_courte && (
        <View style={styles.section}>
          <Text style={styles.descriptionText}>{metadata.description_courte}</Text>
        </View>
      )}

      {/* Coordonnées */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📌 Coordonnées</Text>
        
        {etablissement.ville && (
          <View style={styles.infoRow}>
            <MapPin size={18} color={theme.colors.neutral[500]} />
            <Text style={styles.infoText}>{etablissement.ville}</Text>
          </View>
        )}
        
        {etablissement.telephone && (
          <TouchableOpacity style={styles.infoRow} onPress={() => Linking.openURL(`tel:${etablissement.telephone}`)}>
            <Phone size={18} color={theme.colors.neutral[500]} />
            <Text style={[styles.infoText, styles.linkText]}>{etablissement.telephone}</Text>
          </TouchableOpacity>
        )}
        
        {etablissement.email && (
          <TouchableOpacity style={styles.infoRow} onPress={() => Linking.openURL(`mailto:${etablissement.email}`)}>
            <Mail size={18} color={theme.colors.neutral[500]} />
            <Text style={[styles.infoText, styles.linkText]}>{etablissement.email}</Text>
          </TouchableOpacity>
        )}
        
        {etablissement.site_web && (
          <TouchableOpacity style={styles.infoRow} onPress={() => Linking.openURL(etablissement.site_web!)}>
            <Globe size={18} color={theme.colors.neutral[500]} />
            <Text style={[styles.infoText, styles.linkText]}>{etablissement.site_web}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Caractéristiques pédagogiques */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📚 Caractéristiques pédagogiques</Text>
        
        <View style={styles.infoRow}>
          <Building2 size={18} color={theme.colors.neutral[500]} />
          <Text style={styles.infoText}>Régime: {getRegimeLabel(metadata.regime)}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <GraduationCap size={18} color={theme.colors.neutral[500]} />
          <Text style={styles.infoText}>Corps: {getCorpsLabel(metadata.corps)}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <BookOpen size={18} color={theme.colors.neutral[500]} />
          <Text style={styles.infoText}>Enseignement: {getEnseignementLabel(metadata.enseignement)}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Calendar size={18} color={theme.colors.neutral[500]} />
          <Text style={styles.infoText}>Cycles: {getCyclesLabels(metadata.cycles)}</Text>
        </View>
        
        {metadata.options && metadata.options.length > 0 && (
          <View style={styles.infoRow}>
            <Award size={18} color={theme.colors.neutral[500]} />
            <Text style={styles.infoText}>Options: {getOptionsLabels(metadata.options)}</Text>
          </View>
        )}
        
        {metadata.taux_reussite && (
          <View style={styles.infoRow}>
            <Award size={18} color={theme.colors.success.DEFAULT} />
            <Text style={[styles.infoText, { color: theme.colors.success.DEFAULT, fontWeight: '600' }]}>
              Taux de réussite: {metadata.taux_reussite}%
            </Text>
          </View>
        )}
      </View>

      {/* Description complète */}
      {etablissement.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📖 Présentation</Text>
          <Text style={styles.descriptionFullText}>{etablissement.description}</Text>
        </View>
      )}

      {/* URL du site (si actif) */}
      {siteUrl && isActive && (
        <View style={styles.urlSection}>
          <Text style={styles.sectionTitle}>🌐 Votre site officiel</Text>
          <View style={styles.urlCard}>
            <Globe size={20} color={theme.colors.primary.DEFAULT} />
            <Text style={styles.urlText} numberOfLines={1}>{siteUrl}</Text>
            <TouchableOpacity style={styles.urlActionButton} onPress={handleCopyUrl}>
              {copied ? (
                <CheckCircle size={18} color={theme.colors.success.DEFAULT} />
              ) : (
                <Copy size={18} color={theme.colors.primary.DEFAULT} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.urlActionButton} onPress={handleShare}>
              <Share2 size={18} color={theme.colors.primary.DEFAULT} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.visitButton} onPress={handleOpenUrl}>
            <Text style={styles.visitButtonText}>Visiter le site officiel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Message pour site non actif */}
      {!isActive && (
        <View style={styles.infoCard}>
          <Text style={styles.infoCardTitle}>🔒 Site non publié</Text>
          <Text style={styles.infoCardText}>
            Ce site n'est pas encore visible publiquement. Souscrivez à un abonnement pour le rendre accessible à tous.
          </Text>
          <TouchableOpacity
            style={styles.subscribeButton}
            onPress={() => router.push(`/(app)/(sidebar)/etablissement/abonnement?id=${etablissement.id}`)}
          >
            <Text style={styles.subscribeButtonText}>Souscrire un abonnement</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButtonHeader: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  previewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  previewBannerText: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '500',
  },
  logoSection: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  logoContainer: {
    marginBottom: 16,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  etablissementNom: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  section: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 15,
    color: '#4B5563',
    lineHeight: 22,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  descriptionFullText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  linkText: {
    color: theme.colors.primary.DEFAULT,
    textDecorationLine: 'underline',
  },
  urlSection: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  urlCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  urlText: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
  },
  urlActionButton: {
    padding: 6,
  },
  visitButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  visitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 20,
    margin: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  infoCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D97706',
    marginBottom: 8,
  },
  infoCardText: {
    fontSize: 13,
    color: '#92400E',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  subscribeButton: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});