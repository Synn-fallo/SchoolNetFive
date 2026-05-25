// /home/project/hooks/useChefNotes.ts
// Hook pour la récupération des données de notes pour le chef d'établissement
// PHASE C.2 : Utilise periodeId (UUID) au lieu de Periode (S1/T1)

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useSubscriptionCheck } from './useSubscriptionCheck';
import { 
  ClasseStats, 
  MatiereStats, 
  EleveWithMoyenne, 
  CALCULABLE_STATUSES,
  Alert as AlertType
} from '@/types/notes.types';

interface UseChefNotesReturn {
  classesStats: ClasseStats[];
  matieresStats: MatiereStats[];
  elevesList: EleveWithMoyenne[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  statsGenerales: {
    moyenneEtablissement: number;
    tauxReussite: number;
    meilleureClasse: { nom: string; moyenne: number };
    plusFaibleClasse: { nom: string; moyenne: number };
  };
  alertes: AlertType[];
  graphiqueComparatif: { classe: string; moyenne: number }[];
  graphiqueEvolution: { date: string; moyenne: number }[];
  isSubscribed: boolean | null;
  subscriptionLoading: boolean;
  loadDistributionNotes: () => Promise<Map<string, number[]>>;
}

export function useChefNotes(
  etablissementId: string,
  anneeScolaireId: string,
  selectedClasseId: string | null,
  selectedPeriodeId: string  // ← MODIFIÉ : UUID au lieu de Periode
): UseChefNotesReturn {
  const [classesStats, setClassesStats] = useState<ClasseStats[]>([]);
  const [matieresStats, setMatieresStats] = useState<MatiereStats[]>([]);
  const [elevesList, setElevesList] = useState<EleveWithMoyenne[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [statsGenerales, setStatsGenerales] = useState({
    moyenneEtablissement: 0,
    tauxReussite: 0,
    meilleureClasse: { nom: '', moyenne: 0 },
    plusFaibleClasse: { nom: '', moyenne: 0 },
  });
  const [alertes, setAlertes] = useState<AlertType[]>([]);
  const [graphiqueComparatif, setGraphiqueComparatif] = useState<{ classe: string; moyenne: number }[]>([]);
  const [graphiqueEvolution, setGraphiqueEvolution] = useState<{ date: string; moyenne: number }[]>([]);

  const { isSubscribed, loading: subscriptionLoading } = useSubscriptionCheck(etablissementId);

  console.log('🔍 [useChefNotes] Initialisation:', { 
    etablissementId, 
    anneeScolaireId, 
    selectedClasseId, 
    selectedPeriodeId,
    isSubscribed 
  });

  // Charger les statistiques des classes
  const loadClassesStats = useCallback(async () => {
    if (!etablissementId || !anneeScolaireId || !isSubscribed) return [];

    console.log('🔄 [useChefNotes] loadClassesStats - début');

    try {
      const { data: classes, error: classesError } = await supabase
        .from('classes')
        .select('id, nom, niveau')
        .eq('etablissement_id', etablissementId)
        .eq('is_active', true)
        .eq('annee_scolaire_id', anneeScolaireId);

      if (classesError) throw classesError;

      console.log('✅ [useChefNotes] Classes trouvées:', classes?.length);

      const stats: ClasseStats[] = await Promise.all(
        (classes || []).map(async (classe) => {
          const { data: eleves, error: elevesError } = await supabase
            .from('eleves')
            .select('id')
            .eq('classe_id', classe.id)
            .eq('statut', 'actif');

          if (elevesError) throw elevesError;

          const effectif = eleves?.length || 0;
          const eleveIds = eleves?.map(e => e.id) || [];
          
          if (eleveIds.length === 0) {
            return {
              id: classe.id,
              nom: classe.nom,
              niveau: classe.niveau || '',
              effectif: 0,
              moyenneGenerale: 0,
              rang: 0,
              tauxReussite: 0,
              meilleureMoyenne: 0,
              plusFaibleMoyenne: 0,
            };
          }

          const { data: notes, error: notesError } = await supabase
            .from('notes')
            .select(`
              note,
              eleve_id,
              devoir:devoir_id (
                coefficient,
                note_sur,
                matiere:matiere_id (coefficient)
              )
            `)
            .in('eleve_id', eleveIds)
            .in('statut', CALCULABLE_STATUSES);

          if (notesError) throw notesError;

          const moyennesParEleve = eleveIds.map(eleveId => {
            const notesEleve = notes?.filter(n => n.eleve_id === eleveId) || [];
            let sommePonderee = 0;
            let sommeCoeffs = 0;
            notesEleve.forEach(note => {
              const coeff = note.devoir?.matiere?.coefficient || 1;
              const noteSur = note.devoir?.note_sur || 20;
              const noteNormalisee = (note.note / noteSur) * 20;
              sommePonderee += noteNormalisee * coeff;
              sommeCoeffs += coeff;
            });
            return sommeCoeffs > 0 ? sommePonderee / sommeCoeffs : 0;
          });

          const moyenneGenerale = effectif > 0 ? moyennesParEleve.reduce((a, b) => a + b, 0) / effectif : 0;
          const meilleureMoyenne = moyennesParEleve.length > 0 ? Math.max(...moyennesParEleve) : 0;
          const plusFaibleMoyenne = moyennesParEleve.length > 0 ? Math.min(...moyennesParEleve) : 0;
          const reussite = moyennesParEleve.filter(m => m >= 10).length;
          const tauxReussite = effectif > 0 ? (reussite / effectif) * 100 : 0;

          return {
            id: classe.id,
            nom: classe.nom,
            niveau: classe.niveau || '',
            effectif,
            moyenneGenerale: Math.round(moyenneGenerale * 100) / 100,
            rang: 0,
            tauxReussite: Math.round(tauxReussite * 100) / 100,
            meilleureMoyenne: Math.round(meilleureMoyenne * 100) / 100,
            plusFaibleMoyenne: Math.round(plusFaibleMoyenne * 100) / 100,
          };
        })
      );

      const sortedStats = [...stats].sort((a, b) => b.moyenneGenerale - a.moyenneGenerale);
      sortedStats.forEach((stat, index) => { stat.rang = index + 1; });

      if (sortedStats.length > 0) {
        const moyenneEtablissement = sortedStats.reduce((sum, c) => sum + c.moyenneGenerale, 0) / sortedStats.length;
        const tauxReussite = sortedStats.reduce((sum, c) => sum + c.tauxReussite, 0) / sortedStats.length;
        const meilleure = sortedStats[0];
        const plusFaible = sortedStats[sortedStats.length - 1];

        setStatsGenerales({
          moyenneEtablissement: Math.round(moyenneEtablissement * 100) / 100,
          tauxReussite: Math.round(tauxReussite * 100) / 100,
          meilleureClasse: { nom: meilleure.nom, moyenne: meilleure.moyenneGenerale },
          plusFaibleClasse: { nom: plusFaible.nom, moyenne: plusFaible.moyenneGenerale },
        });

        setGraphiqueComparatif(sortedStats.map(c => ({ classe: c.nom, moyenne: c.moyenneGenerale })));
      }

      console.log('✅ [useChefNotes] loadClassesStats terminé, stats:', sortedStats.length);
      return sortedStats;
    } catch (err) {
      console.error('❌ [useChefNotes] Error loading classes stats:', err);
      return [];
    }
  }, [etablissementId, anneeScolaireId, isSubscribed]);

  // Charger les statistiques par matière pour une classe
  const loadMatiereStats = useCallback(async () => {
    if (!selectedClasseId || !anneeScolaireId || !isSubscribed || !selectedPeriodeId) {
      console.log('❌ [useChefNotes] loadMatiereStats: conditions non remplies', { selectedClasseId, anneeScolaireId, isSubscribed, selectedPeriodeId });
      return [];
    }

    console.log('🔄 [useChefNotes] loadMatiereStats - début pour classe', selectedClasseId);

    try {
      const { data: devoirs, error: devoirsError } = await supabase
        .from('devoirs')
        .select(`
          id,
          matiere_id,
          coefficient,
          note_sur,
          matiere:matiere_id (nom, coefficient)
        `)
        .eq('classe_id', selectedClasseId)
        .eq('periode_id', selectedPeriodeId)  // ← MODIFIÉ : utilise periode_id
        .eq('annee_scolaire_id', anneeScolaireId);

      if (devoirsError) throw devoirsError;

      console.log('✅ [useChefNotes] Devoirs trouvés:', devoirs?.length);

      const { data: eleves, error: elevesError } = await supabase
        .from('eleves')
        .select('id')
        .eq('classe_id', selectedClasseId)
        .eq('statut', 'actif');

      if (elevesError) throw elevesError;

      const eleveIds = eleves?.map(e => e.id) || [];
      const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select(`
          note,
          devoir_id,
          devoir:devoir_id (matiere_id, note_sur)
        `)
        .in('eleve_id', eleveIds)
        .in('statut', CALCULABLE_STATUSES);

      if (notesError) throw notesError;

      const matieresMap = new Map<string, { notes: number[]; nom: string; coefficient: number }>();

      devoirs?.forEach(devoir => {
        const matiereId = devoir.matiere_id;
        const matiereNom = devoir.matiere?.nom;
        const matiereCoeff = devoir.matiere?.coefficient || devoir.coefficient;
        if (!matieresMap.has(matiereId)) {
          matieresMap.set(matiereId, { notes: [], nom: matiereNom || 'Inconnu', coefficient: matiereCoeff });
        }
      });

      notes?.forEach(note => {
        const matiereId = note.devoir?.matiere_id;
        if (matiereId && matieresMap.has(matiereId)) {
          const noteSur = note.devoir?.note_sur || 20;
          const noteNormalisee = (note.note / noteSur) * 20;
          matieresMap.get(matiereId)!.notes.push(noteNormalisee);
        }
      });

      const stats: MatiereStats[] = [];
      matieresMap.forEach((value, id) => {
        const { notes, nom, coefficient } = value;
        const moyenne = notes.length > 0 ? notes.reduce((a, b) => a + b, 0) / notes.length : 0;
        const meilleureNote = notes.length > 0 ? Math.max(...notes) : 0;
        const plusFaibleNote = notes.length > 0 ? Math.min(...notes) : 0;
        const reussite = notes.filter(n => n >= 10).length;
        const tauxReussite = notes.length > 0 ? (reussite / notes.length) * 100 : 0;

        stats.push({
          id,
          nom,
          coefficient,
          moyenne: Math.round(moyenne * 100) / 100,
          meilleureNote: Math.round(meilleureNote * 100) / 100,
          plusFaibleNote: Math.round(plusFaibleNote * 100) / 100,
          notesCount: notes.length,
          tauxReussite: Math.round(tauxReussite * 100) / 100,
        });
      });

      console.log('✅ [useChefNotes] loadMatiereStats terminé, stats:', stats.length);
      return stats.sort((a, b) => b.moyenne - a.moyenne);
    } catch (err) {
      console.error('❌ [useChefNotes] Error loading matiere stats:', err);
      return [];
    }
  }, [selectedClasseId, anneeScolaireId, selectedPeriodeId, isSubscribed]);

  // Charger la liste des élèves
  const loadElevesList = useCallback(async () => {
    if (!selectedClasseId || !anneeScolaireId || !isSubscribed) {
      console.log('❌ [useChefNotes] loadElevesList: conditions non remplies', { selectedClasseId, anneeScolaireId, isSubscribed });
      return [];
    }

    console.log('🔄 [useChefNotes] loadElevesList - début pour classe', selectedClasseId);

    try {
      const { data: eleves, error: elevesError } = await supabase
        .from('eleves')
        .select('id, user_id, matricule')
        .eq('classe_id', selectedClasseId)
        .eq('statut', 'actif');

      if (elevesError) throw elevesError;

      console.log('✅ [useChefNotes] Élèves trouvés:', eleves?.length);

      if (!eleves || eleves.length === 0) return [];

      const userIds = eleves.map(e => e.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nom, prenom')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      console.log('✅ [useChefNotes] Profiles trouvés:', profiles?.length);

      const profileMap = new Map();
      profiles?.forEach(p => profileMap.set(p.id, p));

      const eleveIds = eleves.map(e => e.id);
      const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select('note, eleve_id')
        .in('eleve_id', eleveIds)
        .eq('statut', 'livree');

      if (notesError) console.error('❌ [useChefNotes] Erreur notes:', notesError);

      console.log('✅ [useChefNotes] Notes trouvées:', notes?.length);

      const elevesWithMoyenne = eleves.map(eleve => {
        const profile = profileMap.get(eleve.user_id);
        const notesEleve = notes?.filter(n => n.eleve_id === eleve.id) || [];
        const moyenne = notesEleve.length > 0 
          ? notesEleve.reduce((sum, n) => sum + n.note, 0) / notesEleve.length 
          : 0;

        let appreciation: 'Excellent' | 'Bien' | 'Assez bien' | 'Passable' | 'Insuffisant';
        if (moyenne >= 16) appreciation = 'Excellent';
        else if (moyenne >= 14) appreciation = 'Bien';
        else if (moyenne >= 12) appreciation = 'Assez bien';
        else if (moyenne >= 10) appreciation = 'Passable';
        else appreciation = 'Insuffisant';

        return {
          id: eleve.id,
          nom: profile?.nom || 'Inconnu',
          prenom: profile?.prenom || 'Inconnu',
          matricule: eleve.matricule,
          matricule_snet: eleve.matricule,
          moyenne: Math.round(moyenne * 100) / 100,
          rang: 0,
          appreciation,
          notesCount: notesEleve.length,
        };
      });

      const sorted = [...elevesWithMoyenne].sort((a, b) => b.moyenne - a.moyenne);
      sorted.forEach((eleve, index) => { eleve.rang = index + 1; });

      console.log('✅ [useChefNotes] Liste finale des élèves:', sorted.length);
      return sorted;
    } catch (err) {
      console.error('❌ [useChefNotes] Erreur loadElevesList:', err);
      return [];
    }
  }, [selectedClasseId, anneeScolaireId, isSubscribed]);

  // Chargement principal
  const loadData = useCallback(async () => {
    console.log('🔄 [useChefNotes] loadData - début', { selectedClasseId, anneeScolaireId, isSubscribed, selectedPeriodeId });

    if (!etablissementId || !anneeScolaireId) {
      console.log('❌ [useChefNotes] loadData: pas d\'etablissementId ou anneeScolaireId');
      setLoading(false);
      return;
    }

    if (isSubscribed === false) {
      console.log('❌ [useChefNotes] loadData: pas abonné');
      setLoading(false);
      return;
    }

    if (subscriptionLoading) {
      console.log('⏳ [useChefNotes] loadData: en attente de subscriptionLoading');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const stats = await loadClassesStats();
      setClassesStats(stats);

      if (selectedClasseId && selectedPeriodeId) {
        console.log('🔄 [useChefNotes] Chargement des détails pour la classe', selectedClasseId);
        const [matieres, eleves] = await Promise.all([
          loadMatiereStats(),
          loadElevesList(),
        ]);
        setMatieresStats(matieres);
        setElevesList(eleves);
        console.log(`✅ [useChefNotes] Classe ${selectedClasseId} - ${eleves.length} élèves chargés`);
      } else {
        console.log('ℹ️ [useChefNotes] Aucune classe ou période sélectionnée');
        setMatieresStats([]);
        setElevesList([]);
      }
    } catch (err) {
      console.error('❌ [useChefNotes] Erreur loadData:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, [etablissementId, anneeScolaireId, selectedClasseId, selectedPeriodeId, isSubscribed, subscriptionLoading, loadClassesStats, loadMatiereStats, loadElevesList]);

  const refresh = useCallback(async () => {
    console.log('🔄 [useChefNotes] refresh appelé');
    await loadData();
  }, [loadData]);

  // Fonction pour charger la distribution des notes
  const loadDistributionNotes = useCallback(async () => {
    if (!selectedClasseId || !anneeScolaireId || !isSubscribed) {
      return new Map();
    }

    try {
      const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select('note, devoir:devoir_id(matiere_id)')
        .eq('eleve_id', selectedClasseId)
        .eq('statut', 'livree');

      if (notesError) throw notesError;

      const distributionByMatiere = new Map();
      notes?.forEach((note: any) => {
        const matiereId = note.devoir?.matiere_id;
        if (!distributionByMatiere.has(matiereId)) {
          distributionByMatiere.set(matiereId, []);
        }
        distributionByMatiere.get(matiereId).push(note.note);
      });

      return distributionByMatiere;
    } catch (err) {
      console.error('Error loading distribution notes:', err);
      return new Map();
    }
  }, [selectedClasseId, anneeScolaireId, isSubscribed]);

  // Recharger quand selectedClasseId ou selectedPeriodeId change
  useEffect(() => {
    console.log('🔄 [useChefNotes] useEffect déclenché - selectedClasseId ou selectedPeriodeId a changé', { selectedClasseId, selectedPeriodeId });
    loadData();
  }, [selectedClasseId, selectedPeriodeId, loadData]);

  return {
    classesStats,
    matieresStats,
    elevesList,
    loading: loading || subscriptionLoading,
    error,
    refresh,
    statsGenerales,
    alertes,
    graphiqueComparatif,
    graphiqueEvolution,
    isSubscribed,
    subscriptionLoading,
    loadDistributionNotes,
  };
}