/*
  # SchoolNet - Core Database Schema
  
  ## Architecture Multi-tenant
  - Toutes les tables liées à un établissement contiennent `etablissement_id`
  - Les données globales utilisent `scope = 'platform'`
  - Architecture évolutive pour IA, Social et Marketplace
  
  ## Tables créées
  
  ### 1. Core System
  - `etablissements` - Gestion des établissements scolaires
  - `profiles` - Profils utilisateurs étendus (complète auth.users)
  - `user_roles` - Gestion multi-rôles par utilisateur
  - `annees_scolaires` - Années académiques
  - `classes` - Classes par établissement
  - `matieres` - Matières enseignées
  
  ### 2. Scolarité & Finance
  - `eleves` - Fiches élèves
  - `inscriptions` - Inscriptions/réinscriptions par année
  - `frais_scolarite` - Définition des frais par classe
  - `paiements` - Historique des paiements
  - `echeanciers` - Paiements échelonnés
  
  ### 3. Pédagogique
  - `devoirs` - Devoirs et compositions
  - `notes` - Notes des élèves
  - `bulletins` - Bulletins générés
  
  ### 4. Communication
  - `messages` - Messagerie interne
  - `notifications` - Notifications système
  
  ### 5. IA
  - `ai_sessions` - Sessions de chat IA
  - `ai_messages` - Historique conversations IA
  
  ### 6. Social
  - `publications` - Publications sur le mur
  - `comments` - Commentaires
  - `likes` - J'aime
  - `amis` - Relations d'amitié
  - `parental_controls` - Contrôles parentaux
  - `activity_logs` - Journal d'activités
  
  ### 7. Community
  - `forums` - Forums de discussion
  - `forum_messages` - Messages des forums
  
  ### 8. Marketplace
  - `produits` - Produits à vendre
  - `commandes` - Commandes
  
  ### 9. Système
  - `invitation_codes` - Codes d'invitation
  - `abonnements` - Abonnements établissements
  - `audit_logs` - Logs d'audit système
  
  ## Sécurité
  - RLS activé sur toutes les tables
  - Policies restrictives par rôle
  - Isolation multi-tenant stricte
*/

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUMS & TYPES
-- ============================================================================

-- Rôles utilisateurs
CREATE TYPE user_role AS ENUM (
  'eleve',
  'parent',
  'enseignant',
  'chef_etablissement',
  'admin',
  'autorite',
  'partenaire'
);

-- Statuts de paiement
CREATE TYPE payment_status AS ENUM (
  'paye',
  'partiel',
  'impaye'
);

-- Types de frais
CREATE TYPE fee_type AS ENUM (
  'inscription',
  'scolarite',
  'examen',
  'autre'
);

-- Types de devoirs
CREATE TYPE devoir_type AS ENUM (
  'devoir',
  'composition',
  'examen'
);

-- Modes de contrôle parental
CREATE TYPE access_mode AS ENUM (
  'libre',
  'controle',
  'differe'
);

-- Types d'actions pour logs
CREATE TYPE action_type AS ENUM (
  'connexion',
  'consultation_notes',
  'envoi_message',
  'acces_corrige',
  'tentative_acces_hors_plage',
  'acces_ia',
  'publication',
  'ajout_ami'
);

-- ============================================================================
-- CORE SYSTEM TABLES
-- ============================================================================

-- Établissements
CREATE TABLE IF NOT EXISTS etablissements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  adresse text,
  telephone text,
  email text,
  logo_url text,
  couleur_primaire text DEFAULT '#3B82F6',
  couleur_secondaire text DEFAULT '#1E40AF',
  is_active boolean DEFAULT true,
  date_creation timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Profils utilisateurs (étend auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  etablissement_id uuid REFERENCES etablissements(id),
  nom text NOT NULL,
  prenom text NOT NULL,
  telephone text,
  adresse text,
  date_naissance date,
  lieu_naissance text,
  sexe text CHECK (sexe IN ('M', 'F')),
  photo_url text,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Rôles utilisateurs (multi-rôles)
CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  etablissement_id uuid REFERENCES etablissements(id),
  role user_role NOT NULL,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, etablissement_id, role)
);

