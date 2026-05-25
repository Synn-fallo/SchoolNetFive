// types/admin.types.ts
// Types pour les rôles administratifs et les délégations

export type AdminType = 'de' | 'ae' | 'administratif' | 'vie_scolaire';

export interface AdminMetadata {
  type_admin: AdminType;
  departement?: string;      // Pour les AE : département supervisé
  plafond?: number;          // Pour les AE : nombre max d'enseignants
  fonction?: string;         // Pour personnel admin/vie scolaire
}

export interface Delegation {
  id: string;
  delegant_id: string;
  delegue_id: string;
  etablissement_id: string;
  type: 'directeur_etudes' | 'animateur_etablissement' | 'enseignant' | 'personnel_administratif' | 'personnel_vie_scolaire';
  departement?: string;
  plafond?: number;
  droits: {
    lecture: boolean;
    ecriture: boolean;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Relance {
  id: string;
  etablissement_id?: string;
  user_id: string;
  type: 'phase2_j7' | 'phase2_j30' | 'demande_48h' | 'paiement_echoue';
  date_envoi: string;
  statut: 'envoye' | 'en_attente' | 'echoue';
  message?: string;
  metadata?: any;
  created_at: string;
}

export interface EnseignantSupervise {
  id: string;
  user_id: string;
  nom: string;
  prenom: string;
  email: string;
  departement?: string;
  classes: Array<{ id: string; nom: string }>;
}

// NOUVEAUX TYPES POUR AUTORITÉ ET PARTENAIRE

export type Perimetre = 'national' | 'regional' | 'departemental' | 'local';

export type OrganisationType = 'ministere' | 'delegation' | 'ong' | 'entreprise' | 'association' | 'autre';

export interface Zone {
  id: string;
  nom: string;
  type: 'region' | 'departement' | 'commune' | 'arrondissement';
  parent_id?: string;
  code?: string;
  created_at: string;
  updated_at: string;
}

export interface PartenariatEtablissement {
  id: string;
  partenaire_id: string;
  etablissement_id: string;
  statut: 'actif' | 'suspendu' | 'termine';
  date_debut: string;
  date_fin?: string;
  created_at: string;
  updated_at: string;
}

export interface AutoriteMetadata {
  perimetre: Perimetre;
  zone_id?: string;
  organisation: string;
  organisation_type: OrganisationType;
  fonction?: string;
}

export interface PartenaireMetadata {
  organisation: string;
  organisation_type: OrganisationType;
  secteur?: string;
  site_web?: string;
}