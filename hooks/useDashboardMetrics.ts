import { useMetrics } from '@/contexts/MetricsContext';

// Ce hook devient un simple wrapper du contexte
// L'interface reste identique pour ne pas casser les composants existants
export function useDashboardMetrics(etablissementId?: string) {
  const metrics = useMetrics();
  
  // Note: etablissementId n'est pas utilisé dans cette version
  // car le contexte charge les métriques globales pour l'admin
  // Si plus tard tu as besoin de filtrer par établissement, on pourra l'ajouter
  
  return {
    totalEtablissements: metrics.totalEtablissements,
    totalDemandes: metrics.totalDemandes,
    demandesEnAttente: metrics.demandesEnAttente,
    demandesEnAttente48h: metrics.demandesEnAttente48h,
    tauxConversionPhase1to2: metrics.tauxConversionPhase1to2,
    tauxConversionPhase2toAbonnement: metrics.tauxConversionPhase2toAbonnement,
    tempsMoyenPhase1to2: metrics.tempsMoyenPhase1to2,
    tempsMoyenPhase2toAbonnement: metrics.tempsMoyenPhase2toAbonnement,
    tauxValidationAuto: metrics.tauxValidationAuto,
    tauxRejet: metrics.tauxRejet,
    motifsRejetPrincipaux: metrics.motifsRejetPrincipaux,
    etablissementsPhase2Plus30Jours: metrics.etablissementsPhase2Plus30Jours,
    paiementsEchoues: metrics.paiementsEchoues,
    suspicionsDoublons: metrics.suspicionsDoublons,
    totalValidations: metrics.totalValidations,
    totalAbonnements: metrics.totalAbonnements,
    loading: metrics.loading,
    error: metrics.error,
    refresh: metrics.refresh,
  };
}