-- Années scolaires
CREATE TABLE IF NOT EXISTS annees_scolaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id uuid REFERENCES etablissements(id) ON DELETE CASCADE,
  libelle text NOT NULL,
  date_debut date NOT NULL,
  date_fin date NOT NULL,
  is_active boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Classes
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id uuid REFERENCES etablissements(id) ON DELETE CASCADE,
  annee_scolaire_id uuid REFERENCES annees_scolaires(id),
  nom text NOT NULL,
  niveau text NOT NULL,
  capacite integer DEFAULT 50,
  enseignant_principal_id uuid REFERENCES auth.users(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Matières
CREATE TABLE IF NOT EXISTS matieres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id uuid REFERENCES etablissements(id) ON DELETE CASCADE,
  nom text NOT NULL,
  code text NOT NULL,
  coefficient integer DEFAULT 1,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(etablissement_id, code)
);

-- ============================================================================
-- SCOLARITÉ & FINANCE
-- ============================================================================

-- Élèves
CREATE TABLE IF NOT EXISTS eleves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  etablissement_id uuid REFERENCES etablissements(id) ON DELETE CASCADE,
  matricule text NOT NULL,
  classe_id uuid REFERENCES classes(id),
  parent_id uuid REFERENCES auth.users(id),
  statut text DEFAULT 'actif' CHECK (statut IN ('actif', 'inactif', 'exclu', 'diplome')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(etablissement_id, matricule)
);

-- Inscriptions
CREATE TABLE IF NOT EXISTS inscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eleve_id uuid REFERENCES eleves(id) ON DELETE CASCADE,
  etablissement_id uuid REFERENCES etablissements(id) ON DELETE CASCADE,
  annee_scolaire_id uuid REFERENCES annees_scolaires(id),
  classe_id uuid REFERENCES classes(id),
  date_inscription timestamptz DEFAULT now(),
  montant_total numeric(10,2) DEFAULT 0,
  montant_paye numeric(10,2) DEFAULT 0,
  statut payment_status DEFAULT 'impaye',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Frais de scolarité
