-- Migration: Ajout d'une politique RLS pour permettre aux parents de voir leurs enfants
-- Date: 2026-05-18
-- Description: Les parents peuvent voir les élèves auxquels ils sont liés via parent_eleve

-- Politique pour permettre aux parents de voir leurs enfants (via parent_eleve)
CREATE POLICY "parents_can_view_linked_children" ON eleves
  FOR SELECT
  USING (
    -- Vérifier si l'utilisateur connecté est un parent lié à cet élève
    EXISTS (
      SELECT 1
      FROM parents
      JOIN parent_eleve ON parent_eleve.parent_id = parents.id
      WHERE parents.user_id = auth.uid()
      AND parent_eleve.eleve_id = eleves.id
    )
  );

-- Commentaire pour documentation
COMMENT ON POLICY "parents_can_view_linked_children" ON eleves IS 'Permet aux parents de voir uniquement les élèves qui leur sont liés via parent_eleve';