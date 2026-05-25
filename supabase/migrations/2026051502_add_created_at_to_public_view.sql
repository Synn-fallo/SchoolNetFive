-- Migration : Ajouter created_at à la vue public_etablissements_cards
-- Date : 2026-05-15

-- 1. Supprimer la vue existante
DROP VIEW IF EXISTS public.public_etablissements_cards;

-- 2. Recréer la vue avec la colonne created_at (en conservant la structure exacte)
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
  (SELECT nom FROM regions WHERE id = e.region_id) AS region,
  (SELECT nom FROM departements WHERE id = e.departement_id) AS departement,
  e.region_id,
  e.departement_id,
  CASE
    WHEN (a.id IS NOT NULL AND a.plan = 'prestige') THEN 'Prestige'
    WHEN (a.id IS NOT NULL AND a.plan = 'premium') THEN 'Premium'
    WHEN (a.id IS NOT NULL AND a.plan = 'basique') THEN 'Basique'
    ELSE NULL
  END AS badge_annuaire,
  CASE
    WHEN (e.metadata -> 'cycles') IS NOT NULL 
    THEN REPLACE(REPLACE(e.metadata->>'cycles', '["', ''), '"]', '')
    ELSE NULL
  END AS cycles,
  CASE
    WHEN (e.metadata -> 'options') IS NOT NULL 
    THEN REPLACE(REPLACE(e.metadata->>'options', '["', ''), '"]', '')
    ELSE NULL
  END AS options,
  e.metadata->>'description_courte' AS description_courte,
  CASE
    WHEN e.note_moyenne >= 4.5 THEN '★★★★★'
    WHEN e.note_moyenne >= 4.0 THEN '★★★★☆'
    WHEN e.note_moyenne >= 3.0 THEN '★★★☆☆'
    WHEN e.note_moyenne >= 2.0 THEN '★★☆☆☆'
    WHEN e.note_moyenne > 0 THEN '★☆☆☆☆'
    ELSE '☆☆☆☆☆'
  END AS etoiles,
  CASE
    WHEN e.type_etablissement = 'public' THEN 'Public'
    WHEN e.type_etablissement = 'prive' THEN 'Privé'
    WHEN e.type_etablissement = 'mixte' THEN 'Mixte'
    ELSE e.regime
  END AS type_affichage,
  e.code_etablissement,
  e.created_at  -- ✅ NOUVEAU : pour le tri des établissements récents
FROM etablissements e
LEFT JOIN abonnements a ON a.etablissement_id = e.id AND a.is_active = true;