CREATE TABLE IF NOT EXISTS frais_scolarite (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id uuid REFERENCES etablissements(id) ON DELETE CASCADE,
  annee_scolaire_id uuid REFERENCES annees_scolaires(id),
  classe_id uuid REFERENCES classes(id),
  type fee_type NOT NULL,
  libelle text NOT NULL,
  montant numeric(10,2) NOT NULL,
  is_obligatoire boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Paiements
CREATE TABLE IF NOT EXISTS paiements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inscription_id uuid REFERENCES inscriptions(id) ON DELETE CASCADE,
  etablissement_id uuid REFERENCES etablissements(id) ON DELETE CASCADE,
  montant numeric(10,2) NOT NULL,
  date_paiement timestamptz DEFAULT now(),
  mode_paiement text DEFAULT 'especes' CHECK (mode_paiement IN ('especes', 'virement', 'mobile_money', 'cheque')),
  reference text,
  recu_url text,
  created_by uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Échéanciers
CREATE TABLE IF NOT EXISTS echeanciers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inscription_id uuid REFERENCES inscriptions(id) ON DELETE CASCADE,
  etablissement_id uuid REFERENCES etablissements(id) ON DELETE CASCADE,
  montant numeric(10,2) NOT NULL,
  date_echeance date NOT NULL,
  is_paye boolean DEFAULT false,
  date_paiement timestamptz,
  paiement_id uuid REFERENCES paiements(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- PÉDAGOGIQUE
-- ============================================================================

-- Devoirs et compositions
CREATE TABLE IF NOT EXISTS devoirs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id uuid REFERENCES etablissements(id) ON DELETE CASCADE,
  classe_id uuid REFERENCES classes(id),
  matiere_id uuid REFERENCES matieres(id),
  enseignant_id uuid REFERENCES auth.users(id),
  type devoir_type NOT NULL,
  titre text NOT NULL,
  description text,
  date_devoir date NOT NULL,
  note_sur numeric(5,2) DEFAULT 20,
  coefficient integer DEFAULT 1,
  is_published boolean DEFAULT false,
  corrige_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Notes
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  devoir_id uuid REFERENCES devoirs(id) ON DELETE CASCADE,
  eleve_id uuid REFERENCES eleves(id) ON DELETE CASCADE,
  etablissement_id uuid REFERENCES etablissements(id) ON DELETE CASCADE,
  note numeric(5,2) NOT NULL,
  appreciation text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(devoir_id, eleve_id)
);

-- Bulletins
CREATE TABLE IF NOT EXISTS bulletins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  eleve_id uuid REFERENCES eleves(id) ON DELETE CASCADE,
  etablissement_id uuid REFERENCES etablissements(id) ON DELETE CASCADE,
  annee_scolaire_id uuid REFERENCES annees_scolaires(id),
  classe_id uuid REFERENCES classes(id),
  periode text NOT NULL,
  moyenne_generale numeric(5,2),
  rang integer,
  effectif integer,
  appreciation_generale text,
  bulletin_url text,
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- COMMUNICATION
-- ============================================================================

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id uuid REFERENCES etablissements(id),
  expediteur_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  destinataire_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  sujet text,
  contenu text NOT NULL,
  is_read boolean DEFAULT false,
  read_at timestamptz,
  parent_message_id uuid REFERENCES messages(id),
  created_at timestamptz DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id uuid REFERENCES etablissements(id),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  titre text NOT NULL,
  contenu text NOT NULL,
  type text NOT NULL,
  data jsonb DEFAULT '{}',
  is_read boolean DEFAULT false,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- IA MODULE
-- ============================================================================

-- Sessions IA
CREATE TABLE IF NOT EXISTS ai_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  etablissement_id uuid REFERENCES etablissements(id),
  titre text DEFAULT 'Nouvelle conversation',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Messages IA
CREATE TABLE IF NOT EXISTS ai_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES ai_sessions(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  contenu text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- SOCIAL MODULE
-- ============================================================================

-- Publications
CREATE TABLE IF NOT EXISTS publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  etablissement_id uuid REFERENCES etablissements(id),
  contenu text NOT NULL,
  images jsonb DEFAULT '[]',
  visibilite text DEFAULT 'amis' CHECK (visibilite IN ('public', 'amis', 'prive')),
  likes_count integer DEFAULT 0,
  comments_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Commentaires
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid REFERENCES publications(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  contenu text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Likes
CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid REFERENCES publications(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(publication_id, user_id)
);

-- Amis
CREATE TABLE IF NOT EXISTS amis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ami_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  statut text DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'accepte', 'refuse', 'bloque')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, ami_id)
);

-- Contrôles parentaux
CREATE TABLE IF NOT EXISTS parental_controls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  enfant_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  access_mode access_mode DEFAULT 'controle',
  differe_delay_hours integer DEFAULT 48,
  restrictions jsonb DEFAULT '{"forums": true, "publications": true, "amis": true, "messages": false, "marketplace": true, "ia_access": false}',
  horaires jsonb DEFAULT '{"start": "08:00", "end": "20:00", "enabled": true}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(parent_id, enfant_id)
);

-- Journal d'activités
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  enfant_id uuid REFERENCES auth.users(id),
  action_type action_type NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- COMMUNITY MODULE
-- ============================================================================

