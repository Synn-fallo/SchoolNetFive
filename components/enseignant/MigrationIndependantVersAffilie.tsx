// /home/project/components/enseignant/MigrationIndependantVersAffilie.tsx
// Composant principal de migration (indépendant → affilié)

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
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import CorrespondanceEleves from './CorrespondanceEleves';
import SelectionEvaluations from './SelectionEvaluations';
import RapportMigration from './RapportMigration';
import { Building2, BookOpen, ArrowRight, CheckCircle } from 'lucide-react-native';
import theme from '@/constants/theme';

interface ClassePersonnelle {
  id: string;
  nom: string;
  description: string | null;
  matieres: any[];
  eleves: any[];
}

interface ClasseOfficielle {
  id: string;
  nom: string;
  niveau: string;
}

interface MatiereOfficielle {
  id: string;
  nom: string;
  coefficient: number;
}

interface MigrationIndependantVersAffilieProps {
  onComplete?: () => void;
}

export default function MigrationIndependantVersAffilie({ onComplete }: MigrationIndependantVersAffilieProps) {
  const { user } = useAuth();
  
  // États
  const [loading, setLoading] = useState(true);
  const [classesPersonnelles, setClassesPersonnelles] = useState<ClassePersonnelle[]>([]);
  const [classesOfficielles, setClassesOfficielles] = useState<ClasseOfficielle[]>([]);
  const [matieresOfficielles, setMatieresOfficielles] = useState<MatiereOfficielle[]>([]);
  
  // Sélections
  const [selectedClassePersonnelle, setSelectedClassePersonnelle] = useState<string | null>(null);
  const [selectedClasseOfficielle, setSelectedClasseOfficielle] = useState<string | null>(null);
  const [selectedMatiereOfficielle, setSelectedMatiereOfficielle] = useState<string | null>(null);
  
  // Correspondance
  const [correspondanceClasseExistante, setCorrespondanceClasseExistante] = useState<any>(null);
  const [correspondanceElevesValidee, setCorrespondanceElevesValidee] = useState(false);
  
  // Transfert
  const [selectedEvaluations, setSelectedEvaluations] = useState<string[]>([]);
  const [transfertEnCours, setTransfertEnCours] = useState(false);
  const [rapport, setRapport] = useState<any>(null);
  const [etape, setEtape] = useState<'selection' | 'correspondance_eleves' | 'selection_evaluations' | 'transfert' | 'rapport'>('selection');

  // Chargement des données
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      // Récupérer les classes personnelles
      const { data: classesPerso, error: err1 } = await supabase
        .from('classes_personnelles')
        .select('*')
        .eq('enseignant_id', user.id);
      
      if (err1) throw err1;
      setClassesPersonnelles(classesPerso || []);
      
      // Récupérer l'établissement de l'enseignant (affilié)
      const { data: enseignantEtab, error: err2 } = await supabase
        .from('enseignant_etablissements')
        .select('etablissement_id')
        .eq('enseignant_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      
      if (err2) throw err2;
      
      if (enseignantEtab?.etablissement_id) {
        // Récupérer les classes officielles
        const { data: classesOff, error: err3 } = await supabase
          .from('classes')
          .select('id, nom, niveau')
          .eq('etablissement_id', enseignantEtab.etablissement_id)
          .eq('is_active', true);
        
        if (err3) throw err3;
        setClassesOfficielles(classesOff || []);
        
        // Récupérer les matières officielles
        const { data: matieresOff, error: err4 } = await supabase
          .from('matieres')
          .select('id, nom, coefficient')
          .eq('etablissement_id', enseignantEtab.etablissement_id);
        
        if (err4) throw err4;
        setMatieresOfficielles(matieresOff || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  const handleClassePersonnelleChange = async (classeId: string) => {
    setSelectedClassePersonnelle(classeId);
    setSelectedClasseOfficielle(null);
    setCorrespondanceClasseExistante(null);
    setCorrespondanceElevesValidee(false);
    
    // Vérifier si une correspondance existe déjà
    const { data } = await supabase
      .from('correspondance_classes')
      .select('*')
      .eq('classe_personnelle_id', classeId)
      .eq('statut', 'active')
      .maybeSingle();
    
    if (data) {
      setCorrespondanceClasseExistante(data);
      setSelectedClasseOfficielle(data.classe_officielle_id);
    }
  };

  const handleValiderClasse = async () => {
    if (!selectedClassePersonnelle || !selectedClasseOfficielle) {
      Alert.alert('Erreur', 'Veuillez sélectionner une classe personnelle et une classe officielle');
      return;
    }
    
    try {
      // Sauvegarder ou mettre à jour la correspondance
      if (correspondanceClasseExistante) {
        await supabase
          .from('correspondance_classes')
          .update({ classe_officielle_id: selectedClasseOfficielle, updated_at: new Date().toISOString() })
          .eq('id', correspondanceClasseExistante.id);
      } else {
        await supabase
          .from('correspondance_classes')
          .insert({
            classe_personnelle_id: selectedClassePersonnelle,
            classe_officielle_id: selectedClasseOfficielle,
            enseignant_id: user?.id,
            statut: 'active'
          });
      }
      
      Alert.alert('Succès', 'Correspondance de classe enregistrée');
      setEtape('correspondance_eleves');
    } catch (error) {
      console.error('Error saving class correspondence:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer la correspondance');
    }
  };

  const handleCorrespondanceElevesComplete = () => {
    setCorrespondanceElevesValidee(true);
    setEtape('selection_evaluations');
  };

  const handleTransfertComplete = (rapportData: any) => {
    setRapport(rapportData);
    setEtape('rapport');
    if (onComplete) onComplete();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement de vos données...</Text>
      </View>
    );
  }

  if (classesPersonnelles.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Card style={styles.card}>
          <Text style={styles.emptyTitle}>Aucune classe personnelle</Text>
          <Text style={styles.emptyText}>
            Vous n'avez pas encore créé de classe personnelle.
          </Text>
        </Card>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Migration vers l'établissement</Text>
        <Text style={styles.subtitle}>
          Transférez vos données personnelles vers votre établissement abonné
        </Text>
      </View>

      {/* Étape 1 : Sélection de la classe */}
      {etape === 'selection' && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>📚 Étape 1 : Choisissez votre classe</Text>
          
          <Text style={styles.label}>Classe personnelle (source) :</Text>
          {classesPersonnelles.map(classe => (
            <TouchableOpacity
              key={classe.id}
              style={[
                styles.optionButton,
                selectedClassePersonnelle === classe.id && styles.optionButtonSelected
              ]}
              onPress={() => handleClassePersonnelleChange(classe.id)}
            >
              <Building2 size={20} color={selectedClassePersonnelle === classe.id ? '#FFFFFF' : '#6B7280'} />
              <Text style={[
                styles.optionText,
                selectedClassePersonnelle === classe.id && styles.optionTextSelected
              ]}>
                {classe.nom}
              </Text>
            </TouchableOpacity>
          ))}
          
          <Text style={[styles.label, { marginTop: 20 }]}>Classe officielle (destination) :</Text>
          {classesOfficielles.map(classe => (
            <TouchableOpacity
              key={classe.id}
              style={[
                styles.optionButton,
                selectedClasseOfficielle === classe.id && styles.optionButtonSelected
              ]}
              onPress={() => setSelectedClasseOfficielle(classe.id)}
            >
              <Building2 size={20} color={selectedClasseOfficielle === classe.id ? '#FFFFFF' : '#6B7280'} />
              <Text style={[
                styles.optionText,
                selectedClasseOfficielle === classe.id && styles.optionTextSelected
              ]}>
                {classe.nom} ({classe.niveau})
              </Text>
            </TouchableOpacity>
          ))}
          
          <Text style={[styles.label, { marginTop: 20 }]}>Matière officielle :</Text>
          {matieresOfficielles.map(matiere => (
            <TouchableOpacity
              key={matiere.id}
              style={[
                styles.optionButton,
                selectedMatiereOfficielle === matiere.id && styles.optionButtonSelected
              ]}
              onPress={() => setSelectedMatiereOfficielle(matiere.id)}
            >
              <BookOpen size={20} color={selectedMatiereOfficielle === matiere.id ? '#FFFFFF' : '#6B7280'} />
              <Text style={[
                styles.optionText,
                selectedMatiereOfficielle === matiere.id && styles.optionTextSelected
              ]}>
                {matiere.nom} (coef {matiere.coefficient})
              </Text>
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity
            style={styles.validateButton}
            onPress={handleValiderClasse}
            disabled={!selectedClassePersonnelle || !selectedClasseOfficielle || !selectedMatiereOfficielle}
          >
            <ArrowRight size={18} color="#FFFFFF" />
            <Text style={styles.validateButtonText}>Continuer</Text>
          </TouchableOpacity>
        </Card>
      )}

      {/* Étape 2 : Correspondance des élèves */}
      {etape === 'correspondance_eleves' && selectedClassePersonnelle && (
        <CorrespondanceEleves
          classePersonnelleId={selectedClassePersonnelle}
          classeOfficielleId={selectedClasseOfficielle!}
          onComplete={handleCorrespondanceElevesComplete}
        />
      )}

      {/* Étape 3 : Sélection des évaluations à transférer */}
      {etape === 'selection_evaluations' && selectedClassePersonnelle && selectedMatiereOfficielle && (
        <SelectionEvaluations
          classePersonnelleId={selectedClassePersonnelle}
          classeOfficielleId={selectedClasseOfficielle!}
          matiereOfficielleId={selectedMatiereOfficielle}
          onTransfertComplete={handleTransfertComplete}
          setTransfertEnCours={setTransfertEnCours}
        />
      )}

      {/* Étape 4 : Rapport final */}
      {etape === 'rapport' && rapport && (
        <RapportMigration rapport={rapport} onClose={() => setEtape('selection')} />
      )}

      {/* Indicateur de progression */}
      {transfertEnCours && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
          <Text style={styles.loadingOverlayText}>Transfert en cours...</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  card: {
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    marginBottom: 8,
  },
  optionButtonSelected: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  optionText: {
    fontSize: 14,
    color: '#374151',
  },
  optionTextSelected: {
    color: '#FFFFFF',
  },
  validateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 20,
  },
  validateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlayText: {
    marginTop: 12,
    fontSize: 14,
    color: '#FFFFFF',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});