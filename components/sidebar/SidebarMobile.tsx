import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Animated, Dimensions } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { X, LogOut, User, AlertCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import SidebarSection from './SidebarSection';
import SidebarItem from './SidebarItem';
import { MenuSection } from '@/types/sidebar.types';
import theme from '@/constants/theme';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.8;

interface SidebarMobileProps {
  visible: boolean;
  onClose: () => void;
  sections: MenuSection[];
  activePath: string;
  onNavigate: (href: string) => void;
  userName?: string;
  userRole?: string;
  etablissementNom?: string;
}

export default function SidebarMobile({
  visible,
  onClose,
  sections,
  activePath,
  onNavigate,
  userName,
  userRole,
  etablissementNom,
}: SidebarMobileProps) {
  const router = useRouter();
  const { signOut, isProfileComplete } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Animation pour slide latéral
  const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Ouvrir la sidebar
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Fermer la sidebar
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -SIDEBAR_WIDTH,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const isActive = (href: string) => {
    return activePath === href || activePath.startsWith(href + '/');
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      router.replace('/auth/login');
    } catch (error) {
      console.error('Logout failed:', error);
      Alert.alert('Erreur', 'Impossible de se déconnecter');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleProfile = () => {
    onNavigate('/(app)/profile');
    onClose();
  };

  const renderSections = () => {
    return sections.map((section, idx) => (
      <SidebarSection key={idx} title={section.title} isOpen={true}>
        {section.items.map((item) => (
          <SidebarItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            badge={item.badge}
            active={isActive(item.href)}
            isOpen={true}
            onClick={() => {
              onNavigate(item.href);
              onClose();
            }}
          />
        ))}
      </SidebarSection>
    ));
  };

  const getInitials = () => {
    if (userName) {
      const parts = userName.split(' ');
      if (parts.length >= 2) {
        return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
      }
      return userName.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayOpacity, display: visible ? 'flex' : 'none' }]}>
      <TouchableOpacity style={styles.overlayTouchable} onPress={onClose} activeOpacity={1} />
      <Animated.View style={[styles.container, { transform: [{ translateX: slideAnim }] }]}>
        {/* Header avec avatar cliquable */}
        <TouchableOpacity style={styles.header} onPress={handleProfile} activeOpacity={0.7}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials()}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.userName}>{userName || 'Utilisateur'}</Text>
            <Text style={styles.userRole}>{userRole || 'Invité'}</Text>
            {etablissementNom && (
              <Text style={styles.etablissementNom} numberOfLines={1}>
                {etablissementNom}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={20} color={theme.colors.neutral[600]} />
          </TouchableOpacity>
        </TouchableOpacity>

        {/* Indicateur de profil incomplet */}
        {!isProfileComplete && (
          <TouchableOpacity
            style={styles.profileWarning}
            onPress={handleProfile}
            activeOpacity={0.7}
          >
            <AlertCircle size={14} color="#F59E0B" />
            <Text style={styles.profileWarningText}>Profil incomplet</Text>
          </TouchableOpacity>
        )}

        {/* ScrollView corrigée - maintenant avec flexGrow pour permettre le scroll */}
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.scrollContent}
        >
          {renderSections()}
        </ScrollView>

        {/* Footer avec Mon profil + Déconnexion */}
        <View style={styles.footer}>
          {/* Bouton Mon profil */}
          <TouchableOpacity
            style={styles.profileButton}
            onPress={handleProfile}
            activeOpacity={0.7}
          >
            <User size={18} color={theme.colors.neutral[600]} />
            <Text style={styles.profileButtonText}>Mon profil</Text>
          </TouchableOpacity>

          {/* Bouton Déconnexion */}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={isLoggingOut}
            activeOpacity={0.7}
          >
            {isLoggingOut ? (
              <ActivityIndicator size="small" color={theme.colors.danger.DEFAULT} />
            ) : (
              <>
                <LogOut size={18} color={theme.colors.danger.DEFAULT} />
                <Text style={styles.logoutText}>
                  {isLoggingOut ? 'Déconnexion...' : 'Se déconnecter'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
  },
  overlayTouchable: {
    flex: 1,
  },
  container: {
    width: SIDEBAR_WIDTH,
    maxWidth: 320,
    backgroundColor: theme.colors.background.primary,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
    height: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.background.primary,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing[3],
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  userRole: {
    fontSize: 12,
    color: '#6B7280',
  },
  etablissementNom: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  closeButton: {
    padding: theme.spacing[2],
    marginLeft: theme.spacing[2],
  },
  profileWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    marginHorizontal: theme.spacing[4],
    marginTop: theme.spacing[3],
    marginBottom: theme.spacing[2],
    paddingVertical: 8,
    borderRadius: 8,
  },
  profileWarningText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing[4],
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
    paddingVertical: theme.spacing[2],
    paddingHorizontal: theme.spacing[4],
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[2],
    paddingVertical: theme.spacing[3],
    borderRadius: 8,
    marginBottom: theme.spacing[1],
  },
  profileButtonText: {
    fontSize: 14,
    color: theme.colors.neutral[600],
    fontWeight: '500',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing[2],
    paddingVertical: theme.spacing[3],
    borderRadius: 8,
  },
  logoutText: {
    fontSize: 14,
    color: theme.colors.danger.DEFAULT,
    fontWeight: '500',
  },
});