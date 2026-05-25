import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// Types de relance
type ReminderType = 'J7' | 'J30' | 'J60';

// Configuration des délais et messages
const REMINDER_CONFIG: Record<ReminderType, { days: number; message: string; sms?: string }> = {
  J7: {
    days: 7,
    message: `⏳ Votre site attend d'être officialisé. Des parents recherchent déjà votre école dans l'annuaire ! Passez à l'abonnement Essentiel pour être visible.`,
    sms: `SchoolNet: Votre site est en construction depuis 7 jours. Activez-le pour être visible par les parents.`,
  },
  J30: {
    days: 30,
    message: `⚠️ Votre établissement est en Phase 2 depuis 30 jours sans abonnement actif. Votre annuaire affiche toujours le badge "En configuration". Souscrivez maintenant pour débloquer la visibilité complète.`,
    sms: `SchoolNet: 30 jours sans activation. Votre établissement n'est pas visible publiquement. Souscrivez dès maintenant.`,
  },
  J60: {
    days: 60,
    message: `🔴 Action urgente : Votre établissement est en Phase 2 depuis 60 jours. Sans souscription dans les 30 prochains jours, votre fiche annuaire sera désactivée temporairement. Contactez-nous pour toute question.`,
    sms: `SchoolNet: Dernier avertissement. Souscrivez dans les 30 jours ou votre fiche annuaire sera désactivée.`,
  },
};

// Fonction pour vérifier si un établissement a un abonnement actif
async function hasActiveSubscription(supabaseAdmin: any, etablissementId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('abonnements')
    .select('id, date_fin')
    .eq('etablissement_id', etablissementId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error(`Error checking subscription for ${etablissementId}:`, error);
    return false;
  }

  if (!data) return false;

  // Vérifier si l'abonnement n'est pas expiré
  if (data.date_fin && new Date(data.date_fin) < new Date()) {
    return false;
  }

  return true;
}

// Fonction pour enregistrer la relance dans la table relances
async function logReminder(
  supabaseAdmin: any,
  etablissementId: string,
  userId: string,
  type: ReminderType,
  message: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('relances')
    .insert({
      etablissement_id: etablissementId,
      user_id: userId,
      type: `phase2_${type.toLowerCase()}`,
      date_envoi: new Date().toISOString(),
      statut: 'envoye',
      message: message,
      metadata: { reminder_type: type, days: REMINDER_CONFIG[type].days },
    });

  if (error) {
    console.error(`Error logging reminder for ${etablissementId}:`, error);
  }
}

