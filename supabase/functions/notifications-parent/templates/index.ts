// Templates email pour les notifications parent
// Utilisés par l'Edge Function notifications-parent

export const templates = {
  // Template de base
  base: (content: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>SchoolNet</title></head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #F9FAFB;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 24px;">
    <div style="text-align: center; border-bottom: 2px solid #2563EB; padding-bottom: 16px;">
      <h1 style="color: #2563EB; margin: 0;">SchoolNet</h1>
      <p style="color: #6B7280; margin: 4px 0 0;">Plateforme Éducative</p>
    </div>
    <div style="padding: 20px 0;">
      ${content}
    </div>
    <div style="text-align: center; padding-top: 16px; border-top: 1px solid #E5E7EB; font-size: 12px; color: #9CA3AF;">
      <p>SchoolNet - La plateforme éducative au service de la réussite</p>
      <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
    </div>
  </div>
</body>
</html>
  `,

  // Template invitation parent
  invitation: (data: any) => `
    <h2>Bonjour ${data.prenom} ${data.nom},</h2>
    <p>Un compte parent a été créé pour vous sur SchoolNet.</p>
    <div style="background-color: #EFF6FF; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <p><strong>📧 Identifiant :</strong> ${data.email_snet}</p>
      <p><strong>🔒 Mot de passe temporaire :</strong> ${data.mot_de_passe_temp}</p>
    </div>
    <p>⚠️ Vous devrez changer votre mot de passe lors de votre première connexion.</p>
    <a href="${data.login_url}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Se connecter</a>
  `,

  // Template nouvelle note
  nouvelleNote: (data: any) => `
    <h2>Nouvelle note publiée</h2>
    <p>Bonjour,</p>
    <p>Une nouvelle note a été publiée pour votre enfant <strong>${data.enfantNom}</strong>.</p>
    <p><strong>📖 Matière :</strong> ${data.matiere}</p>
    <p><strong>📝 Note :</strong> ${data.note}/${data.noteSur}</p>
    ${data.appreciation ? `<p><strong>💬 Appréciation :</strong> ${data.appreciation}</p>` : ''}
    <a href="${data.login_url}/parent/notes?enfantId=${data.enfantId}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Voir les détails</a>
  `,

  // Template absence signalée
  absence: (data: any) => `
    <h2>Absence signalée</h2>
    <p>Bonjour,</p>
    <p>Une absence a été signalée pour votre enfant <strong>${data.enfantNom}</strong>.</p>
    <p><strong>📅 Date :</strong> ${data.date}</p>
    ${data.motif ? `<p><strong>📝 Motif :</strong> ${data.motif}</p>` : ''}
    <a href="${data.login_url}/parent/absences?enfantId=${data.enfantId}" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Justifier l'absence</a>
  `,

  // Template bulletin disponible
  bulletin: (data: any) => `
    <h2>Bulletin disponible</h2>
    <p>Bonjour,</p>
    <p>Le bulletin de la période <strong>${data.periode}</strong> est disponible pour votre enfant <strong>${data.enfantNom}</strong>.</p>
    <p><strong>📊 Moyenne générale :</strong> ${data.moyenneGenerale}/20</p>
    <a href="${data.bulletin_url}" style="background-color: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Télécharger le bulletin</a>
  `,

  // Template message reçu
  message: (data: any) => `
    <h2>Nouveau message</h2>
    <p>Bonjour,</p>
    <p>Vous avez reçu un nouveau message de <strong>${data.enseignantNom}</strong> concernant votre enfant <strong>${data.enfantNom}</strong>.</p>
    <p><strong>💬 Message :</strong> "${data.message.substring(0, 100)}${data.message.length > 100 ? '...' : ''}"</p>
    <a href="${data.login_url}/parent/messages" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Lire le message</a>
  `,

  // Template rendez-vous confirmé
  rendezVous: (data: any) => `
    <h2>Rendez-vous confirmé</h2>
    <p>Bonjour,</p>
    <p>Votre rendez-vous avec <strong>${data.enseignantNom}</strong> a été confirmé.</p>
    <p><strong>📅 Date :</strong> ${data.date}</p>
    <p><strong>⏰ Heure :</strong> ${data.heure}</p>
    <p><strong>📝 Motif :</strong> ${data.motif}</p>
    <a href="${data.login_url}/parent/rendez-vous" style="background-color: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">Voir mes rendez-vous</a>
  `,
};