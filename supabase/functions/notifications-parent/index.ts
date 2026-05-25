// supabase/functions/notifications-parent/index.ts
// Edge Function pour l'envoi de notifications aux parents
// ⚠️ Déployer avec JWT verification

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // 'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info, x-application-name',
};

type NotificationType = 
  | 'NOUVELLE_NOTE'
  | 'ABSENCE_SIGNALEE'
  | 'BULLETIN_DISPONIBLE'
  | 'MESSAGE_RECU'
  | 'RENDEZ_VOUS_CONFIRME'
  | 'DEMANDE_LIEN_ACCEPTEE'
  | 'DEMANDE_LIEN_REFUSEE'
  | 'NOUVEL_ENFANT_LIE'
  | 'COMPTE_PARENT_CREE'
  | 'NOUVELLE_ANNONCE';  // ✅ AJOUTÉ

interface NotificationPayload {
  parent_id?: string;
  user_id?: string;
  parent_email?: string;
  type: NotificationType;
  data: Record<string, any>;
  canal: 'IN_APP' | 'EMAIL' | 'BOTH';
}

// Templates email
const emailTemplates: Record<NotificationType, (data: any) => { subject: string; html: string }> = {
  NOUVELLE_NOTE: (data) => ({
    subject: `SchoolNet - Nouvelle note pour ${data.enfantNom}`,
    html: `
      <h2>Nouvelle note publiée</h2>
      <p>Bonjour,</p>
      <p>Une nouvelle note a été publiée pour votre enfant <strong>${data.enfantNom}</strong>.</p>
      <p><strong>Matière :</strong> ${data.matiere}</p>
      <p><strong>Note :</strong> ${data.note}/${data.noteSur}</p>
      ${data.appreciation ? `<p><strong>Appréciation :</strong> ${data.appreciation}</p>` : ''}
      <p><a href="${data.login_url}">Voir les détails</a></p>
    `,
  }),
  ABSENCE_SIGNALEE: (data) => ({
    subject: `SchoolNet - Absence signalée pour ${data.enfantNom}`,
    html: `
      <h2>Absence signalée</h2>
      <p>Bonjour,</p>
      <p>Une absence a été signalée pour votre enfant <strong>${data.enfantNom}</strong>.</p>
      <p><strong>Date :</strong> ${data.date}</p>
      ${data.motif ? `<p><strong>Motif :</strong> ${data.motif}</p>` : ''}
      <p><a href="${data.login_url}">Justifier l'absence</a></p>
    `,
  }),
  BULLETIN_DISPONIBLE: (data) => ({
    subject: `SchoolNet - Bulletin disponible pour ${data.enfantNom}`,
    html: `
      <h2>Bulletin disponible</h2>
      <p>Bonjour,</p>
      <p>Le bulletin de la période <strong>${data.periode}</strong> est disponible pour votre enfant <strong>${data.enfantNom}</strong>.</p>
      <p><strong>Moyenne générale :</strong> ${data.moyenneGenerale}/20</p>
      <p><a href="${data.bulletin_url}">Télécharger le bulletin</a></p>
    `,
  }),
  MESSAGE_RECU: (data) => ({
    subject: `SchoolNet - Nouveau message de ${data.expediteurNom}`,
    html: `
      <h2>Nouveau message</h2>
      <p>Bonjour,</p>
      <p>Vous avez reçu un nouveau message de <strong>${data.expediteurNom}</strong>.</p>
      <p><strong>Canal :</strong> ${data.canal_nom}</p>
      <p><strong>Message :</strong> "${data.message.substring(0, 100)}${data.message.length > 100 ? '...' : ''}"</p>
      <p><a href="${data.login_url}/messages">Lire le message</a></p>
    `,
  }),
  RENDEZ_VOUS_CONFIRME: (data) => ({
    subject: `SchoolNet - Rendez-vous confirmé avec ${data.enseignantNom}`,
    html: `
      <h2>Rendez-vous confirmé</h2>
      <p>Bonjour,</p>
      <p>Votre rendez-vous avec <strong>${data.enseignantNom}</strong> a été confirmé.</p>
      <p><strong>Date :</strong> ${data.date}</p>
      <p><strong>Heure :</strong> ${data.heure}</p>
      <p><strong>Motif :</strong> ${data.motif}</p>
      <p><a href="${data.login_url}/rendez-vous">Voir mes rendez-vous</a></p>
    `,
  }),
  DEMANDE_LIEN_ACCEPTEE: (data) => ({
    subject: `SchoolNet - Votre demande de lien a été acceptée`,
    html: `
      <h2>Demande acceptée</h2>
      <p>Bonjour,</p>
      <p>Votre demande de lien pour l'enfant <strong>${data.enfantNom}</strong> a été acceptée par l'établissement.</p>
      <p>Vous pouvez maintenant suivre sa scolarité sur SchoolNet.</p>
      <p><a href="${data.login_url}">Accéder à mon espace</a></p>
    `,
  }),
  DEMANDE_LIEN_REFUSEE: (data) => ({
    subject: `SchoolNet - Votre demande de lien a été refusée`,
    html: `
      <h2>Demande refusée</h2>
      <p>Bonjour,</p>
      <p>Votre demande de lien pour l'enfant <strong>${data.enfantNom}</strong> a été refusée.</p>
      <p><strong>Motif :</strong> ${data.motif}</p>
      <p>Vous pouvez renouveler votre demande avec un justificatif approprié.</p>
    `,
  }),
  NOUVEL_ENFANT_LIE: (data) => ({
    subject: `SchoolNet - Nouvel enfant lié à votre compte`,
    html: `
      <h2>Nouvel enfant lié</h2>
      <p>Bonjour,</p>
      <p>Un nouvel enfant a été lié à votre compte : <strong>${data.enfantNom}</strong>.</p>
      <p>Établissement : ${data.etablissementNom}</p>
      <p>Classe : ${data.classeNom}</p>
      <p><a href="${data.login_url}">Voir mon tableau de bord</a></p>
    `,
  }),
  COMPTE_PARENT_CREE: (data) => ({
    subject: `SchoolNet - Votre compte parent a été créé`,
    html: `
      <h2>Bienvenue sur SchoolNet</h2>
      <p>Bonjour ${data.prenom} ${data.nom},</p>
      <p>Votre compte parent a été créé par l'établissement scolaire.</p>
      <p><strong>Identifiant :</strong> ${data.email_snet}</p>
      <p><strong>Mot de passe temporaire :</strong> ${data.mot_de_passe_temp}</p>
      <p><a href="${data.login_url}">Se connecter</a></p>
    `,
  }),
  // ✅ NOUVEAU TEMPLATE POUR NOUVELLE_ANNONCE
  NOUVELLE_ANNONCE: (data) => ({
    subject: `SchoolNet - ${data.titre}`,
    html: `
      <h2>${data.titre}</h2>
      <p>${data.contenu}</p>
      ${data.visibilite ? `<p><strong>Public concerné :</strong> ${data.visibilite === 'tous' ? 'Parents, Élèves et Enseignants' : data.visibilite}</p>` : ''}
      <p><a href="${data.login_url}/annonces">Voir toutes les annonces</a></p>
    `,
  }),
};

