import React, { createContext, useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { Profile, UserRoleRecord, UserRole } from '@/types/database.types';
import { AdminMetadata } from '@/types/admin.types';
import { isEtablissementAbonne } from '@/lib/abonnement';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: UserRoleRecord[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, profileData: Partial<Profile>) => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (role: UserRole, etablissementId?: string) => boolean;
  primaryRole: UserRole | null;
  refreshProfile: () => Promise<void>;
  isChefEtablissement: boolean;
  isMembreAdministratif: boolean;
  isDirecteurEtudes: boolean;
  isAnimateurEtablissement: boolean;
  isPersonnelAdministratif: boolean;
  isPersonnelVieScolaire: boolean;
  getAdminMetadata: () => AdminMetadata | null;
  activeRole: UserRole | null;
  setActiveRole: (role: UserRole, etablissementId?: string) => Promise<void>;
  availableRoles: Array<{
    role: UserRole;
    label: string;
    etablissementId?: string;
    etablissementNom?: string;
  }>;
  getEtablissementForRole: (role: UserRole) => { id: string; nom: string } | null;
  canInviteEnseignant: () => Promise<boolean>;
  getPlafondRestant: () => Promise<number>;
  getDepartementAE: () => string | null;
  isProfileComplete: boolean;
  
  // NOUVEAUX CHAMPS POUR AUTORITÉ ET PARTENAIRE
  perimetre: string | null;
  zoneId: string | null;
  organisation: string | null;
  organisationType: string | null;
  adminType: string | null;
  adminDepartement: string | null;
  adminFonction: string | null;
  partenariatEtablissements: string[];
  
  // PHASE 5 – Affiliation enseignant
  isAffiliated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Ordre de priorité des rôles (du plus élevé au plus bas)
// Les rôles avec le même numéro sont à égalité hiérarchique
const ROLE_PRIORITY: Record<UserRole, number> = {
  admin: 1,
  chef_etablissement: 2,
  autorite: 2,
  partenaire: 2,
  membre_administratif: 3,
  enseignant: 4,
  parent: 5,
  eleve: 6,
  visiteur: 7,
};

const getRoleLabel = (role: UserRole): string => {
  switch (role) {
    case 'eleve': return 'Élève';
    case 'parent': return 'Parent';
    case 'enseignant': return 'Enseignant';
    case 'chef_etablissement': return "Chef d'établissement";
    case 'admin': return 'Administrateur';
    case 'autorite': return 'Autorité';
    case 'partenaire': return 'Partenaire';
    case 'visiteur': return 'Visiteur';
    case 'membre_administratif': return 'Membre administratif';
    default: return role;
  }
};

// Fonction de détermination du rôle principal selon la logique de priorité
const getPrimaryRoleFromRoles = (
  activeRole: UserRole | null,
  userRoles: UserRoleRecord[]
): UserRole | null => {
  // Cas 1 : Aucun rôle
  if (userRoles.length === 0) return null;

  // Cas 2 : Un active_role est défini ET l'utilisateur possède encore ce rôle
  if (activeRole && userRoles.some(r => r.role === activeRole)) {
    return activeRole;
  }

  // Cas 3 : Trouver la priorité la plus élevée
  const highestPriority = Math.min(...userRoles.map(r => ROLE_PRIORITY[r.role]));

  // Cas 4 : Filtrer les rôles avec cette priorité
  const topRoles = userRoles.filter(r => ROLE_PRIORITY[r.role] === highestPriority);

  // Cas 5 : Un seul rôle à priorité maximale → l'utiliser automatiquement
  if (topRoles.length === 1) {
    return topRoles[0].role;
  }

  // Cas 6 : Plusieurs rôles à priorité égale → l'utilisateur doit choisir
  return null;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<UserRoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRole, setActiveRoleState] = useState<UserRole | null>(null);
  const [activeEtablissementId, setActiveEtablissementId] = useState<string | null>(null);
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [isAffiliated, setIsAffiliated] = useState(false);
  
  // NOUVEAUX ÉTATS
  const [perimetre, setPerimetre] = useState<string | null>(null);
  const [zoneId, setZoneId] = useState<string | null>(null);
  const [organisation, setOrganisation] = useState<string | null>(null);
  const [organisationType, setOrganisationType] = useState<string | null>(null);
  const [adminType, setAdminType] = useState<string | null>(null);
  const [adminDepartement, setAdminDepartement] = useState<string | null>(null);
  const [adminFonction, setAdminFonction] = useState<string | null>(null);
  const [partenariatEtablissements, setPartenariatEtablissements] = useState<string[]>([]);

  const getCurrentEtablissementId = async (): Promise<string | null> => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('etablissement_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data?.etablissement_id || null;
    } catch (error) {
      console.error('Error getting current etablissement:', error);
      return null;
    }
  };

  const canInviteEnseignant = async (): Promise<boolean> => {
    if (!isAnimateurEtablissement) return false;

    const adminMeta = getAdminMetadata();
    const departement = adminMeta?.departement;
    if (!departement) return false;

    try {
      const etablissementId = await getCurrentEtablissementId();
      if (!etablissementId) return false;

      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/check-plafond-ae`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          ae_id: user?.id,
          departement,
          etablissement_id: etablissementId,
        }),
      });

      const result = await response.json();
      return result.success && result.allowed;
    } catch (error) {
      console.error('Error checking invite permission:', error);
      return false;
    }
  };

  const getPlafondRestant = async (): Promise<number> => {
    if (!isAnimateurEtablissement) return 0;

    const adminMeta = getAdminMetadata();
    const departement = adminMeta?.departement;
    if (!departement) return 0;

    try {
      const etablissementId = await getCurrentEtablissementId();
      if (!etablissementId) return 0;

      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/check-plafond-ae`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          ae_id: user?.id,
          departement,
          etablissement_id: etablissementId,
        }),
      });

      const result = await response.json();
      if (result.success) {
        return result.remaining;
      }
      return 0;
    } catch (error) {
      console.error('Error getting plafond restant:', error);
      return 0;
    }
  };

  const getDepartementAE = (): string | null => {
    if (!isAnimateurEtablissement) return null;
    const adminMeta = getAdminMetadata();
    return adminMeta?.departement || null;
  };

  // Vérifier l'affiliation de l'enseignant (établissement abonné)
  const checkAffiliation = useCallback(async () => {
    if (!user) {
      setIsAffiliated(false);
      return;
    }

    // Vérifier si l'utilisateur a le rôle enseignant
    const enseignantRole = roles.find(r => r.role === 'enseignant' && r.is_active);
    if (!enseignantRole) {
      setIsAffiliated(false);
      return;
    }

    // Récupérer l'établissement via enseignant_etablissements
    const { data: enseignantEtab, error } = await supabase
      .from('enseignant_etablissements')
      .select('etablissement_id')
      .eq('enseignant_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !enseignantEtab?.etablissement_id) {
      setIsAffiliated(false);
      return;
    }

    const affiliated = await isEtablissementAbonne(enseignantEtab.etablissement_id);
    setIsAffiliated(affiliated);
  }, [user, roles]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadUserData(session.user.id);
        } else {
          setProfile(null);
          setRoles([]);
          setActiveRoleState(null);
          setActiveEtablissementId(null);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (roles.length > 0 && user) {
      checkAffiliation();
    }
  }, [roles, user, checkAffiliation]);

  const loadUserData = async (userId: string) => {
    try {
      const [profileResponse, rolesResponse] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        supabase.from('user_roles').select('*').eq('user_id', userId).eq('is_active', true),
      ]);

      console.log('[AuthContext] Profile loaded:', profileResponse.data);
      console.log('[AuthContext] active_role:', profileResponse.data?.active_role);
      console.log('[AuthContext] Roles loaded:', rolesResponse.data?.length, 'roles');

      let profileData = profileResponse.data;
      let rolesData = rolesResponse.data || [];

      if (profileData) {
        setProfile(profileData);
        
        // Calcul de isProfileComplete
        const isComplete = !!(profileData.nom && profileData.prenom);
        setIsProfileComplete(isComplete);
        
        // NOUVEAU : Chargement des champs Autorité/Partenaire
        setPerimetre(profileData.perimetre || null);
        setZoneId(profileData.zone_id || null);
        setOrganisation(profileData.organisation || null);
        setOrganisationType(profileData.organisation_type || null);
      }

      if (rolesData) {
        setRoles(rolesData);
        
        // NOUVEAU : Récupération des fonctions spéciales (membre_administratif)
        const adminRole = rolesData.find(r => r.role === 'membre_administratif');
        if (adminRole?.metadata) {
          setAdminType(adminRole.metadata.type_admin || null);
          setAdminDepartement(adminRole.metadata.departement || null);
          setAdminFonction(adminRole.metadata.fonction || null);
        } else {
          setAdminType(null);
          setAdminDepartement(null);
          setAdminFonction(null);
        }
      }

      // NOUVEAU : Récupération des établissements partenaires (pour Partenaire)
      const currentActiveRole = profileData?.active_role as UserRole | null;
      if (currentActiveRole === 'partenaire') {
        const { data: partenariats } = await supabase
          .from('partenariats_etablissements')
          .select('etablissement_id')
          .eq('partenaire_id', userId)
          .eq('statut', 'actif');
        
        setPartenariatEtablissements(partenariats?.map(p => p.etablissement_id) || []);
      } else {
        setPartenariatEtablissements([]);
      }

      // Déterminer le rôle actif
      const determinedRole = getPrimaryRoleFromRoles(currentActiveRole, rolesData);

      if (determinedRole) {
        setActiveRoleState(determinedRole);
      } else {
        setActiveRoleState(null);
      }

    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadUserData(user.id);
      await checkAffiliation();
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, profileData: Partial<Profile>) => {
    // 1. Créer l'utilisateur dans auth.users
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    if (data.user) {
      // 2. Créer le profil dans profiles avec active_role = 'visiteur'
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        ...profileData,
        is_active: true,
        active_role: 'visiteur',
      });
      if (profileError) throw profileError;

      // 3. Créer le rôle visiteur dans user_roles
      const { error: roleError } = await supabase.from('user_roles').insert({
        user_id: data.user.id,
        role: 'visiteur',
        is_active: true,
      });
      if (roleError) throw roleError;
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn('Erreur API lors de la déconnexion (peut être ignorée):', error.message);
      }
    } catch (error) {
      console.warn('Exception lors de la déconnexion API:', error);
    }
    // On ne lance pas d'erreur, on laisse le nettoyage local se faire
    // Le state va se vider via onAuthStateChange
  };

  // ✅ CORRECTION : Stabilisation de hasRole avec useCallback
  const hasRole = useCallback((role: UserRole, etablissementId?: string): boolean => {
    if (etablissementId) {
      return roles.some(r => r.role === role && r.etablissement_id === etablissementId && r.is_active);
    }
    return roles.some(r => r.role === role && r.is_active);
  }, [roles]);

  const getAdminMetadata = (): AdminMetadata | null => {
    const adminRole = roles.find(r => r.role === 'membre_administratif');
    if (!adminRole) return null;
    return adminRole.metadata as AdminMetadata;
  };

  // ✅ CORRECTION : Utilisation de useMemo pour les booléens dérivés (dépendent de hasRole via roles)
  const isChefEtablissement = useMemo(() => hasRole('chef_etablissement'), [hasRole]);
  const isMembreAdministratif = useMemo(() => hasRole('membre_administratif'), [hasRole]);
  const adminMeta = getAdminMetadata();

  const isDirecteurEtudes = useMemo(() => isMembreAdministratif && adminMeta?.type_admin === 'de', [isMembreAdministratif, adminMeta]);
  const isAnimateurEtablissement = useMemo(() => isMembreAdministratif && adminMeta?.type_admin === 'ae', [isMembreAdministratif, adminMeta]);
  const isPersonnelAdministratif = useMemo(() => isMembreAdministratif && adminMeta?.type_admin === 'administratif', [isMembreAdministratif, adminMeta]);
  const isPersonnelVieScolaire = useMemo(() => isMembreAdministratif && adminMeta?.type_admin === 'vie_scolaire', [isMembreAdministratif, adminMeta]);

  // Calcul du rôle principal selon la logique de priorité (réexécuté à chaque render)
  const primaryRole = useMemo(() => {
    const activeRoles = roles.filter(r => r.is_active);

    if (activeRoles.length === 0) return null;

    // 1. Si un active_role est défini et toujours valide → le conserver (persistance)
    const currentActiveRole = profile?.active_role as UserRole | null;
    if (currentActiveRole && activeRoles.some(r => r.role === currentActiveRole)) {
      return currentActiveRole;
    }

    // 2. Trouver la priorité la plus élevée parmi les rôles
    const highestPriority = Math.min(...activeRoles.map(r => ROLE_PRIORITY[r.role]));

    // 3. Filtrer les rôles avec cette priorité
    const topRoles = activeRoles.filter(r => ROLE_PRIORITY[r.role] === highestPriority);

    // 4. Un seul rôle → l'utiliser automatiquement
    if (topRoles.length === 1) {
      return topRoles[0].role;
    }

    // 5. Plusieurs rôles à priorité égale → l'utilisateur doit choisir
    return null;
  }, [roles, profile?.active_role]);

  const getEtablissementForRole = (role: UserRole): { id: string; nom: string } | null => {
    const roleRecord = roles.find(r => r.role === role && r.etablissement_id);
    if (!roleRecord || !roleRecord.etablissement_id) return null;

    const etab = (profile as any)?.etablissement_id === roleRecord.etablissement_id
      ? { id: roleRecord.etablissement_id, nom: (profile as any)?.etablissement_nom || 'Établissement' }
      : { id: roleRecord.etablissement_id, nom: 'Établissement' };

    return etab;
  };

  const availableRoles = useMemo(() => {
    const uniqueRoles = new Map<string, { role: UserRole; etablissementId?: string; etablissementNom?: string }>();

    for (const roleRecord of roles) {
      const key = roleRecord.role;
      if (!uniqueRoles.has(key)) {
        uniqueRoles.set(key, {
          role: roleRecord.role,
          etablissementId: roleRecord.etablissement_id,
          etablissementNom: undefined,
        });
      }
    }

    return Array.from(uniqueRoles.values()).map(r => ({
      role: r.role,
      label: getRoleLabel(r.role),
      etablissementId: r.etablissementId,
      etablissementNom: r.etablissementNom,
    }));
  }, [roles]);

  const setActiveRole = async (role: UserRole, etablissementId?: string) => {
    if (!user) return;

    try {
      // Vérifier que l'utilisateur possède bien ce rôle
      const hasRoleRecord = roles.some(
        r => r.role === role && (!etablissementId || r.etablissement_id === etablissementId) && r.is_active
      );

      if (!hasRoleRecord) {
        throw new Error(`Vous n'avez pas le rôle ${role}`);
      }

      // Mettre à jour active_role dans profiles (PERSISTANCE)
      const { error } = await supabase
        .from('profiles')
        .update({ active_role: role })
        .eq('id', user.id);

      if (error) throw error;

      // Mettre à jour l'état local
      setActiveRoleState(role);
      setActiveEtablissementId(etablissementId || null);

      // Recharger les données pour mettre à jour l'interface
      await refreshProfile();
    } catch (error) {
      console.error('Error setting active role:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        roles,
        loading,
        signIn,
        signUp,
        signOut,
        hasRole,
        primaryRole,
        refreshProfile,
        isChefEtablissement,
        isMembreAdministratif,
        isDirecteurEtudes,
        isAnimateurEtablissement,
        isPersonnelAdministratif,
        isPersonnelVieScolaire,
        getAdminMetadata,
        activeRole,
        setActiveRole,
        availableRoles,
        getEtablissementForRole,
        canInviteEnseignant,
        getPlafondRestant,
        getDepartementAE,
        isProfileComplete,
        
        // NOUVEAUX
        perimetre,
        zoneId,
        organisation,
        organisationType,
        adminType,
        adminDepartement,
        adminFonction,
        partenariatEtablissements,
        
        // PHASE 5 – Affiliation enseignant
        isAffiliated,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}