// Fonction pour envoyer une notification à un utilisateur
async function sendNotification(
  supabaseAdmin: any,
  userId: string,
  etablissementId: string,
  etablissementNom: string,
  type: ReminderType
): Promise<void> {
  const config = REMINDER_CONFIG[type];
  const message = config.message.replace('{etablissement}', etablissementNom);

  // Récupérer les infos de l'utilisateur
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('email, telephone')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error(`Error fetching profile for ${userId}:`, profileError);
    return;
  }

  // 1. Créer une notification in-app
  const { error: notifError } = await supabaseAdmin
    .from('notifications')
    .insert({
      user_id: userId,
      etablissement_id: etablissementId,
      titre: `Rappel : Site en construction (J+${config.days})`,
      contenu: message,
      type: 'reminder',
      data: { etablissement_nom: etablissementNom, reminder_type: type },
    });

  if (notifError) {
    console.error(`Error creating notification for ${userId}:`, notifError);
  }

  // 2. Envoyer un email via la fonction send-notification
  if (profile?.email) {
    try {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({
          user_id: userId,
          email: profile.email,
          type: 'reminder',
          subject: `SchoolNet - Rappel J+${config.days} : ${etablissementNom}`,
          message: message,
          html: `<h2>Rappel : ${etablissementNom}</h2><p>${message}</p><p><a href="${Deno.env.get('SUPABASE_URL')}/preview/${etablissementId}">Voir mon site en construction</a></p><p><a href="${Deno.env.get('SUPABASE_URL')}/etablissement/abonnement">Souscrire maintenant</a></p>`,
        }),
      });
    } catch (emailError) {
      console.error(`Error sending email to ${profile.email}:`, emailError);
    }
  }

  // 3. Envoyer un SMS si numéro disponible
  if (profile?.telephone && config.sms) {
    try {
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({
          user_id: userId,
          phone: profile.telephone,
          type: 'sms',
          message: config.sms,
        }),
      });
    } catch (smsError) {
      console.error(`Error sending SMS to ${profile.telephone}:`, smsError);
    }
  }

  // 4. Enregistrer dans relances
  await logReminder(supabaseAdmin, etablissementId, userId, type, message);

  console.log(`✅ Reminder sent to ${userId} for ${etablissementNom} (${type})`);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Vérification du cron secret pour sécuriser l'appel
  const authHeader = req.headers.get('Authorization');
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔄 Starting send-reminders function');

    // Récupérer les établissements en Phase 2 (INFOS_MINIMALES_COMPLETE)
    // sans abonnement actif
    const { data: etablissements, error: etabError } = await supabaseAdmin
      .from('etablissements')
      .select('id, nom, created_at, user_roles!inner(user_id)')
      .eq('statut', 'INFOS_MINIMALES_COMPLETE')
      .eq('is_active', false);

    if (etabError) {
      throw new Error(`Error fetching establishments: ${etabError.message}`);
    }

    if (!etablissements || etablissements.length === 0) {
      console.log('No establishments in Phase 2 without subscription');
      return new Response(
        JSON.stringify({ success: true, message: 'No reminders to send' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📊 Found ${etablissements.length} establishments in Phase 2`);

    const now = new Date();
    const results = {
      total: etablissements.length,
      sent: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[],
    };

    for (const etab of etablissements) {
      try {
        // Vérifier si l'établissement a un abonnement actif
        const hasSubscription = await hasActiveSubscription(supabaseAdmin, etab.id);
        if (hasSubscription) {
          console.log(`⏭️ Establishment ${etab.id} has active subscription, skipping`);
          results.skipped++;
          continue;
        }

        // Récupérer le chef d'établissement (user_id)
        const chefRole = etab.user_roles?.find((r: any) => r.user_id);
        if (!chefRole?.user_id) {
          console.log(`⚠️ No chef found for establishment ${etab.id}, skipping`);
          results.skipped++;
          continue;
        }

        const userId = chefRole.user_id;
        const createdDate = new Date(etab.created_at);
        const daysSince = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

        // Déterminer le type de relance
        let reminderType: ReminderType | null = null;

        if (daysSince >= 60 && daysSince < 90) {
          reminderType = 'J60';
        } else if (daysSince >= 30 && daysSince < 60) {
          reminderType = 'J30';
        } else if (daysSince >= 7 && daysSince < 14) {
          reminderType = 'J7';
        }

        if (!reminderType) {
          console.log(`⏭️ Establishment ${etab.id} at day ${daysSince}, no reminder needed`);
          results.skipped++;
          continue;
        }

        // Vérifier si une relance de ce type a déjà été envoyée
        const { data: existingReminder, error: reminderError } = await supabaseAdmin
          .from('relances')
          .select('id')
          .eq('etablissement_id', etab.id)
          .eq('user_id', userId)
          .eq('type', `phase2_${reminderType.toLowerCase()}`)
          .maybeSingle();

        if (reminderError) {
          console.error(`Error checking existing reminder:`, reminderError);
        }

        if (existingReminder) {
          console.log(`⏭️ Reminder ${reminderType} already sent for ${etab.id}`);
          results.skipped++;
          continue;
        }

        // Envoyer la relance
        await sendNotification(
          supabaseAdmin,
          userId,
          etab.id,
          etab.nom,
          reminderType
        );

        results.sent++;
        results.details.push({
          etablissement_id: etab.id,
          etablissement_nom: etab.nom,
          days_since: daysSince,
          reminder_type: reminderType,
        });

        console.log(`✅ Reminder ${reminderType} sent for ${etab.nom} (day ${daysSince})`);
      } catch (error) {
        console.error(`Error processing establishment ${etab.id}:`, error);
        results.errors++;
        results.details.push({
          etablissement_id: etab.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log(`📊 Summary: sent=${results.sent}, skipped=${results.skipped}, errors=${results.errors}`);

    return new Response(
      JSON.stringify({ success: true, results }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in send-reminders:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});