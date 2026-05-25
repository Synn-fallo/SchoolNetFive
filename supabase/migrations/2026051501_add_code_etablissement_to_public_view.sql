-- Migration : Ajouter code_etablissement à la vue public_etablissements_cards
-- Date : 2026-05-15

-- 1. Supprimer la vue existante
DROP VIEW IF EXISTS public.public_etablissements_cards;

-- 2. Recréer la vue avec TOUTES les colonnes originales + code_etablissement
CREATE VIEW public.public_etablissements_cards AS
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
  e.region_id,
  e.departement_id,
  -- badge_annuaire (provenant de abonnements)
  CASE
    WHEN (a.id IS NOT NULL AND a.plan = 'prestige') THEN 'Prestige'
    WHEN (a.id IS NOT NULL AND a.plan = 'premium') THEN 'Premium'
    WHEN (a.id IS NOT NULL AND a.plan = 'basique') THEN 'Basique'
    ELSE NULL
  END AS badge_annuaire,
  -- cycles (extrait du JSONB metadata)
  CASE
    WHEN (e.metadata -> 'cycles') IS NOT NULL 
    THEN REPLACE(REPLACE(e.metadata->>'cycles', '["', ''), '"]', '')
    ELSE NULL
  END AS cycles,
  -- options (extrait du JSONB metadata)
  CASE
    WHEN (e.metadata -> 'options') IS NOT NULL 
    THEN REPLACE(REPLACE(e.metadata->>'options', '["', ''), '"]', '')
    ELSE NULL
  END AS options,
  -- description_courte (extrait du JSONB metadata)
  e.metadata->>'description_courte' AS description_courte,
  -- etoiles (calculé à partir de note_moyenne)
  CASE
    WHEN e.note_moyenne >= 4.5 THEN '★★★★★'
    WHEN e.note_moyenne >= 4.0 THEN '★★★★☆'
    WHEN e.note_moyenne >= 3.0 THEN '★★★☆☆'
    WHEN e.note_moyenne >= 2.0 THEN '★★☆☆☆'
    WHEN e.note_moyenne > 0 THEN '★☆☆☆☆'
    ELSE '☆☆☆☆☆'
  END AS etoiles,
  -- type_affichage (calculé à partir de type_etablissement)
  CASE
    WHEN e.type_etablissement = 'public' THEN 'Public'
    WHEN e.type_etablissement = 'prive' THEN 'Privé'
    WHEN e.type_etablissement = 'mixte' THEN 'Mixte'
    ELSE e.regime
  END AS type_affichage,
  -- ✅ NOUVEAU : code_etablissement
  e.code_etablissement
FROM etablissements e
LEFT JOIN abonnements a ON a.etablissement_id = e.id AND a.is_active = true;

-- 3. Index pour accélérer le tri par code (optionnel mais recommandé)
CREATE INDEX IF NOT EXISTS idx_etablissements_code ON etablissements(code_etablissement);