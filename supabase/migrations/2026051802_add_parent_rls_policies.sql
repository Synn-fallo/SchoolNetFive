-- Migration: Ajout des politiques RLS pour permettre aux parents d'accéder à leurs données
-- Date: 2026-05-18

-- ============================================================
-- 1. POLITIQUE SUR eleves (voir ses enfants)
-- ============================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'eleves' AND policyname = 'parents_can_view_linked_children'
  ) THEN
    CREATE POLICY "parents_can_view_linked_children" ON eleves
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM parents
          JOIN parent_eleve ON parent_eleve.parent_id = parents.id
          WHERE parents.user_id = auth.uid()
          AND parent_eleve.eleve_id = eleves.id
        )
      );
  END IF;
END $$;

-- ============================================================
-- 2. POLITIQUE SUR notes (voir les notes de ses enfants)
-- ============================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'notes' AND policyname = 'parents_can_view_notes_of_linked_children'
  ) THEN
    CREATE POLICY "parents_can_view_notes_of_linked_children" ON notes
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM parents
          JOIN parent_eleve ON parent_eleve.parent_id = parents.id
          JOIN eleves ON eleves.id = parent_eleve.eleve_id
          WHERE parents.user_id = auth.uid()
          AND notes.eleve_id = eleves.id
        )
      );
  END IF;
END $$;

-- ============================================================
-- 3. POLITIQUE SUR devoirs (voir les devoirs des classes de ses enfants)
-- ============================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'devoirs' AND policyname = 'parents_can_view_devoirs_of_linked_children'
  ) THEN
    CREATE POLICY "parents_can_view_devoirs_of_linked_children" ON devoirs
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM parents
          JOIN parent_eleve ON parent_eleve.parent_id = parents.id
          JOIN eleves ON eleves.id = parent_eleve.eleve_id
          WHERE parents.user_id = auth.uid()
          AND devoirs.classe_id = eleves.classe_id
        )
      );
  END IF;
END $$;

-- ============================================================
-- 4. POLITIQUE SUR bulletins (voir les bulletins de ses enfants)
-- ============================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'bulletins' AND policyname = 'parents_can_view_bulletins_of_linked_children'
  ) THEN
    CREATE POLICY "parents_can_view_bulletins_of_linked_children" ON bulletins
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM parents
          JOIN parent_eleve ON parent_eleve.parent_id = parents.id
          JOIN eleves ON eleves.id = parent_eleve.eleve_id
          WHERE parents.user_id = auth.uid()
          AND bulletins.eleve_id = eleves.id
        )
      );
  END IF;
END $$;

-- ============================================================
-- 5. POLITIQUE SUR classes (voir les classes de ses enfants)
-- ============================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'classes' AND policyname = 'parents_can_view_classes_of_linked_children'
  ) THEN
    CREATE POLICY "parents_can_view_classes_of_linked_children" ON classes
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1
          FROM parents
          JOIN parent_eleve ON parent_eleve.parent_id = parents.id
          JOIN eleves ON eleves.id = parent_eleve.eleve_id
          WHERE parents.user_id = auth.uid()
          AND classes.id = eleves.classe_id
        )
      );
  END IF;
END $$;

-- ============================================================
-- 6. POLITIQUE SUR parent_eleve (permet au parent de voir ses liens)
-- ============================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'parent_eleve' AND policyname = 'parents_can_view_own_links'
  ) THEN
    CREATE POLICY "parents_can_view_own_links" ON parent_eleve
      FOR SELECT
      USING (
        parent_id IN (
          SELECT id FROM parents WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================
-- 7. POLITIQUE SUR parents (permet au parent de voir son propre profil)
-- ============================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'parents' AND policyname = 'parents_can_view_own_profile'
  ) THEN
    CREATE POLICY "parents_can_view_own_profile" ON parents
      FOR SELECT
      USING (user_id = auth.uid());
  END IF;
END $$;