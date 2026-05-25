-- ============================================================
-- MIGRATION: Ajout de la contrainte d'unicité sur telephone dans parents
-- Date: 2026-04-10
-- Description: Garantit qu'un numéro de téléphone ne peut être associé qu'à un seul parent
-- ============================================================

-- ============================================================
-- PARTIE 1: Nettoyer les éventuels doublons existants
-- ============================================================

-- 1.1 Identifier les doublons
DO $$
DECLARE
  v_duplicate_count INTEGER;
BEGIN
  -- Compter les doublons
  SELECT COUNT(*)
  INTO v_duplicate_count
  FROM (
    SELECT telephone
    FROM parents
    WHERE telephone IS NOT NULL
    GROUP BY telephone
    HAVING COUNT(*) > 1
  ) duplicates;

  IF v_duplicate_count > 0 THEN
    RAISE NOTICE '⚠️ Attention: % doublons de téléphone trouvés', v_duplicate_count;
    RAISE NOTICE '   Résolution: conservation du parent le plus ancien, suppression des autres';
  ELSE
    RAISE NOTICE '✅ Aucun doublon de téléphone trouvé';
  END IF;
END $$;

-- 1.2 Supprimer les doublons (garder le plus ancien)
WITH duplicates AS (
  SELECT id, telephone,
         ROW_NUMBER() OVER (PARTITION BY telephone ORDER BY created_at ASC) as rn
  FROM parents
  WHERE telephone IN (
    SELECT telephone
    FROM parents
    WHERE telephone IS NOT NULL
    GROUP BY telephone
    HAVING COUNT(*) > 1
  )
)
DELETE FROM parents
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

-- 1.3 Vérification après nettoyage
DO $$
DECLARE
  v_remaining_duplicates INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO v_remaining_duplicates
  FROM (
    SELECT telephone
    FROM parents
    WHERE telephone IS NOT NULL
    GROUP BY telephone
    HAVING COUNT(*) > 1
  ) duplicates;

  IF v_remaining_duplicates = 0 THEN
    RAISE NOTICE '✅ Tous les doublons ont été nettoyés';
  ELSE
    RAISE NOTICE '⚠️ Il reste % doublons. Vérification manuelle requise.', v_remaining_duplicates;
  END IF;
END $$;

-- ============================================================
-- PARTIE 2: Ajout de la contrainte d'unicité
-- ============================================================

-- 2.1 Supprimer l'index existant si nécessaire
DROP INDEX IF EXISTS idx_parents_telephone;

-- 2.2 Ajouter la contrainte UNIQUE
ALTER TABLE parents ADD CONSTRAINT parents_telephone_unique UNIQUE (telephone);

-- ============================================================
-- PARTIE 3: Créer un index pour accélérer les recherches
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_parents_telephone ON parents(telephone);

-- ============================================================
-- PARTIE 4: Commentaires
-- ============================================================

COMMENT ON CONSTRAINT parents_telephone_unique ON parents IS 'Garantit qu''un numéro de téléphone ne peut être associé qu''à un seul parent';

-- ============================================================
-- PARTIE 5: Vérification post-migration
-- ============================================================

DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'parents' 
    AND constraint_name = 'parents_telephone_unique'
  ), 'ERREUR: La contrainte parents_telephone_unique n''a pas été créée';
  
  RAISE NOTICE '✅ Migration réussie: Contrainte UNIQUE ajoutée sur parents.telephone';
  RAISE NOTICE '   - Un numéro de téléphone ne peut plus être associé qu''à un seul parent';
  RAISE NOTICE '   - La recherche par téléphone est garantie unique';
END $$;