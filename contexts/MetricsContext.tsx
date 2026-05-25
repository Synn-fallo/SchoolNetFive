import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface DashboardMetrics {
  totalEtablissements: number;
  totalDemandes: number;
  demandesEnAttente: number;
  demandesEnAttente48h: number;
  tauxConversionPhase1to2: number | null;
  tauxConversionPhase2toAbonnement: number | null;
  tempsMoyenPhase1to2: number | null;
  tempsMoyenPhase2toAbonnement: number | null;
  tauxValidationAuto: number | null;
  tauxRejet: number | null;
  motifsRejetPrincipaux: { motif: string; count: number }[];
  etablissementsPhase2Plus30Jours: number;
  paiementsEchoues: number;
  suspicionsDoublons: number;
  totalValidations: number;
  totalAbonnements: { essentiel: number; premium: number; prestige: number };
  loading: boolean;
  error: string | null;
}

interface MetricsContextType extends DashboardMetrics {
  refresh: () => Promise<void>;
}

const DEFAULT_METRICS = {
  totalEtablissements: 0,
  totalDemandes: 0,
  demandesEnAttente: 0,
  demandesEnAttente48h: 0,
  tauxConversionPhase1to2: null,
  tauxConversionPhase2toAbonnement: null,
  tempsMoyenPhase1to2: null,
  tempsMoyenPhase2toAbonnement: null,
  tauxValidationAuto: null,
  tauxRejet: null,
  motifsRejetPrincipaux: [],
  etablissementsPhase2Plus30Jours: 0,
  paiementsEchoues: 0,
  suspicionsDoublons: 0,
  totalValidations: 0,
  totalAbonnements: { essentiel: 0, premium: 0, prestige: 0 },
  loading: true,
  error: null,
};

const MetricsContext = createContext<MetricsContextType | undefined>(undefined);

