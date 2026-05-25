import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Download } from 'lucide-react-native';
import { convertToCSV, downloadCSV } from '@/utils/exportCSV';
import { NoteStatus, getNoteStatusLabel } from '@/types/notes.types';

interface NoteData {
  id: string;
  eleve_id: string;
  eleve_nom: string;
  eleve_prenom: string;
  note: number;
  appreciation?: string;
  statut: NoteStatus;
}

interface ExportNotesCSVProps {
  notes: NoteData[];
  evaluationTitre: string;
  evaluationDate: string;
}

export default function ExportNotesCSV({ notes, evaluationTitre, evaluationDate }: ExportNotesCSVProps) {
  const handleExport = () => {
    if (notes.length === 0) {
      Alert.alert('Information', 'Aucune note à exporter');
      return;
    }

    const exportData = notes.map(note => ({
      'Nom': note.eleve_nom,
      'Prénom': note.eleve_prenom,
      'Note': note.note || '',
      'Appréciation': note.appreciation || '',
      'Statut': getNoteStatusLabel(note.statut),
    }));

    const csv = convertToCSV(exportData);
    const sanitizedTitle = evaluationTitre.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const filename = `notes_${sanitizedTitle}_${evaluationDate}.csv`;
    
    downloadCSV(csv, filename);
    Alert.alert('Succès', `Exporté: ${filename}`);
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handleExport}>
      <Download size={16} color="#FFFFFF" />
      <Text style={styles.buttonText}>Exporter CSV</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});