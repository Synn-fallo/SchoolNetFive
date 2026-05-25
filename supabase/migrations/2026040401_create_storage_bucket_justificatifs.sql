-- =====================================================
-- MIGRATION: Création du bucket Storage pour les justificatifs
-- Date: 04/04/2026
-- Description: Crée le bucket 'demandes' pour stocker les pièces justificatives
-- des demandes institutionnelles (Chef d'établissement, Autorité, Partenaire)
-- =====================================================

-- =====================================================
-- 1. Création du bucket 'demandes'
-- =====================================================

-- Vérifier si le bucket existe déjà, le créer sinon
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'demandes'
    ) THEN
        INSERT INTO storage.buckets (id, name, public)
        VALUES ('demandes', 'demandes', true);
    END IF;
END $$;

-- =====================================================
-- 2. Politiques de sécurité (RLS) pour le bucket 'demandes'
-- =====================================================

-- 2.1 Politique : Les utilisateurs authentifiés peuvent uploader leurs propres justificatifs
-- Les fichiers sont stockés dans un dossier nommé par l'ID de l'utilisateur
DROP POLICY IF EXISTS "Users can upload their own justificatifs" ON storage.objects;
CREATE POLICY "Users can upload their own justificatifs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'demandes' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 2.2 Politique : Les utilisateurs peuvent voir leurs propres justificatifs
DROP POLICY IF EXISTS "Users can view their own justificatifs" ON storage.objects;
CREATE POLICY "Users can view their own justificatifs"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'demandes' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 2.3 Politique : Les administrateurs peuvent voir tous les justificatifs
DROP POLICY IF EXISTS "Admins can view all justificatifs" ON storage.objects;
CREATE POLICY "Admins can view all justificatifs"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'demandes' 
    AND EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid()
        AND role = 'admin'
        AND is_active = true
    )
);

-- 2.4 Politique : Lecture publique (pour visualisation des justificatifs par lien)
-- Les justificatifs sont publics car ils sont partagés via URL
DROP POLICY IF EXISTS "Anyone can view justificatifs" ON storage.objects;
CREATE POLICY "Anyone can view justificatifs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'demandes');

-- 2.5 Politique : Les utilisateurs peuvent supprimer leurs propres justificatifs
DROP POLICY IF EXISTS "Users can delete their own justificatifs" ON storage.objects;
CREATE POLICY "Users can delete their own justificatifs"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'demandes' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- 2.6 Politique : Les utilisateurs peuvent mettre à jour leurs propres justificatifs
DROP POLICY IF EXISTS "Users can update their own justificatifs" ON storage.objects;
CREATE POLICY "Users can update their own justificatifs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'demandes' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- 3. Vérification de la création
-- =====================================================

-- Afficher les buckets existants pour vérification
SELECT id, name, public FROM storage.buckets WHERE id = 'demandes';

-- Afficher les politiques créées
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
ORDER BY policyname;