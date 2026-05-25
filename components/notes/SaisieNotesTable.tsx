import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, 
  ActivityIndicator, Alert, Keyboard, Platform 
} from 'react-native';
import { CheckCircle, XCircle, Lock, ChevronRight, ChevronLeft } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import theme from '@/constants/theme';
import { NoteStatus } from '@/types/notes.types';
import NoteStatusBadge from './NoteStatusBadge';

const ZERO_CONFIRM_STORAGE_KEY = '@dont_ask_zero_again';

interface NoteData {
  id: string;
  eleve_id: string;
  eleve_nom: string;
  eleve_prenom: string;
  note: number;
  appreciation?: string;
  statut: NoteStatus;
}

interface SaisieNotesTableProps {
  notes: NoteData[];
  loading: boolean;
  noteSur: number;
  isAffiliated: boolean;
  onUpdateNoteValue: (noteId: string, newNote: number, appreciation?: string) => Promise<void>;
  onUpdateNoteStatus: (noteId: string, newStatus: NoteStatus) => Promise<void>;
  updatingNoteId: string | null;
  onBulkStatusUpdate?: (newStatus: NoteStatus) => Promise<void>;
}

export default function SaisieNotesTable({
  notes,
  loading,
  noteSur,
  isAffiliated,
  onUpdateNoteValue,
  onUpdateNoteStatus,
  updatingNoteId,
  onBulkStatusUpdate
}: SaisieNotesTableProps) {
  const [localNotes, setLocalNotes] = useState<NoteData[]>(notes);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempNote, setTempNote] = useState<string>('');
  const [dontAskZeroAgain, setDontAskZeroAgain] = useState(false);
  const [savedNoteId, setSavedNoteId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    const loadPreference = async () => {
      try {
        const value = await AsyncStorage.getItem(ZERO_CONFIRM_STORAGE_KEY);
        if (value === 'true') setDontAskZeroAgain(true);
      } catch (error) {
        console.error('Error loading zero preference:', error);
      }
    };
    loadPreference();
  }, []);

  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

  const saveDontAskZeroAgain = async (value: boolean) => {
    try {
      await AsyncStorage.setItem(ZERO_CONFIRM_STORAGE_KEY, value.toString());
      setDontAskZeroAgain(value);
    } catch (error) {
      console.error('Error saving zero preference:', error);
    }
  };

  const formatNoteDisplay = (note: number): string => {
    if (note === null || note === undefined || isNaN(note)) return '';
    const fixed = note.toFixed(1);
    const parts = fixed.split('.');
    const integerPart = parts[0].padStart(2, '0');
    return parts[1] === '0' ? integerPart : `${integerPart}.${parts[1]}`;
  };

  const parseAndValidateNote = (value: string): { valid: boolean; numericValue: number | null; error: string | null } => {
    let cleaned = value.trim();
    if (cleaned === '') return { valid: false, numericValue: null, error: 'Veuillez saisir une note' };
    cleaned = cleaned.replace(',', '.');
    const numericValue = parseFloat(cleaned);
    if (isNaN(numericValue)) return { valid: false, numericValue: null, error: 'Veuillez saisir un nombre valide' };
    if (numericValue < 0) return { valid: false, numericValue: null, error: 'La note ne peut pas être inférieure à 0' };
    if (numericValue > noteSur) return { valid: false, numericValue: null, error: `La note ne peut pas dépasser ${noteSur}` };
    return { valid: true, numericValue, error: null };
  };

  const showSuccessNotification = (message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const confirmZeroNote = (onConfirm: () => void, noteValue: number) => {
    if (dontAskZeroAgain || noteValue !== 0) {
      onConfirm();
      return;
    }

    Alert.alert(
      'Note à 0',
      'Vous avez saisi 0. Confirmez-vous que l’élève a composé et a obtenu 0 ?\n\n(0 absent = laisser la cellule vide)',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer (0 présent)',
          onPress: () => {
            Alert.alert('Option', 'Ne plus afficher ce message pour les notes à 0 ?', [
              { text: 'Non', onPress: onConfirm },
              { 
                text: 'Oui', 
                onPress: () => {
                  saveDontAskZeroAgain(true);
                  onConfirm();
                }
              },
            ]);
          }
        }
      ]
    );
  };

  const handleStartEdit = (index: number) => {
    const note = localNotes[index];
    if (note.statut === 'livree') return;
    setEditingIndex(index);
    setTempNote(formatNoteDisplay(note.note));
    setTimeout(() => inputRefs.current[index]?.focus(), 50);
  };

  const handleSaveNote = async (index: number) => {
    const note = localNotes[index];
    const validation = parseAndValidateNote(tempNote);
    if (!validation.valid) {
      Alert.alert('Erreur', validation.error || 'Note invalide');
      return;
    }

    const newNoteValue = validation.numericValue!;

    confirmZeroNote(async () => {
      setLocalNotes(prev => prev.map((n, i) => i === index ? { ...n, note: newNoteValue } : n));
      setEditingIndex(null);
      setTempNote('');
      setSavedNoteId(note.id);
      setTimeout(() => setSavedNoteId(null), 1500);
      
      await onUpdateNoteValue(note.id, newNoteValue, note.appreciation);
      showSuccessNotification('Note sauvegardée');
      
      if (index + 1 < localNotes.length) handleStartEdit(index + 1);
    }, newNoteValue);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setTempNote('');
  };

  const handleUpdateStatus = async (note: NoteData, newStatus: NoteStatus) => {
    setLocalNotes(prev => prev.map(n => n.eleve_id === note.eleve_id ? { ...n, statut: newStatus } : n));
    await onUpdateNoteStatus(note.id, newStatus);
    const statusMessage = newStatus === 'livree' ? 'livrée' : newStatus === 'publiee' ? 'publiée' : 'validée';
    showSuccessNotification(`Note ${statusMessage}`);
  };

  const handleBulkStatus = async (newStatus: NoteStatus, filterStatus?: NoteStatus) => {
    const targetNotes = filterStatus ? localNotes.filter(n => n.statut === filterStatus) : localNotes;
    if (targetNotes.length === 0) {
      Alert.alert('Information', 'Aucune note en statut correspondant');
      return;
    }

    const statusLabel = newStatus === 'validee' ? 'valider' : newStatus === 'publiee' ? 'publier' : 'livrer';
    
    Alert.alert(
      'Confirmation',
      `Voulez-vous ${statusLabel} les ${targetNotes.length} note(s) sélectionnée(s) ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            setLocalNotes(prev => prev.map(n => targetNotes.some(t => t.id === n.id) ? { ...n, statut: newStatus } : n));
            if (onBulkStatusUpdate) {
              await onBulkStatusUpdate(newStatus);
            } else {
              for (const note of targetNotes) {
                await onUpdateNoteStatus(note.id, newStatus);
              }
            }
            showSuccessNotification(`${targetNotes.length} note(s) ${statusLabel}es`);
          }
        }
      ]
    );
  };

  const getNoteColor = (note: number): string => {
    if (note >= 10) return '#10B981';
    if (note >= 8) return '#F59E0B';
    return '#EF4444';
  };

  const getProgressStats = () => {
    const total = localNotes.length;
    const saisies = localNotes.filter(n => n.note !== 0 || (n.note === 0 && n.statut !== 'en_attente')).length;
    return { total, saisies };
  };

  const handleKeyPress = (event: any, index: number) => {
    if (event.key === 'Enter') handleSaveNote(index);
    else if (event.key === 'ArrowDown' && index + 1 < localNotes.length) handleStartEdit(index + 1);
    else if (event.key === 'ArrowUp' && index - 1 >= 0) handleStartEdit(index - 1);
  };

  const { total, saisies } = getProgressStats();
  const progressPercent = total > 0 ? (saisies / total) * 100 : 0;

  const getStatusActionsForBulk = () => {
    const actions = [];
    const hasEnAttente = localNotes.some(n => n.statut === 'en_attente');
    const hasValidee = localNotes.some(n => n.statut === 'validee');
    const hasPubliee = localNotes.some(n => n.statut === 'publiee');
    
    if (hasEnAttente) actions.push({ label: 'Tout valider', newStatus: 'validee' as NoteStatus, filterStatus: 'en_attente' as NoteStatus, color: '#3B82F6' });
    if (hasValidee) actions.push({ label: 'Tout publier', newStatus: 'publiee' as NoteStatus, filterStatus: 'validee' as NoteStatus, color: '#10B981' });
    if (hasPubliee && isAffiliated) actions.push({ label: 'Tout livrer', newStatus: 'livree' as NoteStatus, filterStatus: 'publiee' as NoteStatus, color: '#059669' });
    return actions;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement des élèves...</Text>
      </View>
    );
  }

  if (!localNotes || localNotes.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>Aucun élève dans cette classe</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {showSuccess && (
        <View style={styles.successToast}>
          <Text style={styles.successToastText}>{successMessage}</Text>
        </View>
      )}

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>
        <Text style={styles.progressText}>{saisies} / {total} notes saisies</Text>
      </View>

      {getStatusActionsForBulk().length > 0 && (
        <View style={styles.bulkActions}>
          {getStatusActionsForBulk().map((action) => (
            <TouchableOpacity
              key={action.label}
              style={[styles.bulkButton, { backgroundColor: action.color }]}
              onPress={() => handleBulkStatus(action.newStatus, action.filterStatus)}
            >
              <Text style={styles.bulkButtonText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        data={localNotes}
        keyExtractor={(item) => item.eleve_id}
        renderItem={({ item, index }) => {
          const isEditing = editingIndex === index;
          const isSaving = updatingNoteId === item.id;
          const noteColor = getNoteColor(item.note);
          
          return (
            <View style={styles.row}>
              <View style={styles.eleveCell}>
                <Text style={styles.eleveName}>{item.eleve_prenom} {item.eleve_nom}</Text>
                {savedNoteId === item.id && <Text style={styles.savedBadge}>✓ Sauvegardé</Text>}
              </View>

              <View style={styles.noteCell}>
                {isEditing ? (
                  <View style={styles.editContainer}>
                    <TextInput
                      ref={ref => inputRefs.current[index] = ref}
                      style={styles.noteInput}
                      value={tempNote}
                      onChangeText={setTempNote}
                      keyboardType="decimal-pad"
                      autoFocus
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      onSubmitEditing={() => handleSaveNote(index)}
                    />
                    <TouchableOpacity onPress={() => handleSaveNote(index)} style={styles.saveButton}>
                      <CheckCircle size={16} color="#10B981" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelButton}>
                      <XCircle size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.noteValue, { backgroundColor: item.note ? `${noteColor}15` : '#F3F4F6' }]}
                    onPress={() => handleStartEdit(index)}
                    disabled={item.statut === 'livree'}
                  >
                    <Text style={[styles.noteText, { color: item.note ? noteColor : '#6B7280' }]}>
                      {item.note ? formatNoteDisplay(item.note) : '-'}
                    </Text>
                    {item.statut === 'livree' && <Lock size={12} color="#9CA3AF" style={styles.lockIcon} />}
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.statusCell}>
                <NoteStatusBadge status={item.statut} />
              </View>

              <View style={styles.actionsCell}>
                {item.statut === 'en_attente' && (
                  <TouchableOpacity
                    style={[styles.statusButton, { backgroundColor: '#3B82F6' }]}
                    onPress={() => handleUpdateStatus(item, 'validee')}
                    disabled={isSaving}
                  >
                    {isSaving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.statusButtonText}>Valider</Text>}
                  </TouchableOpacity>
                )}
                {item.statut === 'validee' && (
                  <TouchableOpacity
                    style={[styles.statusButton, { backgroundColor: '#10B981' }]}
                    onPress={() => handleUpdateStatus(item, 'publiee')}
                    disabled={isSaving}
                  >
                    {isSaving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.statusButtonText}>Publier</Text>}
                  </TouchableOpacity>
                )}
                {item.statut === 'publiee' && isAffiliated && (
                  <TouchableOpacity
                    style={[styles.statusButton, { backgroundColor: '#059669' }]}
                    onPress={() => handleUpdateStatus(item, 'livree')}
                    disabled={isSaving}
                  >
                    {isSaving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.statusButtonText}>Livrer</Text>}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        ListHeaderComponent={() => (
          <View style={styles.headerRow}>
            <Text style={[styles.headerCell, styles.eleveCell]}>Élève</Text>
            <Text style={[styles.headerCell, styles.noteCell]}>Note / {noteSur}</Text>
            <Text style={[styles.headerCell, styles.statusCell]}>Statut</Text>
            <Text style={[styles.headerCell, styles.actionsCell]}>Actions</Text>
          </View>
        )}
        stickyHeaderIndices={[0]}
      />

      {editingIndex !== null && Platform.OS !== 'web' && (
        <View style={styles.mobileNav}>
          <TouchableOpacity style={styles.navButton} onPress={() => editingIndex > 0 && handleStartEdit(editingIndex - 1)} disabled={editingIndex === 0}>
            <ChevronLeft size={20} color={editingIndex === 0 ? '#9CA3AF' : '#3B82F6'} />
            <Text style={[styles.navText, editingIndex === 0 && styles.navTextDisabled]}>Précédent</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.navButton} onPress={() => handleSaveNote(editingIndex)}>
            <Text style={styles.navText}>Suivant</Text>
            <ChevronRight size={20} color="#3B82F6" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  centerContainer: { padding: 24, alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  emptyText: { fontSize: 14, color: '#6B7280', textAlign: 'center' },
  successToast: { position: 'absolute', top: 10, left: 20, right: 20, backgroundColor: '#10B981', padding: 12, borderRadius: 8, zIndex: 1000, alignItems: 'center' },
  successToastText: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  progressContainer: { padding: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  progressBar: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.colors.primary.DEFAULT, borderRadius: 3 },
  progressText: { fontSize: 11, color: '#6B7280', marginTop: 6, textAlign: 'center' },
  bulkActions: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  bulkButton: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  bulkButtonText: { fontSize: 12, fontWeight: '500', color: '#FFFFFF' },
  headerRow: { flexDirection: 'row', backgroundColor: '#F3F4F6', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerCell: { fontWeight: '600', color: '#374151', fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#FFFFFF' },
  eleveCell: { flex: 2 },
  noteCell: { flex: 1.5 },
  statusCell: { flex: 1.5 },
  actionsCell: { flex: 2, flexDirection: 'row', gap: 6 },
  eleveName: { fontSize: 14, color: '#1F2937' },
  savedBadge: { fontSize: 10, color: '#10B981', marginTop: 2 },
  noteValue: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, alignSelf: 'flex-start' },
  noteText: { fontSize: 14, fontWeight: '500' },
  lockIcon: { marginLeft: 6 },
  editContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noteInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: theme.colors.primary.DEFAULT, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, width: 70, textAlign: 'center', fontSize: 14 },
  saveButton: { padding: 4 },
  cancelButton: { padding: 4 },
  statusButton: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  statusButtonText: { fontSize: 11, color: '#FFFFFF', fontWeight: '500' },
  mobileNav: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  navButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: '#F3F4F6' },
  navText: { fontSize: 14, color: '#3B82F6', fontWeight: '500' },
  navTextDisabled: { color: '#9CA3AF' },
});