import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface RendezVous {
  id: string;
  parent_id: string;
  enseignant_id: string;
  enseignant_nom: string;
  enseignant_prenom: string;
  eleve_id: string;
  eleve_nom: string;
  eleve_prenom: string;
  date_rdv: string;
  heure_debut: string;
  heure_fin: string;
  motif: string;
  statut: 'en_attente' | 'confirme' | 'refuse' | 'annule' | 'termine';
  motif_refus?: string;
  lieu: string;
  created_at: string;
}

export interface EnseignantDisponible {
  id: string;
  nom: string;
  prenom: string;
  matieres: string[];
}

export function useRendezVous() {
  const { user } = useAuth();
  const [rendezVous, setRendezVous] = useState<RendezVous[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Récupérer les rendez-vous du parent connecté
  const chargerRendezVous = useCallback(async () => {
    if (!user) {
      setRendezVous([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Récupérer le parent
      const { data: parent, error: parentError } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (parentError || !parent) {
        setRendezVous([]);
        setLoading(false);
        return;
      }

      // Récupérer les rendez-vous avec les infos des enseignants et élèves
      const { data, error: rdvError } = await supabase
        .from('rendez_vous')
        .select(`
          *,
          enseignant:enseignant_id (nom, prenom),
          eleve:eleve_id (user_id)
        `)
        .eq('parent_id', parent.id)
        .order('date_rdv', { ascending: false });

      if (rdvError) throw rdvError;

      // Récupérer les noms/prénoms des élèves depuis profiles
      const formatted: RendezVous[] = [];
      
      for (const rdv of data || []) {
        const enseignant = rdv.enseignant as any;
        let eleveNom = '', elevePrenom = '';
        
        if (rdv.eleve?.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('nom, prenom')
            .eq('id', rdv.eleve.user_id)
            .maybeSingle();
          
          if (profile) {
            eleveNom = profile.nom;
            elevePrenom = profile.prenom;
          }
        }

        formatted.push({
          id: rdv.id,
          parent_id: rdv.parent_id,
          enseignant_id: rdv.enseignant_id,
          enseignant_nom: enseignant?.nom || '',
          enseignant_prenom: enseignant?.prenom || '',
          eleve_id: rdv.eleve_id,
          eleve_nom: eleveNom,
          eleve_prenom: elevePrenom,
          date_rdv: rdv.date_rdv,
          heure_debut: rdv.heure_debut,
          heure_fin: rdv.heure_fin,
          motif: rdv.motif,
          statut: rdv.statut,
          motif_refus: rdv.motif_refus,
          lieu: rdv.lieu,
          created_at: rdv.created_at,
        });
      }

      setRendezVous(formatted);
    } catch (err) {
      console.error('Erreur chargement rendez-vous:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Récupérer les enseignants disponibles pour un élève
  const getEnseignantsForEleve = useCallback(async (eleveId: string): Promise<EnseignantDisponible[]> => {
    if (!eleveId) return [];

    try {
      // Récupérer la classe de l'élève
      const { data: eleve, error: eleveError } = await supabase
        .from('eleves')
        .select('classe_id')
        .eq('id', eleveId)
        .maybeSingle();

      if (eleveError || !eleve?.classe_id) return [];

      // Récupérer les enseignants de cette classe
      const { data: enseignants, error: ensError } = await supabase
        .from('enseignant_classes')
        .select(`
          enseignant_id,
          matiere:matiere_id (nom),
          profile:enseignant_id (nom, prenom)
        `)
        .eq('classe_id', eleve.classe_id);

      if (ensError) throw ensError;

      const uniqueEnseignants = new Map<string, EnseignantDisponible>();
      
      for (const item of enseignants || []) {
        const profile = item.profile as any;
        if (profile && !uniqueEnseignants.has(profile.id)) {
          uniqueEnseignants.set(profile.id, {
            id: profile.id,
            nom: profile.nom || '',
            prenom: profile.prenom || '',
            matieres: [],
          });
        }
        const ens = uniqueEnseignants.get(item.enseignant_id);
        if (ens && (item.matiere as any)?.nom) {
          ens.matieres.push((item.matiere as any).nom);
        }
      }

      return Array.from(uniqueEnseignants.values());
    } catch (err) {
      console.error('Erreur chargement enseignants:', err);
      return [];
    }
  }, []);

  // Demander un rendez-vous
  const demanderRendezVous = useCallback(async (
    enseignantId: string,
    eleveId: string,
    date: string,
    heure: string,
    motif: string,
    lieu: string = 'Salle des professeurs'
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Non authentifié' };

    setSending(true);

    try {
      // Récupérer le parent
      const { data: parent, error: parentError } = await supabase
        .from('parents')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (parentError || !parent) {
        return { success: false, error: 'Parent non trouvé' };
      }

      // Créer le rendez-vous
      const heureFin = `${parseInt(heure.split(':')[0]) + 1}:${heure.split(':')[1]}`;

      const { error: insertError } = await supabase
        .from('rendez_vous')
        .insert({
          parent_id: parent.id,
          enseignant_id: enseignantId,
          eleve_id: eleveId,
          date_rdv: date,
          heure_debut: heure,
          heure_fin: heureFin,
          motif: motif,
          statut: 'en_attente',
          lieu: lieu,
        });

      if (insertError) throw insertError;

      // TODO: Envoyer notification à l'enseignant (via Edge Function)
      
      return { success: true };
    } catch (err) {
      console.error('Erreur création rendez-vous:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue' };
    } finally {
      setSending(false);
    }
  }, [user]);

  // Annuler un rendez-vous
  const annulerRendezVous = useCallback(async (rdvId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from('rendez_vous')
        .update({ statut: 'annule', cancelled_at: new Date().toISOString() })
        .eq('id', rdvId);

      if (error) throw error;
      
      await chargerRendezVous();
      return { success: true };
    } catch (err) {
      console.error('Erreur annulation:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Erreur inconnue' };
    }
  }, [chargerRendezVous]);

  useEffect(() => {
    chargerRendezVous();
  }, [chargerRendezVous]);

  return {
    rendezVous,
    loading,
    sending,
    error,
    getEnseignantsForEleve,
    demanderRendezVous,
    annulerRendezVous,
    refetch: chargerRendezVous,
  };
}