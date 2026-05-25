-- ============================================================================
-- Création du Super Admin SchoolNet
-- Version corrigée (sans ON CONFLICT sur auth.users)
-- ============================================================================

-- 1. Vérifier si l'utilisateur existe déjà
DO $$
DECLARE
  user_id uuid;
  user_exists boolean;
BEGIN
  -- Vérifier l'existence
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'schoolnet.official@gmail.com'
  ) INTO user_exists;
  
  IF user_exists THEN
    RAISE NOTICE 'L''utilisateur schoolnet.official@gmail.com existe déjà.';
    
    -- Récupérer l'ID existant
    SELECT id INTO user_id FROM auth.users WHERE email = 'schoolnet.official@gmail.com';
    
    -- Vérifier si le rôle admin est déjà attribué
    IF NOT EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = user_id AND role = 'admin'
    ) THEN
      INSERT INTO user_roles (user_id, role, is_active)
      VALUES (user_id, 'admin', true);
      RAISE NOTICE 'Rôle admin attribué à l''utilisateur existant.';
    ELSE
      RAISE NOTICE 'L''utilisateur a déjà le rôle admin.';
    END IF;
    
  ELSE
    -- Créer l'utilisateur dans auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      confirmation_sent_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'schoolnet.official@gmail.com',
      crypt('Is@ieModest5', gen_salt('bf')),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"name":"SchoolNet Admin"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO user_id;
    
    -- Créer le profil utilisateur
    INSERT INTO profiles (id, nom, prenom, is_active)
    VALUES (user_id, 'SchoolNet', 'Admin', true);
    
    -- Attribuer le rôle admin
    INSERT INTO user_roles (user_id, role, is_active)
    VALUES (user_id, 'admin', true);
    
    RAISE NOTICE 'Super Admin créé avec succès. ID: %', user_id;
  END IF;
END $$;

-- 2. Vérification finale
SELECT 
  u.email,
  p.nom,
  p.prenom,
  ur.role,
  ur.is_active
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN user_roles ur ON ur.user_id = u.id
WHERE u.email = 'schoolnet.official@gmail.com';