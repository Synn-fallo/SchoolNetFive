-- ============================================================
-- MIGRATION: Correction du trigger notes_historique
-- Date: 14/04/2026
-- Description: Suppression de la colonne metadata et correction du trigger
-- ============================================================

-- 1. Supprimer l'ancien trigger et la fonction
DROP TRIGGER IF EXISTS trigger_log_note_changes ON public.notes;
DROP FUNCTION IF EXISTS log_note_changes();

-- 2. Supprimer la colonne metadata si elle existe
ALTER TABLE public.notes_historique DROP COLUMN IF EXISTS metadata;

-- 3. Recréer la table notes_historique avec la structure correcte
CREATE TABLE IF NOT EXISTS public.notes_historique (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  old_value DECIMAL(5,2),
  new_value DECIMAL(5,2),
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  reason TEXT,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  user_role VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Recréer les index
CREATE INDEX IF NOT EXISTS idx_notes_historique_note_id ON public.notes_historique(note_id);
CREATE INDEX IF NOT EXISTS idx_notes_historique_created_at ON public.notes_historique(created_at);
CREATE INDEX IF NOT EXISTS idx_notes_historique_user_id ON public.notes_historique(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_historique_action ON public.notes_historique(action);

-- 5. Recréer la fonction log_note_changes (sans metadata)
CREATE OR REPLACE FUNCTION log_note_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notes_historique (note_id, action, new_value, new_status, user_id, user_role)
    VALUES (NEW.id, 'create', NEW.note, NEW.statut, auth.uid(), 
            (SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.note != NEW.note OR OLD.statut != NEW.statut THEN
      INSERT INTO notes_historique (note_id, action, old_value, new_value, old_status, new_status, user_id, user_role)
      VALUES (NEW.id, 'update', OLD.note, NEW.note, OLD.statut, NEW.statut, auth.uid(),
              (SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1));
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO notes_historique (note_id, action, old_value, old_status, user_id, user_role, reason)
    VALUES (OLD.id, 'delete', OLD.note, OLD.statut, auth.uid(),
            (SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1),
            'Suppression note');
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Recréer le trigger
CREATE TRIGGER trigger_log_note_changes
AFTER INSERT OR UPDATE OR DELETE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION log_note_changes();

-- 7. Row Level Security (RLS)
ALTER TABLE public.notes_historique ENABLE ROW LEVEL SECURITY;

-- Suppression des politiques existantes
DROP POLICY IF EXISTS notes_historique_select_policy ON public.notes_historique;
DROP POLICY IF EXISTS notes_historique_insert_policy ON public.notes_historique;
DROP POLICY IF EXISTS notes_historique_no_update_policy ON public.notes_historique;
DROP POLICY IF EXISTS notes_historique_no_delete_policy ON public.notes_historique;

-- Lecture: tout utilisateur authentifié peut voir
CREATE POLICY notes_historique_select_policy ON public.notes_historique
  FOR SELECT USING (auth.role() = 'authenticated');

-- Insertion: automatique par trigger
CREATE POLICY notes_historique_insert_policy ON public.notes_historique
  FOR INSERT WITH CHECK (true);

-- Pas de UPDATE ou DELETE sur l'historique
CREATE POLICY notes_historique_no_update_policy ON public.notes_historique
  FOR UPDATE USING (false);

CREATE POLICY notes_historique_no_delete_policy ON public.notes_historique
  FOR DELETE USING (false);

COMMENT ON TABLE public.notes_historique IS 'Historique des modifications des notes pour audit';
COMMENT ON COLUMN public.notes_historique.action IS 'create, update, status_change, delete';
COMMENT ON COLUMN public.notes_historique.reason IS 'Raison du changement (si fournie)';