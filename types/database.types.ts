export type UserRole = 'eleve' | 'parent' | 'enseignant' | 'chef_etablissement' | 'admin' | 'autorite' | 'partenaire';

export type PaymentStatus = 'paye' | 'partiel' | 'impaye';

export type FeeType = 'inscription' | 'scolarite' | 'examen' | 'autre';

export type DevoirType = 'devoir' | 'composition' | 'examen';

export type AccessMode = 'libre' | 'controle' | 'differe';

export type ActionType =
  | 'connexion'
  | 'consultation_notes'
  | 'envoi_message'
  | 'acces_corrige'
  | 'tentative_acces_hors_plage'
  | 'acces_ia'
  | 'publication'
  | 'ajout_ami';

export interface Etablissement {
  id: string;
  nom: string;
  slug: string;
  description?: string;
  region_id?: string;
  departement_id?: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  logo_url?: string;
  couleur_primaire: string;
  couleur_secondaire: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  etablissement_id?: string;
  nom: string;
  prenom: string;
  sexe?: string;
  telephone?: string;
  adresse?: string;
  date_naissance?: string;
  lieu_naissance?: string;
  photo_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // NOUVEAUX CHAMPS POUR AUTORITÉ ET PARTENAIRE
  perimetre?: string;           // National, Régional, Départemental, Local
  zone_id?: string;             // ID de la zone (région, département, commune)
  organisation?: string;        // Nom de l'organisation (pour Autorité et Partenaire)
  organisation_type?: string;   // ONG, Entreprise, Ministère, Délégation, etc.
}

export interface UserRoleRecord {
  id: string;
  user_id: string;
  etablissement_id?: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  // NOUVEAU : métadonnées pour les rôles administratifs
  metadata?: {
    type_admin?: string;      // 'de', 'ae', 'administratif', 'vie_scolaire'
    departement?: string;      // Pour les AE : département supervisé
    fonction?: string;         // Pour personnel admin/vie scolaire
  };
}