-- Forums
CREATE TABLE IF NOT EXISTS forums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id uuid REFERENCES etablissements(id) ON DELETE CASCADE,
  classe_id uuid REFERENCES classes(id),
  titre text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Messages forums
CREATE TABLE IF NOT EXISTS forum_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forum_id uuid REFERENCES forums(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  contenu text NOT NULL,
  parent_message_id uuid REFERENCES forum_messages(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- MARKETPLACE MODULE
-- ============================================================================

-- Produits
CREATE TABLE IF NOT EXISTS produits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id uuid REFERENCES etablissements(id),
  vendeur_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  titre text NOT NULL,
  description text,
  prix numeric(10,2) NOT NULL,
  images jsonb DEFAULT '[]',
  categorie text,
  is_disponible boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Commandes
CREATE TABLE IF NOT EXISTS commandes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produit_id uuid REFERENCES produits(id) ON DELETE CASCADE,
  acheteur_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  quantite integer DEFAULT 1,
  montant_total numeric(10,2) NOT NULL,
  statut text DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'confirmee', 'livree', 'annulee')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================================
-- SYSTÈME
-- ============================================================================

-- Codes d'invitation
CREATE TABLE IF NOT EXISTS invitation_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id uuid REFERENCES etablissements(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  role user_role NOT NULL,
  max_usages integer DEFAULT 1,
  usages_count integer DEFAULT 0,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Abonnements
CREATE TABLE IF NOT EXISTS abonnements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id uuid REFERENCES etablissements(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('gratuit', 'basique', 'premium', 'entreprise')),
  date_debut timestamptz DEFAULT now(),
  date_fin timestamptz,
  is_active boolean DEFAULT true,
  limite_eleves integer,
  limite_enseignants integer,
  fonctionnalites jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Logs d'audit
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  etablissement_id uuid REFERENCES etablissements(id),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  table_name text,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================

-- Core indexes
CREATE INDEX IF NOT EXISTS idx_profiles_etablissement ON profiles(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_etablissement ON user_roles(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_classes_etablissement ON classes(etablissement_id);

-- Finance indexes
CREATE INDEX IF NOT EXISTS idx_eleves_etablissement ON eleves(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_eleves_parent ON eleves(parent_id);
CREATE INDEX IF NOT EXISTS idx_inscriptions_eleve ON inscriptions(eleve_id);
CREATE INDEX IF NOT EXISTS idx_paiements_inscription ON paiements(inscription_id);

-- Academic indexes
CREATE INDEX IF NOT EXISTS idx_devoirs_classe ON devoirs(classe_id);
CREATE INDEX IF NOT EXISTS idx_notes_eleve ON notes(eleve_id);
CREATE INDEX IF NOT EXISTS idx_notes_devoir ON notes(devoir_id);

-- Communication indexes
CREATE INDEX IF NOT EXISTS idx_messages_expediteur ON messages(expediteur_id);
CREATE INDEX IF NOT EXISTS idx_messages_destinataire ON messages(destinataire_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- Social indexes
CREATE INDEX IF NOT EXISTS idx_publications_user ON publications(user_id);
CREATE INDEX IF NOT EXISTS idx_parental_controls_parent ON parental_controls(parent_id);
CREATE INDEX IF NOT EXISTS idx_parental_controls_enfant ON parental_controls(enfant_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_enfant ON activity_logs(enfant_id);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE etablissements ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE annees_scolaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matieres ENABLE ROW LEVEL SECURITY;
ALTER TABLE eleves ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE frais_scolarite ENABLE ROW LEVEL SECURITY;
ALTER TABLE paiements ENABLE ROW LEVEL SECURITY;
ALTER TABLE echeanciers ENABLE ROW LEVEL SECURITY;
ALTER TABLE devoirs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulletins ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE amis ENABLE ROW LEVEL SECURITY;
ALTER TABLE parental_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE forums ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE produits ENABLE ROW LEVEL SECURITY;
ALTER TABLE commandes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE abonnements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;