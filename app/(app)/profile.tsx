import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Card } from '@/components/Card';
import { Building2, Handshake, FileText, ChevronRight, AlertCircle, BookOpen, Users, Briefcase, Shield, UserPlus, GraduationCap, Globe } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import theme from '@/constants/theme';
import ActiveRolesList from '@/components/profile/ActiveRolesList';
import InstitutionalRequestButton from '@/components/profile/InstitutionalRequestButton';
import UserRequestsTabs from '@/components/profile/requests/UserRequestsTabs';
import ProfileForm from '@/components/profile/ProfileForm';
import { useActiveEtablissement } from '@/hooks/useActiveEtablissement';

interface EtablissementInfo {
  id: string;
  nom: string;
  slug: string;
  statut: string;
  is_active: boolean;
}

interface EleveSimple {
  id: string;
  nom: string;
  prenom: string;
  matricule: string;
  classe_nom?: string;
}

interface EnseignantEtablissement {
  id: string;
  etablissement_id: string;
  etablissement_nom: string;
  est_principal: boolean;
}

export default function ProfileScreen() {
  const { 
    user, 
    profile, 
    signOut, 
    hasRole, 
    refreshProfile,
    isMembreAdministratif,
    isDirecteurEtudes,
    isAnimateurEtablissement,
    isPersonnelAdministratif,
    isPersonnelVieScolaire,
    getAdminMetadata,
    activeRole,
    setActiveRole,
    availableRoles,
    perimetre,
    organisation,
    organisationType,
    adminType,
    adminDepartement,
    adminFonction
  } = useAuth();
  const router = useRouter();
  const { activeEtablissement } = useActiveEtablissement();
  const [etablissementsList, setEtablissementsList] = useState<EtablissementInfo[]>([]);
  const [etablissement, setEtablissement] = useState<EtablissementInfo | null>(null);
  const [loadingEtablissement, setLoadingEtablissement] = useState(true);
  const [showEtabSelector, setShowEtabSelector] = useState(false);
  const [hasPendingEtablissementRequest, setHasPendingEtablissementRequest] = useState(false);
  const [hasPendingPartenariatRequest, setHasPendingPartenariatRequest] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);
  const [mesEnfants, setMesEnfants] = useState<EleveSimple[]>([]);
  const [loadingEnfants, setLoadingEnfants] = useState(false);
  const [etablissementsRattaches, setEtablissementsRattaches] = useState<EnseignantEtablissement[]>([]);
  const [loadingRattaches, setLoadingRattaches] = useState(false);

  const isChef = hasRole('chef_etablissement');

  useEffect(() => {
    if (user) {
      fetchEtablissementsInfo();
      checkPendingRequests();
      if (hasRole('parent')) {
        fetchMesEnfants();
      }
      if (hasRole('enseignant')) {
        fetchEtablissementsRattaches();
      }
    }
  }, [user, hasRole]);

  const fetchEtablissementsInfo = async () => {
    if (!user) return;

    setLoadingEtablissement(true);
    try {
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('etablissement_id')
        .eq('user_id', user.id)
        .eq('role', 'chef_etablissement')
        .eq('is_active', true);

      if (rolesError) throw rolesError;

      if (rolesData && rolesData.length > 0) {
        const etablissementIds = rolesData.map(r => r.etablissement_id).filter(id => id);
        
        if (etablissementIds.length > 0) {
          const { data: etabsData, error: etabsError } = await supabase
            .from('etablissements')
            .select('id, nom, slug, statut, is_active')
            .in('id', etablissementIds);

          if (etabsError) throw etabsError;
          
          setEtablissementsList(etabsData || []);
          
          const { data: prefs, error: prefsError } = await supabase
            .from('user_preferences')
            .select('preferences')
            .eq('user_id', user.id)
            .maybeSingle();

          if (prefsError) throw prefsError;
          
          const activeEtabId = prefs?.preferences?.active_etablissement_id;
          const currentEtab = etabsData?.find(e => e.id === activeEtabId) || etabsData?.[0];
          
          setEtablissement(currentEtab || null);
        } else {
          setEtablissementsList([]);
          setEtablissement(null);
        }
      } else {
        setEtablissementsList([]);
        setEtablissement(null);
      }
    } catch (error) {
      console.error('Error fetching etablissements:', error);
      setEtablissementsList([]);
      setEtablissement(null);
    } finally {
      setLoadingEtablissement(false);
    }
  };

  const fetchEtablissementsRattaches = async () => {
    if (!user) return;
    
    setLoadingRattaches(true);
    try {
      const { data, error } = await supabase
        .from('enseignants_etablissements')
        .select(`
          id,
          etablissement_id,
          est_principal,
          etablissements:etablissement_id (nom)
        `)
        .eq('enseignant_id', user.id)
        .eq('statut', 'actif');

      if (error) throw error;

      const rattachesList = (data || []).map(item => ({
        id: item.id,
        etablissement_id: item.etablissement_id,
        etablissement_nom: (item.etablissements as any)?.nom || 'Établissement inconnu',
        est_principal: item.est_principal || false,
      }));

      setEtablissementsRattaches(rattachesList);
    } catch (error) {
      console.error('Error fetching etablissements rattaches:', error);
    } finally {
      setLoadingRattaches(false);
    }
  };

  const saveActiveEtablissement = async (etablissementId: string) => {
    if (!user) return;
    
    try {
      const { data: existingPrefs, error: prefsError } = await supabase
        .from('user_preferences')
        .select('id, preferences')
        .eq('user_id', user.id)
        .maybeSingle();

      if (prefsError) throw prefsError;
      
      const newPreferences = {
        ...(existingPrefs?.preferences || {}),
        active_etablissement_id: etablissementId,
      };
      
      if (existingPrefs) {
        const { error: updateError } = await supabase
          .from('user_preferences')
          .update({ preferences: newPreferences })
          .eq('id', existingPrefs.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('user_preferences')
          .insert({
            user_id: user.id,
            preferences: newPreferences,
          });
        if (insertError) throw insertError;
      }
      
      console.log('[Profile] Établissement actif sauvegardé:', etablissementId);
    } catch (error) {
      console.error('Error saving active etablissement:', error);
    }
  };

  const checkPendingRequests = async () => {
    if (!user) return;

    try {
      const { data: etabData, error: etabError } = await supabase
        .from('demandes_etablissement')
        .select('id, statut')
        .eq('demandeur_id', user.id)
        .in('statut', ['en_attente', 'en_cours'])
        .maybeSingle();

      if (!etabError) {
        setHasPendingEtablissementRequest(!!etabData);
      }

      const { data: partData, error: partError } = await supabase
        .from('demandes_partenariat')
        .select('id, statut')
        .eq('demandeur_id', user.id)
        .in('statut', ['en_attente', 'en_cours'])
        .maybeSingle();

      if (!partError) {
        setHasPendingPartenariatRequest(!!partData);
      }
    } catch (error) {
      console.error('Error checking pending requests:', error);
    }
  };

  const fetchMesEnfants = async () => {
    if (!user) return;
    
    setLoadingEnfants(true);
    try {
      const { data, error } = await supabase
        .from('parents_eleves')
        .select(`
          id,
          lien_parente,
          est_principal,
          eleves:eleve_id (
            id,
            nom,
            prenom,
            matricule,
            classes:classe_id (nom)
          )
        `)
        .eq('parent_id', user.id);

      if (error) throw error;

      const enfantsList = (data || []).map(item => ({
        id: (item.eleves as any)?.id,
        nom: (item.eleves as any)?.nom || '',
        prenom: (item.eleves as any)?.prenom || '',
        matricule: (item.eleves as any)?.matricule || '',
        classe_nom: (item.eleves as any)?.classes?.nom,
      }));

      setMesEnfants(enfantsList);
    } catch (error) {
      console.error('Error fetching enfants:', error);
    } finally {
      setLoadingEnfants(false);
    }
  };

  const handleLierEnfant = () => {
    router.push('/(app)/enfants/lier');
  };

  const handleLogout = async () => {
    try {
      await signOut();
      router.replace('/auth/login');
    } catch (error) {
      console.error('Logout failed:', error);
      Alert.alert('Erreur', 'Impossible de se déconnecter');
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'eleve': return 'Élève';
      case 'parent': return 'Parent';
      case 'enseignant': return 'Enseignant';
      case 'chef_etablissement': return 'Chef d\'établissement';
      case 'admin': return 'Administrateur';
      case 'membre_administratif': return 'Membre administratif';
      case 'autorite': return 'Autorité';
      case 'partenaire': return 'Partenaire';
      case 'visiteur': return 'Visiteur';
      default: return role || 'Utilisateur';
    }
  };

  const handleSwitchRole = async (role: string, etablissementId?: string) => {
    if (switchingRole) return;
    
    setSwitchingRole(true);
    try {
      await setActiveRole(role as any, etablissementId);
      Alert.alert('Succès', `Vous utilisez maintenant le rôle : ${getRoleLabel(role)}`);
    } catch (error) {
      console.error('Error switching role:', error);
      Alert.alert('Erreur', 'Impossible de changer de rôle');
    } finally {
      setSwitchingRole(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {profile?.prenom?.charAt(0)}{profile?.nom?.charAt(0)}
          </Text>
        </View>
        <Text style={styles.name}>{profile?.prenom} {profile?.nom}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.role}>
          {activeRole === 'chef_etablissement' ? 'Chef d\'établissement' : 
           activeRole === 'enseignant' ? 'Enseignant' :
           activeRole === 'parent' ? 'Parent' :
           activeRole === 'admin' ? 'Administrateur' :
           activeRole === 'eleve' ? 'Élève' :
           activeRole === 'autorite' ? 'Autorité' :
           activeRole === 'partenaire' ? 'Partenaire' : getRoleLabel(activeRole || 'visiteur')}
        </Text>
        
        {hasRole('enseignant') && !activeEtablissement && (
          <View style={styles.autonomeBadge}>
            <Text style={styles.autonomeBadgeText}>Autonome</Text>
          </View>
        )}
      </View>

      {/* Section Informations personnelles - AVEC ProfileForm intégré */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Informations personnelles</Text>
        <ProfileForm />
      </Card>

      {/* Section Spécificités pour Autorité (affichées dans ProfileForm, mais gardées ici pour cohérence) */}
      {activeRole === 'autorite' && perimetre && (
        <Card style={styles.card}>
          <View style={styles.specificiteHeader}>
            <Globe size={20} color={theme.colors.primary.DEFAULT} />
            <Text style={styles.cardTitle}>🌍 Périmètre géographique</Text>
          </View>
          <View style={styles.specificiteContent}>
            <Text style={styles.specificiteLabel}>Périmètre :</Text>
            <Text style={styles.specificiteValue}>
              {perimetre === 'national' ? 'National' : 
               perimetre === 'regional' ? 'Régional' :
               perimetre === 'departemental' ? 'Départemental' : 'Local'}
            </Text>
          </View>
          {profile?.zone_id && (
            <Text style={styles.specificiteNote}>
              Zone ID: {profile?.zone_id}
            </Text>
          )}
        </Card>
      )}

      {/* Section Spécificités pour Partenaire */}
      {activeRole === 'partenaire' && organisation && (
        <Card style={styles.card}>
          <View style={styles.specificiteHeader}>
            <Building2 size={20} color={theme.colors.primary.DEFAULT} />
            <Text style={styles.cardTitle}>🤝 Organisation</Text>
          </View>
          <View style={styles.specificiteContent}>
            <Text style={styles.specificiteLabel}>Nom :</Text>
            <Text style={styles.specificiteValue}>{organisation}</Text>
          </View>
          {organisationType && (
            <View style={styles.specificiteContent}>
              <Text style={styles.specificiteLabel}>Type :</Text>
              <Text style={styles.specificiteValue}>
                {organisationType === 'ong' ? 'ONG' :
                 organisationType === 'entreprise' ? 'Entreprise' :
                 organisationType === 'ministere' ? 'Ministère' :
                 organisationType === 'delegation' ? 'Délégation' :
                 organisationType === 'association' ? 'Association' : organisationType}
              </Text>
            </View>
          )}
        </Card>
      )}

      {/* Section Fonctions spéciales (membre_administratif) */}
      {adminType && (
        <Card style={styles.card}>
          <View style={styles.specificiteHeader}>
            <Shield size={20} color={theme.colors.primary.DEFAULT} />
            <Text style={styles.cardTitle}>🛡️ Fonctions spéciales</Text>
          </View>
          <View style={styles.specificiteContent}>
            <Text style={styles.specificiteLabel}>Fonction :</Text>
            <Text style={styles.specificiteValue}>
              {adminType === 'de' ? 'Directeur des Études' :
               adminType === 'ae' ? 'Animateur d\'Établissement' :
               adminType === 'administratif' ? 'Personnel Administratif' :
               'Personnel Vie Scolaire'}
            </Text>
          </View>
          {adminDepartement && (
            <View style={styles.specificiteContent}>
              <Text style={styles.specificiteLabel}>Département :</Text>
              <Text style={styles.specificiteValue}>{adminDepartement}</Text>
            </View>
          )}
          {adminFonction && (
            <View style={styles.specificiteContent}>
              <Text style={styles.specificiteLabel}>Fonction détaillée :</Text>
              <Text style={styles.specificiteValue}>{adminFonction}</Text>
            </View>
          )}
        </Card>
      )}

      {/* Section Établissements rattachés (pour les enseignants) */}
      {hasRole('enseignant') && etablissementsRattaches.length > 0 && (
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>🏫 Établissements rattachés</Text>
            <TouchableOpacity onPress={() => router.push('/(app)/(sidebar)/enseignants/rattachement')}>
              <Text style={styles.linkText}>Gérer</Text>
            </TouchableOpacity>
          </View>
          {loadingRattaches ? (
            <ActivityIndicator size="small" color={theme.colors.primary.DEFAULT} />
          ) : (
            <>
              {etablissementsRattaches.slice(0, 3).map((etab) => (
                <View key={etab.id} style={styles.etablissementRow}>
                  <Building2 size={16} color={theme.colors.neutral[500]} />
                  <Text style={styles.etablissementRowText}>{etab.etablissement_nom}</Text>
                  {etab.est_principal && (
                    <View style={styles.principalChip}>
                      <Text style={styles.principalChipText}>Principal</Text>
                    </View>
                  )}
                </View>
              ))}
              {etablissementsRattaches.length > 3 && (
                <Text style={styles.moreText}>+{etablissementsRattaches.length - 3} autres</Text>
              )}
            </>
          )}
        </Card>
      )}

      {/* Section Mes enfants (pour les parents) */}
      {hasRole('parent') && (
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>👨‍👩‍👧 Mes enfants</Text>
            <TouchableOpacity style={styles.addButton} onPress={handleLierEnfant}>
              <UserPlus size={16} color={theme.colors.primary.DEFAULT} />
              <Text style={styles.addButtonText}>Lier un enfant</Text>
            </TouchableOpacity>
          </View>
          
          {loadingEnfants ? (
            <ActivityIndicator size="small" color={theme.colors.primary.DEFAULT} />
          ) : mesEnfants.length === 0 ? (
            <View style={styles.emptyEnfantsContainer}>
              <Text style={styles.emptyEnfantsText}>Aucun enfant lié</Text>
              <Text style={styles.emptyEnfantsSubtext}>
                Utilisez le bouton "Lier un enfant" pour ajouter votre enfant à votre compte parent.
              </Text>
            </View>
          ) : (
            mesEnfants.map((enfant) => (
              <TouchableOpacity
                key={enfant.id}
                style={styles.enfantCard}
                onPress={() => router.push(`/(app)/enfants?id=${enfant.id}`)}
              >
                <View style={styles.enfantAvatar}>
                  <GraduationCap size={20} color="#FFFFFF" />
                </View>
                <View style={styles.enfantInfo}>
                  <Text style={styles.enfantName}>{enfant.prenom} {enfant.nom}</Text>
                  <Text style={styles.enfantClasse}>{enfant.classe_nom || 'Classe non assignée'}</Text>
                  <Text style={styles.enfantMatricule}>Matricule: {enfant.matricule}</Text>
                </View>
                <ChevronRight size={18} color="#9CA3AF" />
              </TouchableOpacity>
            ))
          )}
        </Card>
      )}

      {/* Section Mes rôles actifs */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>📋 Mes rôles actifs</Text>
        <ActiveRolesList 
          roles={availableRoles}
          activeRole={activeRole}
          onSelectRole={handleSwitchRole}
          disabled={switchingRole}
        />
        {switchingRole && (
          <ActivityIndicator 
            size="small" 
            color={theme.colors.primary.DEFAULT} 
            style={styles.switchLoader} 
          />
        )}
      </Card>

      {/* Section Démarches institutionnelles */}
      {activeRole !== 'eleve' && (
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>🏛️ Rejoindre la communauté</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Inscrivez-vous comme élève, parent, enseignant, ou devenez un acteur institutionnel.
          </Text>
          <View style={styles.demarchesButtons}>
            {!hasRole('chef_etablissement') && !hasRole('admin') && (
              <TouchableOpacity
                style={styles.demarcheButton}
                onPress={() => router.push('/(app)/(sidebar)/institution/demande-etablissement')}
              >
                <Building2 size={16} color={theme.colors.primary.DEFAULT} />
                <Text style={styles.demarcheButtonText}>Demander un établissement</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.demarcheButton}
              onPress={() => router.push('/(app)/(sidebar)/institution/demande-partenariat')}
            >
              <Handshake size={16} color={theme.colors.primary.DEFAULT} />
              <Text style={styles.demarcheButtonText}>Demander un partenariat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.demarcheButton}
              // onPress={() => router.push('/(app)/(sidebar)/institution/demande-role')}
              onPress={() => router.push('/(app)/(sidebar)/choix-role-simple')}
            >
              <Shield size={16} color={theme.colors.primary.DEFAULT} />
              <Text style={styles.demarcheButtonText}>Devenir membre</Text>
            </TouchableOpacity>
          </View>
          {(hasPendingEtablissementRequest || hasPendingPartenariatRequest) && (
            <View style={styles.pendingContainer}>
              <AlertCircle size={14} color="#F59E0B" />
              <Text style={styles.pendingText}>
                Vous avez des demandes en cours de traitement.
              </Text>
            </View>
          )}
        </Card>
      )}

      {/* Section Mes demandes */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>📋 Mes demandes</Text>
        <UserRequestsTabs />
      </Card>

      {/* Section Déconnexion */}
      <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Déconnexion</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  role: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  autonomeBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 8,
  },
  autonomeBadgeText: {
    fontSize: 12,
    color: '#D97706',
    fontWeight: '500',
  },
  card: {
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  button: {
    height: 48,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoutButton: {
    backgroundColor: '#EF4444',
    marginTop: 8,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addButtonText: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '500',
  },
  emptyEnfantsContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyEnfantsText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  emptyEnfantsSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  enfantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  enfantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  enfantInfo: {
    flex: 1,
  },
  enfantName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  enfantClasse: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  enfantMatricule: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  linkText: {
    fontSize: 13,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  etablissementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  etablissementRowText: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
  },
  principalChip: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  principalChipText: {
    fontSize: 9,
    color: '#10B981',
    fontWeight: '500',
  },
  moreText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  switchLoader: {
    marginTop: 12,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 18,
  },
  demarchesButtons: {
    gap: 12,
  },
  demarcheButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  demarcheButtonText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  pendingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  pendingText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
  },
  specificiteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  specificiteContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  specificiteLabel: {
    fontSize: 13,
    color: '#6B7280',
    width: 100,
  },
  specificiteValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    flex: 1,
  },
  specificiteNote: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 8,
    fontStyle: 'italic',
  },
});