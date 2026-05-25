// /home/project/utils/exportDataGetters.ts
// Fonctions dédiées à la récupération des données d'export

import { supabase } from '@/lib/supabase';
import { Periode } from '@/types/notes.types';

export interface EleveExportData {
  rang: number;
  matricule: string;
  nom: string;
  prenom: string;
  moyenneGenerale: number;
  appreciation: string;
  detailsParMatiere: {
    matiere: string;
    coefficient: number;
    note: number;
    moyenneClasse: number;
    rangMatiere: number;
  }[];
}

export interface ClasseExportData {
  classeNom: string;
  effectif: number;
  moyenneClasse: number;
  eleves: EleveExportData[];
}

export interface MatiereExportData {
  matiereNom: string;
  coefficient: number;
  periode: Periode;
  classeNom: string;
  effectif: number;
  moyenneClasse: number;
  ecartType: number;
  tauxReussite: number;
  eleves: {
    rang: number;
    matricule: string;
    nom: string;
    prenom: string;
    note: number;
    appreciation: string;
  }[];
}

export interface PeriodeExportData {
  etablissementNom: string;
  anneeScolaireLibelle: string;
  periodeLabel: string;
  dateGeneration: string;
  statsGlobales: {
    totalEleves: number;
    moyenneGenerale: number;
    tauxReussite: number;
    meilleureClasse: { nom: string; moyenne: number };
    plusFaibleClasse: { nom: string; moyenne: number };
  };
  classesStats: {
    nom: string;
    effectif: number;
    moyenneGenerale: number;
    rang: number;
    tauxReussite: number;
    meilleureMoyenne: number;
    plusFaibleMoyenne: number;
  }[];
  matieresStats: {
    nom: string;
    coefficient: number;
    moyenneEtablissement: number;
    meilleureClasse: string;
    plusFaibleClasse: string;
  }[];
  tableauHonneur?: {
    rang: number;
    classe: string;
    nom: string;
    prenom: string;
    moyenne: number;
    mention: string;
  }[];
}

/**
 * Récupère les données pour l'export par classe
 */
