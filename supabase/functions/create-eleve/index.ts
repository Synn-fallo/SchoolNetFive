// supabase/functions/create-eleve/index.ts
// Edge Function pour créer un élève - Version avec gestion multi-parents
// ⚠️ Déployer avec --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // 'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info, x-application-name',
};

// ============================================================
// FONCTIONS UTILITAIRES
// ============================================================

function normaliserTelephone(tel: string): string {
  if (!tel) return '';
  return tel.replace(/[\s\-\.\(\)]/g, '');
}

function normaliserEmail(email: string): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');
}

// ✅ CORRECTION : Format nom.prenom@snet.bj (nom en premier)
function genererEmailSnet(nom: string, prenom: string): string {
  const normalize = (str: string) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9.-]/g, '')
      .replace(/\.+/g, '.')
      .replace(/^\.|\.$/g, '');
  };
  const nomNormalise = normalize(nom);
  const prenomNormalise = normalize(prenom);
  return `${nomNormalise}.${prenomNormalise}@snet.bj`; // ✅ nom.prenom@snet.bj
}

// ✅ CORRECTION : Génération d'identifiant pour élève (même format)
function genererIdentifiantEleve(nom: string, prenom: string): string {
  const normalize = (str: string) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9.-]/g, '')
      .replace(/\.+/g, '.')
      .replace(/^\.|\.$/g, '');
  };
  const nomNormalise = normalize(nom);
  const prenomNormalise = normalize(prenom);
  return `${nomNormalise}.${prenomNormalise}@snet.bj`; // nom.prenom@snet.bj
}

function genererMotDePasseTemp(prenom: string): string {
  const chiffres = Math.floor(1000 + Math.random() * 9000);
  return `Parent${prenom}${chiffres}`;
}

// ✅ CORRECTION : Gestion des collisions pour email_snet parent
async function getUniqueEmailSnet(
  supabaseAdmin: any,
  nom: string,
  prenom: string
): Promise<string> {
  const baseEmail = genererEmailSnet(nom, prenom);
  let emailSnet = baseEmail;
  let suffixe = 1;
  let exists = true;

  while (exists && suffixe < 100) {
    const { data: check } = await supabaseAdmin
      .from('parents')
      .select('id')
      .eq('email_snet', emailSnet)
      .maybeSingle();

    if (!check) {
      exists = false;
    } else {
      // Format: nom.prenom.1@snet.bj
      const baseWithoutDomain = baseEmail.replace('@snet.bj', '');
      emailSnet = `${baseWithoutDomain}.${suffixe}@snet.bj`;
      suffixe++;
    }
  }

  return emailSnet;
}

// ✅ NOUVELLE FONCTION : Gestion des collisions pour identifiant élève
async function getUniqueIdentifiantEleve(
  supabaseAdmin: any,
  nom: string,
  prenom: string
): Promise<string> {
  const baseIdentifiant = genererIdentifiantEleve(nom, prenom);
  let identifiant = baseIdentifiant;
  let suffixe = 1;
  let exists = true;

  while (exists && suffixe < 100) {
    const { data: check } = await supabaseAdmin
      .from('eleves')
      .select('id')
      .eq('identifiant_connexion', identifiant)
      .maybeSingle();

    if (!check) {
      exists = false;
    } else {
      const baseWithoutDomain = baseIdentifiant.replace('@snet.bj', '');
      identifiant = `${baseWithoutDomain}.${suffixe}@snet.bj`;
      suffixe++;
    }
  }

  return identifiant;
}

// ============================================================
// FONCTION DE GÉNÉRATION DE MATRICULE (avec clé de contrôle)
// ============================================================

function calculerCleMatricule(partieNumerique: string): string {
  let somme = 0;
  for (let i = 0; i < partieNumerique.length; i++) {
    somme += parseInt(partieNumerique[i], 10) * (i + 1);
  }
  const reste = somme % 26;
  return String.fromCharCode(65 + reste); // A-Z
}

