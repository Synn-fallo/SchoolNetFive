-- =====================================================
-- MIGRATION: Fix cycles and options format in public_etablissements_cards view
-- =====================================================
-- Description: 
--   La vue public_etablissements_cards actuelle utilise replace() pour extraire
--   les cycles et options, ce qui produit une chaîne mal formatée du type:
--   'premier", "second' au lieu d'un JSON array valide '["premier", "second"]'
--
-- Solution:
--   Remplacer l'extraction textuelle par une extraction JSON directe
--   pour conserver le format JSON array complet.
-- =====================================================

-- Supprimer l'ancienne vue
DROP VIEW IF EXISTS public_etablissements_cards;

-- Recréer la vue avec la définition corrigée
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
    (SELECT regions.nom FROM regions WHERE regions.id = e.region_id) AS region,
    (SELECT departements.nom FROM departements WHERE departements.id = e.departement_id) AS departement,
    e.region_id,
    e.departement_id,
    CASE
        WHEN (a.id IS NOT NULL AND a.plan = 'prestige') THEN 'Prestige'
        WHEN (a.id IS NOT NULL AND a.plan = 'premium') THEN 'Premium'
        WHEN (a.id IS NOT NULL AND a.plan = 'basique') THEN 'Basique'
        ELSE NULL
    END AS badge_annuaire,
    -- CORRECTION: Garde le format JSON array complet
    -- Ancien: replace(replace((e.metadata ->> 'cycles'), '["', ''), '"]', '')
    -- Nouveau: retourne directement ["premier", "second"]
    CASE
        WHEN (e.metadata ? 'cycles') THEN (e.metadata->'cycles')::text
        ELSE NULL
    END AS cycles,
    -- CORRECTION: Même correction pour les options
    CASE
        WHEN (e.metadata ? 'options') THEN (e.metadata->'options')::text
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
        WHEN e.type_etablissement = 'public' THEN 'Public'::varchar
        WHEN e.type_etablissement = 'prive' THEN 'Privé'::varchar
        WHEN e.type_etablissement = 'mixte' THEN 'Mixte'::varchar
        ELSE e.regime
    END AS type_affichage,
    e.code_etablissement,
    e.created_at
FROM etablissements e
LEFT JOIN abonnements a ON (a.etablissement_id = e.id AND a.is_active = true);

-- =====================================================
-- VÉRIFICATION POST-MIGRATION
-- =====================================================
-- Exécutez cette requête pour vérifier que le format est correct :
-- 
-- SELECT id, nom, cycles FROM public_etablissements_cards WHERE cycles IS NOT NULL LIMIT 5;
-- 
-- Résultat attendu: cycles doit être comme '["premier", "second"]'
-- Résultat avant migration: 'premier", "second'
-- =====================================================