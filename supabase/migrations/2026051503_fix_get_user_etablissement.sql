-- Migration M1: Correction de la fonction get_user_etablissement
-- Date: 2026-05-15
-- Objectif: Ignorer les rôles sans établissement et prioriser les rôles importants
-- Problème: Un rôle chef_etablissement avec etablissement_id = null bloquait l'affichage des classes

-- Remplacer la fonction existante (CREATE OR REPLACE, pas DROP)
CREATE OR REPLACE FUNCTION public.get_user_etablissement()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_etablissement UUID;
BEGIN
  -- Récupérer l'établissement depuis user_roles
  -- Ignorer les rôles sans établissement (etablissement_id IS NOT NULL)
  -- Prioriser les rôles importants: chef_etablissement > admin > membre_administratif
  SELECT ur.etablissement_id INTO user_etablissement
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid() 
    AND ur.is_active = true
    AND ur.etablissement_id IS NOT NULL  -- ✅ Ignorer les rôles sans établissement
  ORDER BY 
    CASE 
      WHEN ur.role = 'chef_etablissement' THEN 1
      WHEN ur.role = 'admin' THEN 2
      WHEN ur.role = 'membre_administratif' THEN 3
      WHEN ur.role = 'enseignant' THEN 4
      ELSE 5
    END
  LIMIT 1;
  
  -- Retourner l'établissement trouvé (peut être NULL si aucun rôle valide)
  RETURN user_etablissement;
END;
$$;

-- Donner les droits d'exécution (maintenir)
GRANT EXECUTE ON FUNCTION public.get_user_etablissement() TO authenticated, anon;

-- Vérification (optionnelle - à exécuter manuellement après)
-- SELECT get_user_etablissement() AS etablissement_id;