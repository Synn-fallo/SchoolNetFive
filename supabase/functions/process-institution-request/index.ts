import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ProcessRequest {
  request_id: string;
  request_type: 'etablissement' | 'partenariat';
  action: 'valider' | 'rejeter' | 'changement_direction';
  commentaire?: string;
}

// Fonction pour générer un slug à partir d'un nom
function generateSlug(nom: string): string {
  return nom
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Fonction pour obtenir un slug unique
async function getUniqueSlug(supabaseAdmin: any, baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let counter = 1;
  
  while (true) {
    const { data, error } = await supabaseAdmin
      .from('etablissements')
      .select('slug')
      .eq('slug', slug)
      .maybeSingle();
    
    if (error || !data) {
      return slug;
    }
    
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

// Fonction de validation automatique par numéro d'agrément (améliorée)
async function validateByAgrement(supabaseAdmin: any, numeroAgrement: string): Promise<{ valid: boolean; message: string }> {
  if (!numeroAgrement) {
    return { valid: false, message: 'Numéro d\'agrément manquant' };
  }
  
  // Formats acceptés:
  // - AGRE-XXXXX
  // - 2024-XXXXX, 2025-XXXXX, 2026-XXXXX
  // - Format avec slash: 2026-0005/AGRE
  // - Tout code alphanumérique de 6+ caractères
  const isValid = 
    numeroAgrement.startsWith('AGRE-') || 
    numeroAgrement.startsWith('2024-') ||
    numeroAgrement.startsWith('2025-') ||
    numeroAgrement.startsWith('2026-') ||
    /^[A-Z0-9\/-]{6,}$/.test(numeroAgrement);
  
  console.log(`Validation agrément ${numeroAgrement}: ${isValid}`);
  
  if (!isValid) {
    return { 
      valid: false, 
      message: `Numéro d'agrément "${numeroAgrement}" invalide. Formats acceptés: AGRE-XXXXX, 2026-XXXXX, ou code alphanumérique de 6+ caractères.` 
    };
  }
  
  return { valid: true, message: 'Agrément valide' };
}

// Fonction pour gérer le changement de direction
async function handleChangementDirection(
  supabaseAdmin: any,
  etablissementExistant: any,
  nouveauDemandeurId: string,
  commentaire: string,
  requestId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const { data: existingChef, error: chefError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, id')
      .eq('etablissement_id', etablissementExistant.id)
      .eq('role', 'chef_etablissement')
      .eq('is_active', true)
      .maybeSingle();

    if (chefError) throw chefError;

    if (existingChef) {
      const { error: archiveError } = await supabaseAdmin
        .from('user_roles')
        .update({ 
          is_active: false,
          metadata: { 
            ...(etablissementExistant.user_roles?.metadata || {}),
            archived_at: new Date().toISOString(),
            archived_by: nouveauDemandeurId,
            reason: commentaire || 'Changement de direction',
            transferred_to: nouveauDemandeurId
          }
        })
        .eq('id', existingChef.id);

      if (archiveError) throw archiveError;
      console.log(`📦 Ancien chef archivé: ${existingChef.user_id}`);
    }

    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: nouveauDemandeurId,
        etablissement_id: etablissementExistant.id,
        role: 'chef_etablissement',
        is_active: true,
        metadata: {
          transferred_from: existingChef?.user_id || null,
          transferred_at: new Date().toISOString(),
          transfer_request_id: requestId
        }
      });

    if (roleError) throw roleError;
    console.log(`👨‍💼 Nouveau chef créé: ${nouveauDemandeurId}`);

    await supabaseAdmin
      .from('profiles')
      .update({ etablissement_id: etablissementExistant.id })
      .eq('id', nouveauDemandeurId);

    await supabaseAdmin
      .from('demandes_etablissement')
      .update({
        statut: 'valide',
        commentaire_admin: commentaire || 'Changement de direction accepté',
        traitee_at: new Date().toISOString(),
        traitee_par: null,
        etablissement_cree_id: etablissementExistant.id,
      })
      .eq('id', requestId);

    if (existingChef) {
      try {
        const { data: oldChefProfile } = await supabaseAdmin
          .from('profiles')
          .select('email')
          .eq('id', existingChef.user_id)
          .single();

        await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notify-institution-request`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: existingChef.user_id,
            email: oldChefProfile?.email,
            type: 'changement_direction',
            message: `Un nouveau chef d'établissement a été nommé pour ${etablissementExistant.nom}. Votre compte a été archivé.`,
            etablissement_nom: etablissementExistant.nom,
          }),
        });
      } catch (notifyError) {
        console.error('Error notifying old chef:', notifyError);
      }
    }

    try {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notify-institution-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: nouveauDemandeurId,
          type: 'changement_direction_confirmation',
          message: `Vous êtes désormais chef d'établissement pour ${etablissementExistant.nom}.`,
          etablissement_nom: etablissementExistant.nom,
        }),
      });
    } catch (notifyError) {
      console.error('Error notifying new chef:', notifyError);
    }

    return { success: true, message: 'Changement de direction effectué avec succès' };
  } catch (error) {
    console.error('Error handling direction change:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
}

Deno.serve(async (req: Request) => {
  // Gestion CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('🔧 Function called - bypassing auth check');

    const { request_id, request_type, action, commentaire }: ProcessRequest = await req.json();

    if (!request_id || !request_type || !action) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Champs manquants',
          details: { required: ['request_id', 'request_type', 'action'], received: { request_id, request_type, action } }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📝 Processing ${request_type} request ${request_id} with action ${action}`);

    let requestData: any;
    let demandeurId: string;

    if (request_type === 'etablissement') {
      const { data, error } = await supabaseAdmin
        .from('demandes_etablissement')
        .select('*')
        .eq('id', request_id)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Demande non trouvée',
            details: { request_id, error: error?.message }
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      requestData = data;
      demandeurId = data.demandeur_id;

      if (action === 'valider') {
        // Vérifier que l'email n'est pas déjà utilisé
        const { data: existingEtab, error: emailError } = await supabaseAdmin
          .from('etablissements')
          .select('*')
          .eq('email', data.email_contact)
          .eq('statut', 'ACTIF')
          .maybeSingle();

        if (emailError) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'Erreur lors de la vérification de l\'email',
              details: emailError.message
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        if (existingEtab) {
          const { data: existingChef, error: chefError } = await supabaseAdmin
            .from('user_roles')
            .select('user_id, profiles:user_id(email)')
            .eq('etablissement_id', existingEtab.id)
            .eq('role', 'chef_etablissement')
            .eq('is_active', true)
            .maybeSingle();

          if (chefError) throw chefError;

          if (existingChef) {
            return new Response(
              JSON.stringify({
                success: false,
                error: 'ETABLISSEMENT_EXISTANT',
                message: 'Cet email est déjà utilisé par un établissement actif. Voulez-vous demander le changement de direction ?',
                etablissement: {
                  id: existingEtab.id,
                  nom: existingEtab.nom,
                  chef_actuel: existingChef.profiles?.email,
                },
              }),
              { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        // Vérification automatique si mode = 'auto'
        let validationAuto = false;
        let validationMessage = '';
        
        if (data.mode_verification === 'auto' && data.numero_agrement) {
          const agrementResult = await validateByAgrement(supabaseAdmin, data.numero_agrement);
          if (agrementResult.valid) {
            validationAuto = true;
            validationMessage = 'Validé automatiquement (agrément vérifié)';
            console.log(`✅ Auto-validation réussie pour ${data.nom_etablissement}`);
          } else {
            // Retourner une erreur claire pour l'admin
            return new Response(
              JSON.stringify({
                success: false,
                error: 'AGREMENT_INVALIDE',
                message: agrementResult.message,
                details: {
                  numero_agrement: data.numero_agrement,
                  mode_verification: data.mode_verification,
                  suggestion: 'Modifiez le numéro d\'agrément ou passez en vérification manuelle'
                }
              }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        // Génération du slug unique
        const baseSlug = generateSlug(data.nom_etablissement);
        const uniqueSlug = await getUniqueSlug(supabaseAdmin, baseSlug);
        console.log(`📌 Generated unique slug: ${uniqueSlug}`);

        // Création de l'établissement
        const { data: etablissement, error: etabError } = await supabaseAdmin
          .from('etablissements')
          .insert({
            nom: data.nom_etablissement,
            slug: uniqueSlug,
            type_etablissement: data.type_etablissement,
            adresse: data.adresse,
            telephone: data.telephone,
            email: data.email_contact,
            ville: data.ville,
            site_web: data.site_web || null,
            statut: 'EN_ATTENTE_ACTIVATION',
            is_active: false,
            metadata: {
              plan_souhaite: data.plan_souhaite,
              message_demandeur: data.message_demandeur,
              justificatifs_urls: data.justificatifs_urls || [],
              mode_verification: data.mode_verification,
              numero_agrement: data.numero_agrement,
              validation_auto: validationAuto,
              validation_message: validationMessage,
            }
          })
          .select()
          .single();

        if (etabError) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'ERREUR_CREATION_ETABLISSEMENT',
              message: 'Impossible de créer l\'établissement',
              details: etabError.message
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`🏫 Establishment created: ${etablissement.id} with slug ${uniqueSlug}`);

        // Attribution du rôle chef_etablissement
        const { error: roleInsertError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: demandeurId,
            etablissement_id: etablissement.id,
            role: 'chef_etablissement',
            is_active: true
          });

        if (roleInsertError) {
          await supabaseAdmin.from('etablissements').delete().eq('id', etablissement.id);
          return new Response(
            JSON.stringify({
              success: false,
              error: 'ERREUR_ATTRIBUTION_ROLE',
              message: 'L\'établissement a été créé mais le rôle n\'a pas pu être attribué',
              details: roleInsertError.message
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Mise à jour du profil
        await supabaseAdmin
          .from('profiles')
          .update({ etablissement_id: etablissement.id })
          .eq('id', demandeurId);

        // Mise à jour de la demande
        await supabaseAdmin
          .from('demandes_etablissement')
          .update({
            statut: 'valide',
            commentaire_admin: commentaire || validationMessage,
            traitee_at: new Date().toISOString(),
            traitee_par: null,
            etablissement_cree_id: etablissement.id,
          })
          .eq('id', request_id);

        console.log(`✅ Establishment request validated, role assigned to ${demandeurId}`);
        
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Demande validée avec succès',
            etablissement: { id: etablissement.id, nom: etablissement.nom, slug: etablissement.slug }
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else if (action === 'changement_direction') {
        const { data: existingEtab, error: etabError } = await supabaseAdmin
          .from('etablissements')
          .select('*')
          .eq('email', requestData.email_contact)
          .eq('statut', 'ACTIF')
          .maybeSingle();

        if (etabError || !existingEtab) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'ETABLISSEMENT_NON_TROUVE',
              message: 'Établissement non trouvé pour le changement de direction'
            }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const result = await handleChangementDirection(
          supabaseAdmin,
          existingEtab,
          demandeurId,
          commentaire || 'Changement de direction',
          request_id
        );

        if (!result.success) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'ERREUR_CHANGEMENT_DIRECTION',
              message: result.message
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`✅ Direction changed for establishment ${existingEtab.id} to user ${demandeurId}`);
        
        return new Response(
          JSON.stringify({
            success: true,
            message: result.message
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        await supabaseAdmin
          .from('demandes_etablissement')
          .update({
            statut: 'rejete',
            commentaire_admin: commentaire,
            traitee_at: new Date().toISOString(),
            traitee_par: null,
          })
          .eq('id', request_id);
        
        console.log(`❌ Establishment request rejected`);
        
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Demande rejetée avec succès'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (request_type === 'partenariat') {
      const { data, error } = await supabaseAdmin
        .from('demandes_partenariat')
        .select('*')
        .eq('id', request_id)
        .single();

      if (error || !data) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Demande non trouvée',
            details: { request_id, error: error?.message }
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      requestData = data;
      demandeurId = data.demandeur_id;

      if (action === 'valider') {
        const { error: roleInsertError } = await supabaseAdmin
          .from('user_roles')
          .insert({
            user_id: demandeurId,
            role: 'partenaire',
            is_active: true
          });

        if (roleInsertError) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'ERREUR_ATTRIBUTION_ROLE',
              message: 'Impossible d\'attribuer le rôle partenaire',
              details: roleInsertError.message
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await supabaseAdmin
          .from('demandes_partenariat')
          .update({
            statut: 'valide',
            notes_internes: commentaire,
            traitee_at: new Date().toISOString(),
            traitee_par: null,
          })
          .eq('id', request_id);
        
        console.log(`✅ Partnership request validated`);
        
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Demande de partenariat validée avec succès'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        await supabaseAdmin
          .from('demandes_partenariat')
          .update({
            statut: 'rejete',
            notes_internes: commentaire,
            traitee_at: new Date().toISOString(),
            traitee_par: null,
          })
          .eq('id', request_id);
        
        console.log(`❌ Partnership request rejected`);
        
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Demande de partenariat rejetée'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'TYPE_INVALIDE',
          message: 'request_type doit être "etablissement" ou "partenariat"'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'ERREUR_INTERNE',
        message: error instanceof Error ? error.message : 'Erreur interne du serveur'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});