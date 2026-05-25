-- ============================================================
-- MIGRATION: Création de la table notes_historique
-- Date: 13/04/2026
-- Description: Traçabilité des modifications des notes
-- ============================================================

-- Création de la table
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
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_notes_historique_note_id ON public.notes_historique(note_id);
CREATE INDEX IF NOT EXISTS idx_notes_historique_created_at ON public.notes_historique(created_at);
CREATE INDEX IF NOT EXISTS idx_notes_historique_user_id ON public.notes_historique(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_historique_action ON public.notes_historique(action);

-- Row Level Security (RLS)
ALTER TABLE public.notes_historique ENABLE ROW LEVEL SECURITY;

-- Lecture: tout utilisateur authentifié peut voir (pour audit)
CREATE POLICY notes_historique_select_policy ON public.notes_historique
  FOR SELECT USING (auth.role() = 'authenticated');

-- Insertion: automatique par trigger ou Edge Function
CREATE POLICY notes_historique_insert_policy ON public.notes_historique
  FOR INSERT WITH CHECK (true);

-- Pas de UPDATE ou DELETE sur l'historique
CREATE POLICY notes_historique_no_update_policy ON public.notes_historique
  FOR UPDATE USING (false);

CREATE POLICY notes_historique_no_delete_policy ON public.notes_historique
  FOR DELETE USING (false);

-- Trigger sur notes pour enregistrer les modifications
CREATE OR REPLACE FUNCTION log_note_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notes_historique (note_id, action, new_value, new_status, user_id, user_role, metadata)
    VALUES (NEW.id, 'create', NEW.note, NEW.statut, auth.uid(), 
            (SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1),
            jsonb_build_object('devoir_id', NEW.devoir_id, 'eleve_id', NEW.eleve_id));
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.note != NEW.note THEN
      INSERT INTO notes_historique (note_id, action, old_value, new_value, old_status, new_status, user_id, user_role, reason, metadata)
      VALUES (NEW.id, 'update', OLD.note, NEW.note, OLD.statut, NEW.statut, auth.uid(),
              (SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1),
              COALESCE(current_setting('app.reason', true), 'Modification note'),
              jsonb_build_object('changed_fields', 
                jsonb_strip_nulls(jsonb_build_object(
                  'note', CASE WHEN OLD.note != NEW.note THEN true ELSE null END,
                  'statut', CASE WHEN OLD.statut != NEW.statut THEN true ELSE null END
                ))
              ));
    ELSIF OLD.statut != NEW.statut THEN
      INSERT INTO notes_historique (note_id, action, old_status, new_status, user_id, user_role, reason, metadata)
      VALUES (NEW.id, 'status_change', OLD.statut, NEW.statut, auth.uid(),
              (SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1),
              COALESCE(current_setting('app.reason', true), 'Changement statut'),
              jsonb_build_object('note_value', NEW.note));
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO notes_historique (note_id, action, old_value, old_status, user_id, user_role, reason, metadata)
    VALUES (OLD.id, 'delete', OLD.note, OLD.statut, auth.uid(),
            (SELECT role FROM user_roles WHERE user_id = auth.uid() LIMIT 1),
            COALESCE(current_setting('app.reason', true), 'Suppression note'),
            jsonb_build_object('deleted_at', NOW()));
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Création du trigger sur la table notes
DROP TRIGGER IF EXISTS trigger_log_note_changes ON public.notes;
CREATE TRIGGER trigger_log_note_changes
AFTER INSERT OR UPDATE OR DELETE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION log_note_changes();

COMMENT ON TABLE public.notes_historique IS 'Historique des modifications des notes pour audit';
COMMENT ON COLUMN public.notes_historique.action IS 'create, update, status_change, delete';
COMMENT ON COLUMN public.notes_historique.reason IS 'Raison du changement (si fournie)';