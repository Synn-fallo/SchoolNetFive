-- =====================================================
-- MIGRATION: Correction de toutes les politiques du bucket 'demandes'
-- Date: 05/04/2026
-- Description: Remplace [1] par [2] dans toutes les politiques
-- Car le chemin est: demandes/justificatifs/{user_id}/...
-- =====================================================

-- 1. Supprimer toutes les politiques existantes sur le bucket 'demandes'
DROP POLICY IF EXISTS "Users can delete their own justificatifs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own justificatifs" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own justificatifs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own justificatifs" ON storage.objects;

-- 2. Recréer les politiques avec la bonne logique ([2] au lieu de [1])

-- 2.1 Upload
CREATE POLICY "Users can upload their own justificatifs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'demandes'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- 2.2 Select (propriétaire)
CREATE POLICY "Users can view their own justificatifs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'demandes'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- 2.3 Update
CREATE POLICY "Users can update their own justificatifs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'demandes'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- 2.4 Delete
CREATE POLICY "Users can delete their own justificatifs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'demandes'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- 3. Les politiques admin et public restent inchangées
-- (elles n'utilisent pas la logique de dossier)