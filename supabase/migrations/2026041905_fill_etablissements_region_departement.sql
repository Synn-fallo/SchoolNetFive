-- ============================================================
-- MIGRATION: 2026041905_fill_etablissements_region_departement
-- BUT: Remplir region_id et departement_id pour les établissements existants
-- À exécuter APRÈS que les chefs aient choisi leur région/département
-- ============================================================

-- Note: Ce script est un template. Il faudra l'exécuter manuellement
-- après que les établissements aient mis à jour leurs informations.

-- Exemple de mise à jour manuelle :
-- UPDATE etablissements 
-- SET region_id = (SELECT id FROM regions WHERE code = 'SUD'),
--     departement_id = (SELECT id FROM departements WHERE code = 'LITTORAL')
-- WHERE id = 'ID_DE_L_ETABLISSEMENT';