export interface Classe {
  id: string;
  etablissement_id: string;
  annee_scolaire_id?: string;
  nom: string;
  niveau: string;
  capacite: number;
  enseignant_principal_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClassePersonnelle {
  id: string;
  enseignant_id: string;
  nom: string;
  description: string | null;
  matieres: any[];
  eleves: any[];
  rattachee_a: string | null;
  etablissement_nom: string | null;      // ← NOUVEAU
  etablissement_id: string | null;       // ← NOUVEAU
  created_at: string;
  updated_at: string;
}

export interface Eleve {
  id: string;
  user_id: string;
  etablissement_id: string;
  matricule: string;
  classe_id?: string;
  parent_id?: string;
  statut: 'actif' | 'inactif' | 'exclu' | 'diplome';
  created_at: string;
  updated_at: string;
}

export interface Inscription {
  id: string;
  eleve_id: string;
  etablissement_id: string;
  annee_scolaire_id?: string;
  classe_id?: string;
  date_inscription: string;
  montant_total: number;
  montant_paye: number;
  statut: PaymentStatus;
  created_at: string;
  updated_at: string;
}

export interface Paiement {
  id: string;
  inscription_id: string;
  etablissement_id: string;
  montant: number;
  date_paiement: string;
  mode_paiement: 'especes' | 'virement' | 'mobile_money' | 'cheque';
  reference?: string;
  recu_url?: string;
  created_by?: string;
  created_at: string;
}

export interface Devoir {
  id: string;
  etablissement_id: string;
  classe_id?: string;
  matiere_id?: string;
  enseignant_id?: string;
  type: DevoirType;
  titre: string;
  description?: string;
  date_devoir: string;
  note_sur: number;
  coefficient: number;
  is_published: boolean;
  corrige_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  devoir_id: string;
  eleve_id: string;
  etablissement_id: string;
  note: number;
  appreciation?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  etablissement_id?: string;
  expediteur_id: string;
  destinataire_id: string;
  sujet?: string;
  contenu: string;
  is_read: boolean;
  read_at?: string;
  parent_message_id?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  etablissement_id?: string;
  user_id: string;
  titre: string;
  contenu: string;
  type: string;
  data?: any;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface Publication {
  id: string;
  user_id: string;
  etablissement_id?: string;
  contenu: string;
  images?: string[];
  visibilite: 'public' | 'amis' | 'prive';
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
}

export interface ParentalControl {
  id: string;
  parent_id: string;
  enfant_id: string;
  access_mode: AccessMode;
  differe_delay_hours: number;
  restrictions: {
    forums: boolean;
    publications: boolean;
    amis: boolean;
    messages: boolean;
    marketplace: boolean;
    ia_access: boolean;
  };
  horaires: {
    start: string;
    end: string;
    enabled: boolean;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  enfant_id?: string;
  action_type: ActionType;
  metadata?: any;
  created_at: string;
}

export interface AnneeScolaire {
  id: string;
  etablissement_id: string;
  libelle: string;
  date_debut: string;
  date_fin: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Matiere {
  id: string;
  etablissement_id: string;
  nom: string;
  code: string;
  coefficient: number;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface FraisScolarite {
  id: string;
  etablissement_id: string;
  annee_scolaire_id?: string;
  classe_id?: string;
  type: FeeType;
  libelle: string;
  montant: number;
  is_obligatoire: boolean;
  created_at: string;
  updated_at: string;
}

export interface Echeancier {
  id: string;
  inscription_id: string;
  etablissement_id: string;
  montant: number;
  date_echeance: string;
  is_paye: boolean;
  date_paiement?: string;
  paiement_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Bulletin {
  id: string;
  eleve_id: string;
  etablissement_id: string;
  annee_scolaire_id?: string;
  classe_id?: string;
  periode: string;
  moyenne_generale?: number;
  rang?: number;
  effectif?: number;
  appreciation_generale?: string;
  bulletin_url?: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiSession {
  id: string;
  user_id: string;
  etablissement_id?: string;
  titre: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  contenu: string;
  metadata?: any;
  created_at: string;
}

export interface Comment {
  id: string;
  publication_id: string;
  user_id: string;
  contenu: string;
  created_at: string;
}

export interface Like {
  id: string;
  publication_id: string;
  user_id: string;
  created_at: string;
}

export interface Ami {
  id: string;
  user_id: string;
  ami_id: string;
  statut: 'en_attente' | 'accepte' | 'refuse' | 'bloque';
  created_at: string;
  updated_at: string;
}

export interface Forum {
  id: string;
  etablissement_id: string;
  classe_id?: string;
  titre: string;
  description?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ForumMessage {
  id: string;
  forum_id: string;
  user_id: string;
  contenu: string;
  parent_message_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Produit {
  id: string;
  etablissement_id?: string;
  vendeur_id: string;
  titre: string;
  description?: string;
  prix: number;
  images?: string[];
  categorie?: string;
  is_disponible: boolean;
  created_at: string;
  updated_at: string;
}

export interface Commande {
  id: string;
  produit_id: string;
  acheteur_id: string;
  quantite: number;
  montant_total: number;
  statut: 'en_attente' | 'confirmee' | 'livree' | 'annulee';
  created_at: string;
  updated_at: string;
}

export interface InvitationCode {
  id: string;
  etablissement_id?: string;
  code: string;
  role: UserRole;
  max_usages: number;
  usages_count: number;
  expires_at?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
}

export interface Abonnement {
  id: string;
  etablissement_id: string;
  plan: 'gratuit' | 'basique' | 'premium' | 'entreprise';
  date_debut: string;
  date_fin?: string;
  is_active: boolean;
  limite_eleves?: number;
  limite_enseignants?: number;
  fonctionnalites?: any;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  etablissement_id?: string;
  user_id?: string;
  action: string;
  table_name?: string;
  record_id?: string;
  old_data?: any;
  new_data?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// NOUVELLE INTERFACE : Partenariats établissements
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

// ============================================================
// RÉGIONS ET DÉPARTEMENTS
// ============================================================

export interface Region {
  id: string;
  code: string;
  nom: string;
  ordre: number;
  created_at: string;
  updated_at: string;
}

export interface Departement {
  id: string;
  code: string;
  nom: string;
  region_id: string;
  ordre: number;
  created_at: string;
  updated_at: string;
}