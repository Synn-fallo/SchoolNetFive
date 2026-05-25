import { View, StyleSheet, Dimensions, Animated, ScrollView, TouchableOpacity, Text, Alert, ActivityIndicator } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import SidebarHeader from './SidebarHeader';
import SidebarSection from './SidebarSection';
import SidebarItem from './SidebarItem';
import { MenuItem, MenuSection } from '@/types/sidebar.types';
import { LogOut, User, AlertCircle } from 'lucide-react-native';
import theme from '@/constants/theme';

const { width, height } = Dimensions.get('window');
const SIDEBAR_WIDTH = 280;
const COLLAPSED_WIDTH = 80;

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  sections: MenuSection[];
  activePath: string;
  onNavigate: (href: string) => void;
  userName?: string;
  userRole?: string;
  etablissementNom?: string;
  isChef?: boolean;
}

export default function Sidebar({
  isOpen,
  onToggle,
  sections,
  activePath,
  onNavigate,
  userName,
  userRole,
  etablissementNom,
  isChef,
}: SidebarProps) {
  // ✅ LOG AJOUTÉ en début de composant
  console.log('🔍 Sidebar - sections reçues:', sections.map(s => s.title));

  const router = useRouter();
  const { signOut, isProfileComplete } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const animatedWidth = useRef(new Animated.Value(isOpen ? SIDEBAR_WIDTH : COLLAPSED_WIDTH)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: isOpen ? SIDEBAR_WIDTH : COLLAPSED_WIDTH,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isOpen]);

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
  };

  const renderSections = () => {
    return sections.map((section, idx) => (
      <SidebarSection key={idx} title={section.title} isOpen={isOpen}>
        {section.items.map((item) => (
          <SidebarItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            badge={item.badge}
            active={isActive(item.href)}
            isOpen={isOpen}
            onClick={() => onNavigate(item.href)}
          />
        ))}
      </SidebarSection>
    ));
  };

  const renderAccountSection = () => {
    if (!isOpen) {
      return (
        <View style={styles.collapsedAccount}>
          <TouchableOpacity
            style={styles.collapsedAccountButton}
            onPress={handleProfile}
            activeOpacity={0.7}
          >
            <User size={20} color={theme.colors.neutral[500]} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.collapsedAccountButton}
            onPress={handleLogout}
            activeOpacity={0.7}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <ActivityIndicator size="small" color={theme.colors.danger.DEFAULT} />
            ) : (
              <LogOut size={20} color={theme.colors.danger.DEFAULT} />
            )}
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.accountSection}>
        <View style={styles.accountDivider} />
        <TouchableOpacity
          style={styles.accountItem}
          onPress={handleProfile}
          activeOpacity={0.7}
        >
          <User size={18} color={theme.colors.neutral[500]} />
          <Text style={styles.accountLabel}>Mon profil</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.accountItem, styles.logoutItem]}
          onPress={handleLogout}
          activeOpacity={0.7}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <ActivityIndicator size="small" color={theme.colors.danger.DEFAULT} />
          ) : (
            <LogOut size={18} color={theme.colors.danger.DEFAULT} />
          )}
          <Text style={styles.logoutLabel}>
            {isLoggingOut ? 'Déconnexion...' : 'Se déconnecter'}
          </Text>
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
      </View>
    );
  };

  // ✅ LOG AJOUTÉ dans le render (avant le return)
  console.log('🎨 Sidebar - render appelé, nombre de sections:', sections.length);

  return (
    <Animated.View style={[styles.container, { width: animatedWidth }]}>
      <SidebarHeader
        isOpen={isOpen}
        onToggle={onToggle}
        userName={userName}
        userRole={userRole}
        etablissementNom={etablissementNom}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderSections()}
      </ScrollView>
      {renderAccountSection()}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background.primary,
    borderRightWidth: 1,
    borderRightColor: theme.colors.neutral[200],
    height: '100%',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: theme.spacing[4],
    paddingBottom: theme.spacing[2],
  },
  accountSection: {
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.background.primary,
  },
  accountDivider: {
    height: 1,
    backgroundColor: theme.colors.neutral[200],
    marginBottom: theme.spacing[3],
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    marginHorizontal: -theme.spacing[2],
    paddingHorizontal: theme.spacing[2],
    borderRadius: theme.borderRadius.md,
  },
  accountLabel: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.neutral[600],
    fontWeight: '500',
  },
  logoutItem: {
    marginTop: theme.spacing[1],
  },
  logoutLabel: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.danger.DEFAULT,
    fontWeight: '500',
  },
  profileWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    marginTop: theme.spacing[3],
    paddingVertical: 8,
    borderRadius: 8,
  },
  profileWarningText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
  },
  collapsedAccount: {
    paddingVertical: theme.spacing[3],
    alignItems: 'center',
    gap: theme.spacing[4],
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
  },
  collapsedAccountButton: {
    padding: theme.spacing[2],
  },
});