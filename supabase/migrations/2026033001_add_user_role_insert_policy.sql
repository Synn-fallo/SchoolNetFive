/*
  # SchoolNet - Ajout politique pour l'auto-attribution du rôle visiteur
  
  ## Description
  Permet aux utilisateurs de s'ajouter le rôle "visiteur" lors de l'inscription.
  Cette politique est ADDITIVE et ne modifie pas les politiques existantes.
  
  ## Date
  30 Mars 2026
*/

-- Politique pour permettre à un utilisateur de s'ajouter le rôle visiteur
CREATE POLICY "Users can add visitor role to themselves"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    -- L'utilisateur s'ajoute son propre rôle
    user_id = auth.uid()
    -- ET le rôle est 'visiteur'
    AND role = 'visiteur'
    -- ET le rôle n'existe pas déjà pour cet utilisateur
    AND NOT EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'visiteur'
    )
  );

-- Politique pour permettre à un utilisateur de voir ses propres rôles (déjà existe)
-- Politique existante: "Users can view own roles"