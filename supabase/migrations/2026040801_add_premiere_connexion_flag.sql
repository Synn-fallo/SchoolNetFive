-- Ajout du flag first_login pour gérer la première connexion des élèves
-- À exécuter DANS Supabase SQL Editor APRÈS vérification

-- Vérifier d'abord si la colonne existe déjà
DO $$ 
BEGIN
    -- Ajout dans profiles (recommandé)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'first_login'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN first_login BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- Mettre à jour les comptes admin existants (first_login = false)
UPDATE public.profiles 
SET first_login = FALSE 
WHERE id IN (
    SELECT user_id FROM public.user_roles 
    WHERE role IN ('chef_etablissement', 'admin', 'enseignant')
);

-- Commentaire pour documentation
COMMENT ON COLUMN public.profiles.first_login IS 
'Indique si l''utilisateur n''a jamais changé son mot de passe par défaut. 
TRUE = première connexion non effectuée, doit changer mot de passe.
FALSE = a déjà changé son mot de passe.';