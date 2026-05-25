-- Migration: Correction des filtres pour l'annuaire des établissements
-- Objectif: Remplir departement_id et region_id dans la table etablissements

-- ============================================================
-- 1. Vérifications pré-migration sur la table etablissements
-- ============================================================
DO $$
DECLARE
    total_count INTEGER;
    with_dept_id INTEGER;
    with_region_id INTEGER;
BEGIN
    SELECT COUNT(*), COUNT(departement_id), COUNT(region_id)
    INTO total_count, with_dept_id, with_region_id
    FROM etablissements;
    
    RAISE NOTICE '📊 [PRE-MIGRATION] Table etablissements:';
    RAISE NOTICE '   - Total établissements: %', total_count;
    RAISE NOTICE '   - Avec departement_id: %', with_dept_id;
    RAISE NOTICE '   - Avec region_id: %', with_region_id;
END $$;

-- ============================================================
-- 2. Ajouter les colonnes si elles n'existent pas dans etablissements
-- ============================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'etablissements' AND column_name = 'departement_id'
    ) THEN
        ALTER TABLE etablissements ADD COLUMN departement_id UUID;
        RAISE NOTICE '✅ Colonne departement_id ajoutée à etablissements';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'etablissements' AND column_name = 'region_id'
    ) THEN
        ALTER TABLE etablissements ADD COLUMN region_id UUID;
        RAISE NOTICE '✅ Colonne region_id ajoutée à etablissements';
    END IF;
END $$;

-- ============================================================
-- 3. Mettre à jour departement_id et region_id dans etablissements
--    en utilisant la correspondance directe avec departements
-- ============================================================
UPDATE etablissements e
SET 
    departement_id = d.id,
    region_id = d.region_id
FROM departements d
WHERE e.departement IS NOT NULL
  AND UPPER(e.departement) = UPPER(d.nom)
  AND e.departement_id IS NULL;

-- ============================================================
-- 4. Mettre à jour les établissements avec departement = 'OUEME'
--    Utilisation de l'ID existant
-- ============================================================
DO $$
DECLARE
    oueme_id UUID;
    oueme_region_id UUID;
BEGIN
    SELECT id, region_id INTO oueme_id, oueme_region_id 
    FROM departements 
    WHERE UPPER(code) = 'OUEME' OR UPPER(nom) = 'OUEME' 
    LIMIT 1;
    
    IF oueme_id IS NOT NULL THEN
        UPDATE etablissements
        SET departement_id = oueme_id,
            region_id = oueme_region_id
        WHERE UPPER(departement) = 'OUEME'
          AND departement_id IS NULL;
        
        RAISE NOTICE '✅ Établissements OUEME mis à jour avec ID: %', oueme_id;
    ELSE
        RAISE NOTICE '⚠️ Département OUEME non trouvé';
    END IF;
END $$;

-- ============================================================
-- 5. Mettre à jour les établissements sans correspondance directe
--    basé sur la ville (ex: ville contient le nom du département)
-- ============================================================
UPDATE etablissements e
SET 
    departement_id = d.id,
    region_id = d.region_id
FROM departements d
WHERE e.departement_id IS NULL
  AND e.ville IS NOT NULL
  AND UPPER(e.ville) LIKE '%' || UPPER(d.nom) || '%'
  AND LENGTH(d.nom) > 3;

-- ============================================================
-- 6. Vérification post-migration sur etablissements
-- ============================================================
DO $$
DECLARE
    total_count INTEGER;
    with_dept_id INTEGER;
    with_region_id INTEGER;
    still_missing INTEGER;
    missing_record RECORD;
BEGIN
    SELECT COUNT(*), COUNT(departement_id), COUNT(region_id)
    INTO total_count, with_dept_id, with_region_id
    FROM etablissements;
    
    still_missing := total_count - with_dept_id;
    
    RAISE NOTICE '📊 [POST-MIGRATION] Table etablissements:';
    RAISE NOTICE '   - Total établissements: %', total_count;
    RAISE NOTICE '   - Avec departement_id: %', with_dept_id;
    RAISE NOTICE '   - Avec region_id: %', with_region_id;
    
    IF still_missing > 0 THEN
        RAISE NOTICE '⚠️ Attention: % établissements ont encore departement_id NULL', still_missing;
        
        RAISE NOTICE '📊 Exemples d''établissements sans departement_id:';
        FOR missing_record IN (
            SELECT nom, departement, ville 
            FROM etablissements 
            WHERE departement_id IS NULL 
            LIMIT 5
        ) LOOP
            RAISE NOTICE '   - Nom: %, Département: %, Ville: %', missing_record.nom, missing_record.departement, missing_record.ville;
        END LOOP;
    ELSE
        RAISE NOTICE '✅ Migration réussie: Tous les établissements ont un departement_id';
    END IF;
END $$;

-- ============================================================
-- 7. Vérifier que la vue reflète les modifications
-- ============================================================
DO $$
DECLARE
    vue_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO vue_count FROM public_etablissements_cards WHERE region_id IS NOT NULL;
    RAISE NOTICE '📊 [VIEW] Établissements dans la vue avec region_id: %', vue_count;
END $$;

-- ============================================================
-- 8. Tester les filtres après migration
-- ============================================================
DO $$
DECLARE
    sud_id UUID;
    sud_count INTEGER;
    centre_id UUID;
    centre_count INTEGER;
    nord_id UUID;
    nord_count INTEGER;
BEGIN
    SELECT id INTO sud_id FROM regions WHERE nom = 'Sud' LIMIT 1;
    SELECT id INTO centre_id FROM regions WHERE nom = 'Centre' LIMIT 1;
    SELECT id INTO nord_id FROM regions WHERE nom = 'Nord' LIMIT 1;
    
    IF sud_id IS NOT NULL THEN
        SELECT COUNT(*) INTO sud_count FROM public_etablissements_cards WHERE region_id = sud_id;
        RAISE NOTICE '📊 [TEST] Établissements dans la région Sud: %', sud_count;
    END IF;
    
    IF centre_id IS NOT NULL THEN
        SELECT COUNT(*) INTO centre_count FROM public_etablissements_cards WHERE region_id = centre_id;
        RAISE NOTICE '📊 [TEST] Établissements dans la région Centre: %', centre_count;
    END IF;
    
    IF nord_id IS NOT NULL THEN
        SELECT COUNT(*) INTO nord_count FROM public_etablissements_cards WHERE region_id = nord_id;
        RAISE NOTICE '📊 [TEST] Établissements dans la région Nord: %', nord_count;
    END IF;
END $$;

-- ============================================================
-- 9. Audit final - Répartition par région
-- ============================================================
SELECT 
    COALESCE(r.nom, 'Sans région') as region,
    COUNT(e.id) as etablissements
FROM etablissements e
LEFT JOIN regions r ON r.id = e.region_id
GROUP BY r.nom, r.ordre
ORDER BY r.ordre NULLS LAST;

-- ============================================================
-- 10. Index pour optimiser les performances des filtres
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_etablissements_region_id 
ON etablissements(region_id);

CREATE INDEX IF NOT EXISTS idx_etablissements_departement_id 
ON etablissements(departement_id);

CREATE INDEX IF NOT EXISTS idx_etablissements_nom 
ON etablissements(nom);

CREATE INDEX IF NOT EXISTS idx_etablissements_ville 
ON etablissements(ville);

-- ============================================================
-- 11. Message de fin
-- ============================================================
SELECT '🎉 Migration terminée avec succès !' as status;