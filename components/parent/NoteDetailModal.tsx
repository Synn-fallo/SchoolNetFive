import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { X, Calendar, BookOpen, Award } from 'lucide-react-native';
import theme from '@/constants/theme';
import NoteJauge from './NoteJauge';

interface NoteDetailModalProps {
  visible: boolean;
  onClose: () => void;
  matiere: {
    id: string;
    nom: string;
    moyenne: number;
    noteSur: number;
    appreciation?: string;
    notes?: Array<{
      id: string;
      valeur: number;
      type: string;
      date: string;
      appreciation?: string;
      coefficient?: number;
    }>;
  } | null;
}

export default function NoteDetailModal({ visible, onClose, matiere }: NoteDetailModalProps) {
  if (!matiere) return null;

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'devoir': return '📝 Devoir';
      case 'composition': return '📖 Composition';
      case 'examen': return '🎓 Examen';
      default: return '📌 Note';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>{matiere.nom}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.moyenneContainer}>
              <Text style={styles.moyenneLabel}>Moyenne</Text>
              <NoteJauge note={matiere.moyenne} noteSur={matiere.noteSur} />
              <Text style={styles.moyenneValeur}>
                {matiere.moyenne.toFixed(1)} / {matiere.noteSur}
              </Text>
            </View>

            {matiere.appreciation && (
              <View style={styles.appreciationContainer}>
                <Award size={20} color={theme.colors.primary.DEFAULT} />
                <Text style={styles.appreciationText}>{matiere.appreciation}</Text>
              </View>
            )}

            {matiere.notes && matiere.notes.length > 0 && (
              <View style={styles.notesList}>
                <Text style={styles.sectionTitle}>Détail des notes</Text>
                {matiere.notes.map((note, index) => (
                  <View key={note.id || index} style={styles.noteItem}>
                    <View style={styles.noteItemLeft}>
                      <Text style={styles.noteType}>{getTypeLabel(note.type)}</Text>
                      <Text style={styles.noteDate}>
                        <Calendar size={12} color="#9CA3AF" /> {new Date(note.date).toLocaleDateString('fr-FR')}
                      </Text>
                    </View>
                    <View style={styles.noteItemRight}>
                      <Text style={styles.noteValeur}>{note.valeur}/{matiere.noteSur}</Text>
                      {note.coefficient && (
                        <Text style={styles.noteCoeff}>coeff. {note.coefficient}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.closeModalButton} onPress={onClose}>
            <Text style={styles.closeModalButtonText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 20,
  },
  moyenneContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  moyenneLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  moyenneValeur: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 8,
  },
  appreciationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  appreciationText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
  },
  notesList: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  noteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  noteItemLeft: {
    flex: 1,
  },
  noteType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  noteDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  noteItemRight: {
    alignItems: 'flex-end',
  },
  noteValeur: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary.DEFAULT,
  },
  noteCoeff: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  closeModalButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 10,
  },
  closeModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});