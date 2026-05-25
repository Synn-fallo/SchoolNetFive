/**
 * Edge Function: generate-bulletin
 * 
 * Génère un bulletin PDF pour un élève sur une période donnée
 * Utilise la bibliothèque PDFMake (via Deno)
 * 
 * Endpoint: POST /functions/v1/generate-bulletin
 * Body: { eleve_id: string, periode: string, annee_scolaire_id: string }
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface GenerateBulletinRequest {
  eleve_id: string;
  periode: string; // 'T1', 'T2', 'T3', 'SEM1', 'SEM2', 'ANNEE'
  annee_scolaire_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { eleve_id, periode, annee_scolaire_id }: GenerateBulletinRequest = await req.json();

    if (!eleve_id || !periode || !annee_scolaire_id) {
      throw new Error('Missing required fields: eleve_id, periode, annee_scolaire_id');
    }

    // 1. Récupérer les informations de l'élève
    const { data: eleve, error: eleveError } = await supabaseAdmin
      .from('eleves')
      .select(`
        *,
        classe:classe_id(*),
        user:user_id(*),
        etablissement:etablissement_id(*)
      `)
      .eq('id', eleve_id)
      .single();

    if (eleveError || !eleve) {
      throw new Error('Élève non trouvé');
    }

    // 2. Récupérer les notes pour la période
    // Déterminer les dates selon la période
    const { data: anneeScolaire } = await supabaseAdmin
      .from('annees_scolaires')
      .select('*')
      .eq('id', annee_scolaire_id)
      .single();

    if (!anneeScolaire) {
      throw new Error('Année scolaire non trouvée');
    }

    // Calculer les dates de début/fin selon la période
    let dateDebut: Date;
    let dateFin: Date;
    const anneeStart = new Date(anneeScolaire.date_debut);
    const anneeEnd = new Date(anneeScolaire.date_fin);

    switch (periode) {
      case 'T1':
        dateDebut = anneeStart;
        dateFin = new Date(anneeStart);
        dateFin.setMonth(anneeStart.getMonth() + 3);
        break;
      case 'T2':
        dateDebut = new Date(anneeStart);
        dateDebut.setMonth(anneeStart.getMonth() + 3);
        dateFin = new Date(anneeStart);
        dateFin.setMonth(anneeStart.getMonth() + 6);
        break;
      case 'T3':
        dateDebut = new Date(anneeStart);
        dateDebut.setMonth(anneeStart.getMonth() + 6);
        dateFin = anneeEnd;
        break;
      default:
        dateDebut = anneeStart;
        dateFin = anneeEnd;
    }

    // Récupérer les notes
    const { data: notes, error: notesError } = await supabaseAdmin
      .from('notes')
      .select(`
        *,
        devoir:devoir_id(
          *,
          matiere:matiere_id(nom, coefficient)
        )
      `)
      .eq('eleve_id', eleve_id)
      .gte('created_at', dateDebut.toISOString())
      .lte('created_at', dateFin.toISOString());

    if (notesError) throw notesError;

    // 3. Calculer les moyennes par matière
    const matieresMap = new Map<string, { notes: number[]; coeff: number; nom: string }>();

    for (const note of notes || []) {
      const matiere = note.devoir?.matiere;
      if (!matiere) continue;

      if (!matieresMap.has(matiere.nom)) {
        matieresMap.set(matiere.nom, {
          notes: [],
          coeff: matiere.coefficient || 1,
          nom: matiere.nom,
        });
      }
      matieresMap.get(matiere.nom)!.notes.push(note.note);
    }

    const matieresBulletin = Array.from(matieresMap.values()).map(m => ({
      nom: m.nom,
      moyenne: m.notes.reduce((a, b) => a + b, 0) / m.notes.length,
      coefficient: m.coeff,
    }));

    // Calculer la moyenne générale
    let sommeNotesPonderees = 0;
    let sommeCoeffs = 0;
    for (const m of matieresBulletin) {
      sommeNotesPonderees += m.moyenne * m.coefficient;
      sommeCoeffs += m.coefficient;
    }
    const moyenneGenerale = sommeCoeffs > 0 ? sommeNotesPonderees / sommeCoeffs : 0;

    // 4. Générer le PDF (simulation – à implémenter avec PDFMake)
    // Pour le MVP, on retourne les données structurées
    // L'implémentation réelle du PDF nécessite une bibliothèque comme PDFMake

    const bulletinData = {
      eleve: {
        nom: eleve.user?.nom || 'Élève',
        prenom: eleve.user?.prenom || '',
        matricule: eleve.matricule,
        classe: eleve.classe?.nom || 'Non assignée',
      },
      etablissement: {
        nom: eleve.etablissement?.nom || 'Établissement',
        logo: eleve.etablissement?.logo_url,
      },
      periode,
      annee_scolaire: anneeScolaire.libelle,
      date_emission: new Date().toISOString(),
      matieres: matieresBulletin,
      moyenne_generale: Math.round(moyenneGenerale * 100) / 100,
      appreciation: moyenneGenerale >= 16 ? 'Excellent' :
                     moyenneGenerale >= 14 ? 'Très bien' :
                     moyenneGenerale >= 12 ? 'Bien' :
                     moyenneGenerale >= 10 ? 'Passable' : 'Insuffisant',
      rang: 0, // À calculer avec une requête supplémentaire
      effectif: 0,
    };

    // 5. Enregistrer le bulletin en base
    const { data: bulletin, error: insertError } = await supabaseAdmin
      .from('bulletins')
      .insert({
        eleve_id,
        etablissement_id: eleve.etablissement_id,
        annee_scolaire_id,
        classe_id: eleve.classe_id,
        periode,
        moyenne_generale: bulletinData.moyenne_generale,
        appreciation_generale: bulletinData.appreciation,
        bulletin_url: null, // À remplir après génération PDF
        is_published: false,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 6. Envoyer notification aux parents
    try {
      const { data: parents } = await supabaseAdmin
        .from('parent_eleve')
        .select('parent_id')
        .eq('eleve_id', eleve_id);

      if (parents && parents.length > 0) {
        // Récupérer le nom de l'élève
        let enfantNom = '';
        if (eleve.user_id) {
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('nom, prenom')
            .eq('id', eleve.user_id)
            .single();
          if (profile) enfantNom = `${profile.prenom} ${profile.nom}`;
        }

        // Formater la période pour l'affichage
        const periodeLabel = periode === 'T1' ? '1er Trimestre' :
                             periode === 'T2' ? '2ème Trimestre' :
                             periode === 'T3' ? '3ème Trimestre' :
                             periode === 'SEM1' ? '1er Semestre' :
                             periode === 'SEM2' ? '2ème Semestre' : 'Année complète';

        for (const parent of parents) {
          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/notifications-parent`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            },
            body: JSON.stringify({
              parent_id: parent.parent_id,
              type: 'BULLETIN_DISPONIBLE',
              data: {
                enfantNom,
                periode: periodeLabel,
                moyenneGenerale: bulletinData.moyenne_generale,
                bulletin_url: null, // À remplir après génération PDF
              },
              canal: 'BOTH',
            }),
          });
          console.log(`✅ Notification de bulletin envoyée au parent ${parent.parent_id}`);
        }
      }
    } catch (notifError) {
      console.error('Erreur envoi notification bulletin:', notifError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        bulletin: bulletinData,
        bulletin_id: bulletin.id,
        message: 'Bulletin généré avec succès',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error generating bulletin:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});