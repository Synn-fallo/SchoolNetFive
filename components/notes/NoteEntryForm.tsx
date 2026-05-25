import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Check, X, Save } from 'lucide-react-native';

interface Eleve {
  id: string;
  matricule: string;
  user?: {
    prenom: string;
    nom: string;
  };
}

interface NoteEntryFormProps {
  devoirId: string;
  classeId: string;
  noteSur: number;
  onComplete?: () => void;
  onCancel?: () => void;
}

interface NoteEntry {
  eleveId: string;
  note: string;
  appreciation: string;
  isValid: boolean;
}

export default function NoteEntryForm({ 
  devoirId, 
  classeId, 
  noteSur, 
  onComplete, 
  onCancel 
}: NoteEntryFormProps) {
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [notes, setNotes] = useState<Map<string, NoteEntry>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingNotes, setExistingNotes] = useState<Map<string, { note: number; appreciation: string }>>(new Map());

  useEffect(() => {
    loadElevesAndNotes();
  }, [classeId, devoirId]);

  const loadElevesAndNotes = async () => {
    try {
      setLoading(true);

      // Récupérer les élèves de la classe
      const { data: elevesData, error: elevesError } = await supabase
        .from('eleves')
        .select('id, matricule, user:user_id(prenom, nom)')
        .eq('classe_id', classeId)
        .eq('statut', 'actif');

      if (elevesError) throw elevesError;

      setEleves(elevesData || []);

      // Récupérer les notes existantes pour ce devoir
      const { data: notesData, error: notesError } = await supabase
        .from('notes')
        .select('eleve_id, note, appreciation')
        .eq('devoir_id', devoirId);

      if (notesError) throw notesError;

      const existingMap = new Map();
      for (const n of notesData || []) {
        existingMap.set(n.eleve_id, { note: n.note, appreciation: n.appreciation || '' });
      }
      setExistingNotes(existingMap);

      // Initialiser les entrées de notes
      const notesMap = new Map();
      for (const eleve of elevesData || []) {
        const existing = existingMap.get(eleve.id);
        notesMap.set(eleve.id, {
          eleveId: eleve.id,
          note: existing ? String(existing.note) : '',
          appreciation: existing?.appreciation || '',
          isValid: existing ? true : false,
        });
      }
      setNotes(notesMap);

    } catch (error) {
      console.error('Error loading eleves:', error);
      Alert.alert('Erreur', 'Impossible de charger les élèves');
    } finally {
      setLoading(false);
    }
  };

  const validateNote = (value: string): { valid: boolean; numeric: number | null } => {
    const num = parseFloat(value);
    if (isNaN(num)) return { valid: false, numeric: null };
    if (num < 0 || num > noteSur) return { valid: false, numeric: num };
    return { valid: true, numeric: num };
  };

  const handleNoteChange = (eleveId: string, value: string) => {
    const { valid, numeric } = validateNote(value);
    const current = notes.get(eleveId);
    if (current) {
      notes.set(eleveId, {
        ...current,
        note: value,
        isValid: valid && value !== '',
      });
      setNotes(new Map(notes));
    }
  };

  const handleAppreciationChange = (eleveId: string, value: string) => {
    const current = notes.get(eleveId);
    if (current) {
      notes.set(eleveId, {
        ...current,
        appreciation: value,
      });
      setNotes(new Map(notes));
    }
  };

  const handleSaveAll = async () => {
    // Vérifier que toutes les notes sont valides
    const invalidNotes = Array.from(notes.values()).filter(n => n.note && !n.isValid);
    if (invalidNotes.length > 0) {
      Alert.alert('Notes invalides', 'Certaines notes sont invalides (vérifiez les valeurs)');
      return;
    }

    // Préparer les notes à sauvegarder
    const notesToSave = Array.from(notes.values())
      .filter(n => n.note !== '')
      .map(n => ({
        devoir_id: devoirId,
        eleve_id: n.eleveId,
        note: parseFloat(n.note),
        appreciation: n.appreciation || null,
      }));

    if (notesToSave.length === 0) {
      Alert.alert('Aucune note', 'Veuillez saisir au moins une note');
      return;
    }

    setSaving(true);

    try {
      // Supprimer les notes existantes pour ce devoir
      const { error: deleteError } = await supabase
        .from('notes')
        .delete()
        .eq('devoir_id', devoirId);

      if (deleteError) throw deleteError;

      // Insérer les nouvelles notes
      const { error: insertError } = await supabase
        .from('notes')
        .insert(notesToSave);

      if (insertError) throw insertError;

      // Envoyer les notifications aux parents (via Edge Function)
      for (const note of notesToSave) {
        const eleve = eleves.find(e => e.id === note.eleve_id);
        const matiere = await getMatiereForDevoir(devoirId);
        
        if (eleve?.user) {
          try {
            await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
              },
              body: JSON.stringify({
                user_ids: [eleve.user_id],
                type: 'note',
                template: 'note_saisie',
                data: {
                  eleve_nom: `${eleve.user?.prenom} ${eleve.user?.nom}`,
                  matiere: matiere?.nom || 'Devoir',
                  note: note.note,
                  note_sur: noteSur,
                },
              }),
            });
          } catch (err) {
            console.error('Error sending notification:', err);
          }
        }
      }

      Alert.alert('Succès', 'Notes enregistrées avec succès');
      if (onComplete) onComplete();

    } catch (error) {
      console.error('Error saving notes:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer les notes');
    } finally {
      setSaving(false);
    }
  };

  const getMatiereForDevoir = async (devoirId: string) => {
    const { data } = await supabase
      .from('devoirs')
      .select('matiere:matiere_id(nom)')
      .eq('id', devoirId)
      .single();
    return data?.matiere;
  };

  const getEleveName = (eleve: Eleve) => {
    if (eleve.user?.prenom && eleve.user?.nom) {
      return `${eleve.user.prenom} ${eleve.user.nom}`;
    }
    return eleve.matricule;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Chargement des élèves...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Saisie des notes</Text>
        <Text style={styles.subtitle}>Note sur {noteSur}</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, styles.eleveCell]}>Élève</Text>
          <Text style={[styles.headerCell, styles.noteCell]}>Note</Text>
          <Text style={[styles.headerCell, styles.appreciationCell]}>Appréciation</Text>
        </View>

        {eleves.map((eleve) => {
          const noteEntry = notes.get(eleve.id);
          const existing = existingNotes.get(eleve.id);
          const isModified = noteEntry?.note !== (existing ? String(existing.note) : '');
          const isValid = noteEntry?.isValid ?? true;

          return (
            <View key={eleve.id} style={[styles.tableRow, isModified && styles.modifiedRow]}>
              <Text style={[styles.rowCell, styles.eleveCell]} numberOfLines={1}>
                {getEleveName(eleve)}
              </Text>
              <View style={[styles.rowCell, styles.noteCell]}>
                <TextInput
                  style={[
                    styles.noteInput,
                    !isValid && noteEntry?.note !== '' && styles.invalidInput,
                    existing && styles.existingInput,
                  ]}
                  value={noteEntry?.note || ''}
                  onChangeText={(v) => handleNoteChange(eleve.id, v)}
                  keyboardType="numeric"
                  placeholder="--"
                  placeholderTextColor="#9CA3AF"
                />
                {isValid && noteEntry?.note && (
                  <Check size={14} color="#10B981" style={styles.validIcon} />
                )}
              </View>
              <TextInput
                style={[styles.rowCell, styles.appreciationCell, styles.appreciationInput]}
                value={noteEntry?.appreciation || ''}
                onChangeText={(v) => handleAppreciationChange(eleve.id, v)}
                placeholder="Appréciation"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        {onCancel && (
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <X size={18} color="#6B7280" />
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveAll} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Save size={18} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Enregistrer toutes les notes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerCell: {
    fontWeight: '600',
    color: '#374151',
    fontSize: 13,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  modifiedRow: {
    backgroundColor: '#FFFBEB',
  },
  rowCell: {
    fontSize: 14,
    color: '#1F2937',
  },
  eleveCell: {
    flex: 3,
  },
  noteCell: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  appreciationCell: {
    flex: 4,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    width: '80%',
    textAlign: 'center',
  },
  invalidInput: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  existingInput: {
    backgroundColor: '#F3F4F6',
  },
  validIcon: {
    marginLeft: 4,
  },
  appreciationInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    flex: 1,
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 2,
  },
  saveButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});