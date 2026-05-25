-- ============================================================
-- SEED: Données de référence pour régions et départements
-- VERSION CORRIGÉE – Répartition réelle des 12 départements
-- ============================================================

-- Insertion des 3 régions
INSERT INTO regions (code, nom, ordre) VALUES
  ('SUD', 'Sud', 1),
  ('CENTRE', 'Centre', 2),
  ('NORD', 'Nord', 3)
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom;

-- Insertion des 12 départements avec leur région CORRECTE
INSERT INTO departements (code, nom, region_id, ordre) VALUES
  -- RÉGION SUD (6 départements)
  ('ATLANTIQUE', 'Atlantique', (SELECT id FROM regions WHERE code = 'SUD'), 1),
  ('LITTORAL', 'Littoral', (SELECT id FROM regions WHERE code = 'SUD'), 2),
  ('OUEME', 'Ouémé', (SELECT id FROM regions WHERE code = 'SUD'), 3),
  ('PLATEAU', 'Plateau', (SELECT id FROM regions WHERE code = 'SUD'), 4),
  ('MONO', 'Mono', (SELECT id FROM regions WHERE code = 'SUD'), 5),
  ('OCOUFFO', 'Couffo', (SELECT id FROM regions WHERE code = 'SUD'), 6),

  -- RÉGION CENTRE (2 départements)
  ('ZOU', 'Zou', (SELECT id FROM regions WHERE code = 'CENTRE'), 7),
  ('COLLINES', 'Collines', (SELECT id FROM regions WHERE code = 'CENTRE'), 8),

  -- RÉGION NORD (4 départements)
  ('BORGOU', 'Borgou', (SELECT id FROM regions WHERE code = 'NORD'), 9),
  ('ALIBORI', 'Alibori', (SELECT id FROM regions WHERE code = 'NORD'), 10),
  ('ATACORA', 'Atacora', (SELECT id FROM regions WHERE code = 'NORD'), 11),
  ('DONGA', 'Donga', (SELECT id FROM regions WHERE code = 'NORD'), 12)
ON CONFLICT (code) DO UPDATE SET nom = EXCLUDED.nom, region_id = EXCLUDED.region_id;