async function envoyerNotificationInApp(supabaseAdmin: any, parentId: string, type: NotificationType, data: any) {
  const { error } = await supabaseAdmin
    .from('notifications')
    .insert({
      parent_id: parentId,
      titre: getNotificationTitle(type, data),
      contenu: getNotificationContent(type, data),
      type: type,
      is_read: false,
    });

  if (error) {
    console.error('Erreur insertion notification IN-APP:', error);
  }
}

function getNotificationTitle(type: NotificationType, data: any): string {
  const titles: Record<NotificationType, string> = {
    NOUVELLE_NOTE: `📝 Nouvelle note - ${data.matiere}`,
    ABSENCE_SIGNALEE: `⚠️ Absence signalée`,
    BULLETIN_DISPONIBLE: `📄 Bulletin disponible`,
    MESSAGE_RECU: `💬 Nouveau message`,
    RENDEZ_VOUS_CONFIRME: `📅 Rendez-vous confirmé`,
    DEMANDE_LIEN_ACCEPTEE: `✅ Demande acceptée`,
    DEMANDE_LIEN_REFUSEE: `❌ Demande refusée`,
    NOUVEL_ENFANT_LIE: `👶 Nouvel enfant lié`,
    COMPTE_PARENT_CREE: `🎉 Bienvenue sur SchoolNet`,
    NOUVELLE_ANNONCE: `📢 Nouvelle annonce - ${data.titre}`,
  };
  return titles[type];
}

