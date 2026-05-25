import { supabase } from './supabase';

export type NotificationType = 
  | 'demande_envoyee'
  | 'demande_examen'
  | 'demande_validee'
  | 'demande_rejetee';

export type NotificationData = {
  type: NotificationType;
  userId: string;
  demandeId: string;
  role: string;
  motif?: string;
  commentaire?: string;
};

export type EmailData = {
  to: string;
  subject: string;
  html: string;
};

/**
 * Envoi d'une notification in-app (stockée en base)
 */
export async function sendInAppNotification(
  userId: string,
  title: string,
  message: string,
  metadata?: Record<string, any>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        titre: title,
        message: message,
        type: 'demande_role',
        metadata: metadata || {},
        is_read: false,
        created_at: new Date().toISOString(),
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error sending in-app notification:', error);
    return false;
  }
}

/**
 * Récupérer les notifications non lues d'un utilisateur
 */
export async function getUnreadNotifications(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    return [];
  }
}

/**
 * Marquer une notification comme lue
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

/**
 * Marquer toutes les notifications d'un utilisateur comme lues
 */
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
}

/**
 * Générer le contenu HTML des emails
 */
function generateEmailContent(type: NotificationType, data: {
  role: string;
  userName: string;
  motif?: string;
  commentaire?: string;
}): { subject: string; html: string } {
  const roleLabel = getRoleLabel(data.role);
  const appUrl = process.env.EXPO_PUBLIC_APP_URL || 'https://schoolnet.bj';

  switch (type) {
    case 'demande_envoyee':
      return {
        subject: `[SchoolNet] Demande de rôle ${roleLabel} - Accusé de réception`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #2563EB; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; }
              .button { display: inline-block; background-color: #2563EB; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
              .footer { font-size: 12px; color: #6b7280; text-align: center; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>SchoolNet</h1>
            </div>
            <div class="content">
              <h2>Bonjour ${data.userName},</h2>
              <p>Nous accusons bonne réception de votre demande de rôle <strong>${roleLabel}</strong>.</p>
              <p>Votre demande a bien été enregistrée et sera examinée par notre équipe administrative dans les plus brefs délais.</p>
              <p>Vous recevrez une notification dès que votre dossier sera traité.</p>
              <a href="${appUrl}/profile" class="button">Suivre ma demande</a>
            </div>
            <div class="footer">
              <p>SchoolNet - La plateforme éducative de référence</p>
            </div>
          </body>
          </html>
        `,
      };

    case 'demande_examen':
      return {
        subject: `[SchoolNet] Demande de rôle ${roleLabel} - En cours d'examen`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #F59E0B; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; }
              .button { display: inline-block; background-color: #2563EB; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
              .footer { font-size: 12px; color: #6b7280; text-align: center; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>SchoolNet</h1>
            </div>
            <div class="content">
              <h2>Bonjour ${data.userName},</h2>
              <p>Nous vous informons que votre demande de rôle <strong>${roleLabel}</strong> est actuellement <strong>en cours d'examen</strong> par notre équipe administrative.</p>
              <p>Nous reviendrons vers vous dès qu'une décision sera prise.</p>
              <a href="${appUrl}/profile" class="button">Suivre ma demande</a>
            </div>
            <div class="footer">
              <p>SchoolNet - La plateforme éducative de référence</p>
            </div>
          </body>
          </html>
        `,
      };

    case 'demande_validee':
      return {
        subject: `[SchoolNet] Demande de rôle ${roleLabel} - Félicitations !`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; }
              .button { display: inline-block; background-color: #2563EB; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
              .footer { font-size: 12px; color: #6b7280; text-align: center; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>SchoolNet</h1>
            </div>
            <div class="content">
              <h2>Bonjour ${data.userName},</h2>
              <p>Nous avons le plaisir de vous annoncer que votre demande de rôle <strong>${roleLabel}</strong> a été <strong>validée</strong> !</p>
              <p>Vous avez désormais accès à toutes les fonctionnalités associées à ce rôle.</p>
              <p>Connectez-vous à votre espace pour découvrir votre nouveau tableau de bord.</p>
              <a href="${appUrl}/app" class="button">Accéder à mon espace</a>
            </div>
            <div class="footer">
              <p>SchoolNet - La plateforme éducative de référence</p>
            </div>
          </body>
          </html>
        `,
      };

    case 'demande_rejetee':
      return {
        subject: `[SchoolNet] Demande de rôle ${roleLabel} - Décision`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #EF4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; }
              .button { display: inline-block; background-color: #2563EB; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
              .footer { font-size: 12px; color: #6b7280; text-align: center; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>SchoolNet</h1>
            </div>
            <div class="content">
              <h2>Bonjour ${data.userName},</h2>
              <p>Nous avons examiné votre demande de rôle <strong>${roleLabel}</strong>.</p>
              <p>Nous vous informons que votre demande n'a pas pu être acceptée pour le moment.</p>
              ${data.motif ? `<p><strong>Motif :</strong> ${data.motif}</p>` : ''}
              <p>Vous pouvez soumettre une nouvelle demande en apportant les informations complémentaires nécessaires.</p>
              <a href="${appUrl}/profile" class="button">Faire une nouvelle demande</a>
            </div>
            <div class="footer">
              <p>SchoolNet - La plateforme éducative de référence</p>
            </div>
          </body>
          </html>
        `,
      };

    default:
      return {
        subject: `[SchoolNet] Mise à jour de votre demande`,
        html: `<p>Bonjour ${data.userName}, une mise à jour concernant votre demande de rôle ${roleLabel} est disponible.</p>`,
      };
  }
}

/**
 * Envoi d'un email via l'Edge Function
 */
export async function sendEmail(emailData: EmailData): Promise<boolean> {
  try {
    // Appeler l'Edge Function pour l'envoi d'email
    const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-demand-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Notification complète (email + in-app) pour l'évolution d'une demande
 */
export async function sendDemandeNotification(
  type: NotificationType,
  userId: string,
  userName: string,
  userEmail: string,
  role: string,
  options?: { motif?: string; commentaire?: string; demandeId?: string }
): Promise<void> {
  let title = '';
  let message = '';

  switch (type) {
    case 'demande_envoyee':
      title = 'Demande envoyée';
      message = `Votre demande de rôle ${getRoleLabel(role)} a bien été enregistrée.`;
      break;
    case 'demande_examen':
      title = 'Demande en cours d\'examen';
      message = `Votre demande de rôle ${getRoleLabel(role)} est en cours d'examen.`;
      break;
    case 'demande_validee':
      title = 'Demande validée !';
      message = `Félicitations ! Votre demande de rôle ${getRoleLabel(role)} a été validée.`;
      break;
    case 'demande_rejetee':
      title = 'Demande rejetée';
      message = `Votre demande de rôle ${getRoleLabel(role)} n'a pas pu être acceptée. ${options?.motif ? `Motif : ${options.motif}` : ''}`;
      break;
  }

  // Envoi de la notification in-app
  await sendInAppNotification(userId, title, message, {
    type,
    role,
    demandeId: options?.demandeId,
    motif: options?.motif,
  });

  // Envoi de l'email
  const emailContent = generateEmailContent(type, {
    role,
    userName,
    motif: options?.motif,
    commentaire: options?.commentaire,
  });

  await sendEmail({
    to: userEmail,
    subject: emailContent.subject,
    html: emailContent.html,
  });
}

/**
 * Libellé du rôle
 */
function getRoleLabel(role: string): string {
  switch (role) {
    case 'eleve': return 'Élève';
    case 'parent': return 'Parent';
    case 'enseignant': return 'Enseignant';
    case 'chef_etablissement': return 'Chef d\'établissement';
    case 'autorite': return 'Autorité';
    case 'partenaire': return 'Partenaire';
    default: return role;
  }
}