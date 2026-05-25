/*
  # Row Level Security Policies
  
  ## Principes de sécurité
  - Isolation multi-tenant stricte par etablissement_id
  - Élève : accès à ses propres données uniquement
  - Parent : accès aux données de ses enfants
  - Enseignant : accès aux données de ses classes
  - Chef d'établissement : accès à toutes les données de son établissement
  - Admin : accès à toutes les données de la plateforme
  
  ## Policies par table
  Chaque table a 4 policies (SELECT, INSERT, UPDATE, DELETE) par rôle concerné
*/

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Fonction pour vérifier si l'utilisateur a un rôle spécifique
CREATE OR REPLACE FUNCTION has_role(required_role user_role, etab_id uuid DEFAULT NULL)
RETURNS boolean AS $$
BEGIN
  IF etab_id IS NULL THEN
    RETURN EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = required_role
      AND is_active = true
    );
  ELSE
    RETURN EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = required_role
      AND etablissement_id = etab_id
      AND is_active = true
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour obtenir l'établissement de l'utilisateur
CREATE OR REPLACE FUNCTION get_user_etablissement()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT etablissement_id FROM profiles
    WHERE id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour vérifier si un élève appartient à un parent
CREATE OR REPLACE FUNCTION is_parent_of(eleve_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM eleves
    WHERE user_id = eleve_user_id
    AND parent_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can view profiles in same etablissement"
  ON profiles FOR SELECT
  TO authenticated
  USING (etablissement_id = get_user_etablissement());

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- ÉTABLISSEMENTS POLICIES
-- ============================================================================

CREATE POLICY "Anyone can view active etablissements"
  ON etablissements FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage all etablissements"
  ON etablissements FOR ALL
  TO authenticated
  USING (has_role('admin'))
  WITH CHECK (has_role('admin'));

CREATE POLICY "Chef etablissement can view own etablissement"
  ON etablissements FOR SELECT
  TO authenticated
  USING (has_role('chef_etablissement', id));

CREATE POLICY "Chef etablissement can update own etablissement"
  ON etablissements FOR UPDATE
  TO authenticated
  USING (has_role('chef_etablissement', id))
  WITH CHECK (has_role('chef_etablissement', id));

-- ============================================================================
-- USER ROLES POLICIES
-- ============================================================================

CREATE POLICY "Users can view own roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
  ON user_roles FOR ALL
  TO authenticated
  USING (has_role('admin') OR has_role('chef_etablissement', etablissement_id))
  WITH CHECK (has_role('admin') OR has_role('chef_etablissement', etablissement_id));

-- ============================================================================
-- CLASSES POLICIES
-- ============================================================================

CREATE POLICY "Users can view classes in their etablissement"
  ON classes FOR SELECT
  TO authenticated
  USING (etablissement_id = get_user_etablissement());

CREATE POLICY "Chef etablissement and admins can manage classes"
  ON classes FOR ALL
  TO authenticated
  USING (
    has_role('admin') OR 
    has_role('chef_etablissement', etablissement_id)
  )
  WITH CHECK (
    has_role('admin') OR 
    has_role('chef_etablissement', etablissement_id)
  );

-- ============================================================================
-- ÉLÈVES POLICIES
-- ============================================================================

CREATE POLICY "Eleves can view own data"
  ON eleves FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Parents can view their children data"
  ON eleves FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid());

CREATE POLICY "Staff can view eleves in their etablissement"
  ON eleves FOR SELECT
  TO authenticated
  USING (
    etablissement_id = get_user_etablissement() AND (
      has_role('enseignant', etablissement_id) OR
      has_role('chef_etablissement', etablissement_id) OR
      has_role('admin')
    )
  );

CREATE POLICY "Staff can manage eleves"
  ON eleves FOR ALL
  TO authenticated
  USING (
    has_role('chef_etablissement', etablissement_id) OR
    has_role('admin')
  )
  WITH CHECK (
    has_role('chef_etablissement', etablissement_id) OR
    has_role('admin')
  );

-- ============================================================================
-- INSCRIPTIONS POLICIES
-- ============================================================================

