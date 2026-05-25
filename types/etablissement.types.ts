// /home/project/types/etablissement.types.ts
// Types pour les établissements publics (annuaire)

export interface EtablissementPublic {
  id: string;
  nom: string;
  slug: string;
  ville: string | null;
  type_etablissement: string | null;
  regime: string | null;
  logo_url: string | null;
  taux_reussite: number | null;
  likes_count: number;
  vues_count: number;
  note_moyenne: number;
  region: string | null;
  departement: string | null;
  region_id: string | null;
  departement_id: string | null;
  badge_annuaire: string | null;
  cycles: string | null;
  options: string | null;
  description_courte: string | null;
  etoiles: string;
  type_affichage: string;
  code_etablissement?: string | null; // 🆕 AJOUT
}

export interface EtablissementFilters {
  searchQuery?: string;
  regionId?: string;
  departementId?: string;
  type?: string;
  cycle?: string;
  option?: string;
  page?: number;
  limit?: number;
}

export interface EtablissementListResponse {
  data: EtablissementPublic[];
  total: number;
  page: number;
  totalPages: number;
}

export interface Region {
  id: string;
  nom: string;
}

export interface Departement {
  id: string;
  nom: string;
  region_id: string;
}