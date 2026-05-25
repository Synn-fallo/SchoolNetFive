-- Migration: Ajout de la colonne parent_id à la table notifications
-- Date: 2026-05-18

-- ============================================================
-- Ajout de la colonne parent_id
-- ============================================================
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES parents(id);

-- Index pour les recherches par parent_id
CREATE INDEX IF NOT EXISTS idx_notifications_parent_id ON notifications(parent_id);

COMMENT ON COLUMN notifications.parent_id IS 'Lien vers le parent (pour les notifications sans user_id)';