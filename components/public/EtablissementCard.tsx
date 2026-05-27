import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  Dimensions, 
  Share,
  Platform
} from 'react-native';
import { 
  MapPin, 
  TrendingUp, 
  Heart, 
  Eye, 
  GraduationCap, 
  Award, 
  ChevronRight, 
  Copy,
  Check,
  Sparkles
} from 'lucide-react-native';

// --- TS TYPES INTERFACES ---
export interface EtablissementCardProps {
  id: string;
  name: string;
  logoUrl?: string;
  coverUrl?: string;
  slug?: string;
  address?: string;
  quarter?: string;
  city?: string;
  department?: string;
  successRate?: number;
  likes?: number;
  views?: number;
  cycles?: string[];
  directAccessCode?: string;
  specialities?: string[];
  description?: string;
  onPressVitrine?: (id: string, slug?: string) => void;
  onPressRegister?: (id: string) => void;
  onLikePress?: (id: string) => void;
}

const { width } = Dimensions.get('window');

export default function EtablissementCard({
  id,
  name,
  logoUrl,
  coverUrl,
  slug,
  address,
  quarter,
  city,
  department,
  successRate = 0,
  likes = 0,
  views = 0,
  cycles = [],
  directAccessCode,
  specialities = [],
  description,
  onPressVitrine,
  onPressRegister,
  onLikePress
}: EtablissementCardProps) {
  
  const [hasLiked, setHasLiked] = useState(false);
  const [localLikes, setLocalLikes] = useState(likes);
  const [copied, setCopied] = useState(false);

  // Gérer le clic sur le bouton J'aime
  const handleLike = () => {
    if (onLikePress) {
      onLikePress(id);
    } else {
      if (hasLiked) {
        setLocalLikes(prev => prev - 1);
        setHasLiked(false);
      } else {
        setLocalLikes(prev => prev + 1);
        setHasLiked(true);
      }
    }
  };

  // Gérer le partage
  const handleShare = async () => {
    try {
      await Share.share({
        message: `Découvrez l'établissement ${name} sur SchoolNet !`,
        title: name,
      });
    } catch (error) {
      console.log('Erreur de partage :', error);
    }
  };

  // Formatter les nombres compacts (ex: 1200 -> 1.2k)
  const formatCompact = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
  };

  return (
    <View style={styles.cardContainer} id={`school-card-${id}`}>
      
      {/* 1. Header & Cover Image avec Dégradé */}
      <View style={styles.coverWrapper}>
        {coverUrl ? (
          <Image 
            source={{ uri: coverUrl }} 
            style={styles.coverImage}
            referrerPolicy="no-referrer"
          />
        ) : (
          <View style={styles.coverPlaceholder} />
        )}
        {/* Filtre d'ombrage élégant */}
        <View style={styles.coverOverlay} />

        {/* Badge Prestige / Homologation */}
        <View style={styles.premiumBadge}>
          <Award size={10} color="#D97706" style={styles.premiumIcon} />
          <Text style={styles.premiumBadgeText}>PRESTIGE ÉLITE</Text>
        </View>

        {/* Tag d'homologation secondaire discret */}
        <View style={styles.systemTag}>
          <Sparkles size={8} color="#FBBF24" />
          <Text style={styles.systemTagText}>Établissement Agréé</Text>
        </View>
      </View>

      {/* 2. Contenu Principal de la Carte */}
      <View style={styles.cardBody}>
        
        {/* Zone Logo chevauchant & Évaluation */}
        <View style={styles.avatarRow}>
          <View style={styles.logoFrame}>
            {logoUrl ? (
              <Image 
                source={{ uri: logoUrl }} 
                style={styles.logoImage}
                referrerPolicy="no-referrer"
              />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoPlaceholderText}>
                  {name ? name.substring(0, 2).toUpperCase() : 'SN'}
                </Text>
              </View>
            )}
          </View>
          
          {/* Étoiles d'évaluation intégrées de façon moderne */}
          <View style={styles.ratingContainer}>
            <View style={styles.starsRow}>
              <Sparkles size={10} color="#F59E0B" style={styles.starFill} />
              <Sparkles size={10} color="#F59E0B" style={styles.starFill} />
              <Sparkles size={10} color="#F59E0B" style={styles.starFill} />
              <Sparkles size={10} color="#F59E0B" style={styles.starFill} />
              <Sparkles size={10} color="#F59E0B" style={styles.starFill} />
            </View>
            <Text style={styles.ratingText}>4.8 (120 avis)</Text>
          </View>
        </View>

        {/* Nom de l'établissement */}
        <Text style={styles.schoolName} numberOfLines={2}>
          {name || "Nom de l'établissement"}
        </Text>

        {/* Tags d'Infrastructures & Cycles */}
        <View style={styles.tagsContainer}>
          {(cycles || []).map((cycle, index) => (
            <View key={index} style={styles.badgeCycle}>
              <GraduationCap size={10} color="#2563EB" />
              <Text style={styles.badgeCycleText}>{cycle}</Text>
            </View>
          ))}
          
          {/* Badge Code d'Accès Direct */}
          {directAccessCode && (
            <View style={styles.badgeAccessCode}>
              <Text style={styles.badgeAccessCodeText}>Code : {directAccessCode}</Text>
            </View>
          )}
        </View>

        {/* Adresse et géolocalisation */}
        <View style={styles.locationContainer}>
          <MapPin size={11} color="#2563EB" style={styles.pinIcon} />
          <Text style={styles.locationText} numberOfLines={1}>
            {quarter ? `${quarter}, ` : ''}{city || "Cotonou"}{department ? ` (${department})` : ''}
          </Text>
        </View>

        {/* 3. GRILLE DE MÉTRIQUES REORGANISÉE (Aucune donnée perdue) */}
        <View style={styles.metricsWrapper}>
          
          {/* Taux de Réussite officiel */}
          <View style={styles.metricItem}>
            <TrendingUp size={12} color="#10B981" />
            <Text style={styles.metricValue}>{successRate}%</Text>
            <Text style={styles.metricLabel}>RÉUSSITE</Text>
          </View>

          {/* Nombre de Likes interactif */}
          <TouchableOpacity 
            onPress={handleLike} 
            activeOpacity={0.7} 
            style={[styles.metricItem, hasLiked && styles.metricItemActive]}
          >
            <Heart size={12} color={hasLiked ? "#E11D48" : "#94A3B8"} fill={hasLiked ? "#E11D48" : "transparent"} />
            <Text style={[styles.metricValue, hasLiked && styles.metricValueActive]}>
              {formatCompact(localLikes)}
            </Text>
            <Text style={styles.metricLabel}>J'AIME</Text>
          </TouchableOpacity>

          {/* Compteur de Vues */}
          <View style={styles.metricItem}>
            <Eye size={12} color="#0EA5E9" />
            <Text style={styles.metricValue}>{formatCompact(views)}</Text>
            <Text style={styles.metricLabel}>VUES</Text>
          </View>

          {/* Spécialité générale / Cycle */}
          <View style={styles.metricItem}>
            <GraduationCap size={12} color="#4F46E5" />
            <Text style={styles.metricValue} numberOfLines={1}>Général</Text>
            <Text style={styles.metricLabel}>STATUT</Text>
          </View>

        </View>

        {/* Ligne des séries & spécialités si existantes */}
        {specialities.length > 0 && (
          <View style={styles.specialitiesRow}>
            <Text style={styles.specialityBadgeText} numberOfLines={1}>
              🔬 {specialities.join('  •  ').toUpperCase()}
            </Text>
          </View>
        )}

        {/* Petite description stylisée avec barrière visuelle */}
        {description && (
          <Text style={styles.descriptionText} numberOfLines={2}>
            {description}
          </Text>
        )}

      </View>

      {/* 4. ZONE D'ACTIONS ACTIONNABLES ET STRATÉGIQUES */}
      <View style={styles.footerActions}>
        
        {/* Bouton Partager */}
        <TouchableOpacity 
          style={styles.actionBtnSecondary} 
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Text style={styles.actionBtnSecondaryText}>Partager</Text>
        </TouchableOpacity>

        {/* Bouton S'inscrire */}
        {onPressRegister && (
          <TouchableOpacity 
            style={styles.actionBtnSuccess} 
            onPress={() => onPressRegister(id)}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnSuccessText}>S'inscrire</Text>
          </TouchableOpacity>
        )}

        {/* Bouton Vitrine */}
        <TouchableOpacity 
          style={styles.actionBtnPrimary} 
          onPress={() => onPressVitrine && onPressVitrine(id, slug)}
          activeOpacity={0.7}
        >
          <Text style={styles.actionBtnPrimaryText}>Vitrine</Text>
          <ChevronRight size={12} color="#FFFFFF" style={styles.arrowIcon} />
        </TouchableOpacity>

      </View>

    </View>
  );
}