async function genererMatriculeSnet(supabaseAdmin: any): Promise<string> {
  const now = new Date();
  const annee = now.getFullYear().toString().slice(-2); // '26' pour 2026
  
  const { data: rangData, error: rangError } = await supabaseAdmin.rpc('get_next_matricule_rang', {
    p_annee: annee
  });

  if (rangError) {
    console.error('Erreur génération rang:', rangError);
    throw new Error('Impossible de générer le matricule');
  }

  const partieNumerique = `${annee}${String(rangData).padStart(8, '0')}`;
  const cle = calculerCleMatricule(partieNumerique);
  
  return `SNET-${partieNumerique}${cle}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const {
      email, password, nom, prenom, sexe, etablissement_id,
      classe_id, groupe_id, educmaster, telephone, date_naissance, matricule,
      parents
    } = body;

    if (!email || !password || !nom || !prenom || !etablissement_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, password, nom, prenom, etablissement_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const educmasterClean = educmaster ? educmaster.replace(/\s/g, '') : '';
    if (!educmasterClean || educmasterClean.length !== 12) {
      return new Response(
        JSON.stringify({ error: 'EducMaster obligatoire (12 chiffres)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prenomFormate = toTitleCase(prenom);
    const nomFormate = nom.toUpperCase();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { 
        auth: { 
          autoRefreshToken: false, 
          persistSession: false 
        } 
      }
    );

    // ✅ CORRECTION : Générer un identifiant unique pour l'élève si non fourni
    let finalIdentifiant = email;
    if (!finalIdentifiant || finalIdentifiant === '') {
      finalIdentifiant = await getUniqueIdentifiantEleve(supabaseAdmin, nomFormate, prenomFormate);
    } else {
      // Vérifier que l'identifiant fourni est unique
      const { data: existing } = await supabaseAdmin
        .from('eleves')
        .select('id')
        .eq('identifiant_connexion', finalIdentifiant)
        .maybeSingle();
      
      if (existing) {
        finalIdentifiant = await getUniqueIdentifiantEleve(supabaseAdmin, nomFormate, prenomFormate);
      }
    }

    // Génération du matricule (si non fourni)
    const finalMatricule = matricule || await genererMatriculeSnet(supabaseAdmin);
    const now = new Date().toISOString();

    // ============================================================
    // ÉTAPE 1 : Créer l'utilisateur (élève) dans auth.users
    // ============================================================
    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: finalIdentifiant,
      password,
      email_confirm: true,
      user_metadata: { nom: nomFormate, prenom: prenomFormate, role: 'eleve', educmaster: educmasterClean, sexe: sexe || null },
    });

    if (createUserError) {
      console.error('Erreur création utilisateur:', createUserError);
      return new Response(
        JSON.stringify({ error: `Erreur création utilisateur: ${createUserError.message}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = newUser.user.id;

    // ============================================================
    // ÉTAPE 2 : Créer le profil dans profiles
    // ============================================================
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        nom: nomFormate,
        prenom: prenomFormate,
        sexe: sexe || null,
        telephone: telephone || null,
        date_naissance: date_naissance || null,
        is_active: true,
        first_login: true,
      });

    if (profileError) {
      console.error('Erreur création profil:', profileError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: `Erreur création profil: ${profileError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================================
    // ÉTAPE 3 : Ajouter le rôle eleve dans user_roles
    // ============================================================
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'eleve',
        etablissement_id: etablissement_id,
        is_active: true,
        metadata: { educmaster: educmasterClean },
        validated_at: now,
      });

    if (roleError) {
      console.error('Erreur insertion user_roles:', roleError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: `Erreur création rôle: ${roleError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: verifyRole, error: verifyError } = await supabaseAdmin
      .from('user_roles')
      .select('id, role, etablissement_id')
      .eq('user_id', userId)
      .eq('role', 'eleve')
      .single();

    if (verifyError || !verifyRole) {
      console.error('Vérification échouée - rôle non trouvé:', verifyError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: 'Rôle non créé après insertion - vérification échouée' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Rôle vérifié pour user_id:', userId);

    // ============================================================
    // ÉTAPE 4 : Créer l'enregistrement dans eleves
    // ============================================================
    const eleveInsertData: any = {
      user_id: userId,
      etablissement_id: etablissement_id,
      identifiant_connexion: finalIdentifiant,
      matricule: finalMatricule,
      educmaster: educmasterClean,
      classe_id: classe_id || null,
      telephone: telephone || null,
      date_naissance: date_naissance || null,
      statut: 'actif',
    };

    if (groupe_id) {
      eleveInsertData.groupe_id = groupe_id;
    }

    const { error: eleveError } = await supabaseAdmin
      .from('eleves')
      .insert(eleveInsertData);

    if (eleveError) {
      console.error('Erreur insertion eleves:', eleveError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: `Erreur création élève: ${eleveError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: verifyEleve, error: verifyEleveError } = await supabaseAdmin
      .from('eleves')
      .select('id, matricule, identifiant_connexion')
      .eq('user_id', userId)
      .single();

    if (verifyEleveError || !verifyEleve) {
      console.error('Vérification échouée - élève non trouvé:', verifyEleveError);
      return new Response(
        JSON.stringify({ error: 'Élève non créé après insertion - vérification échouée' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Élève vérifié pour user_id:', userId, 'matricule:', verifyEleve.matricule);

    // ============================================================
    // ÉTAPE 5 : Gestion des parents (multi-parents)
    // ============================================================
    const parentsResults: any[] = [];
    const eleveId = verifyEleve.id;

    if (parents && Array.isArray(parents) && parents.length > 0) {
      for (const parent of parents) {
        try {
          let parentId = parent.existing_parent_id;
          let motDePasseTemp = null;
          let isNewParent = false;
          let emailSnet = null;

          const telephoneNormalise = normaliserTelephone(parent.telephone);
          const nomParent = parent.nom.toUpperCase();
          const prenomParent = toTitleCase(parent.prenom);
          const emailPersonnel = parent.email_personnel ? normaliserEmail(parent.email_personnel) : null;

          if (!parentId) {
            // Rechercher un parent existant par téléphone
            const { data: existingParent } = await supabaseAdmin
              .from('parents')
              .select('id, user_id, nom, prenom, email_snet')
              .eq('telephone', telephoneNormalise)
              .maybeSingle();

            if (existingParent) {
              parentId = existingParent.id;
              console.log(`✅ Parent existant trouvé par téléphone: ${telephoneNormalise}`);
            } else {
              isNewParent = true;
              
              // ✅ Générer un email_snet unique pour le parent (format nom.prenom@snet.bj)
              emailSnet = await getUniqueEmailSnet(supabaseAdmin, nomParent, prenomParent);
              motDePasseTemp = genererMotDePasseTemp(prenomParent);

              console.log(`📧 Création nouveau parent: ${emailSnet}, mot de passe: ${motDePasseTemp}`);

              const { data: newParentUser, error: parentAuthError } = await supabaseAdmin.auth.admin.createUser({
                email: emailSnet,
                password: motDePasseTemp,
                email_confirm: true,
                user_metadata: { 
                  nom: nomParent, 
                  prenom: prenomParent, 
                  role: 'parent', 
                  telephone: telephoneNormalise 
                },
              });

              if (parentAuthError) {
                console.error('Erreur création parent auth:', parentAuthError);
                parentsResults.push({
                  type_lien: parent.type_lien,
                  success: false,
                  error: parentAuthError.message,
                });
                continue;
              }

              // ✅ AJOUT : Insérer le rôle 'parent' dans user_roles
              const { error: parentRoleError } = await supabaseAdmin
                .from('user_roles')
                .insert({
                  user_id: newParentUser.user.id,
                  role: 'parent',
                  is_active: true,
                  validated_at: now,
                });

              if (parentRoleError) {
                console.error('Erreur insertion rôle parent:', parentRoleError);
                await supabaseAdmin.auth.admin.deleteUser(newParentUser.user.id);
                parentsResults.push({
                  type_lien: parent.type_lien,
                  success: false,
                  error: parentRoleError.message,
                });
                continue;
              }

              console.log(`✅ Rôle parent ajouté pour user_id: ${newParentUser.user.id}`);

              const { data: newParent, error: parentError } = await supabaseAdmin
                .from('parents')
                .insert({
                  user_id: newParentUser.user.id,
                  nom: nomParent,
                  prenom: prenomParent,
                  telephone: telephoneNormalise,
                  email_snet: emailSnet,
                  email_personnel: emailPersonnel,
                  mot_de_passe_temp: motDePasseTemp,
                  premiere_connexion: true,
                  is_active: true,
                })
                .select()
                .single();

              if (parentError) {
                console.error('Erreur création parent:', parentError);
                await supabaseAdmin.auth.admin.deleteUser(newParentUser.user.id);
                parentsResults.push({
                  type_lien: parent.type_lien,
                  success: false,
                  error: parentError.message,
                });
                continue;
              }

              parentId = newParent.id;
              console.log(`✅ Nouveau parent créé avec ID: ${parentId}, email_snet: ${emailSnet}`);
            }
          }

          // Créer la liaison parent_eleve
          const { error: linkError } = await supabaseAdmin
            .from('parent_eleve')
            .insert({
              parent_id: parentId,
              eleve_id: eleveId,
              type_lien: parent.type_lien,
              est_principal: parent.est_principal === true,
              est_contact_urgence: false,
            });

          if (linkError) {
            console.error('Erreur liaison parent_eleve:', linkError);
            parentsResults.push({
              type_lien: parent.type_lien,
              success: false,
              error: linkError.message,
            });
          } else {
            parentsResults.push({
              type_lien: parent.type_lien,
              success: true,
              parent_id: parentId,
              is_new: isNewParent,
              mot_de_passe_temp: motDePasseTemp,
              email_snet: emailSnet,
            });
          }
        } catch (err) {
          console.error('Erreur traitement parent:', err);
          parentsResults.push({
            type_lien: parent.type_lien,
            success: false,
            error: err instanceof Error ? err.message : 'Erreur inconnue',
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          user_id: userId,
          eleve_id: eleveId,
          identifiant_connexion: finalIdentifiant,
          matricule: finalMatricule,
          parents: parentsResults,
        },
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erreur non gérée:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});