CREATE POLICY "Eleves can view own inscriptions"
  ON inscriptions FOR SELECT
  TO authenticated
  USING (
    eleve_id IN (
      SELECT id FROM eleves WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view children inscriptions"
  ON inscriptions FOR SELECT
  TO authenticated
  USING (
    eleve_id IN (
      SELECT id FROM eleves WHERE parent_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage inscriptions"
  ON inscriptions FOR ALL
  TO authenticated
  USING (
    has_role('chef_etablissement', etablissement_id) OR
    has_role('admin')
  )
  WITH CHECK (
    has_role('chef_etablissement', etablissement_id) OR
    has_role('admin')
  );

-- ============================================================================
-- PAIEMENTS POLICIES
-- ============================================================================

CREATE POLICY "Eleves can view own paiements"
  ON paiements FOR SELECT
  TO authenticated
  USING (
    inscription_id IN (
      SELECT i.id FROM inscriptions i
      JOIN eleves e ON e.id = i.eleve_id
      WHERE e.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view children paiements"
  ON paiements FOR SELECT
  TO authenticated
  USING (
    inscription_id IN (
      SELECT i.id FROM inscriptions i
      JOIN eleves e ON e.id = i.eleve_id
      WHERE e.parent_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage paiements"
  ON paiements FOR ALL
  TO authenticated
  USING (
    has_role('chef_etablissement', etablissement_id) OR
    has_role('admin')
  )
  WITH CHECK (
    has_role('chef_etablissement', etablissement_id) OR
    has_role('admin')
  );

-- ============================================================================
-- NOTES POLICIES
-- ============================================================================

CREATE POLICY "Eleves can view own notes"
  ON notes FOR SELECT
  TO authenticated
  USING (
    eleve_id IN (
      SELECT id FROM eleves WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view children notes"
  ON notes FOR SELECT
  TO authenticated
  USING (
    eleve_id IN (
      SELECT id FROM eleves WHERE parent_id = auth.uid()
    )
  );

CREATE POLICY "Enseignants can manage notes"
  ON notes FOR ALL
  TO authenticated
  USING (
    has_role('enseignant', etablissement_id) OR
    has_role('chef_etablissement', etablissement_id) OR
    has_role('admin')
  )
  WITH CHECK (
    has_role('enseignant', etablissement_id) OR
    has_role('chef_etablissement', etablissement_id) OR
    has_role('admin')
  );

-- ============================================================================
-- DEVOIRS POLICIES
-- ============================================================================

CREATE POLICY "Users can view devoirs in their classes"
  ON devoirs FOR SELECT
  TO authenticated
  USING (
    is_published = true AND (
      -- Eleves in the class
      classe_id IN (
        SELECT classe_id FROM eleves WHERE user_id = auth.uid()
      ) OR
      -- Enseignants
      has_role('enseignant', etablissement_id) OR
      has_role('chef_etablissement', etablissement_id) OR
      has_role('admin')
    )
  );

CREATE POLICY "Enseignants can manage devoirs"
  ON devoirs FOR ALL
  TO authenticated
  USING (
    has_role('enseignant', etablissement_id) OR
    has_role('chef_etablissement', etablissement_id) OR
    has_role('admin')
  )
  WITH CHECK (
    has_role('enseignant', etablissement_id) OR
    has_role('chef_etablissement', etablissement_id) OR
    has_role('admin')
  );

-- ============================================================================
-- BULLETINS POLICIES
-- ============================================================================

CREATE POLICY "Eleves can view own bulletins"
  ON bulletins FOR SELECT
  TO authenticated
  USING (
    is_published = true AND
    eleve_id IN (
      SELECT id FROM eleves WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view children bulletins"
  ON bulletins FOR SELECT
  TO authenticated
  USING (
    is_published = true AND
    eleve_id IN (
      SELECT id FROM eleves WHERE parent_id = auth.uid()
    )
  );

CREATE POLICY "Staff can manage bulletins"
  ON bulletins FOR ALL
  TO authenticated
  USING (
    has_role('enseignant', etablissement_id) OR
    has_role('chef_etablissement', etablissement_id) OR
    has_role('admin')
  )
  WITH CHECK (
    has_role('enseignant', etablissement_id) OR
    has_role('chef_etablissement', etablissement_id) OR
    has_role('admin')
  );

-- ============================================================================
-- MESSAGES POLICIES
-- ============================================================================

CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    expediteur_id = auth.uid() OR
    destinataire_id = auth.uid()
  );

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (expediteur_id = auth.uid());

CREATE POLICY "Users can update own sent messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (expediteur_id = auth.uid() OR destinataire_id = auth.uid())
  WITH CHECK (expediteur_id = auth.uid() OR destinataire_id = auth.uid());

CREATE POLICY "Users can delete own sent messages"
  ON messages FOR DELETE
  TO authenticated
  USING (expediteur_id = auth.uid());

-- ============================================================================
-- NOTIFICATIONS POLICIES
-- ============================================================================

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ============================================================================
-- AI SESSIONS & MESSAGES POLICIES
-- ============================================================================

CREATE POLICY "Users can view own AI sessions"
  ON ai_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create AI sessions"
  ON ai_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own AI sessions"
  ON ai_sessions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own AI messages"
  ON ai_messages FOR SELECT
  TO authenticated
  USING (
    session_id IN (
      SELECT id FROM ai_sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can create AI messages"
  ON ai_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    session_id IN (
      SELECT id FROM ai_sessions WHERE user_id = auth.uid()
    )
  );

-- ============================================================================
-- SOCIAL POLICIES (Publications, Comments, Likes, Amis)
-- ============================================================================

CREATE POLICY "Users can view public publications"
  ON publications FOR SELECT
  TO authenticated
  USING (
    visibilite = 'public' OR
    user_id = auth.uid() OR
    (visibilite = 'amis' AND user_id IN (
      SELECT ami_id FROM amis WHERE user_id = auth.uid() AND statut = 'accepte'
      UNION
      SELECT user_id FROM amis WHERE ami_id = auth.uid() AND statut = 'accepte'
    ))
  );

CREATE POLICY "Users can create publications"
  ON publications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own publications"
  ON publications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own publications"
  ON publications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view comments on accessible publications"
  ON comments FOR SELECT
  TO authenticated
  USING (
    publication_id IN (
      SELECT id FROM publications WHERE 
        visibilite = 'public' OR 
        user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view likes"
  ON likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create likes"
  ON likes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own likes"
  ON likes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view friendships"
  ON amis FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR ami_id = auth.uid());

CREATE POLICY "Users can create friendships"
  ON amis FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update friendships"
  ON amis FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR ami_id = auth.uid())
  WITH CHECK (user_id = auth.uid() OR ami_id = auth.uid());

-- ============================================================================
-- PARENTAL CONTROLS POLICIES
-- ============================================================================

CREATE POLICY "Parents can view own parental controls"
  ON parental_controls FOR SELECT
  TO authenticated
  USING (parent_id = auth.uid());

CREATE POLICY "Children can view their parental controls"
  ON parental_controls FOR SELECT
  TO authenticated
  USING (enfant_id = auth.uid());

CREATE POLICY "Parents can manage parental controls"
  ON parental_controls FOR ALL
  TO authenticated
  USING (parent_id = auth.uid())
  WITH CHECK (parent_id = auth.uid());

-- ============================================================================
-- ACTIVITY LOGS POLICIES
-- ============================================================================

CREATE POLICY "Parents can view children activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (
    enfant_id IN (
      SELECT user_id FROM eleves WHERE parent_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own activity logs"
  ON activity_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create activity logs"
  ON activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- FORUMS POLICIES
-- ============================================================================

CREATE POLICY "Users can view forums in their etablissement"
  ON forums FOR SELECT
  TO authenticated
  USING (
    etablissement_id = get_user_etablissement() OR
    has_role('admin')
  );

CREATE POLICY "Staff can manage forums"
  ON forums FOR ALL
  TO authenticated
  USING (
    has_role('enseignant', etablissement_id) OR
    has_role('chef_etablissement', etablissement_id) OR
    has_role('admin')
  )
  WITH CHECK (
    has_role('enseignant', etablissement_id) OR
    has_role('chef_etablissement', etablissement_id) OR
    has_role('admin')
  );

CREATE POLICY "Users can view forum messages"
  ON forum_messages FOR SELECT
  TO authenticated
  USING (
    forum_id IN (
      SELECT id FROM forums WHERE etablissement_id = get_user_etablissement()
    )
  );

CREATE POLICY "Users can create forum messages"
  ON forum_messages FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own forum messages"
  ON forum_messages FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- MARKETPLACE POLICIES
-- ============================================================================

CREATE POLICY "Users can view available products"
  ON produits FOR SELECT
  TO authenticated
  USING (is_disponible = true);

CREATE POLICY "Users can create products"
  ON produits FOR INSERT
  TO authenticated
  WITH CHECK (vendeur_id = auth.uid());

CREATE POLICY "Vendors can manage own products"
  ON produits FOR ALL
  TO authenticated
  USING (vendeur_id = auth.uid())
  WITH CHECK (vendeur_id = auth.uid());

CREATE POLICY "Users can view own commandes"
  ON commandes FOR SELECT
  TO authenticated
  USING (
    acheteur_id = auth.uid() OR
    produit_id IN (
      SELECT id FROM produits WHERE vendeur_id = auth.uid()
    )
  );

CREATE POLICY "Users can create commandes"
  ON commandes FOR INSERT
  TO authenticated
  WITH CHECK (acheteur_id = auth.uid());

CREATE POLICY "Users can update own commandes"
  ON commandes FOR UPDATE
  TO authenticated
  USING (acheteur_id = auth.uid())
  WITH CHECK (acheteur_id = auth.uid());

-- ============================================================================
-- SYSTEM TABLES POLICIES
-- ============================================================================

CREATE POLICY "Admins can manage all system tables"
  ON invitation_codes FOR ALL
  TO authenticated
  USING (has_role('admin') OR has_role('chef_etablissement', etablissement_id))
  WITH CHECK (has_role('admin') OR has_role('chef_etablissement', etablissement_id));

CREATE POLICY "Users can view active invitation codes"
  ON invitation_codes FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage abonnements"
  ON abonnements FOR ALL
  TO authenticated
  USING (has_role('admin'))
  WITH CHECK (has_role('admin'));

CREATE POLICY "Chef etablissement can view own abonnement"
  ON abonnements FOR SELECT
  TO authenticated
  USING (
    etablissement_id = get_user_etablissement() OR
    has_role('admin')
  );

CREATE POLICY "Admins can view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (has_role('admin'));

CREATE POLICY "System can create audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- OTHER TABLES POLICIES
-- ============================================================================

CREATE POLICY "Users can view annees scolaires"
  ON annees_scolaires FOR SELECT
  TO authenticated
  USING (etablissement_id = get_user_etablissement() OR has_role('admin'));

CREATE POLICY "Staff can manage annees scolaires"
  ON annees_scolaires FOR ALL
  TO authenticated
  USING (
    has_role('chef_etablissement', etablissement_id) OR
    has_role('admin')
  )
  WITH CHECK (
    has_role('chef_etablissement', etablissement_id) OR
    has_role('admin')
  );

CREATE POLICY "Users can view matieres"
  ON matieres FOR SELECT
  TO authenticated
  USING (etablissement_id = get_user_etablissement() OR has_role('admin'));

CREATE POLICY "Staff can manage matieres"
  ON matieres FOR ALL
  TO authenticated
  USING (
    has_role('chef_etablissement', etablissement_id) OR
    has_role('admin')
  )
  WITH CHECK (
    has_role('chef_etablissement', etablissement_id) OR
    has_role('admin')
  );

CREATE POLICY "Users can view frais scolarite"
  ON frais_scolarite FOR SELECT
  TO authenticated
  USING (etablissement_id = get_user_etablissement() OR has_role('admin'));

CREATE POLICY "Staff can manage frais scolarite"
  ON frais_scolarite FOR ALL
  TO authenticated
  USING (
    has_role('chef_etablissement', etablissement_id) OR
    has_role('admin')
  )
  WITH CHECK (
    has_role('chef_etablissement', etablissement_id) OR
    has_role('admin')
  );

CREATE POLICY "Users can view echeanciers"
  ON echeanciers FOR SELECT
  TO authenticated
  USING (
    inscription_id IN (
      SELECT i.id FROM inscriptions i
      JOIN eleves e ON e.id = i.eleve_id
      WHERE e.user_id = auth.uid() OR e.parent_id = auth.uid()
    ) OR
    has_role('chef_etablissement', etablissement_id) OR
    has_role('admin')
  );

CREATE POLICY "Staff can manage echeanciers"
  ON echeanciers FOR ALL
  TO authenticated
  USING (
    has_role('chef_etablissement', etablissement_id) OR
    has_role('admin')
  )
  WITH CHECK (
    has_role('chef_etablissement', etablissement_id) OR
    has_role('admin')
  );