// --- DESIGN DE LA CARTE MODERNISÉE (Tailwind-like shadow, smooth borders, cool contrast) ---
const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#1E3A8A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  coverWrapper: {
    height: 90,
    width: '100%',
    position: 'relative',
    backgroundColor: '#1E3A8A',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E3A8A',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  premiumBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  premiumIcon: {
    marginRight: 3,
  },
  premiumBadgeText: {
    fontSize: 7.5,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  systemTag: {
    position: 'absolute',
    bottom: 6,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  systemTagText: {
    fontSize: 7,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardBody: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: -22,
    marginBottom: 6,
  },
  logoFrame: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholderText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  ratingContainer: {
    alignItems: 'flex-end',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 1,
  },
  starFill: {
    marginRight: 1,
  },
  ratingText: {
    fontSize: 8,
    color: '#64748B',
    fontWeight: 'bold',
    marginTop: 2,
  },
  schoolName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 17,
    marginBottom: 6,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginBottom: 8,
  },
  badgeCycle: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  badgeCycleText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#2563EB',
  },
  badgeAccessCode: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  badgeAccessCodeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#059669',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  pinIcon: {
    marginRight: 4,
  },
  locationText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '500',
  },
  metricsWrapper: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingVertical: 4,
    marginHorizontal: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  metricItemActive: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  metricValue: {
    fontSize: 10,
    fontWeight: '905',
    color: '#0F172A',
    marginTop: 2,
  },
  metricValueActive: {
    color: '#E11D48',
  },
  metricLabel: {
    fontSize: 6.5,
    fontWeight: '750',
    color: '#64748B',
    marginTop: 1,
  },
  specialitiesRow: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  specialityBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#1E3A8A',
    letterSpacing: 0.2,
  },
  descriptionText: {
    fontSize: 9.5,
    color: '#475569',
    lineHeight: 13,
    fontStyle: 'italic',
    borderLeftWidth: 2,
    borderLeftColor: '#CBD5E1',
    paddingLeft: 6,
    marginBottom: 2,
  },
  footerActions: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    padding: 8,
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    gap: 6,
  },
  actionBtnSecondary: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnSecondaryText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
  },
  actionBtnSuccess: {
    flex: 1.2,
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnSuccessText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionBtnPrimary: {
    flex: 1.2,
    backgroundColor: '#1E3A8A',
    borderRadius: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnPrimaryText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 2,
  },
  arrowIcon: {
    marginLeft: 1,
  }
});