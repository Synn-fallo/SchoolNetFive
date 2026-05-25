-- Migration: Création des tables pour la communication par canaux
-- Date: 2026-05-18
-- Description: canaux_classe, membres_canal, messages_canal

-- ============================================================
-- TABLE canaux_classe
-- ============================================================
CREATE TABLE canaux_classe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classe_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  nom VARCHAR(100) NOT NULL,
  annee_scolaire_id UUID NOT NULL REFERENCES annees_scolaires(id),
  animateur_id UUID NOT NULL REFERENCES profiles(id),
  mode VARCHAR(20) DEFAULT 'moderation' CHECK (mode IN ('moderation', 'libre', 'ferme')),
  est_archive BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  archived_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(classe_id, annee_scolaire_id)
);

COMMENT ON TABLE canaux_classe IS 'Canaux de communication par classe (un canal par classe et année scolaire)';
COMMENT ON COLUMN canaux_classe.mode IS 'moderation (seul animateur écrit), libre (tous écrivent), ferme (invisible sauf animateur)';
COMMENT ON COLUMN canaux_classe.est_archive IS 'Canal archivé après fin d''année scolaire';

-- ============================================================
-- TABLE membres_canal
-- ============================================================
CREATE TABLE membres_canal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canal_id UUID NOT NULL REFERENCES canaux_classe(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id),
  role VARCHAR(20) DEFAULT 'membre' CHECK (role IN ('animateur', 'membre', 'exclu')),
  peut_ecrire BOOLEAN DEFAULT true,
  est_actif BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(canal_id, user_id)
);

COMMENT ON TABLE membres_canal IS 'Membres d''un canal (parents, enseignants, animateur)';
COMMENT ON COLUMN membres_canal.peut_ecrire IS 'Permet à l''animateur d''autoriser temporairement un parent exclu';
COMMENT ON COLUMN membres_canal.est_actif IS 'Si false, membre exclu du canal';

-- ============================================================
-- TABLE messages_canal
-- ============================================================
CREATE TABLE messages_canal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  canal_id UUID NOT NULL REFERENCES canaux_classe(id) ON DELETE CASCADE,
  expediteur_id UUID NOT NULL REFERENCES profiles(id),
  contenu TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE messages_canal IS 'Messages échangés dans les canaux';
COMMENT ON COLUMN messages_canal.is_pinned IS 'Message épinglé par l''animateur';

-- ============================================================
-- INDEX
-- ============================================================
CREATE INDEX idx_canaux_classe_classe ON canaux_classe(classe_id);
CREATE INDEX idx_canaux_classe_annee ON canaux_classe(annee_scolaire_id);
CREATE INDEX idx_canaux_classe_animateur ON canaux_classe(animateur_id);

CREATE INDEX idx_membres_canal_canal ON membres_canal(canal_id);
CREATE INDEX idx_membres_canal_user ON membres_canal(user_id);

CREATE INDEX idx_messages_canal_canal ON messages_canal(canal_id);
CREATE INDEX idx_messages_canal_expediteur ON messages_canal(expediteur_id);
CREATE INDEX idx_messages_canal_created ON messages_canal(created_at DESC);

-- ============================================================
-- TRIGGER pour updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_canaux_classe_updated_at
  BEFORE UPDATE ON canaux_classe
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_membres_canal_updated_at
  BEFORE UPDATE ON membres_canal
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_messages_canal_updated_at
  BEFORE UPDATE ON messages_canal
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- POLITIQUES RLS
-- ============================================================
ALTER TABLE canaux_classe ENABLE ROW LEVEL SECURITY;
ALTER TABLE membres_canal ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages_canal ENABLE ROW LEVEL SECURITY;

-- Politiques canaux_classe
CREATE POLICY "admins_full_access_canaux_classe" ON canaux_classe
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role IN ('admin', 'chef_etablissement')
      AND user_roles.is_active = true
    )
  );

CREATE POLICY "members_view_canaux_classe" ON canaux_classe
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM membres_canal
      WHERE membres_canal.canal_id = canaux_classe.id
      AND membres_canal.user_id = auth.uid()
      AND membres_canal.est_actif = true
    )
  );

-- Politiques membres_canal
CREATE POLICY "animateur_manage_membres" ON membres_canal
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM canaux_classe
      WHERE canaux_classe.id = membres_canal.canal_id
      AND canaux_classe.animateur_id = auth.uid()
    )
  );

CREATE POLICY "members_view_membres" ON membres_canal
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM membres_canal m2
      WHERE m2.canal_id = membres_canal.canal_id
      AND m2.user_id = auth.uid()
      AND m2.est_actif = true
    )
  );

-- Politiques messages_canal
CREATE POLICY "members_view_messages" ON messages_canal
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM membres_canal
      WHERE membres_canal.canal_id = messages_canal.canal_id
      AND membres_canal.user_id = auth.uid()
      AND membres_canal.est_actif = true
    )
  );

CREATE POLICY "members_insert_messages" ON messages_canal
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM membres_canal
      WHERE membres_canal.canal_id = messages_canal.canal_id
      AND membres_canal.user_id = auth.uid()
      AND membres_canal.est_actif = true
      AND (
        membres_canal.peut_ecrire = true
        OR membres_canal.role = 'animateur'
      )
    )
  );

CREATE POLICY "animateur_update_messages" ON messages_canal
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM canaux_classe
      WHERE canaux_classe.id = messages_canal.canal_id
      AND canaux_classe.animateur_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM canaux_classe
      WHERE canaux_classe.id = messages_canal.canal_id
      AND canaux_classe.animateur_id = auth.uid()
    )
  );