export async function getClasseExportData(
  etablissementId: string,
  anneeScolaireId: string,
  classeId: string,
  periode: Periode
): Promise<ClasseExportData | null> {
  try {
    console.log('🔍 getClasseExportData - classeId:', classeId);
    console.log('🔍 getClasseExportData - periode:', periode);
    console.log('🔍 getClasseExportData - anneeScolaireId:', anneeScolaireId);

    // 1. Récupérer les élèves de la classe
    const { data: eleves, error: elevesError } = await supabase
      .from('eleves')
      .select('id, user_id, matricule')
      .eq('classe_id', classeId)
      .eq('statut', 'actif');

    if (elevesError) {
      console.error('Erreur eleves:', elevesError);
      throw elevesError;
    }
    
    console.log('🔍 getClasseExportData - élèves trouvés:', eleves?.length);

    if (!eleves || eleves.length === 0) {
      console.log('Aucun élève trouvé pour cette classe');
      return null;
    }

    // 2. Récupérer les noms depuis profiles
    const userIds = eleves.map(e => e.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nom, prenom')
      .in('id', userIds);

    const profileMap = new Map();
    profiles?.forEach(p => profileMap.set(p.id, p));
    console.log('🔍 getClasseExportData - profiles trouvés:', profiles?.length);

    // 3. Récupérer les devoirs pour la période
    const { data: devoirs, error: devoirsError } = await supabase
      .from('devoirs')
      .select('id, matiere_id, coefficient, note_sur, matiere:matiere_id(id, nom, coefficient)')
      .eq('classe_id', classeId)
      .eq('periode', periode)
      .eq('annee_scolaire_id', anneeScolaireId);

    if (devoirsError) {
      console.error('Erreur devoirs:', devoirsError);
      throw devoirsError;
    }

    console.log('🔍 getClasseExportData - devoirs trouvés:', devoirs?.length);

    // 4. Récupérer les notes des élèves
    const eleveIds = eleves.map(e => e.id);
    const devoirIds = devoirs?.map(d => d.id) || [];
    
    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select(`
        note,
        eleve_id,
        devoir_id,
        devoir:devoir_id(
          matiere_id,
          note_sur,
          coefficient,
          matiere:matiere_id(id, nom, coefficient)
        )
      `)
      .in('eleve_id', eleveIds)
      .in('devoir_id', devoirIds)
      .eq('statut', 'livree');

    if (notesError) {
      console.error('Erreur notes:', notesError);
    }

    console.log('🔍 getClasseExportData - notes trouvées:', notes?.length);

    // 5. Calculer les moyennes par matière pour la classe
    const matieresMap = new Map();
    devoirs?.forEach(devoir => {
      const matiereId = devoir.matiere_id;
      const matiereNom = devoir.matiere?.nom;
      const coeff = devoir.matiere?.coefficient || devoir.coefficient;
      if (!matieresMap.has(matiereId)) {
        matieresMap.set(matiereId, {
          id: matiereId,
          nom: matiereNom || 'Matière',
          coefficient: coeff,
          notes: [],
        });
      }
    });

    notes?.forEach(note => {
      const matiereId = note.devoir?.matiere_id;
      if (matiereId && matieresMap.has(matiereId)) {
        const noteSur = note.devoir?.note_sur || 20;
        const noteNormalisee = (note.note / noteSur) * 20;
        matieresMap.get(matiereId).notes.push(noteNormalisee);
      }
    });

    const matieresStats = Array.from(matieresMap.values()).map((m: any) => ({
      id: m.id,
      nom: m.nom,
      coefficient: m.coefficient,
      moyenne: m.notes.length > 0 ? m.notes.reduce((a: number, b: number) => a + b, 0) / m.notes.length : 0,
    }));

    // 6. Calculer les moyennes des élèves
    const elevesWithMoyenne = eleves.map(eleve => {
      const profile = profileMap.get(eleve.user_id);
      const notesEleve = notes?.filter(n => n.eleve_id === eleve.id) || [];
      
      let sommePonderee = 0;
      let sommeCoeffs = 0;
      const detailsParMatiere: any[] = [];

      for (const matiere of matieresStats) {
        const notesMatiere = notesEleve.filter(n => n.devoir?.matiere_id === matiere.id);
        if (notesMatiere.length > 0) {
          const moyenneMatiere = notesMatiere.reduce((sum, n) => {
            const noteSur = n.devoir?.note_sur || 20;
            return sum + (n.note / noteSur) * 20;
          }, 0) / notesMatiere.length;
          
          sommePonderee += moyenneMatiere * matiere.coefficient;
          sommeCoeffs += matiere.coefficient;
          
          detailsParMatiere.push({
            matiere: matiere.nom,
            coefficient: matiere.coefficient,
            note: Math.round(moyenneMatiere * 100) / 100,
            moyenneClasse: matiere.moyenne,
            rangMatiere: 0,
          });
        }
      }

      const moyenneGenerale = sommeCoeffs > 0 ? sommePonderee / sommeCoeffs : 0;
      
      let appreciation = '';
      if (moyenneGenerale >= 16) appreciation = 'Excellent';
      else if (moyenneGenerale >= 14) appreciation = 'Bien';
      else if (moyenneGenerale >= 12) appreciation = 'Assez bien';
      else if (moyenneGenerale >= 10) appreciation = 'Passable';
      else appreciation = 'Insuffisant';

      detailsParMatiere.sort((a, b) => b.note - a.note);
      detailsParMatiere.forEach((detail, idx) => { detail.rangMatiere = idx + 1; });

      return {
        id: eleve.id,
        matricule: eleve.matricule,
        nom: profile?.nom || '',
        prenom: profile?.prenom || '',
        moyenneGenerale: Math.round(moyenneGenerale * 100) / 100,
        appreciation,
        detailsParMatiere,
      };
    });

    const sortedEleves = [...elevesWithMoyenne].sort((a, b) => b.moyenneGenerale - a.moyenneGenerale);
    sortedEleves.forEach((eleve, index) => { eleve.rang = index + 1; });

    const moyenneClasse = sortedEleves.reduce((sum, e) => sum + e.moyenneGenerale, 0) / (sortedEleves.length || 1);
    const effectif = sortedEleves.length;

    console.log('🔍 getClasseExportData - retour:', { effectif, moyenneClasse, nbEleves: sortedEleves.length });

    return {
      classeNom: '',
      effectif,
      moyenneClasse: Math.round(moyenneClasse * 100) / 100,
      eleves: sortedEleves,
    };
  } catch (error) {
    console.error('Error getting classe export data:', error);
    return null;
  }
}

/**
 * Récupère les données pour l'export par matière
 */
export async function getMatiereExportData(
  etablissementId: string,
  anneeScolaireId: string,
  classeId: string,
  matiereId: string,
  periode: Periode
): Promise<MatiereExportData | null> {
  try {
    // 1. Récupérer les informations de la matière
    const { data: matiere, error: matiereError } = await supabase
      .from('matieres')
      .select('id, nom, coefficient')
      .eq('id', matiereId)
      .single();

    if (matiereError) throw matiereError;

    // 2. Récupérer les élèves de la classe
    const { data: eleves, error: elevesError } = await supabase
      .from('eleves')
      .select('id, user_id, matricule')
      .eq('classe_id', classeId)
      .eq('statut', 'actif');

    if (elevesError) throw elevesError;
    if (!eleves || eleves.length === 0) return null;

    // 3. Récupérer les noms depuis profiles
    const userIds = eleves.map(e => e.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, nom, prenom')
      .in('id', userIds);

    const profileMap = new Map();
    profiles?.forEach(p => profileMap.set(p.id, p));

    // 4. Récupérer les devoirs pour cette matière et période
    const { data: devoirs, error: devoirsError } = await supabase
      .from('devoirs')
      .select('id, coefficient, note_sur')
      .eq('classe_id', classeId)
      .eq('matiere_id', matiereId)
      .eq('periode', periode)
      .eq('annee_scolaire_id', anneeScolaireId);

    if (devoirsError) throw devoirsError;

    // 5. Récupérer les notes des élèves pour cette matière
    const eleveIds = eleves.map(e => e.id);
    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select('note, eleve_id, devoir_id')
      .in('eleve_id', eleveIds)
      .in('devoir_id', devoirs?.map(d => d.id) || [])
      .eq('statut', 'livree');

    if (notesError) throw notesError;

    // 6. Calculer la moyenne par élève pour cette matière
    const elevesWithNote = eleves.map(eleve => {
      const profile = profileMap.get(eleve.user_id);
      const notesEleve = notes?.filter(n => n.eleve_id === eleve.id) || [];
      
      let sommePonderee = 0;
      let sommeCoeffs = 0;
      
      notesEleve.forEach(note => {
        const devoir = devoirs?.find(d => d.id === note.devoir_id);
        const coeff = devoir?.coefficient || 1;
        const noteSur = devoir?.note_sur || 20;
        sommePonderee += (note.note / noteSur) * 20 * coeff;
        sommeCoeffs += coeff;
      });
      
      const moyenne = sommeCoeffs > 0 ? sommePonderee / sommeCoeffs : 0;
      
      let appreciation = '';
      if (moyenne >= 16) appreciation = 'Exceptionnel';
      else if (moyenne >= 14) appreciation = 'Saisissant';
      else if (moyenne >= 12) appreciation = 'Assez bien';
      else if (moyenne >= 10) appreciation = 'Assidûment';
      else if (moyenne >= 9.5) appreciation = 'Indispensable';
      else if (moyenne >= 7.5) appreciation = 'Faible';
      else appreciation = 'Insuffisant';

      return {
        id: eleve.id,
        matricule: eleve.matricule,
        nom: profile?.nom || '',
        prenom: profile?.prenom || '',
        note: Math.round(moyenne * 100) / 100,
        appreciation,
      };
    });

    // Trier par note décroissante
    const sortedEleves = [...elevesWithNote].sort((a, b) => b.note - a.note);
    sortedEleves.forEach((eleve, index) => { eleve.rang = index + 1; });

    const notesValues = sortedEleves.map(e => e.note);
    const moyenneClasse = notesValues.reduce((a, b) => a + b, 0) / (notesValues.length || 1);
    const variance = notesValues.reduce((acc, val) => acc + Math.pow(val - moyenneClasse, 2), 0) / (notesValues.length || 1);
    const ecartType = Math.sqrt(variance);
    const reussite = notesValues.filter(n => n >= 10).length;
    const tauxReussite = (reussite / (notesValues.length || 1)) * 100;

    return {
      matiereNom: matiere.nom,
      coefficient: matiere.coefficient,
      periode,
      classeNom: '',
      effectif: eleves.length,
      moyenneClasse: Math.round(moyenneClasse * 100) / 100,
      ecartType: Math.round(ecartType * 100) / 100,
      tauxReussite: Math.round(tauxReussite * 100) / 100,
      eleves: sortedEleves,
    };
  } catch (error) {
    console.error('Error getting matiere export data:', error);
    return null;
  }
}

/**
 * Récupère les données pour l'export par période (rapport complet)
 * Version simplifiée et robuste
 */
export async function getPeriodeExportData(
  etablissementId: string,
  etablissementNom: string,
  anneeScolaireId: string,
  periode: Periode
): Promise<PeriodeExportData | null> {
  try {
    if (!anneeScolaireId || anneeScolaireId === '') {
      console.error('❌ getPeriodeExportData: anneeScolaireId manquant');
      return null;
    }

    console.log('🔍 getPeriodeExportData - anneeScolaireId:', anneeScolaireId);
    console.log('🔍 getPeriodeExportData - periode:', periode);

    // 1. Récupérer toutes les classes
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('id, nom, niveau')
      .eq('etablissement_id', etablissementId)
      .eq('is_active', true);

    if (classesError) throw classesError;
    if (!classes || classes.length === 0) return null;

    // 2. Récupérer TOUS les devoirs pour TOUTES les classes (optimisation)
    const classIds = classes.map(c => c.id);
    const { data: allDevoirs, error: devoirsError } = await supabase
      .from('devoirs')
      .select('id, classe_id, matiere_id, coefficient, note_sur')
      .in('classe_id', classIds)
      .eq('periode', periode)
      .eq('annee_scolaire_id', anneeScolaireId);

    if (devoirsError) {
      console.error('Erreur devoirs:', devoirsError);
      return null;
    }

    if (!allDevoirs || allDevoirs.length === 0) {
      console.log('Aucun devoir trouvé pour cette période');
      return null;
    }

    console.log('🔍 Devoirs trouvés:', allDevoirs.length);

    // 3. Récupérer TOUTES les notes pour ces devoirs
    const devoirIds = allDevoirs.map(d => d.id);
    const { data: allNotes, error: notesError } = await supabase
      .from('notes')
      .select('note, eleve_id, devoir_id')
      .in('devoir_id', devoirIds)
      .eq('statut', 'livree');

    if (notesError) {
      console.error('Erreur notes:', notesError);
    }

    console.log('🔍 Notes trouvées:', allNotes?.length || 0);

    // 4. Récupérer toutes les matières
    const { data: allMatieres, error: matieresError } = await supabase
      .from('matieres')
      .select('id, nom, coefficient')
      .eq('etablissement_id', etablissementId);

    if (matieresError) throw matieresError;

    // 5. Calculer les statistiques par matière
    const matieresStats = (allMatieres || []).map(matiere => {
      // Trouver tous les devoirs de cette matière
      const devoirsMatiere = allDevoirs.filter(d => d.matiere_id === matiere.id);
      
      if (devoirsMatiere.length === 0) {
        return {
          nom: matiere.nom,
          coefficient: matiere.coefficient,
          moyenneEtablissement: 0,
          meilleureClasse: '-',
          plusFaibleClasse: '-',
        };
      }

      const devoirIdsMatiere = devoirsMatiere.map(d => d.id);
      const notesMatiere = (allNotes || []).filter(n => devoirIdsMatiere.includes(n.devoir_id));
      
      if (notesMatiere.length === 0) {
        return {
          nom: matiere.nom,
          coefficient: matiere.coefficient,
          moyenneEtablissement: 0,
          meilleureClasse: '-',
          plusFaibleClasse: '-',
        };
      }

      // Calculer la moyenne pondérée pour cette matière
      let sommePonderee = 0;
      let sommeCoeffs = 0;
      
      for (const note of notesMatiere) {
        const devoir = devoirsMatiere.find(d => d.id === note.devoir_id);
        if (devoir) {
          const coeff = devoir.coefficient;
          const noteSur = devoir.note_sur || 20;
          const noteNormalisee = (note.note / noteSur) * 20;
          sommePonderee += noteNormalisee * coeff;
          sommeCoeffs += coeff;
        }
      }
      
      const moyenne = sommeCoeffs > 0 ? sommePonderee / sommeCoeffs : 0;

      return {
        nom: matiere.nom,
        coefficient: matiere.coefficient,
        moyenneEtablissement: Math.round(moyenne * 100) / 100,
        meilleureClasse: '-',
        plusFaibleClasse: '-',
      };
    });

    console.log('🔍 Matières stats calculées:', matieresStats.filter(m => m.moyenneEtablissement > 0).length, 'avec notes > 0');

    // 6. Calculer les statistiques par classe
    const classesStats = await Promise.all(classes.map(async (classe, index) => {
      const devoirsClasse = allDevoirs.filter(d => d.classe_id === classe.id);
      
      if (devoirsClasse.length === 0) {
        return {
          nom: classe.nom,
          effectif: 0,
          moyenneGenerale: 0,
          rang: index + 1,
          tauxReussite: 0,
          meilleureMoyenne: 0,
          plusFaibleMoyenne: 0,
        };
      }

      // Récupérer les élèves de la classe
      const { data: eleves, error: elevesError } = await supabase
        .from('eleves')
        .select('id')
        .eq('classe_id', classe.id)
        .eq('statut', 'actif');

      if (elevesError) throw elevesError;
      
      const effectif = eleves?.length || 0;
      const eleveIds = eleves?.map(e => e.id) || [];

      if (effectif === 0) {
        return {
          nom: classe.nom,
          effectif: 0,
          moyenneGenerale: 0,
          rang: index + 1,
          tauxReussite: 0,
          meilleureMoyenne: 0,
          plusFaibleMoyenne: 0,
        };
      }

      const devoirIdsClasse = devoirsClasse.map(d => d.id);
      const notesClasse = (allNotes || []).filter(n => devoirIdsClasse.includes(n.devoir_id));
      
      // Calculer la moyenne par élève
      const moyennesEleves: number[] = [];
      
      for (const eleve of eleves) {
        const notesEleve = notesClasse.filter(n => n.eleve_id === eleve.id);
        let sommePonderee = 0;
        let sommeCoeffs = 0;
        
        for (const note of notesEleve) {
          const devoir = devoirsClasse.find(d => d.id === note.devoir_id);
          if (devoir) {
            const coeff = devoir.coefficient;
            const noteSur = devoir.note_sur || 20;
            sommePonderee += (note.note / noteSur) * 20 * coeff;
            sommeCoeffs += coeff;
          }
        }
        
        const moyenne = sommeCoeffs > 0 ? sommePonderee / sommeCoeffs : 0;
        moyennesEleves.push(moyenne);
      }
      
      const moyenneGenerale = moyennesEleves.length > 0 ? moyennesEleves.reduce((a, b) => a + b, 0) / moyennesEleves.length : 0;
      const reussite = moyennesEleves.filter(m => m >= 10).length;
      const tauxReussite = effectif > 0 ? (reussite / effectif) * 100 : 0;
      const meilleureMoyenne = moyennesEleves.length > 0 ? Math.max(...moyennesEleves) : 0;
      const plusFaibleMoyenne = moyennesEleves.length > 0 ? Math.min(...moyennesEleves) : 0;

      return {
        nom: classe.nom,
        effectif,
        moyenneGenerale: Math.round(moyenneGenerale * 100) / 100,
        rang: 0,
        tauxReussite: Math.round(tauxReussite * 100) / 100,
        meilleureMoyenne: Math.round(meilleureMoyenne * 100) / 100,
        plusFaibleMoyenne: Math.round(plusFaibleMoyenne * 100) / 100,
      };
    }));

    // Trier les classes
    const sortedStats = [...classesStats].sort((a, b) => b.moyenneGenerale - a.moyenneGenerale);
    sortedStats.forEach((stat, idx) => { stat.rang = idx + 1; });

    // 7. Statistiques globales
    const totalEleves = sortedStats.reduce((sum, c) => sum + c.effectif, 0);
    const moyenneGenerale = sortedStats.reduce((sum, c) => sum + c.moyenneGenerale, 0) / (sortedStats.length || 1);
    const tauxReussite = sortedStats.reduce((sum, c) => sum + c.tauxReussite, 0) / (sortedStats.length || 1);
    const meilleureClasse = sortedStats[0];
    const plusFaibleClasse = sortedStats[sortedStats.length - 1];

    // 8. Tableau d'honneur
    const tableauHonneur = await getTableauHonneurExportData(
      etablissementId,
      anneeScolaireId,
      periode,
      undefined,
      14,
      5
    );

    return {
      etablissementNom,
      anneeScolaireLibelle: anneeScolaireId,
      periodeLabel: periode === 'S1' ? 'Semestre 1' : periode === 'S2' ? 'Semestre 2' : `Trimestre ${periode.slice(1)}`,
      dateGeneration: new Date().toISOString(),
      statsGlobales: {
        totalEleves,
        moyenneGenerale: Math.round(moyenneGenerale * 100) / 100,
        tauxReussite: Math.round(tauxReussite * 100) / 100,
        meilleureClasse: { nom: meilleureClasse?.nom || '', moyenne: meilleureClasse?.moyenneGenerale || 0 },
        plusFaibleClasse: { nom: plusFaibleClasse?.nom || '', moyenne: plusFaibleClasse?.moyenneGenerale || 0 },
      },
      classesStats: sortedStats,
      matieresStats,
      tableauHonneur: tableauHonneur?.eleves.map(e => ({
        rang: e.rang,
        classe: e.classe,
        nom: e.nom,
        prenom: e.prenom,
        moyenne: e.moyenne,
        mention: e.mention,
      })) || [],
    };
  } catch (error) {
    console.error('Error getting periode export data:', error);
    return null;
  }
}

/**
 * Récupère les données pour le tableau d'honneur
 */
export async function getTableauHonneurExportData(
  etablissementId: string,
  anneeScolaireId: string,
  periode: Periode,
  classeId?: string,
  seuilMoyenne: number = 14,
  topN: number = 5
): Promise<{
  periodeLabel: string;
  seuilMoyenne: number;
  topN: number;
  eleves: {
    rang: number;
    classe: string;
    matricule: string;
    nom: string;
    prenom: string;
    moyenne: number;
    mention: string;
  }[];
} | null> {
  try {
    // 1. Récupérer les classes (une seule si classeId spécifiée)
    let classesQuery = supabase
      .from('classes')
      .select('id, nom')
      .eq('etablissement_id', etablissementId)
      .eq('is_active', true);
    
    if (classeId) {
      classesQuery = classesQuery.eq('id', classeId);
    }
    
    const { data: classes, error: classesError } = await classesQuery;
    if (classesError) throw classesError;
    if (!classes || classes.length === 0) return null;

    const allEleves: any[] = [];

    for (const classe of classes) {
      // Récupérer les élèves de la classe
      const { data: eleves, error: elevesError } = await supabase
        .from('eleves')
        .select('id, user_id, matricule')
        .eq('classe_id', classe.id)
        .eq('statut', 'actif');

      if (elevesError) throw elevesError;
      if (!eleves || eleves.length === 0) continue;

      // Récupérer les noms depuis profiles
      const userIds = eleves.map(e => e.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nom, prenom')
        .in('id', userIds);

      const profileMap = new Map();
      profiles?.forEach(p => profileMap.set(p.id, p));

      // Récupérer les devoirs pour la période
      const { data: devoirs, error: devoirsError } = await supabase
        .from('devoirs')
        .select('id, coefficient, note_sur')
        .eq('classe_id', classe.id)
        .eq('periode', periode)
        .eq('annee_scolaire_id', anneeScolaireId);

      if (devoirsError) throw devoirsError;

      // Récupérer les notes des élèves
      const eleveIds = eleves.map(e => e.id);
      const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select('note, eleve_id, devoir_id')
        .in('eleve_id', eleveIds)
        .in('devoir_id', devoirs?.map(d => d.id) || [])
        .eq('statut', 'livree');

      if (notesError) throw notesError;

      // Calculer la moyenne par élève
      for (const eleve of eleves) {
        const profile = profileMap.get(eleve.user_id);
        const notesEleve = notes?.filter(n => n.eleve_id === eleve.id) || [];
        
        let sommePonderee = 0;
        let sommeCoeffs = 0;
        
        for (const note of notesEleve) {
          const devoir = devoirs?.find(d => d.id === note.devoir_id);
          const coeff = devoir?.coefficient || 1;
          const noteSur = devoir?.note_sur || 20;
          sommePonderee += (note.note / noteSur) * 20 * coeff;
          sommeCoeffs += coeff;
        }
        
        const moyenne = sommeCoeffs > 0 ? sommePonderee / sommeCoeffs : 0;
        
        if (moyenne >= seuilMoyenne) {
          let mention = '';
          if (moyenne >= 16) mention = 'Félicitations';
          else if (moyenne >= 14) mention = 'Encouragements';
          else mention = 'Tableau d\'honneur';
          
          allEleves.push({
            classeNom: classe.nom,
            matricule: eleve.matricule,
            nom: profile?.nom || '',
            prenom: profile?.prenom || '',
            moyenne: Math.round(moyenne * 100) / 100,
            mention,
          });
        }
      }
    }

    // Trier par moyenne décroissante et limiter à topN
    const sorted = allEleves.sort((a, b) => b.moyenne - a.moyenne).slice(0, topN);
    sorted.forEach((eleve, index) => { eleve.rang = index + 1; });

    return {
      periodeLabel: periode === 'S1' ? 'Semestre 1' : periode === 'S2' ? 'Semestre 2' : `Trimestre ${periode.slice(1)}`,
      seuilMoyenne,
      topN,
      eleves: sorted.map(e => ({
        rang: e.rang,
        classe: e.classeNom,
        matricule: e.matricule,
        nom: e.nom,
        prenom: e.prenom,
        moyenne: e.moyenne,
        mention: e.mention,
      })),
    };
  } catch (error) {
    console.error('Error getting tableau honneur export data:', error);
    return null;
  }
}

/**
 * Récupère les données pour le bulletin individuel d'un élève
 * PHASE C.3 : Utilise periodeId (UUID) au lieu de periode (S1/T1)
 */
export async function getBulletinExportData(
  eleveId: string,
  anneeScolaireId: string,
  periodeId: string  // ← MODIFIÉ : UUID au lieu de Periode
): Promise<{
  eleve: {
    id: string;
    nom: string;
    prenom: string;
    matricule: string;
    dateNaissance?: string;
    lieuNaissance?: string;
    sexe?: 'M' | 'F';
  };
  classe: {
    id: string;
    nom: string;
  };
  notes: Array<{
    matiere: string;
    matiereId: string;
    coefficient: number;
    moyenneInterrogations: number;
    devoir1: number;
    devoir2: number;
    moyenne: number;
    rang: number;
    appreciation: string;
  }>;
  moyenneGenerale: number;
  rang: number;
  effectifClasse: number;
  plusForteMoyenne: { valeur: number; eleve: string };
  plusFaibleMoyenne: { valeur: number; eleve: string };
  decisions: string[];
  appreciationChef: string;
  appreciationPP?: string;
} | null> {
  try {
    console.log('🔍 getBulletinExportData - eleveId:', eleveId);
    console.log('🔍 getBulletinExportData - periodeId:', periodeId);
    console.log('🔍 getBulletinExportData - anneeScolaireId:', anneeScolaireId);

    // 1. Récupérer les informations de l'élève
    const { data: eleve, error: eleveError } = await supabase
      .from('eleves')
      .select('id, user_id, matricule, date_naissance, classe_id')
      .eq('id', eleveId)
      .single();

    if (eleveError) {
      console.error('Erreur récupération élève:', eleveError);
      throw eleveError;
    }

    if (!eleve) {
      console.log('Aucun élève trouvé');
      return null;
    }

    // 2. Récupérer le profil (nom, prenom, lieu_naissance, sexe)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, nom, prenom, lieu_naissance, sexe')
      .eq('id', eleve.user_id)
      .single();

    if (profileError) {
      console.error('Erreur récupération profil:', profileError);
    }

    // 3. Récupérer la classe
    const { data: classeData, error: classeError } = await supabase
      .from('classes')
      .select('id, nom')
      .eq('id', eleve.classe_id)
      .single();

    if (classeError) {
      console.error('Erreur récupération classe:', classeError);
    }

    // 4. Récupérer tous les élèves de la classe (pour le rang)
    const { data: elevesClasse, error: elevesClasseError } = await supabase
      .from('eleves')
      .select('id, user_id')
      .eq('classe_id', eleve.classe_id)
      .eq('statut', 'actif');

    if (elevesClasseError) {
      console.error('Erreur récupération élèves classe:', elevesClasseError);
    }

    const eleveIds = elevesClasse?.map(e => e.id) || [];
    const effectifClasse = eleveIds.length;

    // 5. Récupérer les devoirs de la classe pour la période (en utilisant periode_id)
    const { data: devoirs, error: devoirsError } = await supabase
      .from('devoirs')
      .select(`
        id,
        matiere_id,
        coefficient,
        note_sur,
        matiere:matiere_id (id, nom, coefficient)
      `)
      .eq('classe_id', eleve.classe_id)
      .eq('periode_id', periodeId)  // ← MODIFIÉ : utilise periode_id
      .eq('annee_scolaire_id', anneeScolaireId);

    if (devoirsError) {
      console.error('Erreur récupération devoirs:', devoirsError);
    }

    if (!devoirs || devoirs.length === 0) {
      console.log('Aucun devoir trouvé pour cette période');
      return null;
    }

    // 6. Récupérer les notes de tous les élèves de la classe
    const devoirIds = devoirs.map(d => d.id);
    const { data: allNotes, error: notesError } = await supabase
      .from('notes')
      .select('note, eleve_id, devoir_id')
      .in('eleve_id', eleveIds)
      .in('devoir_id', devoirIds)
      .eq('statut', 'livree');

    if (notesError) {
      console.error('Erreur récupération notes:', notesError);
    }

    console.log('🔍 getBulletinExportData - devoirs trouvés:', devoirs.length);
    console.log('🔍 getBulletinExportData - notes trouvées:', allNotes?.length || 0);

    // 7. Grouper les devoirs par matière
    const matieresMap = new Map();
    devoirs.forEach(devoir => {
      const matiere = devoir.matiere as any;
      const matiereId = devoir.matiere_id;
      if (!matieresMap.has(matiereId)) {
        matieresMap.set(matiereId, {
          id: matiereId,
          nom: matiere?.nom || 'Matière',
          coefficient: matiere?.coefficient || devoir.coefficient,
          devoirs: [],
        });
      }
      matieresMap.get(matiereId).devoirs.push(devoir);
    });

    // 8. Calculer les moyennes par matière pour tous les élèves
    const matieresStats = new Map();
    const elevesMoyennes: Map<string, number[]> = new Map();

    for (const matiere of matieresMap.values()) {
      const matiereId = matiere.id;
      const devoirsMatiere = matiere.devoirs;
      
      for (const eleveIdClasse of eleveIds) {
        let sommePonderee = 0;
        let sommeCoeffs = 0;
        
        for (const devoir of devoirsMatiere) {
          const note = allNotes?.find(n => n.eleve_id === eleveIdClasse && n.devoir_id === devoir.id);
          if (note) {
            const coeff = devoir.coefficient;
            const noteSur = devoir.note_sur || 20;
            const noteNormalisee = (note.note / noteSur) * 20;
            sommePonderee += noteNormalisee * coeff;
            sommeCoeffs += coeff;
          }
        }
        
        const moyenneMatiere = sommeCoeffs > 0 ? sommePonderee / sommeCoeffs : 0;
        
        if (!matieresStats.has(matiereId)) {
          matieresStats.set(matiereId, {
            matiereId,
            matiereNom: matiere.nom,
            coefficient: matiere.coefficient,
            notes: [],
          });
        }
        matieresStats.get(matiereId).notes.push({ eleveId: eleveIdClasse, moyenne: moyenneMatiere });
        
        if (!elevesMoyennes.has(eleveIdClasse)) {
          elevesMoyennes.set(eleveIdClasse, []);
        }
        elevesMoyennes.get(eleveIdClasse)!.push(moyenneMatiere * matiere.coefficient);
      }
    }

    // 9. Calculer les moyennes générales par élève
    const moyennesGenerales: { eleveId: string; moyenne: number }[] = [];
    for (const [eleveIdClasse, notesMatieres] of elevesMoyennes) {
      const sommeCoeffs = Array.from(matieresStats.values()).reduce((sum, m) => sum + m.coefficient, 0);
      const moyenne = sommeCoeffs > 0 ? notesMatieres.reduce((a, b) => a + b, 0) / sommeCoeffs : 0;
      moyennesGenerales.push({ eleveId: eleveIdClasse, moyenne });
    }

    // 10. Trier et trouver le rang de l'élève
    const sortedMoyennes = [...moyennesGenerales].sort((a, b) => b.moyenne - a.moyenne);
    const rang = sortedMoyennes.findIndex(m => m.eleveId === eleveId) + 1;
    const moyenneGenerale = sortedMoyennes.find(m => m.eleveId === eleveId)?.moyenne || 0;

    // 11. Plus forte et plus faible moyenne de la classe
    const plusForte = sortedMoyennes[0];
    const plusFaible = sortedMoyennes[sortedMoyennes.length - 1];
    
    let nomPlusForte = 'Inconnu';
    let nomPlusFaible = 'Inconnu';
    
    if (plusForte) {
      const { data: elevePF } = await supabase
        .from('eleves')
        .select('user_id')
        .eq('id', plusForte.eleveId)
        .single();
      if (elevePF) {
        const { data: profilePF } = await supabase
          .from('profiles')
          .select('nom, prenom')
          .eq('id', elevePF.user_id)
          .single();
        if (profilePF) {
          nomPlusForte = `${profilePF.prenom} ${profilePF.nom}`;
        }
      }
    }
    
    if (plusFaible) {
      const { data: elevePFi } = await supabase
        .from('eleves')
        .select('user_id')
        .eq('id', plusFaible.eleveId)
        .single();
      if (elevePFi) {
        const { data: profilePFi } = await supabase
          .from('profiles')
          .select('nom, prenom')
          .eq('id', elevePFi.user_id)
          .single();
        if (profilePFi) {
          nomPlusFaible = `${profilePFi.prenom} ${profilePFi.nom}`;
        }
      }
    }

    // 12. Construire les notes de l'élève avec les rangs par matière
    const notesDetaillees: Array<{
      matiere: string;
      matiereId: string;
      coefficient: number;
      moyenneInterrogations: number;
      devoir1: number;
      devoir2: number;
      moyenne: number;
      rang: number;
      appreciation: string;
    }> = [];

    for (const matiere of matieresStats.values()) {
      const notesTriees = [...matiere.notes].sort((a, b) => b.moyenne - a.moyenne);
      const noteEleve = matiere.notes.find(n => n.eleveId === eleveId);
      const rangMatiere = notesTriees.findIndex(n => n.eleveId === eleveId) + 1;
      const moyenneMatiere = noteEleve?.moyenne || 0;
      
      let appreciation = '';
      if (moyenneMatiere >= 16) appreciation = 'Exceptionnel';
      else if (moyenneMatiere >= 14) appreciation = 'Saisissant';
      else if (moyenneMatiere >= 12) appreciation = 'Assez bien';
      else if (moyenneMatiere >= 10) appreciation = 'Assidûment';
      else if (moyenneMatiere >= 9.5) appreciation = 'Indispensable';
      else if (moyenneMatiere >= 7.5) appreciation = 'Faible';
      else appreciation = 'Insuffisant';
      
      const devoirsMatiere = matieresMap.get(matiere.matiereId)?.devoirs || [];
      const notesDevoirs = devoirsMatiere.slice(0, 3).map(devoir => {
        const note = allNotes?.find(n => n.eleve_id === eleveId && n.devoir_id === devoir.id);
        return note ? (note.note / (devoir.note_sur || 20)) * 20 : 0;
      });
      
      notesDetaillees.push({
        matiere: matiere.matiereNom,
        matiereId: matiere.matiereId,
        coefficient: matiere.coefficient,
        moyenneInterrogations: notesDevoirs[0] || 0,
        devoir1: notesDevoirs[1] || 0,
        devoir2: notesDevoirs[2] || 0,
        moyenne: moyenneMatiere,
        rang: rangMatiere,
        appreciation,
      });
    }

    notesDetaillees.sort((a, b) => a.matiere.localeCompare(b.matiere));

    // 13. Décisions et appréciations
    const decisions = [
      moyenneGenerale >= 10 ? 'Admis(e) en classe supérieure' : 'Redoublement',
    ];
    
    const appreciationChef = '_________________________';
    const appreciationPP = undefined;

    console.log('🔍 getBulletinExportData - succès:', {
      eleve: `${profile?.prenom} ${profile?.nom}`,
      moyenneGenerale,
      rang,
      nbNotes: notesDetaillees.length,
    });

    return {
      eleve: {
        id: eleve.id,
        nom: profile?.nom || 'Inconnu',
        prenom: profile?.prenom || 'Inconnu',
        matricule: eleve.matricule,
        dateNaissance: eleve.date_naissance,
        lieuNaissance: profile?.lieu_naissance,
        sexe: profile?.sexe as 'M' | 'F' | undefined,
      },
      classe: {
        id: eleve.classe_id,
        nom: classeData?.nom || 'Inconnue',
      },
      notes: notesDetaillees,
      moyenneGenerale: Math.round(moyenneGenerale * 100) / 100,
      rang,
      effectifClasse,
      plusForteMoyenne: {
        valeur: Math.round(plusForte?.moyenne || 0),
        eleve: nomPlusForte,
      },
      plusFaibleMoyenne: {
        valeur: Math.round(plusFaible?.moyenne || 0),
        eleve: nomPlusFaible,
      },
      decisions,
      appreciationChef,
      appreciationPP,
    };
  } catch (error) {
    console.error('Error getting bulletin export data:', error);
    return null;
  }
}