function getNotificationContent(type: NotificationType, data: any): string {
  switch (type) {
    case 'NOUVELLE_NOTE':
      return `${data.enfantNom} - ${data.matiere}: ${data.note}/${data.noteSur}`;
    case 'ABSENCE_SIGNALEE':
      return `${data.enfantNom} - ${new Date(data.date).toLocaleDateString('fr-FR')}`;
    case 'BULLETIN_DISPONIBLE':
      return `${data.enfantNom} - Période ${data.periode} - Moyenne: ${data.moyenneGenerale}/20`;
    case 'MESSAGE_RECU':
      return `De: ${data.expediteurNom} - ${data.canal_nom}`;
    case 'RENDEZ_VOUS_CONFIRME':
      return `${data.date} à ${data.heure} avec ${data.enseignantNom}`;
    case 'NOUVEL_ENFANT_LIE':
      return `${data.enfantNom} - ${data.etablissementNom}`;
    case 'NOUVELLE_ANNONCE':
      return data.contenu.substring(0, 100) + (data.contenu.length > 100 ? '...' : '');
    default:
      return '';
  }
}

async function envoyerEmail(supabaseAdmin: any, email: string, type: NotificationType, data: any) {
  const template = emailTemplates[type];
  if (!template) return;

  const { subject, html } = template(data);
  const loginUrl = Deno.env.get('APP_URL') || 'https://schoolnet.bj';

  try {
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      },
      body: JSON.stringify({
        to: email,
        subject,
        html: html.replace(/\${login_url}/g, loginUrl),
      }),
    });
    if (!response.ok) {
      console.error('Erreur envoi email:', await response.text());
    }
  } catch (err) {
    console.error('Erreur appel send-email:', err);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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
      return new Response(
        JSON.stringify({ error: 'Utilisateur non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { parent_id, user_id, parent_email, type, data, canal } = body as NotificationPayload;

    if ((!parent_id && !user_id && !parent_email) || !type) {
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants: parent_id, user_id ou parent_email, et type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Déterminer le parent_id
    let finalParentId = parent_id;
    let parentEmail = parent_email;

    if (!finalParentId && user_id) {
      const { data: parent } = await supabaseAdmin
        .from('parents')
        .select('id, email_personnel')
        .eq('user_id', user_id)
        .maybeSingle();
      if (parent) {
        finalParentId = parent.id;
        parentEmail = parent.email_personnel;
      }
    }

    if (!finalParentId && parentEmail) {
      const { data: parent } = await supabaseAdmin
        .from('parents')
        .select('id, email_personnel')
        .eq('email_personnel', parentEmail)
        .maybeSingle();
      if (parent) {
        finalParentId = parent.id;
      }
    }

    if (!finalParentId) {
      return new Response(
        JSON.stringify({ error: 'Parent non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer l'email du parent si non fourni
    if (!parentEmail) {
      const { data: parent } = await supabaseAdmin
        .from('parents')
        .select('email_personnel, email_snet')
        .eq('id', finalParentId)
        .single();
      if (parent) {
        parentEmail = parent.email_personnel || parent.email_snet;
      }
    }

    // Envoyer notification IN-APP
    if (canal === 'IN_APP' || canal === 'BOTH') {
      await envoyerNotificationInApp(supabaseAdmin, finalParentId, type, data);
    }

    // Envoyer email
    if ((canal === 'EMAIL' || canal === 'BOTH') && parentEmail) {
      await envoyerEmail(supabaseAdmin, parentEmail, type, {
        ...data,
        login_url: Deno.env.get('APP_URL') || 'https://schoolnet.bj',
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notification envoyée' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});