// supabase/functions/validate-auto-inscription/index.ts
// Edge Function pour valider (accepter/refuser) une demande d'auto-inscription
// Accessible uniquement aux admins authentifiés (Chef/DE)
// ⚠️ Déployer avec JWT verification

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // 'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info, x-application-name',
};

// ============================================================
// MOTIFS DE REFUS PRÉDÉFINIS
// ============================================================

const MOTIFS_REFUS = [
  { value: 'educmaster_invalide', label: 'EducMaster invalide ou non reconnu' },
  { value: 'documents_manquants', label: 'Documents justificatifs manquants' },
  { value: 'classe_indisponible', label: 'Classe demandée non disponible' },
  { value: 'age_non_conforme', label: 'Âge non conforme au niveau demandé' },
  { value: 'capacite_atteinte', label: 'Effectif maximum de la classe atteint' },
  { value: 'doublon_etablissement', label: 'Élève déjà inscrit dans cet établissement' },
  { value: 'irregularite_dossier', label: 'Irrégularité dans le dossier' },
  { value: 'autre', label: 'Autre motif', requiresPrecision: true },
];

// ============================================================
// FONCTIONS UTILITAIRES
// ============================================================

function normalizeTelephone(tel: string): string {
  if (!tel) return '';
  return tel.replace(/\D/g, '');
}

function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

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
  return `${normalize(prenom)}.${normalize(nom)}@snet.bj`;
}

function genererMotDePasseTemp(prenom: string): string {
  const chiffres = Math.floor(1000 + Math.random() * 9000);
  return `Parent${prenom}${chiffres}`;
}

function genererIdentifiantConnexion(nom: string, prenom: string): string {
  const normalize = (str: string) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
  };
  return `${normalize(nom)}.${normalize(prenom)}@snet.bj`;
}

// ============================================================
// FONCTIONS DE GÉNÉRATION DE MATRICULE
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
      emailSnet = baseEmail.replace('@snet.bj', `.${suffixe}@snet.bj`);
      suffixe++;
    }
  }

  return emailSnet;
}

async function getUniqueIdentifiantConnexion(
  supabaseAdmin: any,
  nom: string,
  prenom: string
): Promise<string> {
  const baseIdentifiant = genererIdentifiantConnexion(nom, prenom);
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
      identifiant = baseIdentifiant.replace('@snet.bj', `.${suffixe}@snet.bj`);
      suffixe++;
    }
  }

  return identifiant;
}

