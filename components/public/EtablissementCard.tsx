import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions, Animated, Alert, Linking, Platform } from 'react-native';
import { MapPin, ChevronRight, Share2, X, Star, TrendingUp, GraduationCap, Wrench, Eye, Heart, Building2, Award, Key, LogIn } from 'lucide-react-native';
import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import theme from '@/constants/theme';

const { width } = Dimensions.get('window');

export interface EtablissementCardProps {
  id: string;
  nom: string;
  slug: string;
  ville?: string | null;
  region?: string | null;
  departement?: string | null;
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
  onPress?: () => void;
  onQuickView?: () => void;
}

const formatNumber = (num?: number): string => {
  if (!num) return '0';
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
};

const getInitiales = (nom: string): string => {
  const mots = nom.trim().split(' ');
  if (mots.length >= 2) {
    return (mots[0][0] + mots[mots.length - 1][0]).toUpperCase();
  }
  return nom.substring(0, 2).toUpperCase();
};

const getBadgeColor = (badge?: string | null) => {
  switch (badge) {
    case 'Prestige':
      return { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' };
    case 'Premium':
      return { bg: '#EFF6FF', text: '#3B82F6', border: '#BFDBFE' };
    case 'Basique':
      return { bg: '#F3F4F6', text: '#6B7280', border: '#E5E7EB' };
    default:
      return null;
  }
};

const shareOptions = [
  { id: 'facebook', label: 'Facebook', color: '#1877F2', url: (url: string, text: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
  { id: 'twitter', label: 'Twitter', color: '#1DA1F2', url: (url: string, text: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}` },
  { id: 'linkedin', label: 'LinkedIn', color: '#0A66C2', url: (url: string, text: string) => `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}` },
  { id: 'whatsapp', label: 'WhatsApp', color: '#25D366', url: (url: string, text: string) => `https://wa.me/?text=${encodeURIComponent(text)}%20${encodeURIComponent(url)}` },
  { id: 'copy', label: 'Copier le lien', color: '#6B7280', url: null },
];

export default function EtablissementCard({
  id,
  nom,
  ville,
  region,
  departement,
  type_affichage,
  logo_url,
  taux_reussite,
  likes_count,
  vues_count,
  note_moyenne,
  badge_annuaire,
  cycles,
  options,
  description_courte,
  etoiles,
  code_etablissement,
  slug,
  onPress,
  onQuickView,
}: EtablissementCardProps) {
  let router;
  try {
    router = useRouter();
  } catch (error) {
    console.warn('🔍 useRouter not available, using fallback', error);
    router = null;
  }
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const hasLogo = !!logo_url;
  const initiales = getInitiales(nom);
  const badgeColor = getBadgeColor(badge_annuaire);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const locationParts = [];
  if (ville) locationParts.push(ville);
  if (departement) locationParts.push(departement);
  if (region) locationParts.push(region);
  const locationString = locationParts.join(' • ') || 'Localisation non spécifiée';

  const cleanCycles = cycles ? cycles.replace(/"/g, '').split(',').map(c => c.trim()).join(', ') : null;
  const cleanOptions = options ? options.replace(/"/g, '').split(',').map(o => o.trim().toUpperCase()).join(', ') : null;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const handleQuickViewPress = () => {
    if (onQuickView) onQuickView();
  };

  const handleInscrire = () => {
    if (!code_etablissement) {
      Alert.alert(
        'Code non disponible', 
        'Ce code d\'inscription n\'est pas encore configuré pour cet établissement. Veuillez contacter l\'établissement.'
      );
      return;
    }
    
    const targetUrl = `/auto-inscription?code=${code_etablissement}`;
    
    if (router && typeof router.push === 'function') {
      try {
        router.push(targetUrl);
        return;
      } catch (routerError) {
        console.error('🔍 Erreur router.push:', routerError);
      }
    }
    
    try {
      let baseUrl = '';
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        baseUrl = window.location.origin;
      } else {
        baseUrl = 'schoolnet://';
      }
      
      const fullUrl = `${baseUrl}${targetUrl}`;
      
      Linking.openURL(fullUrl).catch((err) => {
        console.error('🔍 Linking.openURL error:', err);
        Alert.alert(
          'Navigation impossible',
          'Impossible de naviguer vers la page d\'inscription. Veuillez réessayer.'
        );
      });
    } catch (linkingError) {
      console.error('🔍 Linking error:', linkingError);
      Alert.alert(
        'Navigation impossible',
        'Impossible de naviguer vers la page d\'inscription. Veuillez réessayer.'
      );
    }
  };

  const getShareUrl = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return `${window.location.origin}/etablissements/${slug}`;
    }
    return `https://schoolnet.bj/etablissements/${slug}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      if (Platform.OS === 'web' && navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else if (Platform.OS !== 'web') {
        console.log('Copy to clipboard:', text);
        return true;
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      return true;
    } catch (err) {
      console.error('Copy failed:', err);
      return false;
    }
  };

  const handleShare = async (platform: string) => {
    const url = getShareUrl();
    const text = `Je vous recommande ${nom} sur SchoolNet - La plateforme éducative de référence`;

    if (platform === 'copy') {
      const success = await copyToClipboard(url);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        Alert.alert('Lien copié', 'Le lien de cet établissement a été copié dans le presse-papier');
      } else {
        Alert.alert('Erreur', 'Impossible de copier le lien');
      }
      setShowShareMenu(false);
      return;
    }

    const option = shareOptions.find(opt => opt.id === platform);
    if (option && option.url) {
      const shareUrl = option.url(url, text);
      try {
        await Linking.openURL(shareUrl);
      } catch (error) {
        console.error('Error opening share URL:', error);
        Alert.alert('Erreur', 'Impossible d\'ouvrir l\'application de partage');
      }
    }
    
    setShowShareMenu(false);
  };

  const numColumns = width >= 1024 ? 3 : width >= 768 ? 2 : 1;
  const cardWidth = (width - 48 - (numColumns - 1) * 16) / numColumns;

  return (
    <>
      <TouchableOpacity
        style={[styles.card, { width: cardWidth }]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Animated.View style={[styles.cardInner, { transform: [{ scale: scaleAnim }] }]}>
          {badgeColor && (
            <View style={[styles.badgeCorner, { backgroundColor: badgeColor.bg, borderColor: badgeColor.border }]}>
              <Award size={12} color={badgeColor.text} />
              <Text style={[styles.badgeCornerText, { color: badgeColor.text }]}>
                {badge_annuaire}
              </Text>
            </View>
          )}

          <View style={styles.headerContainer}>
            <View style={styles.logoContainer}>
              {hasLogo ? (
                <Image source={{ uri: logo_url }} style={styles.logo} />
              ) : (
                <View style={styles.initialsContainer}>
                  <Text style={styles.initialsText}>{initiales}</Text>
                </View>
              )}
            </View>
            
            <View style={styles.ratingContainer}>
              <Text style={styles.etoilesText}>{etoiles || '☆☆☆☆☆'}</Text>
              {note_moyenne && note_moyenne > 0 && (
                <Text style={styles.noteText}>{note_moyenne.toFixed(1)}/5</Text>
              )}
            </View>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.name} numberOfLines={2}>
              {nom}
            </Text>

            {type_affichage && (
              <View style={styles.typeBadge}>
                <Building2 size={12} color={theme.colors.primary.DEFAULT} />
                <Text style={styles.typeText}>{type_affichage}</Text>
              </View>
            )}

            {code_etablissement && (
              <View style={styles.codeContainer}>
                <Key size={12} color={theme.colors.neutral[500]} />
                <Text style={styles.codeText}>Code: {code_etablissement}</Text>
              </View>
            )}

            <View style={styles.location}>
              <MapPin size={12} color={theme.colors.neutral[400]} />
              <Text style={styles.locationText} numberOfLines={1}>
                {locationString}
              </Text>
            </View>

            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <TrendingUp size={14} color={taux_reussite ? '#10B981' : theme.colors.neutral[400]} />
                <Text style={styles.metricValue}>
                  {taux_reussite ? `${taux_reussite}%` : '---'}
                </Text>
                <Text style={styles.metricLabel}>Réussite</Text>
              </View>

              <View style={styles.metricItem}>
                <Heart size={14} color={likes_count && likes_count > 0 ? '#EF4444' : theme.colors.neutral[400]} />
                <Text style={styles.metricValue}>{formatNumber(likes_count)}</Text>
                <Text style={styles.metricLabel}>J'aime</Text>
              </View>

              <View style={styles.metricItem}>
                <Eye size={14} color={theme.colors.neutral[400]} />
                <Text style={styles.metricValue}>{formatNumber(vues_count)}</Text>
                <Text style={styles.metricLabel}>Vues</Text>
              </View>

              <View style={styles.metricItem}>
                <GraduationCap size={14} color={cleanCycles ? theme.colors.primary.DEFAULT : theme.colors.neutral[400]} />
                <Text style={styles.metricValue} numberOfLines={1}>
                  {cleanCycles ? cleanCycles.split(',')[0] : '---'}
                </Text>
                <Text style={styles.metricLabel}>Cycle</Text>
              </View>
            </View>

            {cleanOptions && (
              <View style={styles.optionsRow}>
                <Wrench size={12} color={theme.colors.neutral[400]} />
                <Text style={styles.optionsText} numberOfLines={1}>
                  {cleanOptions}
                </Text>
              </View>
            )}

            {description_courte && (
              <Text style={styles.description} numberOfLines={2}>
                {description_courte}
              </Text>
            )}
          </View>

          <View style={styles.actionsContainer}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.shareButton]} 
              onPress={() => setShowShareMenu(true)}
            >
              <Share2 size={14} color={theme.colors.neutral[600]} />
              <Text style={styles.actionButtonText}>
                {copied ? 'Copié !' : 'Partager'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.inscrireButton]} 
              onPress={handleInscrire}
            >
              <LogIn size={14} color="#FFFFFF" />
              <Text style={[styles.actionButtonText, styles.inscrireButtonText]}>S'inscrire</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.previewButton]} 
              onPress={handleQuickViewPress}
            >
              <ChevronRight size={14} color={theme.colors.primary.DEFAULT} />
              <Text style={[styles.actionButtonText, styles.previewButtonText]}>Aperçu</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </TouchableOpacity>

      {showShareMenu && (
        <TouchableOpacity 
          style={styles.shareOverlay} 
          activeOpacity={1} 
          onPress={() => setShowShareMenu(false)}
        >
          <View style={styles.shareMenu}>
            <View style={styles.shareHeader}>
              <Text style={styles.shareTitle}>Partager {nom}</Text>
              <TouchableOpacity onPress={() => setShowShareMenu(false)}>
                <X size={20} color={theme.colors.neutral[500]} />
              </TouchableOpacity>
            </View>
            <View style={styles.shareOptions}>
              {shareOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={styles.shareOption}
                  onPress={() => handleShare(option.id)}
                >
                  {option.id === 'facebook' && (
                    <View style={[styles.shareIcon, { backgroundColor: option.color + '20' }]}>
                      <Text style={{ fontSize: 20, color: option.color }}>📘</Text>
                    </View>
                  )}
                  {option.id === 'twitter' && (
                    <View style={[styles.shareIcon, { backgroundColor: option.color + '20' }]}>
                      <Text style={{ fontSize: 18, color: option.color }}>🐦</Text>
                    </View>
                  )}
                  {option.id === 'linkedin' && (
                    <View style={[styles.shareIcon, { backgroundColor: option.color + '20' }]}>
                      <Text style={{ fontSize: 18, color: option.color }}>🔗</Text>
                    </View>
                  )}
                  {option.id === 'whatsapp' && (
                    <View style={[styles.shareIcon, { backgroundColor: option.color + '20' }]}>
                      <Text style={{ fontSize: 20, color: option.color }}>💬</Text>
                    </View>
                  )}
                  {option.id === 'copy' && (
                    <View style={[styles.shareIcon, { backgroundColor: option.color + '20' }]}>
                      <Text style={{ fontSize: 16, color: option.color }}>📋</Text>
                    </View>
                  )}
                  <Text style={styles.shareOptionLabel}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: theme.spacing[4],
  },
  cardInner: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    ...theme.shadows.md,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    position: 'relative',
    minHeight: 460,
  },
  badgeCorner: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    zIndex: 10,
  },
  badgeCornerText: {
    fontSize: 10,
    fontWeight: '600',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[3],
  },
  logoContainer: {
    flexShrink: 0,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    resizeMode: 'cover',
    borderWidth: 2,
    borderColor: theme.colors.neutral[200],
  },
  initialsContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.sm,
  },
  initialsText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ratingContainer: {
    alignItems: 'flex-end',
  },
  etoilesText: {
    fontSize: 12,
    color: '#FBBF24',
    letterSpacing: 1,
  },
  noteText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.neutral[500],
    marginTop: 2,
  },
  infoContainer: {
    width: '100%',
    gap: theme.spacing[1.5],
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.neutral[800],
    lineHeight: 22,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typeText: {
    fontSize: 11,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  codeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
  },
  location: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 11,
    color: theme.colors.neutral[500],
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: theme.spacing[2],
    marginBottom: theme.spacing[1],
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[100],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[100],
  },
  metricItem: {
    alignItems: 'center',
    width: '23%',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.neutral[700],
    marginTop: 4,
  },
  metricLabel: {
    fontSize: 9,
    color: theme.colors.neutral[400],
    marginTop: 2,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionsText: {
    fontSize: 10,
    color: theme.colors.neutral[500],
    flex: 1,
  },
  description: {
    fontSize: 11,
    color: theme.colors.neutral[500],
    lineHeight: 15,
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: theme.spacing[1.5],
    marginTop: theme.spacing[3],
    paddingTop: theme.spacing[3],
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[100],
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: theme.borderRadius.DEFAULT,
  },
  shareButton: {
    backgroundColor: theme.colors.neutral[100],
  },
  inscrireButton: {
    backgroundColor: '#10B981',
  },
  inscrireButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  previewButton: {
    backgroundColor: '#EFF6FF',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.neutral[600],
  },
  previewButtonText: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '600',
  },
  shareOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  shareMenu: {
    width: '80%',
    maxWidth: 320,
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing[4],
    ...theme.shadows.lg,
  },
  shareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[4],
  },
  shareTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.neutral[800],
  },
  shareOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: theme.spacing[3],
  },
  shareOption: {
    alignItems: 'center',
    width: '30%',
    gap: theme.spacing[2],
  },
  shareIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareOptionLabel: {
    fontSize: 11,
    color: theme.colors.neutral[600],
  },
});