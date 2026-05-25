// /home/project/components/notes/EnseignantNotesView.tsx
// Vue pour les enseignants – Gestion des évaluations et saisie des notes
// Avec statut global de l'évaluation (3 statuts)
// Support du filtre par classe (via paramètre d'URL)
// Mise à jour locale sans rechargement complet

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, Alert, TextInput } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import EvaluationCard from '@/components/notes/EvaluationCard';
import CreationEvaluationModal from '@/components/notes/CreationEvaluationModal';
import ModificationEvaluationModal from '@/components/notes/ModificationEvaluationModal';
import SaisieNotesTable from '@/components/notes/SaisieNotesTable';
import ExportNotesCSV from '@/components/notes/ExportNotesCSV';
import { Plus, FileText, CheckCircle, Building2, User, Search, Filter, ChevronDown, X } from 'lucide-react-native';
import theme from '@/constants/theme';
import { EvaluationType, NoteStatus, getEvaluationTypeLabel } from '@/types/notes.types';

type StatutGlobal = 'en_attente' | 'publiee' | 'livree';

interface EvaluationData {
  id: string;
  titre: string;
  type: EvaluationType;
  date_evaluation: string;
  note_sur: number;
  coefficient: number;
  description?: string;
  classe?: { id: string; nom: string; niveau: string; type: 'officielle' | 'personnelle' };
  matiere?: { id: string; nom: string };
  matiere_nom?: string;
  is_published: boolean;
  statutGlobal: StatutGlobal;
}

interface NoteData {
  id: string;
  eleve_id: string;
  eleve_nom: string;
  eleve_prenom: string;
  note: number;
  appreciation?: string;
  statut: NoteStatus;
}

