// /home/project/components/enseignant/SelectionEvaluations.tsx
// Sous-composant pour sélectionner les évaluations à transférer

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { CheckCircle, XCircle, AlertCircle, Send } from 'lucide-react-native';
import theme from '@/constants/theme';

interface SelectionEvaluationsProps {
  classePersonnelleId: string;
  classeOfficielleId: string;
  matiereOfficielleId: string;
  onTransfertComplete: (rapport: any) => void;
  setTransfertEnCours: (loading: boolean) => void;
}

interface Evaluation {
  id: string;
  type: 'interrogation' | 'devoir';
  titre: string;
  date: string;
  note_sur: number;
  coefficient: number;
  selected: boolean;
}

export default function SelectionEvaluations({
  classePersonnelleId,
  classeOfficielleId,
  matiereOfficielleId,
  onTransfertComplete,
  setTransfertEnCours
}: SelectionEvaluationsProps) {
  const [loading, setLoading] = useState(true);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [transfertPossible, setTransfertPossible] = useState(false);

  useEffect(() => {
    loadEvaluations();
  }, []);

  const loadEvaluations = async () => {
    setLoading(true);
    try {
      // Récupérer la classe personnelle
      const { data: classePerso, error: err1 } = await supabase
        .from('classes_personnelles')
        .select('eleves, matieres')
        .eq('id', classePersonnelleId)
        .single();
      
      if (err1) throw err1;
      
      // Récupérer la matière personnelle correspondante
      const matierePersonnelle = classePerso.matieres?.find((m: any) => 
        m.nom && (m.nom.toLowerCase().includes('math') || true) // Simplifié
      );
      
      // Ici, il faudrait récupérer les devoirs personnels de l'enseignant
      // Pour l'exemple, on simule des évaluations
      const evaluationsSimulees: Evaluation[] = [
        {
          id: 'inter1',
          type: 'interrogation',
          titre: 'Interrogation 1',
          date: '2026-04-10',
          note_sur: 20,
          coefficient: 1,
          selected: false
        },
        {
          id: 'inter2',
          type: 'interrogation',
          titre: 'Interrogation 2',
          date: '2026-04-17',
          note_sur: 20,
          coefficient: 1,
          selected: false
        },
        {
          id: 'devoir1',
          type: 'devoir',
          titre: 'Devoir 1',
          date: '2026-04-24',
          note_sur: 20,
          coefficient: 2,
          selected: false
        }
      ];
      
      setEvaluations(evaluationsSimulees);
    } catch (error) {
      console.error('Error loading evaluations:', error);
      Alert.alert('Erreur', 'Impossible de charger les évaluations');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelection = (id: string) => {
    setEvaluations(prev => 
      prev.map(e => e.id === id ? { ...e, selected: !e.selected } : e)
    );
  };

  const toggleAll = () => {
    const allSelected = evaluations.every(e => e.selected);
    setEvaluations(prev => prev.map(e => ({ ...e, selected: !allSelected })));
  };

  const handleTransfert = async () => {
    const selected = evaluations.filter(e => e.selected);
    if (selected.length === 0) {
      Alert.alert('Erreur', 'Veuillez sélectionner au moins une évaluation');
      return;
    }
    
    setTransfertEnCours(true);
    
    try {
      // Appel à l'Edge Function pour le transfert transactionnel
      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/transferer-notes-bloc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          classe_personnelle_id: classePersonnelleId,
          classe_officielle_id: classeOfficielleId,
          matiere_officielle_id: matiereOfficielleId,
          evaluations: selected.map(e => ({
            id: e.id,
            type: e.type,
            titre: e.titre,
            date: e.date,
            note_sur: e.note_sur,
            coefficient: e.coefficient
          }))
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        onTransfertComplete(result.rapport);
      } else {
        Alert.alert('Erreur', result.error || 'Le transfert a échoué');
        setTransfertEnCours(false);
      }
    } catch (error) {
      console.error('Error during transfer:', error);
      Alert.alert('Erreur', 'Impossible de transférer les notes');
      setTransfertEnCours(false);
    }
  };

  if (loading) {
    return (
      <Card style={styles.card}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement des évaluations...</Text>
      </Card>
    );
  }

  const selectedCount = evaluations.filter(e => e.selected).length;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>📝 Étape 3 : Sélectionnez les évaluations à transférer</Text>
      <Text style={styles.subtitle}>
        Choisissez les interrogations et devoirs à transférer vers l'établissement
      </Text>
      
      <TouchableOpacity style={styles.selectAllButton} onPress={toggleAll}>
        <Text style={styles.selectAllText}>
          {evaluations.every(e => e.selected) ? 'Tout désélectionner' : 'Tout sélectionner'}
        </Text>
      </TouchableOpacity>
      
      <ScrollView style={styles.listContainer}>
        {evaluations.map(evaluation => (
          <View key={evaluation.id} style={styles.evaluationRow}>
            <Checkbox
              checked={evaluation.selected}
              onPress={() => toggleSelection(evaluation.id)}
            />
            <View style={styles.evaluationInfo}>
              <View style={styles.evaluationHeader}>
                <Text style={styles.evaluationType}>
                  {evaluation.type === 'interrogation' ? '📖 Interrogation' : '📝 Devoir'}
                </Text>
                <Text style={styles.evaluationDate}>
                  {new Date(evaluation.date).toLocaleDateString('fr-FR')}
                </Text>
              </View>
              <Text style={styles.evaluationTitle}>{evaluation.titre}</Text>
              <Text style={styles.evaluationDetails}>
                Note sur {evaluation.note_sur} • Coefficient {evaluation.coefficient}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
      
      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          {selectedCount} évaluation(s) sélectionnée(s)
        </Text>
      </View>
      
      <TouchableOpacity
        style={[styles.transfertButton, selectedCount === 0 && styles.transfertButtonDisabled]}
        onPress={handleTransfert}
        disabled={selectedCount === 0}
      >
        <Send size={18} color="#FFFFFF" />
        <Text style={styles.transfertButtonText}>Transférer les notes</Text>
      </TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  selectAllButton: {
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  selectAllText: {
    fontSize: 13,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  listContainer: {
    maxHeight: 400,
  },
  evaluationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  evaluationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  evaluationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  evaluationType: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.primary.DEFAULT,
  },
  evaluationDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  evaluationTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  evaluationDetails: {
    fontSize: 11,
    color: '#6B7280',
  },
  summary: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  transfertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 16,
  },
  transfertButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  transfertButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});