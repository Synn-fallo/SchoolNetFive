// /home/project/types/eligibilite.types.ts
// Types pour la gestion de l'éligibilité des élèves

export interface ConditionsEligibilite {
  frais_scolarite: boolean;
  inscription_validee: boolean;
  documents_administratifs: boolean;
}

export interface ParametreBlocageBulletins {
  actif: boolean;
  conditions: ConditionsEligibilite;
}

export interface ParametreBlocageCertificats {
  actif: boolean;
  utiliser_memes_conditions: boolean;
}

export interface StatutEligibilite {
  eligible: boolean;
  motifs: string[];
}

export interface StatutEligibiliteBatch {
  [eleveId: string]: StatutEligibilite;
}

export interface MotifDetail {
  code: string;
  message: string;
  type: 'frais' | 'inscription' | 'documents' | 'autre';
}