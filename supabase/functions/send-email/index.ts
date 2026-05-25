// supabase/functions/send-email/index.ts
// Edge Function pour l'envoi d'emails
// ⚠️ Déployer avec JWT verification

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  // 'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Headers': 'content-type, authorization, apikey, x-client-info, x-application-name',
};

// Templates email (à stocker dans un fichier séparé en production)
const templates: Record<string, (data: any) => string> = {
  'invitation-parent': (data) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>SchoolNet - Invitation parent</title></head>
<body style="font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #2563EB;">SchoolNet</h1>
    <h2>Bonjour ${data.prenom} ${data.nom},</h2>
    <p>Un compte parent a été créé pour vous.</p>
    <div style="background-color: #EFF6FF; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <p><strong>Identifiant :</strong> ${data.email_snet}</p>
      <p><strong>Mot de passe temporaire :</strong> ${data.mot_de_passe_temp}</p>
    </div>
    <p><strong>⚠️ Important :</strong> Vous devrez changer votre mot de passe lors de votre première connexion.</p>
    <a href="${data.login_url}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Se connecter</a>
    <hr style="margin: 32px 0 16px;" />
    <p style="font-size: 12px; color: #6B7280;">SchoolNet - Plateforme Éducative</p>
  </div>
</body>
</html>
  `,
  'bienvenue-parent': (data) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>SchoolNet - Bienvenue !</title></head>
<body style="font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #10B981;">SchoolNet</h1>
    <h2>Bienvenue ${data.prenom} ${data.nom} !</h2>
    <p>Votre compte parent a été activé avec succès.</p>
    <a href="${data.login_url}" style="background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Accéder à mon espace</a>
    <hr style="margin: 32px 0 16px;" />
    <p style="font-size: 12px; color: #6B7280;">SchoolNet - Plateforme Éducative</p>
  </div>
</body>
</html>
  `,
};

Deno.serve(async (req: Request) => {
  // Gestion CORS
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
      return new Response(
        JSON.stringify({ error: 'Utilisateur non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { to, subject, template, data } = body;

    if (!to || !subject || !template) {
      return new Response(
        JSON.stringify({ error: 'Paramètres manquants: to, subject, template' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const templateFn = templates[template];
    if (!templateFn) {
      return new Response(
        JSON.stringify({ error: `Template non trouvé: ${template}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const htmlContent = templateFn(data || {});

    // Configuration SMTP (à remplacer par vos identifiants)
    // Pour l'instant, on log et on simule un succès
    console.log(`📧 Envoi d'email à ${to}`);
    console.log(`   Sujet: ${subject}`);
    console.log(`   Template: ${template}`);

    // TODO: Intégrer un vrai service d'envoi d'emails (Resend, SendGrid, SMTP)
    // Exemple avec Resend:
    /*
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const { error: resendError } = await resend.emails.send({
      from: 'SchoolNet <noreply@schoolnet.bj>',
      to: [to],
      subject: subject,
      html: htmlContent,
    });
    if (resendError) throw resendError;
    */

    return new Response(
      JSON.stringify({ success: true, message: 'Email envoyé avec succès' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});