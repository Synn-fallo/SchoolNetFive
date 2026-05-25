import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Image, Linking, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { X, MapPin, Phone, Mail, Globe, BookOpen, ChevronRight, Share2, Facebook, Twitter, Linkedin, Link as LinkIcon, MessageCircle } from 'lucide-react-native';
import { useState } from 'react';
import theme from '@/constants/theme';

interface EtablissementModalProps {
  visible: boolean;
  onClose: () => void;
  etablissement: {
    id: string;
    nom: string;
    slug: string;
    ville?: string;
    adresse?: string;
    telephone?: string;
    email?: string;
    logo_url?: string;
    type_etablissement?: 'public' | 'prive';
    description_courte?: string;
    classes?: Array<{ id: string; nom: string; niveau: string }>;
    site_web?: string;
    sous_domaine?: string;
  } | null;
}

const shareOptions = [
  { id: 'facebook', label: 'Facebook', icon: Facebook, color: '#1877F2' },
  { id: 'twitter', label: 'Twitter', icon: Twitter, color: '#1DA1F2' },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: '#0A66C2' },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: '#25D366' },
  { id: 'copy', label: 'Copier le lien', icon: LinkIcon, color: '#6B7280' },
];

export default function EtablissementModal({ visible, onClose, etablissement }: EtablissementModalProps) {
  const router = useRouter();
  const [showShareMenu, setShowShareMenu] = useState(false);

  if (!etablissement) return null;

  const handleViewVitrine = () => {
    onClose();
    router.push(`/(public)/etablissements/${etablissement.slug}`);
  };

  const getShareUrl = () => {
    return `${window.location.origin}/etablissements/${etablissement.slug}`;
  };

  const handleShare = async (platform: string) => {
    const url = getShareUrl();
    const title = `Découvrez ${etablissement.nom}`;
    const text = `Je vous recommande ${etablissement.nom} sur SchoolNet - La plateforme éducative de référence`;

    if (platform === 'copy') {
      await navigator.clipboard.writeText(url);
      Alert.alert('Lien copié', 'Le lien de cet établissement a été copié dans le presse-papier');
      setShowShareMenu(false);
      return;
    }

    if (Platform.OS === 'web' && navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url,
        });
      } catch (error) {
        console.log('Share cancelled', error);
      }
    } else {
      let shareUrl = '';
      const encodedUrl = encodeURIComponent(url);
      const encodedText = encodeURIComponent(text);
      
      switch (platform) {
        case 'facebook':
          shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
          break;
        case 'twitter':
          shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
          break;
        case 'linkedin':
          shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodedUrl}&title=${encodeURIComponent(title)}&summary=${encodedText}`;
          break;
        case 'whatsapp':
          shareUrl = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
          break;
        default:
          return;
      }
      
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }
    
    setShowShareMenu(false);
  };

  const handlePhonePress = () => {
    if (etablissement.telephone) {
      Linking.openURL(`tel:${etablissement.telephone}`);
    }
  };

  const handleEmailPress = () => {
    if (etablissement.email) {
      Linking.openURL(`mailto:${etablissement.email}`);
    }
  };

  const getTypeLabel = () => {
    return etablissement.type_etablissement === 'public' ? 'Public' : 'Privé';
  };

  const getTypeColor = () => {
    return etablissement.type_etablissement === 'public' 
      ? { backgroundColor: theme.colors.info.light, color: theme.colors.info.dark }
      : { backgroundColor: theme.colors.warning.light, color: theme.colors.warning.dark };
  };

  const typeStyle = getTypeColor();

  return (
    <>
      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                {etablissement.logo_url ? (
                  <Image source={{ uri: etablissement.logo_url }} style={styles.modalLogo} />
                ) : (
                  <View style={styles.modalLogoPlaceholder}>
                    <BookOpen size={24} color={theme.colors.primary.DEFAULT} />
                  </View>
                )}
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {etablissement.nom}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={theme.colors.neutral[500]} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.badgeRow}>
                <View style={[styles.typeBadge, { backgroundColor: typeStyle.backgroundColor }]}>
                  <Text style={[styles.typeBadgeText, { color: typeStyle.color }]}>
                    {getTypeLabel()}
                  </Text>
                </View>
                {etablissement.ville && (
                  <View style={styles.locationBadge}>
                    <MapPin size={12} color={theme.colors.neutral[500]} />
                    <Text style={styles.locationBadgeText}>{etablissement.ville}</Text>
                  </View>
                )}
              </View>

              {etablissement.description_courte && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>À propos</Text>
                  <Text style={styles.description}>{etablissement.description_courte}</Text>
                </View>
              )}

              {(etablissement.adresse || etablissement.telephone || etablissement.email) && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Contact</Text>
                  {etablissement.adresse && (
                    <View style={styles.contactRow}>
                      <MapPin size={16} color={theme.colors.neutral[400]} />
                      <Text style={styles.contactText}>{etablissement.adresse}</Text>
                    </View>
                  )}
                  {etablissement.telephone && (
                    <TouchableOpacity style={styles.contactRow} onPress={handlePhonePress}>
                      <Phone size={16} color={theme.colors.neutral[400]} />
                      <Text style={[styles.contactText, styles.linkText]}>{etablissement.telephone}</Text>
                    </TouchableOpacity>
                  )}
                  {etablissement.email && (
                    <TouchableOpacity style={styles.contactRow} onPress={handleEmailPress}>
                      <Mail size={16} color={theme.colors.neutral[400]} />
                      <Text style={[styles.contactText, styles.linkText]}>{etablissement.email}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {etablissement.classes && etablissement.classes.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Classes</Text>
                  <View style={styles.classesList}>
                    {etablissement.classes.slice(0, 3).map((classe) => (
                      <View key={classe.id} style={styles.classItem}>
                        <BookOpen size={12} color={theme.colors.neutral[400]} />
                        <Text style={styles.classText}>{classe.nom} ({classe.niveau})</Text>
                      </View>
                    ))}
                    {etablissement.classes.length > 3 && (
                      <Text style={styles.moreText}>
                        +{etablissement.classes.length - 3} autres classes
                      </Text>
                    )}
                  </View>
                </View>
              )}

              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity style={styles.shareButton} onPress={() => setShowShareMenu(true)}>
                  <Share2 size={18} color={theme.colors.neutral[600]} />
                  <Text style={styles.shareButtonText}>Partager</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.vitrineButton} onPress={handleViewVitrine}>
                  <Text style={styles.vitrineButtonText}>Voir la page complète</Text>
                  <ChevronRight size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de partage */}
      {showShareMenu && (
        <TouchableOpacity 
          style={styles.shareOverlay} 
          activeOpacity={1} 
          onPress={() => setShowShareMenu(false)}
        >
          <View style={styles.shareMenu}>
            <View style={styles.shareHeader}>
              <Text style={styles.shareTitle}>Partager {etablissement.nom}</Text>
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
                  <View style={[styles.shareIcon, { backgroundColor: option.color + '20' }]}>
                    <option.icon size={22} color={option.color} />
                  </View>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background.primary,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '85%',
    minHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    flex: 1,
  },
  modalLogo: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
  },
  modalLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: theme.typography.h4.fontSize,
    fontWeight: theme.typography.h4.fontWeight as any,
    color: theme.colors.neutral[800],
    flex: 1,
  },
  closeButton: {
    padding: theme.spacing[1],
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
  },
  typeBadge: {
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.neutral[100],
    paddingHorizontal: theme.spacing[2],
    paddingVertical: theme.spacing[1],
    borderRadius: theme.borderRadius.sm,
  },
  locationBadgeText: {
    fontSize: 12,
    color: theme.colors.neutral[600],
  },
  section: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[100],
  },
  sectionTitle: {
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: '600',
    color: theme.colors.neutral[500],
    marginBottom: theme.spacing[2],
  },
  description: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.neutral[600],
    lineHeight: 20,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[2],
  },
  contactText: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.neutral[600],
    flex: 1,
  },
  linkText: {
    color: theme.colors.primary.DEFAULT,
  },
  classesList: {
    gap: theme.spacing[2],
  },
  classItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  classText: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.neutral[600],
  },
  moreText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.neutral[400],
    marginTop: theme.spacing[1],
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    padding: theme.spacing[4],
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[3],
    backgroundColor: theme.colors.neutral[100],
    borderRadius: theme.borderRadius.DEFAULT,
  },
  shareButtonText: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.neutral[600],
  },
  vitrineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[2],
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.DEFAULT,
  },
  vitrineButtonText: {
    fontSize: theme.typography.button.fontSize,
    fontWeight: theme.typography.button.fontWeight as any,
    color: '#FFFFFF',
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
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareOptionLabel: {
    fontSize: 12,
    color: theme.colors.neutral[600],
  },
});