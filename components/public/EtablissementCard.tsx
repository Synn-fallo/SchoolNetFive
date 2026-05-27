/**
 * @license
 * SchoolNet Identity Guidelines & Design System v2.0
 * Composant de carte d'établissement harmonisé : EtablissementCard.tsx
 */
import React, { useRef, useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  Dimensions, 
  Animated, 
  Alert, 
  Linking, 
  Platform 
} from 'react-native';
import { 
  MapPin, 
  ChevronRight, 
  Share2, 
  X, 
  TrendingUp, 
  GraduationCap, 
  Wrench, 
  Eye, 
  Heart, 
  Building2, 
  Award, 
  Key, 
  LogIn 
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

// PALETTE DE COULEURS DE MARQUE SCHOOLNET (CHARTE GRAPHIQUE)
const BRAND = {
  primary: '#1E3A8A',       // Bleu profond Institutionnel
  primaryLight: '#2563EB',  // Bleu électrique pro (Interactions)
  secondary: '#0EA5E9',     // Bleu ciel d'accents
  success: '#10B981',       // Vert émeraude de réussite / inscription
  alert: '#FBBF24',         // Or des étoiles & badges Prestige
  successBg: '#ECFDF5',     // Fond de badge vert clair
  neutralBg: '#F9FAFB',     // Gris perle ultra-pro
  neutralBorder: '#E5E7EB', // Bordure neutre légère
  textMain: '#1F2937',      // Anthracite principal pour la lisibilité
  textMuted: '#4B5563',     // Gris secondaire lisible
};

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

const getBadgeStyles = (badge?: string | null) => {
  switch (badge) {
    case 'Prestige':
      return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A' }; // Orange thématique
    case 'Premium':
      return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' }; // Bleu électrique pro
    default:
      return { bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB' }; // Standard basique
  }
};

export default function EtablissementCard({
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
  
  let router: any;
  try {
    router = useRouter();
  } catch (error) {
    router = null;
  }
  
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasLogo = !!logo_url;
  const initiales = getInitiales(nom);
  const badgeColors = getBadgeStyles(badge_annuaire);

  const locationParts = [ville, departement, region].filter(Boolean);
  const locationString = locationParts.join(' • ') || 'Secteur Non Spécifié';

  const cleanCycles = cycles ? cycles.replace(/"/g, '').split(',').map(c => c.trim()).join(', ') : null;
  const cleanOptions = options ? options.replace(/"/g, '').split(',').map(o => o.trim().toUpperCase()).join(', ') : null;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97, // Légère sensation physique interactive d'enfoncement (Scale)
      useNativeDriver: true,
      tension: 110,
      friction: 8
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 110,
      friction: 8
    }).start();
  };

  const handleInscrire = () => {
    if (!code_etablissement) {
      Alert.alert(
        'Code indisponible', 
        'Ce code d\'inscription n\'est pas encore configuré. Veuillez contacter l\'administration de l\'établissement.'
      );
      return;
    }
    const targetUrl = `/auto-inscription?code=${code_etablissement}`;
    if (router && typeof router.push === 'function') {
      router.push(targetUrl);
    } else {
      Linking.openURL(`schoolnet://${targetUrl}`).catch(() => {
        Alert.alert('Information', `Page d'inscription directe avec le code : ${code_etablissement}`);
      });
    }
  };

  return (
    <Animated.View 
      style={[
        styles.cardContainer, 
        { transform: [{ scale: scaleAnim }] }
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.95}
        style={styles.touchableArea}
      >
        <View style={styles.innerLayout}>
          
          {/* Badge de certification dans le coin supérieur droit */}
          {badge_annuaire && (
            <View 
              style={[
                styles.badgeCorner, 
                { 
                  backgroundColor: badgeColors.bg, 
                  borderColor: badgeColors.border 
                }
              ]}
            >
              <Award size={10} color={badgeColors.text} style={styles.awardIcon} />
              <Text style={[styles.badgeCornerText, { color: badgeColors.text }]}>
                {badge_annuaire}
              </Text>
            </View>
          )}

          {/* En-Tête (Logo / Initiales & Notation Étoiles) */}
          <View style={styles.headerContainer}>
            <View style={styles.logoWrapper}>
              {hasLogo ? (
                <Image source={{ uri: logo_url }} style={styles.schoolLogo} />
              ) : (
                <View style={styles.initialsBg}>
                  <Text style={styles.initialsText}>{initiales}</Text>
                </View>
              )}
            </View>
            
            <View style={styles.ratingBox}>
              <Text style={styles.stars}>{etoiles || '★★★★☆'}</Text>
              {note_moyenne && note_moyenne > 0 && (
                <Text style={styles.noteRating}>{note_moyenne.toFixed(1)}/5</Text>
              )}
            </View>
          </View>

          {/* Corps de l'information de l'établissement */}
          <View style={styles.contentBody}>
            <Text style={styles.schoolTitle} numberOfLines={2}>
              {nom}
            </Text>

            {/* Type badge - Bleu institutionnel */}
            {type_affichage && (
              <View style={styles.typeTag}>
                <Building2 size={11} color={BRAND.primary} />
                <Text style={styles.typeText}>{type_affichage}</Text>
              </View>
            )}

            {/* Code d'inscription direct */}
            {code_etablissement && (
              <View style={styles.codeTag}>
                <Key size={10} color={BRAND.success} />
                <Text style={styles.codeText}>Accès Direct : {code_etablissement}</Text>
              </View>
            )}

            {/* Localisation géographique */}
            <View style={styles.locationContainer}>
              <MapPin size={11} color={BRAND.secondary} />
              <Text style={styles.locationText} numberOfLines={1}>
                {locationString}
              </Text>
            </View>

            {/* Grille des 4 métriques optimisées alignées sur 12px arrondis */}
            <View style={styles.metricsWrapper}>
              
              <View style={styles.metricCard}>
                <TrendingUp size={13} color={taux_reussite ? BRAND.success : BRAND.textMuted} />
                <Text style={[styles.mValue, taux_reussite ? { color: BRAND.success } : null]}>
                  {taux_reussite ? `${taux_reussite}%` : '---'}
                </Text>
                <Text style={styles.mLabel}>Réussite</Text>
              </View>

              <View style={styles.metricCard}>
                <Heart size={13} color={likes_count ? '#EF4444' : BRAND.textMuted} />
                <Text style={styles.mValue}>{formatNumber(likes_count)}</Text>
                <Text style={styles.mLabel}>J'aime</Text>
              </View>

              <View style={styles.metricCard}>
                <Eye size={13} color={BRAND.secondary} />
                <Text style={styles.mValue}>{formatNumber(vues_count)}</Text>
                <Text style={styles.mLabel}>Vues</Text>
              </View>

              <View style={styles.metricCard}>
                <GraduationCap size={13} color={BRAND.primaryLight} />
                <Text style={styles.mValue} numberOfLines={1}>
                  {cleanCycles ? cleanCycles.split(',')[0] : 'Général'}
                </Text>
                <Text style={styles.mLabel}>Cycle</Text>
              </View>

            </View>

            {/* Encart thématique des options ou spécialités */}
            {cleanOptions && (
              <View style={styles.optionsEncart}>
                <Wrench size={10} color={BRAND.textMuted} />
                <Text style={styles.optionsText} numberOfLines={1}>
                  {cleanOptions}
                </Text>
              </View>
            )}

            {description_courte && (
              <Text style={styles.descriptionText} numberOfLines={2}>
                {description_courte}
              </Text>
            )}
          </View>

          {/* Pied de Carte et boutons d'actions */}
          <View style={styles.footerActions}>
            <TouchableOpacity 
              style={[styles.btnAction, styles.btnOutline]} 
              onPress={() => setShowShareMenu(true)}
            >
              <Share2 size={12} color={BRAND.textMuted} />
              <Text style={styles.btnOutlineText}>Partager</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btnAction, styles.btnSuccess]} 
              onPress={handleInscrire}
            >
              <LogIn size={12} color="#FFFFFF" />
              <Text style={styles.btnSuccessText}>S'inscrire</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.btnAction, styles.btnPrimary]} 
              onPress={onQuickView}
            >
              <ChevronRight size={12} color={BRAND.primaryLight} />
              <Text style={styles.btnPrimaryText}>Vitrine</Text>
            </TouchableOpacity>
          </View>

        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12, // Standard strict 12px approuvé par la charte de SchoolNet
    borderWidth: 1,
    borderColor: BRAND.neutralBorder,
    shadowColor: '#1F2937',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginVertical: 8,
    overflow: 'hidden',
  },
  touchableArea: {
    width: '100%',
  },
  innerLayout: {
    padding: 16,
    position: 'relative',
  },
  badgeCorner: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
    zIndex: 10,
  },
  awardIcon: {
    marginRight: 3,
  },
  badgeCornerText: {
    fontSize: 9,
    fontWeight: '700',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  logoWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BRAND.neutralBorder,
    overflow: 'hidden',
  },
  schoolLogo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  initialsBg: {
    width: '100%',
    height: '100%',
    backgroundColor: BRAND.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  ratingBox: {
    alignItems: 'flex-end',
  },
  stars: {
    fontSize: 11,
    color: BRAND.alert,
    letterSpacing: 0.5,
  },
  noteRating: {
    fontSize: 10,
    fontWeight: '600',
    color: BRAND.textMuted,
    marginTop: 1,
  },
  contentBody: {
    gap: 6,
  },
  schoolTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND.textMain,
    lineHeight: 18,
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '500',
    color: BRAND.primaryLight,
  },
  codeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codeText: {
    fontSize: 10,
    fontWeight: '600',
    color: BRAND.success,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  locationText: {
    fontSize: 10.5,
    color: BRAND.textMuted,
  },
  metricsWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  metricCard: {
    alignItems: 'center',
    flex: 1,
  },
  mValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: BRAND.textMain,
    marginTop: 2,
  },
  mLabel: {
    fontSize: 8.5,
    color: BRAND.textMuted,
    marginTop: 1.5,
  },
  optionsEncart: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: BRAND.neutralBorder,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FCFDFF',
    marginTop: 4,
    gap: 6,
  },
  optionsText: {
    fontSize: 9,
    color: BRAND.textMuted,
    flex: 1,
  },
  descriptionText: {
    fontSize: 10.5,
    lineHeight: 14,
    color: BRAND.textMuted,
    marginTop: 2,
  },
  footerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 12,
    paddingTop: 12,
  },
  btnAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  btnOutline: {
    backgroundColor: '#F3F4F6',
  },
  btnOutlineText: {
    fontSize: 10,
    fontWeight: '600',
    color: BRAND.textMuted,
  },
  btnSuccess: {
    backgroundColor: BRAND.success,
  },
  btnSuccessText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  btnPrimary: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  btnPrimaryText: {
    fontSize: 10,
    fontWeight: '600',
    color: BRAND.primaryLight,
  },
});