export default function EnseignantNotesView() {
  const { user, isAffiliated } = useAuth();
  const { classeId, classePersonnelleId } = useLocalSearchParams<{ classeId?: string; classePersonnelleId?: string }>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [evaluations, setEvaluations] = useState<EvaluationData[]>([]);
  const [selectedEvaluation, setSelectedEvaluation] = useState<EvaluationData | null>(null);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [showCreationModal, setShowCreationModal] = useState(false);
  const [showModificationModal, setShowModificationModal] = useState(false);
  const [evaluationToModify, setEvaluationToModify] = useState<EvaluationData | null>(null);
  const [notesData, setNotesData] = useState<NoteData[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [updatingNoteId, setUpdatingNoteId] = useState<string | null>(null);
  const [currentClasseType, setCurrentClasseType] = useState<'officielle' | 'personnelle'>('officielle');
  const [currentClasseId, setCurrentClasseId] = useState<string>('');
  const [currentEvaluationId, setCurrentEvaluationId] = useState<string>('');
  
  // Filtres et recherche
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<EvaluationType | 'tous'>('tous');
  const [filterStatut, setFilterStatut] = useState<StatutGlobal | 'tous'>('tous');
  const [filterClasse, setFilterClasse] = useState<string>('tous');
  const [sortBy, setSortBy] = useState<'date' | 'titre'>('date');
  const [showFilters, setShowFilters] = useState(false);
  
  // Liste des classes disponibles pour le filtre
  const [classesList, setClassesList] = useState<{ id: string; nom: string; type: string }[]>([]);

  // Mise à jour locale du statut global d'une évaluation
  const updateEvaluationStatutGlobal = (evaluationId: string, newStatut: StatutGlobal) => {
    setEvaluations(prev => prev.map(item =>
      item.id === evaluationId ? { ...item, statutGlobal: newStatut } : item
    ));
  };

  // Recalculer le statut global à partir des notes locales
  const recalculateStatutGlobal = (notes: NoteData[]): StatutGlobal => {
    if (notes.length === 0) return 'en_attente';
    const total = notes.length;
    const livree = notes.filter(n => n.statut === 'livree').length;
    const publiee = notes.filter(n => n.statut === 'publiee').length;
    
    if (livree === total) return 'livree';
    if (publiee === total) return 'publiee';
    return 'en_attente';
  };

  // Charger la liste des classes pour le filtre
  const loadClassesList = async () => {
    if (!user) return;
    const list: { id: string; nom: string; type: string }[] = [];
    
    // Classes officielles
    if (isAffiliated) {
      const { data: officielles } = await supabase
        .from('enseignant_classes')
        .select('classe_id, classes(id, nom)')
        .eq('enseignant_id', user.id);
      if (officielles) {
        officielles.forEach((item: any) => {
          if (item.classes) {
            list.push({ id: item.classes.id, nom: item.classes.nom, type: 'officielle' });
          }
        });
      }
    }
    
    // Classes personnelles
    const { data: personnelles } = await supabase
      .from('classes_personnelles')
      .select('id, nom')
      .eq('enseignant_id', user.id);
    if (personnelles) {
      personnelles.forEach((item: any) => {
        list.push({ id: item.id, nom: item.nom, type: 'personnelle' });
      });
    }
    
    setClassesList(list);
  };

  const loadEvaluations = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('devoirs')
        .select(`
          id,
          titre,
          type,
          date_devoir,
          note_sur,
          coefficient,
          description,
          classe_id,
          classe_personnelle_id,
          matiere_id,
          matiere_nom,
          is_published,
          classe:classe_id(id, nom, niveau),
          classe_personnelle:classe_personnelle_id(id, nom),
          matiere:matiere_id(id, nom)
        `)
        .eq('enseignant_id', user.id);
      
      // Appliquer le filtre classe si présent
      if (classeId) {
        query = query.eq('classe_id', classeId);
      } else if (classePersonnelleId) {
        query = query.eq('classe_personnelle_id', classePersonnelleId);
      }
      
      const { data: devoirs, error } = await query.order('date_devoir', { ascending: false });

      if (error) throw error;

      const evaluationsWithStats = await Promise.all(
        (devoirs || []).map(async (d: any) => {
          const isOfficielle = !!d.classe_id;
          let notesStats = { total: 0, publiee: 0, livree: 0 };
          
          if (isOfficielle) {
            const { data: notes, error: notesError } = await supabase
              .from('notes')
              .select('statut')
              .eq('devoir_id', d.id);
            if (!notesError && notes) {
              notesStats.total = notes.length;
              notesStats.publiee = notes.filter(n => n.statut === 'publiee').length;
              notesStats.livree = notes.filter(n => n.statut === 'livree').length;
            }
          } else {
            const { data: classeData, error: classeError } = await supabase
              .from('classes_personnelles')
              .select('eleves')
              .eq('id', d.classe_personnelle_id)
              .single();
            if (!classeError && classeData?.eleves) {
              const elevesWithNotes = classeData.eleves.filter((e: any) => e.notes?.[d.id]);
              notesStats.total = elevesWithNotes.length;
              notesStats.publiee = elevesWithNotes.filter((e: any) => e.notes[d.id].statut === 'publiee').length;
              notesStats.livree = elevesWithNotes.filter((e: any) => e.notes[d.id].statut === 'livree').length;
            }
          }
          
          let statutGlobal: StatutGlobal = 'en_attente';
          if (notesStats.total > 0) {
            if (notesStats.livree === notesStats.total) statutGlobal = 'livree';
            else if (notesStats.publiee === notesStats.total) statutGlobal = 'publiee';
          }
          
          return {
            id: d.id,
            titre: d.titre,
            type: d.type || 'devoir',
            date_evaluation: d.date_devoir,
            note_sur: d.note_sur,
            coefficient: d.coefficient,
            description: d.description,
            classe: isOfficielle && d.classe ? { ...d.classe, type: 'officielle' as const } : 
                     d.classe_personnelle ? { id: d.classe_personnelle.id, nom: d.classe_personnelle.nom, niveau: 'Personnel', type: 'personnelle' as const } : undefined,
            matiere: d.matiere,
            matiere_nom: d.matiere_nom,
            is_published: d.is_published,
            statutGlobal
          };
        })
      );

      setEvaluations(evaluationsWithStats);
    } catch (error) {
      console.error('Error loading evaluations:', error);
      Alert.alert('Erreur', 'Impossible de charger les évaluations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, classeId, classePersonnelleId]);

  // Charger la liste des classes au montage
  useEffect(() => {
    loadClassesList();
  }, [user, isAffiliated]);

  // Filtrer et trier les évaluations
  const filteredEvaluations = evaluations
    .filter(e => e.titre.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(e => filterType === 'tous' || e.type === filterType)
    .filter(e => filterStatut === 'tous' || e.statutGlobal === filterStatut)
    .filter(e => {
      if (filterClasse === 'tous') return true;
      return e.classe?.id === filterClasse;
    })
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.date_evaluation).getTime() - new Date(a.date_evaluation).getTime();
      }
      return a.titre.localeCompare(b.titre);
    });

  useEffect(() => {
    loadEvaluations();
  }, [loadEvaluations]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadEvaluations();
  }, [loadEvaluations]);

  const loadNotesForEvaluation = async (evaluationId: string, classeId: string, classeType: 'officielle' | 'personnelle') => {
    setLoadingNotes(true);
    setCurrentClasseType(classeType);
    setCurrentClasseId(classeId);
    setCurrentEvaluationId(evaluationId);
    
    try {
      if (classeType === 'officielle') {
        const { data: eleves, error: elevesError } = await supabase
          .from('eleves')
          .select('id, nom, prenom')
          .eq('classe_id', classeId);
        if (elevesError) throw elevesError;

        const { data: notes, error: notesError } = await supabase
          .from('notes')
          .select('id, eleve_id, note, appreciation, statut')
          .eq('devoir_id', evaluationId);
        if (notesError) throw notesError;

        const notesMap = new Map(notes?.map(n => [n.eleve_id, n]) || []);
        const formattedNotes: NoteData[] = (eleves || []).map(eleve => {
          const existingNote = notesMap.get(eleve.id);
          return {
            id: existingNote?.id || '',
            eleve_id: eleve.id,
            eleve_nom: eleve.nom,
            eleve_prenom: eleve.prenom,
            note: existingNote?.note || 0,
            appreciation: existingNote?.appreciation,
            statut: existingNote?.statut || 'en_attente'
          };
        });
        setNotesData(formattedNotes);
      } else {
        const { data: classeData, error: classeError } = await supabase
          .from('classes_personnelles')
          .select('eleves')
          .eq('id', classeId)
          .single();
        if (classeError) throw classeError;
        
        const formattedNotes: NoteData[] = (classeData.eleves || []).map((eleve: any, idx: number) => {
          const evaluationNote = eleve.notes?.[evaluationId] || {};
          return {
            id: `${evaluationId}_${eleve.id || idx}`,
            eleve_id: eleve.id || `temp_${idx}`,
            eleve_nom: eleve.nom,
            eleve_prenom: eleve.prenom,
            note: evaluationNote.note || 0,
            appreciation: evaluationNote.appreciation,
            statut: evaluationNote.statut || 'en_attente'
          };
        });
        setNotesData(formattedNotes);
      }
    } catch (error) {
      console.error('Error loading notes:', error);
      Alert.alert('Erreur', 'Impossible de charger les notes');
    } finally {
      setLoadingNotes(false);
    }
  };

  const handleSelectEvaluation = (evaluation: EvaluationData) => {
    setSelectedEvaluation(evaluation);
    if (evaluation.classe) {
      loadNotesForEvaluation(evaluation.id, evaluation.classe.id, evaluation.classe.type);
    }
    setShowEntryForm(true);
  };

  const handleEntryComplete = () => {
    setShowEntryForm(false);
    setSelectedEvaluation(null);
    setNotesData([]);
    loadEvaluations();
  };

  const handleCreateEvaluation = () => {
    setShowCreationModal(true);
  };

  const handleCreationSuccess = () => {
    setShowCreationModal(false);
    loadEvaluations();
  };

  const handleModifyEvaluation = (evaluation: EvaluationData) => {
    setEvaluationToModify(evaluation);
    setShowModificationModal(true);
  };

  const handleModificationSuccess = () => {
    setShowModificationModal(false);
    setEvaluationToModify(null);
    loadEvaluations();
  };

  const handleDeleteEvaluation = async (evaluation: EvaluationData) => {
    Alert.alert(
      'Supprimer l\'évaluation',
      `Êtes-vous sûr de vouloir supprimer "${evaluation.titre}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('devoirs')
                .delete()
                .eq('id', evaluation.id)
                .eq('enseignant_id', user?.id);
              if (error) throw error;
              Alert.alert('Succès', 'Évaluation supprimée');
              loadEvaluations();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer');
            }
          }
        }
      ]
    );
  };

  const handleUpdateNoteValue = async (noteId: string, newNote: number, appreciation?: string) => {
    if (!selectedEvaluation) return;
    
    try {
      if (currentClasseType === 'officielle') {
        const existingNote = notesData.find(n => n.id === noteId);
        if (existingNote && existingNote.id) {
          const { error } = await supabase
            .from('notes')
            .update({ note: newNote, appreciation, updated_at: new Date().toISOString() })
            .eq('id', noteId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('notes')
            .insert({
              devoir_id: selectedEvaluation.id,
              eleve_id: noteId,
              note: newNote,
              appreciation: appreciation || null,
              statut: 'en_attente',
              created_by: user?.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          if (error) throw error;
        }
      } else {
        const { data: classeData, error: fetchError } = await supabase
          .from('classes_personnelles')
          .select('eleves')
          .eq('id', currentClasseId)
          .single();
        if (fetchError) throw fetchError;
        
        const updatedEleves = (classeData.eleves || []).map((eleve: any) => {
          if (eleve.id === noteId || (!eleve.id && eleve.nom === notesData.find(n => n.id === noteId)?.eleve_nom)) {
            return {
              ...eleve,
              notes: {
                ...(eleve.notes || {}),
                [selectedEvaluation.id]: {
                  note: newNote,
                  appreciation: appreciation || eleve.notes?.[selectedEvaluation.id]?.appreciation,
                  statut: eleve.notes?.[selectedEvaluation.id]?.statut || 'en_attente',
                  updated_at: new Date().toISOString()
                }
              }
            };
          }
          return eleve;
        });
        const { error: updateError } = await supabase
          .from('classes_personnelles')
          .update({ eleves: updatedEleves, updated_at: new Date().toISOString() })
          .eq('id', currentClasseId);
        if (updateError) throw updateError;
      }
      
      // Mise à jour locale de notesData
      setNotesData(prev => prev.map(n => 
        n.id === noteId ? { ...n, note: newNote, appreciation } : n
      ));
      
      // Recalculer et mettre à jour le statut global localement
      const updatedNotes = notesData.map(n => n.id === noteId ? { ...n, note: newNote, appreciation } : n);
      const newStatutGlobal = recalculateStatutGlobal(updatedNotes);
      updateEvaluationStatutGlobal(selectedEvaluation.id, newStatutGlobal);
      
      Alert.alert('Succès', 'Note sauvegardée');
      
    } catch (error) {
      console.error('Error updating note:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la note');
    }
  };

  const handleUpdateNoteStatus = async (noteId: string, newStatus: NoteStatus) => {
    if (!selectedEvaluation) return;
    
    try {
      if (currentClasseType === 'officielle') {
        const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/update-note-status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ noteId, newStatus }),
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.error);
      } else {
        const { data: classeData, error: fetchError } = await supabase
          .from('classes_personnelles')
          .select('eleves')
          .eq('id', currentClasseId)
          .single();
        if (fetchError) throw fetchError;
        
        const updatedEleves = (classeData.eleves || []).map((eleve: any) => {
          if (eleve.id === noteId || (!eleve.id && eleve.nom === notesData.find(n => n.id === noteId)?.eleve_nom)) {
            return {
              ...eleve,
              notes: {
                ...(eleve.notes || {}),
                [selectedEvaluation.id]: {
                  ...(eleve.notes?.[selectedEvaluation.id] || {}),
                  note: eleve.notes?.[selectedEvaluation.id]?.note || 0,
                  statut: newStatus,
                  updated_at: new Date().toISOString()
                }
              }
            };
          }
          return eleve;
        });
        const { error: updateError } = await supabase
          .from('classes_personnelles')
          .update({ eleves: updatedEleves, updated_at: new Date().toISOString() })
          .eq('id', currentClasseId);
        if (updateError) throw updateError;
      }
      
      // Mise à jour locale
      setNotesData(prev => prev.map(n => 
        n.id === noteId ? { ...n, statut: newStatus } : n
      ));
      
      // Recalculer et mettre à jour le statut global localement
      const updatedNotes = notesData.map(n => n.id === noteId ? { ...n, statut: newStatus } : n);
      const newStatutGlobal = recalculateStatutGlobal(updatedNotes);
      updateEvaluationStatutGlobal(selectedEvaluation.id, newStatutGlobal);
      
      const statusMessage = newStatus === 'livree' ? 'livrée' : newStatus === 'publiee' ? 'publiée' : 'validée';
      Alert.alert('Succès', `Note ${statusMessage}`);
      
    } catch (error) {
      console.error('Error updating note status:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le statut');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement de vos évaluations...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[theme.colors.primary.DEFAULT]} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Mes évaluations</Text>
            <Text style={styles.subtitle}>Gérez vos évaluations et saisissez les notes</Text>
          </View>
          <TouchableOpacity style={styles.createButtonHeader} onPress={handleCreateEvaluation}>
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.createButtonHeaderText}>Créer</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.badgeContainer}>
          {isAffiliated && (
            <View style={styles.affiliatedBadge}>
              <CheckCircle size={14} color="#10B981" />
              <Text style={styles.affiliatedText}>Mode affilié – Livraison possible</Text>
            </View>
          )}
          {!isAffiliated && (
            <View style={styles.independantBadge}>
              <Text style={styles.independantText}>Mode indépendant – Livraison non disponible</Text>
            </View>
          )}
        </View>

        <View style={styles.searchBar}>
          <Search size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une évaluation..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
            <Filter size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={styles.filtersPanel}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <Text style={styles.filterLabel}>Type :</Text>
              {['tous', 'interrogation', 'devoir', 'examen_blanc'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.filterChip, filterType === type && styles.filterChipActive]}
                  onPress={() => setFilterType(type as any)}
                >
                  <Text style={[styles.filterChipText, filterType === type && styles.filterChipTextActive]}>
                    {type === 'tous' ? 'Tous' : type === 'interrogation' ? 'Interro' : type}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
              <Text style={styles.filterLabel}>Statut :</Text>
              {['tous', 'en_attente', 'publiee', 'livree'].map((statut) => (
                <TouchableOpacity
                  key={statut}
                  style={[styles.filterChip, filterStatut === statut && styles.filterChipActive]}
                  onPress={() => setFilterStatut(statut as any)}
                >
                  <Text style={[styles.filterChipText, filterStatut === statut && styles.filterChipTextActive]}>
                    {statut === 'tous' ? 'Tous' : statut === 'en_attente' ? 'En attente' : statut === 'publiee' ? 'Publiée' : 'Livrée'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            {classesList.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                <Text style={styles.filterLabel}>Classe :</Text>
                <TouchableOpacity
                  style={[styles.filterChip, filterClasse === 'tous' && styles.filterChipActive]}
                  onPress={() => setFilterClasse('tous')}
                >
                  <Text style={[styles.filterChipText, filterClasse === 'tous' && styles.filterChipTextActive]}>Toutes</Text>
                </TouchableOpacity>
                {classesList.map((classe) => (
                  <TouchableOpacity
                    key={classe.id}
                    style={[styles.filterChip, filterClasse === classe.id && styles.filterChipActive]}
                    onPress={() => setFilterClasse(classe.id)}
                  >
                    <Text style={[styles.filterChipText, filterClasse === classe.id && styles.filterChipTextActive]}>
                      {classe.nom}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            
            <View style={styles.sortRow}>
              <Text style={styles.filterLabel}>Trier par :</Text>
              <TouchableOpacity
                style={[styles.sortButton, sortBy === 'date' && styles.sortButtonActive]}
                onPress={() => setSortBy('date')}
              >
                <Text style={[styles.sortButtonText, sortBy === 'date' && styles.sortButtonTextActive]}>Date</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sortButton, sortBy === 'titre' && styles.sortButtonActive]}
                onPress={() => setSortBy('titre')}
              >
                <Text style={[styles.sortButtonText, sortBy === 'titre' && styles.sortButtonTextActive]}>Titre</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {filteredEvaluations.length === 0 ? (
          <Card style={styles.emptyCard}>
            <FileText size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>Aucune évaluation</Text>
            <Text style={styles.emptyText}>
              {searchQuery ? 'Aucun résultat pour votre recherche.' : 'Vous n\'avez pas encore créé d\'évaluation.'}
            </Text>
            {!searchQuery && (
              <TouchableOpacity style={styles.createButton} onPress={handleCreateEvaluation}>
                <Text style={styles.createButtonText}>Créer une évaluation</Text>
              </TouchableOpacity>
            )}
          </Card>
        ) : (
          filteredEvaluations.map((evaluation) => (
            <EvaluationCard
              key={evaluation.id}
              id={evaluation.id}
              titre={evaluation.titre}
              type={evaluation.type}
              date={evaluation.date_evaluation}
              noteSur={evaluation.note_sur}
              coefficient={evaluation.coefficient}
              classeNom={evaluation.classe?.nom || ''}
              classeType={evaluation.classe?.type || 'officielle'}
              matiereNom={evaluation.matiere_nom || evaluation.matiere?.nom || ''}
              statutGlobal={evaluation.statutGlobal}
              description={evaluation.description}
              onPressSaisie={() => handleSelectEvaluation(evaluation)}
              onPressModifier={() => handleModifyEvaluation(evaluation)}
              onPressSupprimer={() => handleDeleteEvaluation(evaluation)}
            />
          ))
        )}
      </ScrollView>

      <Modal
        visible={showEntryForm}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleEntryComplete}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Saisie des notes - {selectedEvaluation?.titre}
            </Text>
            <TouchableOpacity onPress={handleEntryComplete} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
          
          {selectedEvaluation && (
            <SaisieNotesTable
              notes={notesData}
              loading={loadingNotes}
              noteSur={selectedEvaluation.note_sur}
              isAffiliated={isAffiliated}
              onUpdateNoteValue={handleUpdateNoteValue}
              onUpdateNoteStatus={handleUpdateNoteStatus}
              updatingNoteId={updatingNoteId}
            />
          )}
          
          <View style={styles.modalFooter}>
            <ExportNotesCSV
              notes={notesData}
              evaluationTitre={selectedEvaluation?.titre || ''}
              evaluationDate={selectedEvaluation?.date_evaluation || ''}
            />
          </View>
        </View>
      </Modal>

      <CreationEvaluationModal
        visible={showCreationModal}
        onClose={() => setShowCreationModal(false)}
        onSuccess={handleCreationSuccess}
      />

      {evaluationToModify && (
        <ModificationEvaluationModal
          visible={showModificationModal}
          evaluation={evaluationToModify}
          onClose={() => {
            setShowModificationModal(false);
            setEvaluationToModify(null);
          }}
          onSuccess={handleModificationSuccess}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, paddingBottom: 32 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerLeft: { flex: 1 },
  title: { fontSize: 24, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6B7280' },
  createButtonHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primary.DEFAULT, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  createButtonHeaderText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  badgeContainer: { marginBottom: 16 },
  affiliatedBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#D1FAE5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' },
  affiliatedText: { fontSize: 12, color: '#065F46', fontWeight: '500' },
  independantBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start' },
  independantText: { fontSize: 12, color: '#92400E', fontWeight: '500' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB', gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#1F2937' },
  filtersPanel: { backgroundColor: '#FFFFFF', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  filterLabel: { fontSize: 12, fontWeight: '500', color: '#6B7280', marginRight: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8 },
  filterChipActive: { backgroundColor: theme.colors.primary.DEFAULT },
  filterChipText: { fontSize: 12, color: '#6B7280' },
  filterChipTextActive: { color: '#FFFFFF' },
  filterRow: { flexDirection: 'row', marginTop: 8 },
  sortRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  sortButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: '#F3F4F6' },
  sortButtonActive: { backgroundColor: theme.colors.primary.DEFAULT },
  sortButtonText: { fontSize: 12, color: '#6B7280' },
  sortButtonTextActive: { color: '#FFFFFF' },
  emptyCard: { padding: 32, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 13, color: '#6B7280', textAlign: 'center', marginBottom: 20 },
  createButton: { backgroundColor: theme.colors.primary.DEFAULT, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  createButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  modalContainer: { flex: 1, backgroundColor: '#F9FAFB' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  modalCloseButton: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#F3F4F6', borderRadius: 8 },
  modalCloseText: { fontSize: 14, color: '#6B7280' },
  modalFooter: { padding: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB', alignItems: 'flex-end' },
});