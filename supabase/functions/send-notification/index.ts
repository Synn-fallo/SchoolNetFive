import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface NotificationRequest {
  user_ids: string[];
  titre: string;
  contenu: string;
  type: string;
  data?: any;
  etablissement_id?: string;
  template?: 'note_saisie' | 'note_seuil' | 'bulletin_disponible' | 'devoir_rapproche';
}

// Templates de notifications pour les notes
const NOTE_TEMPLATES = {
  note_saisie: (data: { eleve_nom: string; matiere: string; note: number; note_sur: number }) => ({
    titre: `📝 Nouvelle note pour ${data.eleve_nom}`,
    contenu: `${data.eleve_nom} a obtenu ${data.note}/${data.note_sur} en ${data.matiere}.`,
  }),
  note_seuil_bas: (data: { eleve_nom: string; matiere: string; note: number; seuil: number }) => ({
    titre: `⚠️ Alerte note faible - ${data.eleve_nom}`,
    contenu: `${data.eleve_nom} a obtenu ${data.note}/20 en ${data.matiere} (inférieur au seuil de ${data.seuil}/20).`,
  }),
  note_seuil_haut: (data: { eleve_nom: string; matiere: string; note: number; seuil: number }) => ({
    titre: `🎉 Félicitations - ${data.eleve_nom}`,
    contenu: `${data.eleve_nom} a obtenu ${data.note}/20 en ${data.matiere} (supérieur au seuil de ${data.seuil}/20). Bravo !`,
  }),
  bulletin_disponible: (data: { eleve_nom: string; periode: string }) => ({
    titre: `📄 Bulletin disponible`,
    contenu: `Le bulletin du ${data.periode} pour ${data.eleve_nom} est disponible.`,
  }),
  devoir_rapproche: (data: { eleve_nom: string; devoir_titre: string; date: string }) => ({
    titre: `📚 Devoir approchant`,
    contenu: `${data.eleve_nom} a un devoir "${data.devoir_titre}" prévu le ${new Date(data.date).toLocaleDateString('fr-FR')}.`,
  }),
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { user_ids, titre, contenu, type, data, etablissement_id, template }: NotificationRequest =
      await req.json();

    if (!user_ids || user_ids.length === 0) {
      throw new Error('No user_ids provided');
    }

    let finalTitre = titre;
    let finalContenu = contenu;

    // Utiliser un template si fourni
    if (template && NOTE_TEMPLATES[template] && data) {
      const templateResult = NOTE_TEMPLATES[template](data);
      finalTitre = templateResult.titre;
      finalContenu = templateResult.contenu;
    }

    // Récupérer les emails des utilisateurs pour les notifications email
    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('id, email, telephone')
      .in('id', user_ids);

    const emailMap = new Map(profiles?.map(p => [p.id, p.email]) || []);
    const phoneMap = new Map(profiles?.map(p => [p.id, p.telephone]) || []);

    // Créer les notifications in-app
    const notifications = user_ids.map((user_id) => ({
      user_id,
      etablissement_id,
      titre: finalTitre,
      contenu: finalContenu,
      type: type || 'note',
      data: { ...(data || {}), template },
    }));

    const { data: createdNotifications, error: notificationError } = await supabaseClient
      .from('notifications')
      .insert(notifications)
      .select();

    if (notificationError) {
      throw notificationError;
    }

    // Envoyer des emails pour les notifications importantes (type 'note')
    if (type === 'note' || template === 'note_seuil_bas' || template === 'note_saisie') {
      for (const user_id of user_ids) {
        const email = emailMap.get(user_id);
        if (email) {
          // Appeler la fonction send-email (à créer si besoin)
          // Pour le MVP, on se contente des notifications in-app
          console.log(`[Email] Notification pour ${email}: ${finalTitre}`);
        }
      }
    }

    // Envoyer des SMS pour les alertes seuil bas
    if (template === 'note_seuil_bas') {
      for (const user_id of user_ids) {
        const phone = phoneMap.get(user_id);
        if (phone) {
          // Appeler la fonction send-sms (à créer si besoin)
          console.log(`[SMS] Notification pour ${phone}: ${finalContenu}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        count: createdNotifications.length,
        notifications: createdNotifications,
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});