export function MetricsProvider({ children }: { children: React.ReactNode }) {
  const { user, hasRole, primaryRole } = useAuth();
  const [state, setState] = useState(DEFAULT_METRICS);
  
  const isFetchingRef = useRef(false);
  const initialLoadDoneRef = useRef(false);

  const fetchMetrics = useCallback(async () => {
    // Seul l'admin a besoin des métriques globales
    const isAdmin = hasRole('admin') || primaryRole === 'admin';
    
    if (!isAdmin) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // 1. Compter les établissements
      const { count: totalEtablissements, error: etabError } = await supabase
        .from('etablissements')
        .select('*', { count: 'exact', head: true });
      if (etabError) throw etabError;

      // 2. Récupérer les demandes d'établissement
      const { data: demandes, error: demandesError } = await supabase
        .from('demandes_etablissement')
        .select('*');
      if (demandesError) throw demandesError;

      const demandesArray = demandes || [];
      const totalDemandes = demandesArray.length;

      // 3. Demandes en attente
      const demandesEnAttente = demandesArray.filter(
        d => d.statut === 'en_attente' || d.statut === 'en_cours'
      ).length;

      // 4. Demandes en attente > 48h
      const now = new Date();
      const demandesEnAttente48h = demandesArray.filter(d => {
        if (d.statut !== 'en_attente' && d.statut !== 'en_cours') return false;
        const created = new Date(d.created_at);
        const hoursDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
        return hoursDiff > 48;
      }).length;

      // 5. Établissements en Phase 2
      const { data: etablissements, error: etablissementsError } = await supabase
        .from('etablissements')
        .select('statut, created_at');
      if (etablissementsError) throw etablissementsError;

      const etablissementsPhase2 = etablissements?.filter(e => e.statut === 'INFOS_MINIMALES_COMPLETE') || [];
      const etablissementsPhase2Plus30Jours = etablissementsPhase2.filter(e => {
        const created = new Date(e.created_at);
        const daysDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff > 30;
      }).length;

      // 6. Abonnements
      const { data: abonnements, error: aboError } = await supabase
        .from('abonnements')
        .select('plan, is_active');
      if (aboError) throw aboError;

      const abonnementsArray = abonnements || [];
      const totalAbonnements = {
        essentiel: abonnementsArray.filter(a => a.plan === 'basique' && a.is_active).length,
        premium: abonnementsArray.filter(a => a.plan === 'premium' && a.is_active).length,
        prestige: abonnementsArray.filter(a => a.plan === 'entreprise' && a.is_active).length,
      };

      // 7. Demandes validées
      const validations = demandesArray.filter(d => d.statut === 'valide');
      const totalValidations = validations.length;

      // 8. Taux de conversion
      const tauxConversionPhase1to2 = totalDemandes > 0
        ? (etablissementsPhase2.length / totalDemandes) * 100
        : null;

      const abonnementsActifs = abonnementsArray.filter(a => a.is_active);
      const tauxConversionPhase2toAbonnement = etablissementsPhase2.length > 0
        ? (abonnementsActifs.length / etablissementsPhase2.length) * 100
        : null;

      // 9. Temps moyen Phase 1 → Phase 2
      let tempsTotalPhase1to2 = 0;
      let tempsCountPhase1to2 = 0;

      for (const demande of validations) {
        if (demande.created_at && demande.traitee_at) {
          const created = new Date(demande.created_at);
          const traitee = new Date(demande.traitee_at);
          const diffHours = (traitee.getTime() - created.getTime()) / (1000 * 60 * 60);
          tempsTotalPhase1to2 += diffHours;
          tempsCountPhase1to2++;
        }
      }

      const tempsMoyenPhase1to2 = tempsCountPhase1to2 > 0
        ? Math.round(tempsTotalPhase1to2 / tempsCountPhase1to2)
        : null;

      // 10. Taux validation auto
      const validationsAuto = validations.filter(v => v.mode_verification === 'auto');
      const tauxValidationAuto = validations.length > 0
        ? (validationsAuto.length / validations.length) * 100
        : null;

      // 11. Taux rejet
      const rejets = demandesArray.filter(d => d.statut === 'rejete');
      const tauxRejet = totalDemandes > 0
        ? (rejets.length / totalDemandes) * 100
        : null;

      // 12. Motifs de rejet
      const motifsMap = new Map<string, number>();
      for (const rejet of rejets) {
        const comment = rejet.commentaire_admin || 'Motif non spécifié';
        motifsMap.set(comment, (motifsMap.get(comment) || 0) + 1);
      }
      const motifsRejetPrincipaux = Array.from(motifsMap.entries())
        .map(([motif, count]) => ({ motif, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setState({
        totalEtablissements: totalEtablissements || 0,
        totalDemandes,
        demandesEnAttente,
        demandesEnAttente48h,
        tauxConversionPhase1to2: tauxConversionPhase1to2 !== null ? Math.round(tauxConversionPhase1to2) : null,
        tauxConversionPhase2toAbonnement: tauxConversionPhase2toAbonnement !== null ? Math.round(tauxConversionPhase2toAbonnement) : null,
        tempsMoyenPhase1to2,
        tempsMoyenPhase2toAbonnement: null,
        tauxValidationAuto: tauxValidationAuto !== null ? Math.round(tauxValidationAuto) : null,
        tauxRejet: tauxRejet !== null ? Math.round(tauxRejet) : null,
        motifsRejetPrincipaux,
        etablissementsPhase2Plus30Jours,
        paiementsEchoues: 0,
        suspicionsDoublons: 0,
        totalValidations,
        totalAbonnements,
        loading: false,
        error: null,
      });

    } catch (err) {
      console.error('[MetricsContext] Erreur:', err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Erreur de chargement des métriques',
      }));
    } finally {
      isFetchingRef.current = false;
      initialLoadDoneRef.current = true;
    }
  }, [hasRole, primaryRole]);

  // Chargement initial (une seule fois)
  useEffect(() => {
    if (!initialLoadDoneRef.current) {
      fetchMetrics();
    }
  }, [fetchMetrics]);

  const refresh = useCallback(async () => {
    initialLoadDoneRef.current = false;
    await fetchMetrics();
  }, [fetchMetrics]);

  return (
    <MetricsContext.Provider value={{ ...state, refresh }}>
      {children}
    </MetricsContext.Provider>
  );
}

export function useMetrics() {
  const context = useContext(MetricsContext);
  if (context === undefined) {
    throw new Error('useMetrics must be used within a MetricsProvider');
  }
  return context;
}