// ============================================================
// HANDLER PRINCIPAL
// ============================================================

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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.split(' ')[1];

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Erreur vérification utilisateur:', userError);
      return new Response(
        JSON.stringify({ error: 'Utilisateur non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { demande_id, action, motif, classe_id } = body;

    if (!demande_id || !action || !['accept', 'reject'].includes(action)) {
      return new Response(
        JSON.stringify({ error: 'Paramètres invalides' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // ============================================================
    // ÉTAPE 1: RÉCUPÉRER LA DEMANDE
    // ============================================================

    const { data: demande, error: demandeError } = await supabaseAdmin
      .from('demandes_auto_inscription')
      .select('*')
      .eq('id', demande_id)
      .single();

    if (demandeError || !demande) {
      console.error('Erreur récupération demande:', demandeError);
      return new Response(
        JSON.stringify({ error: 'Demande non trouvée' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (demande.statut !== 'pending') {
      return new Response(
        JSON.stringify({ error: `Cette demande a déjà été ${demande.statut === 'accepted' ? 'acceptée' : 'refusée'}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================================
    // CAS: REFUS DE LA DEMANDE
    // ============================================================

    if (action === 'reject') {
      let motifFinal = '';
      if (motif === 'autre' && motif.autre) {
        motifFinal = motif.autre;
      } else {
        const motifTrouve = MOTIFS_REFUS.find(m => m.value === motif);
        motifFinal = motifTrouve ? motifTrouve.label : (motif || 'Aucun motif fourni');
      }

      const { error: updateError } = await supabaseAdmin
        .from('demandes_auto_inscription')
        .update({
          statut: 'rejected',
          motif_refus: JSON.stringify([motifFinal]),
          date_traitement: new Date().toISOString(),
          traite_par: user.id,
        })
        .eq('id', demande_id);

      if (updateError) {
        console.error('Erreur mise à jour demande:', updateError);
        return new Response(
          JSON.stringify({ error: 'Erreur lors du refus' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Envoyer notification de refus au parent
      try {
        const { data: demandeWithParent } = await supabaseAdmin
          .from('demandes_auto_inscription')
          .select('parent_email')
          .eq('id', demande_id)
          .single();

        if (demandeWithParent?.parent_email) {
          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notifications-parent`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            },
            body: JSON.stringify({
              parent_email: demandeWithParent.parent_email,
              type: 'DEMANDE_LIEN_REFUSEE',
              data: {
                enfantNom: `${demande.eleve_prenom} ${demande.eleve_nom}`,
                motif: motifFinal,
              },
              canal: 'BOTH',
            }),
          });
          console.log(`✅ Notification de refus envoyée pour la demande ${demande_id}`);
        }
      } catch (notifError) {
        console.error('Erreur envoi notification refus:', notifError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          action: 'rejected',
          message: 'Demande refusée avec succès',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================================
    // CAS: ACCEPTATION DE LA DEMANDE - CRÉATION ÉLÈVE ET PARENT
    // ============================================================

    let classeId = classe_id;
    if (!classeId) {
      return new Response(
        JSON.stringify({ error: 'Classe requise pour accepter la demande' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: classe, error: classeError } = await supabaseAdmin
      .from('classes')
      .select('id, nom, niveau_id, serie_id')
      .eq('id', classeId)
      .maybeSingle();

    if (classeError || !classe) {
      return new Response(
        JSON.stringify({ error: 'Classe invalide' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const identifiantConnexion = await getUniqueIdentifiantConnexion(
      supabaseAdmin,
      demande.eleve_nom,
      demande.eleve_prenom
    );

    const motDePasseTemp = genererMotDePasseTemp(demande.eleve_prenom);

    const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: identifiantConnexion,
      password: motDePasseTemp,
      email_confirm: true,
      user_metadata: {
        nom: demande.eleve_nom,
        prenom: demande.eleve_prenom,
        role: 'eleve',
        educmaster: demande.educmaster,
      },
    });

    if (createUserError) {
      console.error('Erreur création utilisateur:', createUserError);
      return new Response(
        JSON.stringify({ error: `Erreur création élève: ${createUserError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = newUser.user.id;

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        nom: demande.eleve_nom,
        prenom: demande.eleve_prenom,
        sexe: demande.eleve_sexe,
        date_naissance: demande.eleve_date_naissance,
        telephone: null,
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

    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'eleve',
        etablissement_id: demande.etablissement_id,
        is_active: true,
        metadata: { educmaster: demande.educmaster },
        validated_at: new Date().toISOString(),
      });

    if (roleError) {
      console.error('Erreur création rôle:', roleError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: `Erreur création rôle: ${roleError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const matriculeGenere = await genererMatriculeSnet(supabaseAdmin);
    console.log('🔍 Matricule généré:', matriculeGenere);

    const { data: eleve, error: eleveError } = await supabaseAdmin
      .from('eleves')
      .insert({
        user_id: userId,
        etablissement_id: demande.etablissement_id,
        educmaster: demande.educmaster,
        identifiant_connexion: identifiantConnexion,
        matricule: matriculeGenere,
        classe_id: classeId,
        statut: 'PRE_ACCEPTED',
        date_naissance: demande.eleve_date_naissance,
      })
      .select()
      .single();

    if (eleveError) {
      console.error('Erreur création élève:', eleveError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: `Erreur création élève: ${eleveError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============================================================
    // GESTION DU PARENT
    // ============================================================

    let parentId: string | null = null;
    let parentUserCreated = false;
    let parentEmailSnet: string | null = null;
    let parentMotDePasseTemp: string | null = null;

    const telephoneNormalise = normalizeTelephone(demande.parent_telephone);
    const { data: parentExistant, error: parentCheckError } = await supabaseAdmin
      .from('parents')
      .select('id')
      .eq('telephone', telephoneNormalise)
      .maybeSingle();

    if (parentCheckError) {
      console.error('Erreur vérification parent existant:', parentCheckError);
    }

    if (parentExistant) {
      parentId = parentExistant.id;
      console.log(`✅ Parent existant trouvé: ${parentId}`);
    } else {
      const emailSnet = await getUniqueEmailSnet(
        supabaseAdmin,
        demande.parent_nom,
        demande.parent_prenom
      );
      parentEmailSnet = emailSnet;
      parentMotDePasseTemp = genererMotDePasseTemp(demande.parent_prenom);

      const { data: newParentUser, error: parentAuthError } = await supabaseAdmin.auth.admin.createUser({
        email: emailSnet,
        password: parentMotDePasseTemp,
        email_confirm: true,
        user_metadata: {
          nom: demande.parent_nom,
          prenom: demande.parent_prenom,
          role: 'parent',
          telephone: telephoneNormalise,
        },
      });

      if (parentAuthError) {
        console.error('Erreur création parent auth:', parentAuthError);
      } else {
        parentUserCreated = true;
        
        const { data: newParent, error: parentError } = await supabaseAdmin
          .from('parents')
          .insert({
            user_id: newParentUser.user.id,
            nom: demande.parent_nom,
            prenom: toTitleCase(demande.parent_prenom),
            telephone: telephoneNormalise,
            email_snet: emailSnet,
            email_personnel: demande.parent_email,
            mot_de_passe_temp: parentMotDePasseTemp,
            premiere_connexion: true,
            is_active: true,
          })
          .select()
          .single();

        if (parentError) {
          console.error('Erreur création parent:', parentError);
          await supabaseAdmin.auth.admin.deleteUser(newParentUser.user.id);
        } else {
          parentId = newParent.id;
          console.log(`✅ Nouveau parent créé: ${parentId} (${emailSnet})`);
        }
      }
    }

    if (parentId) {
      const typeLien = demande.parent_type_lien || 'autre';
      const { error: linkError } = await supabaseAdmin
        .from('parent_eleve')
        .insert({
          parent_id: parentId,
          eleve_id: eleve.id,
          type_lien: typeLien,
          est_principal: typeLien === 'pere' || typeLien === 'mere',
          est_contact_urgence: false,
        });

      if (linkError) {
        console.error('Erreur liaison parent_eleve:', linkError);
      } else {
        console.log(`✅ Parent ${parentId} lié à l'élève ${eleve.id}`);
      }

      // Envoyer notification au parent (si parentId existe)
      try {
        const { data: parentData } = await supabaseAdmin
          .from('parents')
          .select('user_id, email_personnel')
          .eq('id', parentId)
          .single();

        if (parentData?.user_id) {
          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notifications-parent`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            },
            body: JSON.stringify({
              parent_id: parentId,
              type: 'DEMANDE_LIEN_ACCEPTEE',
              data: {
                enfantNom: `${demande.eleve_prenom} ${demande.eleve_nom}`,
              },
              canal: 'BOTH',
            }),
          });
          console.log(`✅ Notification d'acceptation envoyée au parent ${parentId}`);
        }
      } catch (notifError) {
        console.error('Erreur envoi notification acceptation:', notifError);
      }
    }

    // ============================================================
    // ANNULER LES AUTRES DEMANDES DU MÊME ÉLÈVE
    // ============================================================
    
    const { error: cancelError } = await supabaseAdmin
      .from('demandes_auto_inscription')
      .update({
        statut: 'cancelled',
        date_traitement: new Date().toISOString(),
        traite_par: user.id,
        motif_refus: JSON.stringify(['Demande acceptée dans un autre établissement'])
      })
      .eq('educmaster', demande.educmaster)
      .neq('id', demande_id)
      .eq('statut', 'pending');

    if (cancelError) {
      console.error('Erreur annulation demandes concurrentes:', cancelError);
    }

    // ============================================================
    // CRÉATION DE LA FACTURE D'INSCRIPTION
    // ============================================================
    
    let factureData = null;
    
    try {
      const now = new Date();
      const annee = now.getFullYear();
      const mois = String(now.getMonth() + 1).padStart(2, '0');
      
      const { count: factureCount } = await supabaseAdmin
        .from('factures')
        .select('id', { count: 'exact', head: true })
        .gte('date_creation', new Date(annee, now.getMonth(), 1).toISOString())
        .lt('date_creation', new Date(annee, now.getMonth() + 1, 1).toISOString());
      
      const numeroFacture = `FAC-${annee}${mois}-${String((factureCount || 0) + 1).padStart(4, '0')}`;
      
      const { data: insertedFacture, error: factureError } = await supabaseAdmin
        .from('factures')
        .insert({
          numero_facture: numeroFacture,
          matricule: matriculeGenere,
          eleve_id: eleve.id,
          etablissement_id: demande.etablissement_id,
          niveau_id: classe.niveau_id || null,
          serie_id: classe.serie_id || null,
          montant_total: 25000,
          statut: 'en_attente',
          date_creation: new Date().toISOString(),
          date_echeance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();
      
      if (factureError) {
        console.error('⚠️ Erreur création facture:', factureError);
      } else {
        factureData = insertedFacture;
        console.log('✅ Facture créée:', factureData.numero_facture);
      }
    } catch (factureError) {
      console.error('⚠️ Exception création facture:', factureError);
    }

    // ============================================================
    // METTRE À JOUR LE STATUT DE LA DEMANDE
    // ============================================================

    const { error: updateError } = await supabaseAdmin
      .from('demandes_auto_inscription')
      .update({
        statut: 'accepted',
        date_traitement: new Date().toISOString(),
        traite_par: user.id,
      })
      .eq('id', demande_id);

    if (updateError) {
      console.error('Erreur mise à jour demande:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        action: 'accepted',
        message: 'Demande acceptée avec succès. En attente de paiement.',
        eleve_id: eleve.id,
        identifiant_connexion: identifiantConnexion,
        mot_de_passe_temp: motDePasseTemp,
        matricule: matriculeGenere,
        facture_id: factureData?.id || null,
        numero_facture: factureData?.numero_facture || null,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erreur non gérée:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});