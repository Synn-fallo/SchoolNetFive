-- ============================================================
-- MIGRATION: Ajout des colonnes de métriques pour les établissements
-- Date: 2026-04-20
-- Description: Ajout des colonnes à la table etablissements
--              et création des tables de tracking
-- ============================================================

-- ============================================================
-- 1. Ajout des colonnes à la table 'etablissements'
-- ============================================================

-- Ajouter la colonne taux_reussite
ALTER TABLE etablissements 
ADD COLUMN IF NOT EXISTS taux_reussite INTEGER;

COMMENT ON COLUMN etablissements.taux_reussite IS 
'Taux de réussite aux examens (ex: 85 pour 85%)';

-- Ajouter la colonne likes_count
ALTER TABLE etablissements 
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

COMMENT ON COLUMN etablissements.likes_count IS 
'Nombre total de likes reçus par l''établissement';

-- Ajouter la colonne vues_count
ALTER TABLE etablissements 
ADD COLUMN IF NOT EXISTS vues_count INTEGER DEFAULT 0;

COMMENT ON COLUMN etablissements.vues_count IS 
'Nombre total de vues de la page établissement';

-- Ajouter une colonne pour la note moyenne
ALTER TABLE etablissements 
ADD COLUMN IF NOT EXISTS note_moyenne DECIMAL(3,2) DEFAULT 0;

COMMENT ON COLUMN etablissements.note_moyenne IS 
'Note moyenne de l''établissement (0-5)';


-- ============================================================
-- 2. Mise à jour des données existantes (Lycée Workflow)
-- ============================================================

UPDATE etablissements
SET 
    taux_reussite = 84,
    likes_count = 45,
    vues_count = 1250,
    note_moyenne = 4.2
WHERE id = '1e531ccb-fd47-4be6-a8e4-b801edf3e8ad';


-- ============================================================
-- 3. Création de la table pour les likes d'établissements
-- ============================================================

CREATE TABLE IF NOT EXISTS etablissement_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    etablissement_id UUID NOT NULL REFERENCES etablissements(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(etablissement_id, user_id)
);

COMMENT ON TABLE etablissement_likes IS 'Likes des établissements par les utilisateurs';

-- Index
CREATE INDEX IF NOT EXISTS idx_etablissement_likes_etablissement_id ON etablissement_likes(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_etablissement_likes_user_id ON etablissement_likes(user_id);

-- Fonction pour mettre à jour likes_count
CREATE OR REPLACE FUNCTION update_etablissement_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE etablissements
        SET likes_count = likes_count + 1
        WHERE id = NEW.etablissement_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE etablissements
        SET likes_count = likes_count - 1
        WHERE id = OLD.etablissement_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trigger_update_etablissement_likes ON etablissement_likes;
CREATE TRIGGER trigger_update_etablissement_likes
    AFTER INSERT OR DELETE ON etablissement_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_etablissement_likes_count();


-- ============================================================
-- 4. Création de la table pour les vues
-- ============================================================

CREATE TABLE IF NOT EXISTS etablissement_vues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    etablissement_id UUID NOT NULL REFERENCES etablissements(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    ip_address TEXT,
    user_agent TEXT,
    referer TEXT,
    session_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE etablissement_vues IS 'Traçage des vues individuelles des établissements';

-- Index
CREATE INDEX IF NOT EXISTS idx_etablissement_vues_etablissement_id ON etablissement_vues(etablissement_id);
CREATE INDEX IF NOT EXISTS idx_etablissement_vues_created_at ON etablissement_vues(created_at);
CREATE INDEX IF NOT EXISTS idx_etablissement_vues_session_id ON etablissement_vues(session_id);

-- Fonction pour incrémenter vues_count
CREATE OR REPLACE FUNCTION increment_etablissement_vues()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE etablissements
    SET vues_count = vues_count + 1
    WHERE id = NEW.etablissement_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trigger_increment_etablissement_vues ON etablissement_vues;
CREATE TRIGGER trigger_increment_etablissement_vues
    AFTER INSERT ON etablissement_vues
    FOR EACH ROW
    EXECUTE FUNCTION increment_etablissement_vues();


-- ============================================================
-- 5. Vue enrichie pour les cartes
-- ============================================================

DROP VIEW IF EXISTS public_etablissements_cards;

CREATE VIEW public_etablissements_cards AS
SELECT 
    e.id,
    e.nom,
    e.slug,
    e.ville,
    e.type_etablissement,
    e.regime,
    e.logo_url,
    e.taux_reussite,
    e.likes_count,
    e.vues_count,
    e.note_moyenne,
    e.region,
    e.departement,
    -- Badge basé sur l'abonnement actif
    CASE 
        WHEN a.id IS NOT NULL AND a.plan = 'prestige' THEN 'Prestige'
        WHEN a.id IS NOT NULL AND a.plan = 'premium' THEN 'Premium'
        WHEN a.id IS NOT NULL AND a.plan = 'basique' THEN 'Basique'
        ELSE NULL
    END AS badge_annuaire,
    -- Cycles depuis metadata (formaté)
    CASE 
        WHEN e.metadata->'cycles' IS NOT NULL THEN 
            REPLACE(REPLACE(e.metadata->>'cycles', '["', ''), '"]', '')
        ELSE NULL
    END AS cycles,
    -- Options depuis metadata (formaté)
    CASE 
        WHEN e.metadata->'options' IS NOT NULL THEN 
            UPPER(REPLACE(REPLACE(e.metadata->>'options', '["', ''), '"]', ''))
        ELSE NULL
    END AS options,
    -- Description courte depuis metadata
    e.metadata->>'description_courte' AS description_courte,
    -- Note avec étoiles
    CASE 
        WHEN e.note_moyenne >= 4.5 THEN '★★★★★'
        WHEN e.note_moyenne >= 4.0 THEN '★★★★☆'
        WHEN e.note_moyenne >= 3.0 THEN '★★★☆☆'
        WHEN e.note_moyenne >= 2.0 THEN '★★☆☆☆'
        WHEN e.note_moyenne > 0 THEN '★☆☆☆☆'
        ELSE '☆☆☆☆☆'
    END AS etoiles,
    -- Type formaté
    CASE 
        WHEN e.type_etablissement = 'public' THEN 'Public'
        WHEN e.type_etablissement = 'prive' THEN 'Privé'
        WHEN e.type_etablissement = 'mixte' THEN 'Mixte'
        ELSE e.regime
    END AS type_affichage
FROM etablissements e
LEFT JOIN abonnements a ON a.etablissement_id = e.id AND a.is_active = true
WHERE e.statut = 'ACTIF' AND e.is_active = true;

COMMENT ON VIEW public_etablissements_cards IS 'Vue optimisée pour l''affichage des cartes établissements';


-- ============================================================
-- 6. Vérification finale
-- ============================================================

-- Afficher les colonnes ajoutées
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'etablissements'
  AND column_name IN ('taux_reussite', 'likes_count', 'vues_count', 'note_moyenne')
ORDER BY column_name;

-- Tester la nouvelle vue
SELECT 
    id, 
    nom, 
    ville,
    type_affichage, 
    cycles, 
    options, 
    taux_reussite, 
    likes_count, 
    vues_count,
    badge_annuaire,
    etoiles
FROM public_etablissements_cards 
LIMIT 5;