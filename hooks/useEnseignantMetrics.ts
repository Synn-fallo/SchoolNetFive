import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface EnseignantMetrics {
  // Volumétrie
  totalEnseignants: number;
  enseignantsActifs: number;
  enseignantsInactifs: number;
  invitationsEnCours: number;
  invitationsExpirees: number;
  repartitionParDepartement: Array<{ departement: string; count: number }>;
  
  // Ratios
  tauxAcceptationInvitations: number | null;
  delaiMoyenAcceptation: number | null; // en jours
  enseignantsAvecClasses: number;
  enseignantsAvecGroupes: number;
  tauxEnseignantsMultiEtablissements: number | null;
  
  // Plafonds
  plafondsParDepartement: Array<{
    departement: string;
    plafond: number;
    actuel: number;
    disponible: number;
    pourcentage: number;
    ae_nom?: string;
    ae_prenom?: string;
  }>;
  
  // Alertes
  enseignantsSansClasseDepuis: number; // >7 jours
  invitationsExpirées: number;
  plafondsAtteints: number;
  groupesSansResponsable: number;
  
  // Charges
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useEnseignantMetrics(etablissementId?: string): EnseignantMetrics {
  const { user, isChefEtablissement, isDirecteurEtudes, isAnimateurEtablissement } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<Omit<EnseignantMetrics, 'loading' | 'error' | 'refresh'>>({
    totalEnseignants: 0,
    enseignantsActifs: 0,
    enseignantsInactifs: 0,
    invitationsEnCours: 0,
    invitationsExpirees: 0,
    repartitionParDepartement: [],
    tauxAcceptationInvitations: null,
    delaiMoyenAcceptation: null,
    enseignantsAvecClasses: 0,
    enseignantsAvecGroupes: 0,
    tauxEnseignantsMultiEtablissements: null,
    plafondsParDepartement: [],
    enseignantsSansClasseDepuis: 0,
    invitationsExpirées: 0,
    plafondsAtteints: 0,
    groupesSansResponsable: 0,
  });

  const getCurrentEtablissementId = useCallback(async (): Promise<string | null> => {
    if (etablissementId) return etablissementId;
    
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
    } catch (err) {
      console.error('Error getting etablissement id:', err);
      return null;
    }
  }, [user, etablissementId]);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const currentEtablissementId = await getCurrentEtablissementId();
      if (!currentEtablissementId) {
        setLoading(false);
        return;
      }

      // 1. Récupérer tous les enseignants de l'établissement
      const { data: enseignantsData, error: enseignantsError } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          is_active,
          metadata,
          profiles:user_id (
            id,
            nom,
            prenom,
            email
          )
        `)
        .eq('etablissement_id', currentEtablissementId)
        .eq('role', 'enseignant');

      if (enseignantsError) throw enseignantsError;

      const enseignants = enseignantsData || [];
      const totalEnseignants = enseignants.length;
      const enseignantsActifs = enseignants.filter(e => e.is_active === true).length;
      const enseignantsInactifs = totalEnseignants - enseignantsActifs;

      // 2. Récupérer les invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('invitation_codes')
        .select('*')
        .eq('etablissement_id', currentEtablissementId)
        .eq('role', 'enseignant');

      if (invitationsError) throw invitationsError;

      const invitations = invitationsData || [];
      const now = new Date();
      const invitationsEnCours = invitations.filter(i => 
        i.statut === 'en_attente' && new Date(i.expires_at) > now
      ).length;
      const invitationsExpirees = invitations.filter(i => 
        i.statut === 'expiree' || (i.statut === 'en_attente' && new Date(i.expires_at) <= now)
      ).length;
      
      // Taux d'acceptation
      const acceptees = invitations.filter(i => i.statut === 'acceptee').length;
      const totalInvitationsNonExpirees = invitations.filter(i => 
        i.statut !== 'expiree' && !(i.statut === 'en_attente' && new Date(i.expires_at) <= now)
      ).length;
      const tauxAcceptationInvitations = totalInvitationsNonExpirees > 0 
        ? (acceptees / totalInvitationsNonExpirees) * 100 
        : null;

      // Délai moyen d'acceptation
      let delaiTotal = 0;
      let delaiCount = 0;
      for (const inv of invitations) {
        if (inv.statut === 'acceptee' && inv.created_at && inv.updated_at) {
          const created = new Date(inv.created_at);
          const accepted = new Date(inv.updated_at);
          const days = (accepted.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
          delaiTotal += days;
          delaiCount++;
        }
      }
      const delaiMoyenAcceptation = delaiCount > 0 ? delaiTotal / delaiCount : null;

      // 3. Récupérer les rattachements aux classes
      const { data: enseignantsClasses, error: classesError } = await supabase
        .from('enseignant_classes')
        .select('enseignant_id')
        .eq('etablissement_id', currentEtablissementId);

      if (classesError) throw classesError;

      const enseignantsAvecClasses = new Set(enseignantsClasses?.map(ec => ec.enseignant_id)).size;

      // 4. Récupérer les rattachements aux groupes
      const { data: enseignantsGroupes, error: groupesError } = await supabase
        .from('enseignant_groupes')
        .select('enseignant_id')
        .eq('etablissement_id', currentEtablissementId);

      if (groupesError) throw groupesError;

      const enseignantsAvecGroupes = new Set(enseignantsGroupes?.map(eg => eg.enseignant_id)).size;

      // 5. Répartition par département (via metadata des enseignants)
      const departementMap = new Map<string, number>();
      for (const enseignant of enseignants) {
        const departement = enseignant.metadata?.departement;
        if (departement) {
          departementMap.set(departement, (departementMap.get(departement) || 0) + 1);
        }
      }
      const repartitionParDepartement = Array.from(departementMap.entries())
        .map(([departement, count]) => ({ departement, count }))
        .sort((a, b) => b.count - a.count);

      // 6. Enseignants multi-établissements
      const { data: multiEtabData, error: multiError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'enseignant')
        .eq('is_active', true);

      if (multiError) throw multiError;

      const userCounts = new Map<string, number>();
      multiEtabData?.forEach(role => {
        userCounts.set(role.user_id, (userCounts.get(role.user_id) || 0) + 1);
      });
      const multiEtabCount = Array.from(userCounts.values()).filter(count => count > 1).length;
      const totalEnseignantsUniques = new Set(multiEtabData?.map(r => r.user_id)).size;
      const tauxEnseignantsMultiEtablissements = totalEnseignantsUniques > 0 
        ? (multiEtabCount / totalEnseignantsUniques) * 100 
        : null;

      // 7. Plafonds par département (via délégations AE)
      const { data: delegationsAE, error: delegError } = await supabase
        .from('delegations')
        .select(`
          *,
          delegue:delegue_id (
            id,
            profiles:profiles!inner (nom, prenom)
          )
        `)
        .eq('etablissement_id', currentEtablissementId)
        .eq('type', 'ae')
        .eq('is_active', true);

      if (delegError) throw delegError;

      const plafondsParDepartement = await Promise.all(
        (delegationsAE || []).map(async (deleg) => {
          // Compter les enseignants dans ce département
          const { data: enseignantsDept } = await supabase
            .from('user_roles')
            .select('user_id')
            .eq('etablissement_id', currentEtablissementId)
            .eq('role', 'enseignant')
            .eq('is_active', true)
            .filter('metadata->>departement', 'eq', deleg.departement);

          const actuel = enseignantsDept?.length || 0;
          const plafond = deleg.plafond || 0;
          const disponible = Math.max(0, plafond - actuel);
          const pourcentage = plafond > 0 ? (actuel / plafond) * 100 : 0;

          return {
            departement: deleg.departement || 'Non défini',
            plafond,
            actuel,
            disponible,
            pourcentage: Math.round(pourcentage),
            ae_nom: deleg.delegue?.profiles?.nom,
            ae_prenom: deleg.delegue?.profiles?.prenom,
          };
        })
      );

      const plafondsAtteints = plafondsParDepartement.filter(p => p.disponible === 0).length;

      // 8. Enseignants sans classe depuis plus de 7 jours
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const enseignantsSansClasse = enseignants.filter(e => {
        const aDesClasses = enseignantsClasses?.some(ec => ec.enseignant_id === e.user_id);
        return !aDesClasses;
      });
      
      // Vérifier si ces enseignants ont été créés il y a plus de 7 jours
      let sansClasseCount = 0;
      for (const enseignant of enseignantsSansClasse) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('created_at')
          .eq('id', enseignant.user_id)
          .single();
        
        if (profile && new Date(profile.created_at) < sevenDaysAgo) {
          sansClasseCount++;
        }
      }
      
      const enseignantsSansClasseDepuis = sansClasseCount;

      // 9. Groupes sans responsable
      const { data: groupesData, error: groupesListError } = await supabase
        .from('groupes_eleves')
        .select('id')
        .eq('etablissement_id', currentEtablissementId);

      if (groupesListError) throw groupesListError;

      let groupesSansResponsable = 0;
      if (groupesData) {
        for (const groupe of groupesData) {
          const { data: responsables } = await supabase
            .from('enseignant_groupes')
            .select('id')
            .eq('groupe_id', groupe.id)
            .eq('role', 'responsable')
            .limit(1);
          
          if (!responsables || responsables.length === 0) {
            groupesSansResponsable++;
          }
        }
      }

      setMetrics({
        totalEnseignants,
        enseignantsActifs,
        enseignantsInactifs,
        invitationsEnCours,
        invitationsExpirees,
        repartitionParDepartement,
        tauxAcceptationInvitations: tauxAcceptationInvitations !== null ? Math.round(tauxAcceptationInvitations) : null,
        delaiMoyenAcceptation: delaiMoyenAcceptation !== null ? Math.round(delaiMoyenAcceptation * 10) / 10 : null,
        enseignantsAvecClasses,
        enseignantsAvecGroupes,
        tauxEnseignantsMultiEtablissements: tauxEnseignantsMultiEtablissements !== null ? Math.round(tauxEnseignantsMultiEtablissements) : null,
        plafondsParDepartement,
        enseignantsSansClasseDepuis,
        invitationsExpirées: invitationsExpirees,
        plafondsAtteints,
        groupesSansResponsable,
      });

    } catch (err) {
      console.error('Error fetching enseignant metrics:', err);
      setError(err instanceof Error ? err.message : 'Erreur de chargement des métriques');
    } finally {
      setLoading(false);
    }
  }, [getCurrentEtablissementId]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    ...metrics,
    loading,
    error,
    refresh: fetchMetrics,
  };
}