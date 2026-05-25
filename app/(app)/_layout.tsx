import { Stack, usePathname, useRouter } from 'expo-router';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/hooks/useSidebar';
import { useMenuItems } from '@/hooks/useMenuItems';
import { useActiveEtablissement } from '@/hooks/useActiveEtablissement';
import { DelegationProvider } from '@/contexts/DelegationContext';
import { NominationProvider } from '@/contexts/NominationContext';
import Sidebar from '@/components/sidebar/Sidebar';
import SidebarMobile from '@/components/sidebar/SidebarMobile';
import InAppNotification from '@/components/ui/InAppNotification';
import EtablissementSelector from '@/components/common/EtablissementSelector';
import { Menu, Home } from 'lucide-react-native';
import theme from '@/constants/theme';
import { useEffect } from 'react';

const { width } = Dimensions.get('window');
const isDesktop = width >= 768;

function AppLayoutContent() {
  const { user, profile, primaryRole, activeRole, loading, hasRole } = useAuth();
  const { isOpen, isMobile, toggle, close } = useSidebar();
  const { menuSections } = useMenuItems();
  const { activeEtablissement, loading: etablissementLoading } = useActiveEtablissement();
  const pathname = usePathname();
  const router = useRouter();
  
  const isChef = hasRole('chef_etablissement');

  // Redirection uniquement si l'utilisateur n'est PAS connecté
  // ET que nous ne sommes PAS sur une route publique comme auto-inscription
  useEffect(() => {
    if (!loading && !user) {
      // Sauvegarder la tentative de redirection pour après connexion
      const redirectTo = pathname !== '/auto-inscription' ? pathname : null;
      if (redirectTo) {
        router.replace(`/auth/login?redirect=${encodeURIComponent(redirectTo)}`);
      } else {
        router.replace('/auth/login');
      }
    }
  }, [loading, user]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!user) {
    return null;
  }

  const userName = profile?.prenom && profile?.nom 
    ? `${profile.prenom} ${profile.nom}` 
    : user?.email?.split('@')[0] || 'Utilisateur';

  const getRoleLabel = () => {
    const role = activeRole || primaryRole;
    switch (role) {
      case 'eleve': return 'Élève';
      case 'parent': return 'Parent';
      case 'enseignant': return 'Enseignant';
      case 'chef_etablissement': return "Chef d'établissement";
      case 'admin': return 'Administrateur';
      default: return 'Visiteur';
    }
  };

  const handleNavigate = (href: string) => {
    router.push(href);
    if (isMobile) close();
  };

  const goToPublicHome = () => {
    router.push('/(public)');
  };

  console.log('🔍 AppLayout - activeRole:', activeRole);
  console.log('🔍 AppLayout - menuSections:', menuSections.map(s => s.title));
  console.log('🔍 AppLayout - pathname:', pathname);

  return (
    <View style={styles.container}>
      {!isMobile && (
        <Sidebar
          key={activeRole}
          isOpen={isOpen}
          onToggle={toggle}
          sections={menuSections}
          activePath={pathname}
          onNavigate={handleNavigate}
          userName={userName}
          userRole={getRoleLabel()}
          etablissementNom={isChef ? activeEtablissement?.nom : undefined}
          isChef={isChef}
        />
      )}

      <View style={styles.content}>
        {isMobile && (
          <View style={styles.mobileHeader}>
            <TouchableOpacity style={styles.menuButton} onPress={toggle}>
              <Menu size={24} color={theme.colors.neutral[600]} />
            </TouchableOpacity>
            <Text style={styles.mobileTitle}>SchoolNet</Text>
            <View style={styles.mobileHeaderRight}>
              <InAppNotification />
              <TouchableOpacity onPress={goToPublicHome} style={styles.mobilePublicButton}>
                <Home size={20} color={theme.colors.neutral[600]} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!isMobile && (
          <View style={styles.desktopHeader}>
            <Text style={styles.desktopTitle}>SchoolNet</Text>
            <View style={styles.desktopHeaderRight}>
              {isChef && <EtablissementSelector variant="header" />}
              <InAppNotification />
              <TouchableOpacity onPress={goToPublicHome} style={styles.publicButton}>
                <Home size={18} color={theme.colors.neutral[600]} />
                <Text style={styles.publicButtonText}>Accueil</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Stack screenOptions={{ headerShown: false }}>
          {/* Écrans principaux */}
          <Stack.Screen name="index" />
          <Stack.Screen name="notes" />
          <Stack.Screen name="classe" />
          <Stack.Screen name="classes" />
          <Stack.Screen name="messages" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="paiements" />
          <Stack.Screen name="enfants" />
          <Stack.Screen name="scolarite" />
          <Stack.Screen name="etablissements" />
          <Stack.Screen name="utilisateurs" />
          <Stack.Screen name="finance" />
          <Stack.Screen name="parental-controls" />
          <Stack.Screen name="ia-chat" />
          <Stack.Screen name="social" />
          <Stack.Screen name="community" />
          <Stack.Screen name="marketplace" />
          <Stack.Screen name="bulletins" />
          <Stack.Screen name="devoirs" />
          <Stack.Screen name="inscriptions" />
          <Stack.Screen name="factures" />
          <Stack.Screen name="absences" />
          <Stack.Screen name="incidents" />
          <Stack.Screen name="discipline" />
          <Stack.Screen name="communication-officielle" />
          
          {/* Enseignant */}
          <Stack.Screen name="enseignant-tableau-de-bord" />
          <Stack.Screen name="enseignant/espaces-classes" />
          <Stack.Screen name="enseignant/canal-classe" />
          <Stack.Screen name="enseignant/rendez-vous" />
          <Stack.Screen name="enseignant/rendez-vous-form" />
          <Stack.Screen name="enseignant/annonces-publier" />

          {/* Parent */}
          <Stack.Screen name="parent/dashboard" />
          <Stack.Screen name="parent/notes" />
          <Stack.Screen name="parent/absences" />
          <Stack.Screen name="parent/bulletins" />
          <Stack.Screen name="parent/emploi-du-temps" />
          <Stack.Screen name="parent/messages" />
          <Stack.Screen name="parent/annonces" />
          <Stack.Screen name="parent/rendez-vous" />
          <Stack.Screen name="parent/rendez-vous-form" />
          <Stack.Screen name="parent/espaces-classes" />
          <Stack.Screen name="parent/canal-classe" />
          
          {/* Élève */}
          <Stack.Screen name="eleve/annonces" />
          
          {/* Sidebar */}
          <Stack.Screen name="(sidebar)" />
        </Stack>
      </View>

      {isMobile && (
        <SidebarMobile
          visible={isOpen}
          onClose={close}
          sections={menuSections}
          activePath={pathname}
          onNavigate={handleNavigate}
          userName={userName}
          userRole={getRoleLabel()}
          etablissementNom={isChef ? activeEtablissement?.nom : undefined}
        />
      )}
    </View>
  );
}

export default function AppLayout() {
  return (
    <DelegationProvider>
      <NominationProvider>
        <AppLayoutContent />
      </NominationProvider>
    </DelegationProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: theme.colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
  },
  loadingText: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.neutral[500],
  },
  content: {
    flex: 1,
  },
  mobileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  menuButton: {
    padding: theme.spacing[2],
  },
  mobileTitle: {
    fontSize: theme.typography.h4.fontSize,
    fontWeight: theme.typography.h4.fontWeight as any,
    color: theme.colors.primary.DEFAULT,
  },
  mobileHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  mobilePublicButton: {
    padding: 8,
  },
  desktopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing[6],
    paddingVertical: theme.spacing[4],
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  desktopTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight as any,
    color: theme.colors.neutral[800],
  },
  desktopHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
  },
  publicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.neutral[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  publicButtonText: {
    fontSize: 13,
    color: theme.colors.neutral[600],
    fontWeight: '500',
  },
});