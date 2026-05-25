import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { BookOpen, Users, DollarSign, Calendar, Bell, Building2, FileText, Settings, Eye, MessageCircle, User, Newspaper, TrendingUp, Award } from 'lucide-react-native';
import { useDashboardMetrics } from '@/hooks/useDashboardMetrics';
import MetricsCards from '@/components/admin/MetricsCards';
import SimpleRoleButtons from '@/components/dashboard/SimpleRoleButtons';
import { useActiveEtablissement } from '@/hooks/useActiveEtablissement';
import ActiveEtablissementDashboard from '@/components/dashboard/ActiveEtablissementDashboard';
import GlobalDashboard from '@/components/dashboard/GlobalDashboard';
import theme from '@/constants/theme';

export default function HomeScreen() {
  const { user, profile, primaryRole, roles, hasRole, loading: authLoading } = useAuth();
  const { activeEtablissement, loading: etablissementLoading } = useActiveEtablissement();
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'global'>('active');
  
  const { 
    totalEtablissements,
    totalDemandes,
    demandesEnAttente,
    demandesEnAttente48h,
    tauxConversionPhase1to2,
    tauxConversionPhase2toAbonnement,
    tempsMoyenPhase1to2,
    tempsMoyenPhase2toAbonnement,
    tauxValidationAuto,
    tauxRejet,
    motifsRejetPrincipaux,
    etablissementsPhase2Plus30Jours,
    totalValidations,
    totalAbonnements,
    loading: metricsLoading, 
    error: metricsError, 
    refresh: refreshMetrics 
  } = useDashboardMetrics();

  const metrics = {
    totalEtablissements,
    totalDemandes,
    demandesEnAttente,
    demandesEnAttente48h,
    tauxConversionPhase1to2,
    tauxConversionPhase2toAbonnement,
    tempsMoyenPhase1to2,
    tempsMoyenPhase2toAbonnement,
    tauxValidationAuto,
    tauxRejet,
    motifsRejetPrincipaux,
    etablissementsPhase2Plus30Jours,
    totalValidations,
    totalAbonnements,
    loading: metricsLoading,
    error: metricsError,
    refresh: refreshMetrics,
  };

  const hasAnyRoleExceptVisitor = roles.some(r => r.role !== 'visiteur' && r.is_active);
  const isChef = hasRole('chef_etablissement');

  // ✅ Redirection pour les enseignants (via useEffect pour éviter les erreurs de hooks)
  useEffect(() => {
    if (!authLoading && user && primaryRole === 'enseignant' && (pathname === '/(app)' || pathname === '/')) {
      router.replace('/(app)/enseignant');
    }
  }, [authLoading, user, primaryRole, pathname]);

  // Chargement unique au premier montage
  useEffect(() => {
    if (!initialLoadDone && user) {
      loadDashboardData();
      setInitialLoadDone(true);
    }
  }, [user, primaryRole, initialLoadDone]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      if (primaryRole === 'eleve') {
        const { data: eleve } = await supabase
          .from('eleves')
          .select('*, classe:classe_id(*)')
          .eq('user_id', user?.id)
          .maybeSingle();

        if (eleve) {
          const { data: inscriptions } = await supabase
            .from('inscriptions')
            .select('*')
            .eq('eleve_id', eleve.id)
            .order('created_at', { ascending: false })
            .limit(3);

          const { data: notesRecentes } = await supabase
            .from('notes')
            .select('*, devoir:devoir_id(*)')
            .eq('eleve_id', eleve.id)
            .order('created_at', { ascending: false })
            .limit(5);

          setDashboardData({ eleve, inscriptions, notesRecentes });
        }
      } else if (primaryRole === 'parent') {
        const { data: eleves } = await supabase
          .from('eleves')
          .select('*, classe:classe_id(*)')
          .eq('parent_id', user?.id);

        setDashboardData({ eleves });
      } else if (primaryRole === 'enseignant') {
        const { data: classes } = await supabase
          .from('classes')
          .select('*')
          .eq('enseignant_principal_id', user?.id);

        const { data: devoirsARendre } = await supabase
          .from('devoirs')
          .select('*')
          .eq('enseignant_id', user?.id)
          .eq('is_published', true)
          .order('date_devoir', { ascending: true })
          .limit(5);

        setDashboardData({ classes, devoirsARendre });
      } else if (primaryRole === 'chef_etablissement') {
        // Pour le chef, on utilise l'établissement actif
        if (activeEtablissement) {
          const { data: etablissement } = await supabase
            .from('etablissements')
            .select('*')
            .eq('id', activeEtablissement.id)
            .single();

          const { count: elevesCount } = await supabase
            .from('eleves')
            .select('*', { count: 'exact', head: true })
            .eq('etablissement_id', activeEtablissement.id);

          const { count: enseignantsCount } = await supabase
            .from('user_roles')
            .select('*', { count: 'exact', head: true })
            .eq('etablissement_id', activeEtablissement.id)
            .eq('role', 'enseignant');

          const { count: classesCount } = await supabase
            .from('classes')
            .select('*', { count: 'exact', head: true })
            .eq('etablissement_id', activeEtablissement.id);

          const { data: demandesEnAttente } = await supabase
            .from('demandes_etablissement')
            .select('*')
            .eq('etablissement_cree_id', activeEtablissement.id)
            .in('statut', ['en_attente', 'en_cours']);

          setDashboardData({
            etablissement,
            stats: {
              eleves: elevesCount || 0,
              enseignants: enseignantsCount || 0,
              classes: classesCount || 0,
            },
            demandesEnAttente: demandesEnAttente || [],
          });
        }
      } else if (primaryRole === 'admin') {
        const { count: etablissementsCount } = await supabase
          .from('etablissements')
          .select('*', { count: 'exact', head: true });

        const { count: usersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        const { count: demandesEnAttente } = await supabase
          .from('demandes_etablissement')
          .select('*', { count: 'exact', head: true })
          .in('statut', ['en_attente', 'en_cours']);

        const { data: etablissementsRecents } = await supabase
          .from('etablissements')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        setDashboardData({
          stats: {
            etablissements: etablissementsCount || 0,
            utilisateurs: usersCount || 0,
            demandesEnAttente: demandesEnAttente || 0,
          },
          etablissementsRecents: etablissementsRecents || [],
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateToPublic = () => {
    router.push('/(public)');
  };

  // Rendu pour le rôle VISITEUR
  const renderVisitorDashboard = () => {
    if (hasAnyRoleExceptVisitor) {
      return (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Bienvenue, {profile?.prenom || 'Visiteur'}!</Text>
              <Text style={styles.subtitle}>Votre espace SchoolNet</Text>
            </View>
            <TouchableOpacity style={styles.publicButton} onPress={navigateToPublic}>
              <Eye size={18} color="#3B82F6" />
              <Text style={styles.publicButtonText}>Voir l'accueil</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.widgetsContainer}>
            <TouchableOpacity style={styles.widgetCard} onPress={() => router.push('/(public)')}>
              <BookOpen size={32} color="#3B82F6" />
              <Text style={styles.widgetLabel}>Cours</Text>
              <Text style={styles.widgetDescription}>Accédez aux ressources pédagogiques</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.widgetCard} onPress={() => router.push('/(public)')}>
              <MessageCircle size={32} color="#3B82F6" />
              <Text style={styles.widgetLabel}>Forum</Text>
              <Text style={styles.widgetDescription}>Échangez avec la communauté</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.widgetCard} onPress={() => router.push('/(public)')}>
              <Calendar size={32} color="#3B82F6" />
              <Text style={styles.widgetLabel}>Agenda</Text>
              <Text style={styles.widgetDescription}>Calendrier des événements</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.linksSection}>
            <Text style={styles.sectionTitle}>📋 Liens utiles</Text>
            <View style={styles.linksContainer}>
              <TouchableOpacity style={styles.linkCard} onPress={() => router.push('/(app)/profile')}>
                <User size={18} color="#3B82F6" />
                <Text style={styles.linkLabel}>Mon profil</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkCard} onPress={() => router.push('/(app)/(sidebar)/demandes-role')}>
                <FileText size={18} color="#F59E0B" />
                <Text style={styles.linkLabel}>Mes demandes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.linkCard} onPress={() => router.push('/(public)/etablissements')}>
                <Building2 size={18} color="#10B981" />
                <Text style={styles.linkLabel}>Annuaire</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📢 Dernières actualités</Text>
            <View style={styles.actuCard}>
              <Text style={styles.actuTitle}>Nouvelle fonctionnalité : Suivi des notes</Text>
              <Text style={styles.actuDate}>04/04/2026</Text>
              <Text style={styles.actuDescription}>Découvrez le nouveau module de suivi des performances.</Text>
            </View>
            <View style={styles.actuCard}>
              <Text style={styles.actuTitle}>Journée portes ouvertes</Text>
              <Text style={styles.actuDate}>10/04/2026</Text>
              <Text style={styles.actuDescription}>Plusieurs établissements ouvrent leurs portes ce week-end.</Text>
            </View>
          </View>
        </ScrollView>
      );
    }

    return (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bienvenue, {profile?.prenom || 'Visiteur'}!</Text>
            <Text style={styles.subtitle}>Découvrez SchoolNet</Text>
          </View>
          <TouchableOpacity style={styles.publicButton} onPress={navigateToPublic}>
            <Eye size={18} color="#3B82F6" />
            <Text style={styles.publicButtonText}>Voir l'accueil</Text>
          </TouchableOpacity>
        </View>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>👋 Bienvenue sur SchoolNet</Text>
          <Text style={styles.welcomeText}>
            Vous avez créé votre compte avec succès ! Pour accéder aux fonctionnalités, 
            choisissez un rôle ci-dessous.
          </Text>
        </Card>

        <SimpleRoleButtons variant="default" />
      </ScrollView>
    );
  };

  // Rendu pour ÉLÈVE
  const renderStudentDashboard = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Chargement de votre tableau de bord...</Text>
        </View>
      );
    }
    return (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bienvenue, {profile?.prenom}!</Text>
            <Text style={styles.subtitle}>Tableau de bord élève</Text>
          </View>
          <TouchableOpacity style={styles.publicButton} onPress={navigateToPublic}>
            <Eye size={18} color="#3B82F6" />
            <Text style={styles.publicButtonText}>Voir l'accueil</Text>
          </TouchableOpacity>
        </View>

        {dashboardData?.eleve && (
          <>
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>📚 Informations</Text>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Classe:</Text>
                <Text style={styles.value}>{dashboardData.eleve.classe?.nom || 'Non assigné'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Statut:</Text>
                <Text style={[styles.value, { color: dashboardData.eleve.statut === 'actif' ? '#10B981' : '#F59E0B' }]}>
                  {dashboardData.eleve.statut === 'actif' ? 'Actif' : 'Inactif'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.label}>Matricule:</Text>
                <Text style={styles.value}>{dashboardData.eleve.matricule}</Text>
              </View>
            </Card>

            {dashboardData.notesRecentes && dashboardData.notesRecentes.length > 0 && (
              <Card style={styles.card}>
                <Text style={styles.cardTitle}>📖 Notes récentes</Text>
                {dashboardData.notesRecentes.map((note: any) => (
                  <View key={note.id} style={styles.noteItem}>
                    <Text style={styles.noteTitle}>{note.devoir?.titre || 'Devoir'}</Text>
                    <Text style={[styles.noteValue, { color: note.note >= 10 ? '#10B981' : '#EF4444' }]}>
                      {note.note} / {note.devoir?.note_sur || 20}
                    </Text>
                  </View>
                ))}
              </Card>
            )}
          </>
        )}

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(app)/notes')}>
            <BookOpen size={24} color="#3B82F6" />
            <Text style={styles.actionText}>Mes notes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(app)/classe')}>
            <Users size={24} color="#3B82F6" />
            <Text style={styles.actionText}>Ma classe</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(app)/messages')}>
            <Bell size={24} color="#3B82F6" />
            <Text style={styles.actionText}>Messages</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  // Rendu pour PARENT
  const renderParentDashboard = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Chargement de votre tableau de bord...</Text>
        </View>
      );
    }
    return (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bienvenue, {profile?.prenom}!</Text>
            <Text style={styles.subtitle}>Tableau de bord parent</Text>
          </View>
          <TouchableOpacity style={styles.publicButton} onPress={navigateToPublic}>
            <Eye size={18} color="#3B82F6" />
            <Text style={styles.publicButtonText}>Voir l'accueil</Text>
          </TouchableOpacity>
        </View>

        {dashboardData?.eleves && dashboardData.eleves.length > 0 ? (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>👨‍👩‍👧 Mes enfants</Text>
            {dashboardData.eleves.map((eleve: any) => (
              <View key={eleve.id} style={styles.eleveCard}>
                <View>
                  <Text style={styles.eleveName}>{eleve.matricule}</Text>
                  <Text style={styles.eleveClasse}>{eleve.classe?.nom || 'Classe non assignée'}</Text>
                </View>
                <TouchableOpacity
                  style={styles.smallButton}
                  onPress={() => router.push(`/(app)/enfants?id=${eleve.id}`)}
                >
                  <Text style={styles.smallButtonText}>Voir</Text>
                </TouchableOpacity>
              </View>
            ))}
          </Card>
        ) : (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>👨‍👩‍👧 Mes enfants</Text>
            <Text style={styles.emptyText}>Aucun enfant rattaché pour le moment</Text>
          </Card>
        )}

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(app)/paiements')}>
            <DollarSign size={24} color="#3B82F6" />
            <Text style={styles.actionText}>Paiements</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(app)/parental-controls')}>
            <Settings size={24} color="#3B82F6" />
            <Text style={styles.actionText}>Contrôles</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  // Rendu pour ENSEIGNANT
  const renderTeacherDashboard = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Chargement de votre tableau de bord...</Text>
        </View>
      );
    }
    return (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bienvenue, {profile?.prenom}!</Text>
            <Text style={styles.subtitle}>Tableau de bord enseignant</Text>
          </View>
          <TouchableOpacity style={styles.publicButton} onPress={navigateToPublic}>
            <Eye size={18} color="#3B82F6" />
            <Text style={styles.publicButtonText}>Voir l'accueil</Text>
          </TouchableOpacity>
        </View>

        {dashboardData?.classes && dashboardData.classes.length > 0 ? (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>📚 Mes classes</Text>
            {dashboardData.classes.map((classe: any) => (
              <View key={classe.id} style={styles.eleveCard}>
                <View>
                  <Text style={styles.eleveName}>{classe.nom}</Text>
                  <Text style={styles.eleveClasse}>Niveau: {classe.niveau}</Text>
                </View>
                <TouchableOpacity
                  style={styles.smallButton}
                  onPress={() => router.push(`/(app)/classes?id=${classe.id}`)}
                >
                  <Text style={styles.smallButtonText}>Voir</Text>
                </TouchableOpacity>
              </View>
            ))}
          </Card>
        ) : (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>📚 Mes classes</Text>
            <Text style={styles.emptyText}>Aucune classe assignée pour le moment</Text>
          </Card>
        )}

        {dashboardData?.devoirsARendre && dashboardData.devoirsARendre.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>📝 Devoirs à rendre</Text>
            {dashboardData.devoirsARendre.map((devoir: any) => (
              <View key={devoir.id} style={styles.devoirItem}>
                <Text style={styles.devoirTitle}>{devoir.titre}</Text>
                <Text style={styles.devoirDate}>
                  {new Date(devoir.date_devoir).toLocaleDateString('fr-FR')}
                </Text>
              </View>
            ))}
          </Card>
        )}

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(app)/notes')}>
            <BookOpen size={24} color="#3B82F6" />
            <Text style={styles.actionText}>Notes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(app)/messages')}>
            <Bell size={24} color="#3B82F6" />
            <Text style={styles.actionText}>Messages</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  // Rendu pour CHEF D'ÉTABLISSEMENT (avec 2 onglets)
  const renderChefDashboard = () => {
    if (etablissementLoading || loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Chargement de votre tableau de bord...</Text>
        </View>
      );
    }

    return (
      <View style={styles.container}>
        {/* Onglets */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'active' && styles.tabActive]}
            onPress={() => setActiveTab('active')}
          >
            <Building2 size={18} color={activeTab === 'active' ? theme.colors.primary.DEFAULT : '#6B7280'} />
            <Text style={[styles.tabText, activeTab === 'active' && styles.tabTextActive]}>
              Établissement actif
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'global' && styles.tabActive]}
            onPress={() => setActiveTab('global')}
          >
            <TrendingUp size={18} color={activeTab === 'global' ? theme.colors.primary.DEFAULT : '#6B7280'} />
            <Text style={[styles.tabText, activeTab === 'global' && styles.tabTextActive]}>
              Vue globale
            </Text>
          </TouchableOpacity>
        </View>

        {/* Contenu des onglets */}
        {activeTab === 'active' ? (
          <ActiveEtablissementDashboard />
        ) : (
          <GlobalDashboard />
        )}
      </View>
    );
  };

  // Rendu pour ADMIN
  const renderAdminDashboard = () => {
    if (metricsLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
          <Text style={styles.loadingText}>Chargement des indicateurs...</Text>
        </View>
      );
    }

    if (!metrics.totalDemandes && metrics.totalDemandes !== 0) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
          <Text style={styles.loadingText}>Préparation du tableau de bord...</Text>
        </View>
      );
    }

    if (metricsError) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Erreur: {metricsError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refreshMetrics}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bienvenue, Administrateur!</Text>
            <Text style={styles.subtitle}>Tableau de bord - Super Admin</Text>
          </View>
          <TouchableOpacity style={styles.publicButton} onPress={navigateToPublic}>
            <Eye size={18} color="#3B82F6" />
            <Text style={styles.publicButtonText}>Voir l'accueil</Text>
          </TouchableOpacity>
        </View>

        <MetricsCards metrics={metrics} />

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>📊 Synthèse</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Building2 size={28} color="#3B82F6" />
              <Text style={styles.statNumber}>{dashboardData?.stats?.etablissements || 0}</Text>
              <Text style={styles.statLabel}>Établissements</Text>
            </View>
            <View style={styles.statCard}>
              <Users size={28} color="#3B82F6" />
              <Text style={styles.statNumber}>{metrics.totalDemandes || 0}</Text>
              <Text style={styles.statLabel}>Demandes</Text>
            </View>
            <View style={styles.statCard}>
              <FileText size={28} color="#F59E0B" />
              <Text style={styles.statNumber}>{metrics.demandesEnAttente48h || 0}</Text>
              <Text style={styles.statLabel}>En attente >48h</Text>
            </View>
          </View>
        </Card>

        {dashboardData?.etablissementsRecents && dashboardData.etablissementsRecents.length > 0 && (
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>🆕 Établissements récents</Text>
            {dashboardData.etablissementsRecents.map((etab: any) => (
              <View key={etab.id} style={styles.etablissementItem}>
                <Text style={styles.etablissementName}>{etab.nom}</Text>
                <Text style={styles.etablissementDate}>
                  {new Date(etab.created_at).toLocaleDateString('fr-FR')}
                </Text>
              </View>
            ))}
          </Card>
        )}

        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(app)/(sidebar)/admin/demandes-etablissements')}>
            <Building2 size={24} color="#3B82F6" />
            <Text style={styles.actionText}>Établissements</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(app)/utilisateurs')}>
            <Users size={24} color="#3B82F6" />
            <Text style={styles.actionText}>Utilisateurs</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(app)/(sidebar)/admin/demandes-etablissements')}>
            <FileText size={24} color="#F59E0B" />
            <Text style={styles.actionText}>Demandes</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  if ((loading || authLoading) && primaryRole !== 'admin' && primaryRole !== 'chef_etablissement') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Chargement de votre espace...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {primaryRole === 'visiteur' && renderVisitorDashboard()}
      {primaryRole === 'eleve' && renderStudentDashboard()}
      {primaryRole === 'parent' && renderParentDashboard()}
      {/* Enseignant : ne rien afficher ici, la redirection est gérée par le routeur */}
      {primaryRole === 'chef_etablissement' && renderChefDashboard()}
      {primaryRole === 'admin' && renderAdminDashboard()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  publicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  publicButtonText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  card: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  welcomeText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  noteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  noteTitle: {
    fontSize: 14,
    color: '#4B5563',
  },
  noteValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionText: {
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '500',
    marginTop: 8,
  },
  eleveCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  eleveName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  eleveClasse: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  smallButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  smallButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 16,
  },
  devoirItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  devoirTitle: {
    fontSize: 14,
    color: '#4B5563',
  },
  devoirDate: {
    fontSize: 12,
    color: '#9CA3AF',
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
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  demandeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  demandeTitle: {
    fontSize: 14,
    color: '#4B5563',
  },
  etablissementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  etablissementName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  etablissementDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  widgetsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  widgetCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  widgetLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 4,
  },
  widgetDescription: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
  linksSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  linksContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  linkLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
  },
  section: {
    marginBottom: 24,
  },
  actuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  actuDate: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  actuDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.primary.DEFAULT,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '600',
  },
});