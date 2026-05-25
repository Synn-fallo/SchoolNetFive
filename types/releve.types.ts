export type PeriodeType = 'S1' | 'S2' | 'T1' | 'T2' | 'T3' | 'annuel';

export interface EvaluationNote {
  titre: string;
  date: string;
  note: number;
  note_sur: number;
  appreciation?: string;
  type: 'interrogation' | 'devoir' | 'examen_blanc';
}

export interface MatiereReleve {
  id: string;
  nom: string;
  coefficient: number;
  evaluations: EvaluationNote[];
  moyenne: number;
  rang?: number;
  appreciation?: string;
}

export interface ReleveData {
  eleve: {
    id: string;
    nom: string;
    prenom: string;
    matricule?: string;
  };
  classe: {
    id: string;
    nom: string;
    type: 'officielle' | 'personnelle';
    effectif?: number;
  };
  periode: PeriodeType;
  matieres: MatiereReleve[];
  moyenneGenerale: number;
  rang?: number;
  plusForteMoyenne?: { valeur: number; eleve: string };
  plusFaibleMoyenne?: { valeur: number; eleve: string };
}

export interface ExportOptions {
  format: 'pdf' | 'excel';
  includeQRCode: boolean;
}