// lib/emailTemplates/invitationParent.ts
// Template HTML pour l'email d'invitation parent

export const invitationParentTemplate = (data: {
  nom: string;
  prenom: string;
  email_snet: string;
  mot_de_passe_temp: string;
  code_invitation?: string;
  etablissement_nom?: string | null;
  eleve_nom?: string | null;
  login_url: string;
}): string => {
  const eleveInfo = data.eleve_nom 
    ? `<p style="margin: 0 0 16px 0;">L'établissement <strong>${data.etablissement_nom || 'votre école'}</strong> a créé un compte pour votre enfant <strong>${data.eleve_nom}</strong>.</p>`
    : `<p style="margin: 0 0 16px 0;">Un établissement scolaire vous a inscrit comme parent sur SchoolNet.</p>`;

  const codeInfo = data.code_invitation
    ? `<p style="margin: 16px 0 0 0; padding: 12px; background-color: #FEF3C7; border-radius: 8px;">
         <strong>🔑 Code d'invitation :</strong> ${data.code_invitation}<br/>
         <span style="font-size: 12px; color: #6B7280;">Ce code expirera dans 7 jours.</span>
       </p>`
    : '';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SchoolNet - Invitation parent</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #F9FAFB;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #FFFFFF;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      padding: 20px 0;
      border-bottom: 2px solid #2563EB;
    }
    .header h1 {
      color: #2563EB;
      margin: 0;
      font-size: 28px;
    }
    .content {
      padding: 24px 20px;
    }
    .credentials {
      background-color: #EFF6FF;
      padding: 16px;
      border-radius: 8px;
      margin: 16px 0;
    }
    .credentials p {
      margin: 8px 0;
    }
    .credentials strong {
      color: #2563EB;
    }
    .button {
      display: inline-block;
      background-color: #2563EB;
      color: #FFFFFF;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      margin: 16px 0;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      padding: 16px;
      font-size: 12px;
      color: #6B7280;
      border-top: 1px solid #E5E7EB;
    }
    .warning {
      background-color: #FEF2F2;
      padding: 12px;
      border-radius: 8px;
      margin: 16px 0;
      font-size: 13px;
      color: #991B1B;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SchoolNet</h1>
      <p style="color: #6B7280; margin: 4px 0 0;">Plateforme Éducative</p>
    </div>
    <div class="content">
      <h2>Bonjour ${data.prenom} ${data.nom},</h2>
      
      ${eleveInfo}
      
      <p style="margin: 0 0 16px 0;">Voici vos identifiants de connexion pour accéder à votre espace parent :</p>
      
      <div class="credentials">
        <p><strong>📧 Identifiant :</strong> ${data.email_snet}</p>
        <p><strong>🔒 Mot de passe temporaire :</strong> ${data.mot_de_passe_temp}</p>
      </div>
      
      <div class="warning">
        ⚠️ <strong>Important :</strong> Pour des raisons de sécurité, vous devrez changer votre mot de passe lors de votre première connexion.
      </div>
      
      ${codeInfo}
      
      <div style="text-align: center;">
        <a href="${data.login_url}" class="button">Se connecter à SchoolNet</a>
      </div>
      
      <p style="margin: 16px 0 0 0; font-size: 13px; color: #6B7280;">
        Une fois connecté, vous pourrez :<br/>
        • Suivre les notes et absences de votre enfant<br/>
        • Consulter ses bulletins et emploi du temps<br/>
        • Communiquer avec ses enseignants<br/>
        • Autoriser les sorties et événements
      </p>
    </div>
    <div class="footer">
      <p>SchoolNet - La plateforme éducative au service de la réussite</p>
      <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>
  `;
};

export const bienvenueParentTemplate = (data: {
  nom: string;
  prenom: string;
  login_url: string;
}): string => {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SchoolNet - Bienvenue !</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #F9FAFB;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #FFFFFF;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      padding: 20px 0;
      border-bottom: 2px solid #10B981;
    }
    .header h1 {
      color: #10B981;
      margin: 0;
      font-size: 28px;
    }
    .content {
      padding: 24px 20px;
      text-align: center;
    }
    .button {
      display: inline-block;
      background-color: #10B981;
      color: #FFFFFF;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      margin: 16px 0;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      padding: 16px;
      font-size: 12px;
      color: #6B7280;
      border-top: 1px solid #E5E7EB;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>SchoolNet</h1>
      <p style="color: #6B7280; margin: 4px 0 0;">Plateforme Éducative</p>
    </div>
    <div class="content">
      <h2>Bienvenue ${data.prenom} ${data.nom} !</h2>
      
      <p>Votre compte parent a été activé avec succès.</p>
      
      <p>Vous pouvez dès maintenant accéder à votre espace pour suivre la scolarité de votre enfant.</p>
      
      <a href="${data.login_url}" class="button">Accéder à mon espace</a>
      
      <p style="margin: 16px 0 0 0; font-size: 13px; color: #6B7280;">
        N'hésitez pas à contacter l'établissement scolaire si vous avez des questions.
      </p>
    </div>
    <div class="footer">
      <p>SchoolNet - La plateforme éducative au service de la réussite</p>
    </div>
  </div>
</body>
</html>
  `;
};