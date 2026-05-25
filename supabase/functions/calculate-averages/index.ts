import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface CalculateRequest {
  eleve_id: string;
  classe_id: string;
  periode: string;
  annee_scolaire_id: string;
}

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

    const { eleve_id, classe_id, periode, annee_scolaire_id }: CalculateRequest = await req.json();

    // Get all notes for the student in this period
    const { data: notes, error: notesError } = await supabaseClient
      .from('notes')
      .select(`
        *,
        devoirs:devoir_id (
          matiere_id,
          coefficient,
          note_sur,
          matieres:matiere_id (
            nom,
            coefficient
          )
        )
      `)
      .eq('eleve_id', eleve_id);

    if (notesError) {
      throw notesError;
    }

    if (!notes || notes.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No notes found for this student',
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    // Calculate averages by subject
    const matiereStats = new Map();

    notes.forEach((note: any) => {
      const matiere = note.devoirs.matieres;
      const devoir = note.devoirs;
      const matiereId = devoir.matiere_id;

      if (!matiereStats.has(matiereId)) {
        matiereStats.set(matiereId, {
          nom: matiere.nom,
          coefficient: matiere.coefficient,
          notes: [],
          total_points: 0,
          total_sur: 0,
        });
      }

      const stats = matiereStats.get(matiereId);
      const noteNormalisee = (note.note / devoir.note_sur) * 20;
      stats.notes.push(noteNormalisee * devoir.coefficient);
      stats.total_points += noteNormalisee * devoir.coefficient;
      stats.total_sur += 20 * devoir.coefficient;
    });

    // Calculate general average
    let totalPoints = 0;
    let totalCoefficients = 0;
    const moyennesParMatiere: any[] = [];

    matiereStats.forEach((stats, matiereId) => {
      const moyenne = stats.total_sur > 0 ? (stats.total_points / stats.total_sur) * 20 : 0;
      moyennesParMatiere.push({
        matiere_id: matiereId,
        matiere_nom: stats.nom,
        moyenne: Number(moyenne.toFixed(2)),
        coefficient: stats.coefficient,
      });

      totalPoints += moyenne * stats.coefficient;
      totalCoefficients += stats.coefficient;
    });

    const moyenneGenerale =
      totalCoefficients > 0 ? Number((totalPoints / totalCoefficients).toFixed(2)) : 0;

    return new Response(
      JSON.stringify({
        success: true,
        eleve_id,
        periode,
        moyenne_generale: moyenneGenerale,
        moyennes_par_matiere: moyennesParMatiere,
        total_coefficients: totalCoefficients,
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
