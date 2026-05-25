import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, ActivityIndicator, Alert, FlatList, TextInput } from 'react-native';
import { useState, useEffect } from 'react';
import { X, Check, ArrowRight, Building2, Users, Search } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useTransferNotesToOfficielle } from '@/hooks/useTransferNotesToOfficielle';
import theme from '@/constants/theme';

interface RattachementAssistantProps {
  visible: boolean;
  classePersonnelleId: string;
  classePersonnelleNom: string;
  elevesPersonnels: Array<{ nom: string; prenom: string; matricule?: string }>;
  onClose: () => void;
  onSuccess: () => void;
}

interface ClasseOfficielle {
  id: string;
  nom: string;
  niveau: string;
  effectif: number;
  etablissement_nom: string;
}

interface EleveOfficiel {
  id: string;
  nom: string;
  prenom: string;
  matricule?: string;
}

interface Correspondance {
  elevePersonnelIndex: number;
  eleveOfficielId: string | null;
  eleveOfficielNom: string;
  eleveOfficielPrenom: string;
}

export default function RattachementAssistant({
  visible,
  classePersonnelleId,
  classePersonnelleNom,
  elevesPersonnels,
  onClose,
  onSuccess
}: RattachementAssistantProps) {
  const { user } = useAuth();
  const { transfererNotes, loading: transferLoading } = useTransferNotesToOfficielle();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [classesOfficielles, setClassesOfficielles] = useState<ClasseOfficielle[]>([]);
  const [selectedClasseOfficielleId, setSelectedClasseOfficielleId] = useState<string | null>(null);
  const [selectedClasseOfficielleNom, setSelectedClasseOfficielleNom] = useState<string>('');
  const [elevesOfficiels, setElevesOfficiels] = useState<EleveOfficiel[]>([]);
  const [correspondances, setCorrespondances] = useState<Correspondance[]>([]);
  const [showEleveSelector, setShowEleveSelector] = useState(false);
  const [currentSelectionIndex, setCurrentSelectionIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingClasses, setLoadingClasses] = useState(true);

  // Étape 1 : Charger les classes officielles de l'enseignant
  useEffect(() => {
    if (visible && step === 1) {
      loadClassesOfficielles();
    }
  }, [visible, step]);

  // Étape 2 : Charger les élèves de la classe officielle sélectionnée
  useEffect(() => {
    if (step === 2 && selectedClasseOfficielleId) {
      loadElevesOfficiels();
      initCorrespondances();
    }
  }, [step, selectedClasseOfficielleId]);

  const loadClassesOfficielles = async () => {
    setLoadingClasses(true);
    try {
      const { data, error } = await supabase
        .from('enseignant_classes')
        .select(`
          classe_id,
          classes!inner(
            id, nom, niveau,
            etablissements!inner(nom)
          )
        `)
        .eq('enseignant_id', user?.id)
        .eq('est_actif', true);

      if (error) throw error;

      const formatted = (data || []).map((item: any) => ({
        id: item.classes.id,
        nom: item.classes.nom,
        niveau: item.classes.niveau || 'Non spécifié',
        etablissement_nom: item.classes.etablissements.nom,
        effectif: 0
      }));

      setClassesOfficielles(formatted);
    } catch (error) {
      console.error('Error loading official classes:', error);
      Alert.alert('Erreur', 'Impossible de charger les classes officielles');
    } finally {
      setLoadingClasses(false);
    }
  };

  const loadElevesOfficiels = async () => {
    if (!selectedClasseOfficielleId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('eleves')
        .select('id, nom, prenom, matricule')
        .eq('classe_id', selectedClasseOfficielleId)
        .order('nom', { ascending: true });

      if (error) throw error;
      setElevesOfficiels(data || []);
    } catch (error) {
      console.error('Error loading official students:', error);
      Alert.alert('Erreur', 'Impossible de charger les élèves de la classe');
    } finally {
      setLoading(false);
    }
  };

  const initCorrespondances = () => {
    const corresp = elevesPersonnels.map((eleve, index) => {
      // Recherche automatique par nom + prénom
      const match = elevesOfficiels.find(e => 
        e.nom.toLowerCase() === eleve.nom.toLowerCase() && 
        e.prenom.toLowerCase() === eleve.prenom.toLowerCase()
      );
      
      return {
        elevePersonnelIndex: index,
        eleveOfficielId: match?.id || null,
        eleveOfficielNom: match?.nom || '',
        eleveOfficielPrenom: match?.prenom || ''
      };
    });
    setCorrespondances(corresp);
  };

  const openEleveSelector = (index: number) => {
    setCurrentSelectionIndex(index);
    setSearchQuery('');
    setShowEleveSelector(true);
  };

  const selectEleveOfficiel = (eleve: EleveOfficiel) => {
    if (currentSelectionIndex !== null) {
      const nouvelles = [...correspondances];
      nouvelles[currentSelectionIndex] = {
        ...nouvelles[currentSelectionIndex],
        eleveOfficielId: eleve.id,
        eleveOfficielNom: eleve.nom,
        eleveOfficielPrenom: eleve.prenom
      };
      setCorrespondances(nouvelles);
    }
    setShowEleveSelector(false);
    setCurrentSelectionIndex(null);
  };

  const handleSelectionClasse = (classeId: string, classeNom: string) => {
    setSelectedClasseOfficielleId(classeId);
    setSelectedClasseOfficielleNom(classeNom);
    setStep(2);
  };

  const handleTransfert = async () => {
    // Vérifier que tous les élèves sont associés
    const nonAssocies = correspondances.filter(c => !c.eleveOfficielId);
    if (nonAssocies.length > 0) {
      Alert.alert(
        'Associations incomplètes',
        `${nonAssocies.length} élève(s) non associé(s). Veuillez associer tous les élèves ou ignorez-les.`,
        [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: 'Ignorer et continuer', 
            onPress: () => executerTransfert()
          }
        ]
      );
    } else {
      executerTransfert();
    }
  };

  const executerTransfert = async () => {
    setLoading(true);
    try {
      // Construire le mapping des correspondances
      const mapping = correspondances
        .filter(c => c.eleveOfficielId)
        .map(c => ({
          elevePersonnel: elevesPersonnels[c.elevePersonnelIndex],
          eleveOfficielId: c.eleveOfficielId!
        }));

      // Transférer les notes
      const success = await transfererNotes(
        classePersonnelleId,
        selectedClasseOfficielleId!,
        mapping
      );

      if (success) {
        // Mettre à jour la classe personnelle avec rattachee_a
        const { error: updateError } = await supabase
          .from('classes_personnelles')
          .update({ rattachee_a: selectedClasseOfficielleId })
          .eq('id', classePersonnelleId);

        if (updateError) throw updateError;

        Alert.alert('Succès', `La classe "${classePersonnelleNom}" a été rattachée avec succès.`);
        onSuccess();
        onClose();
      } else {
        Alert.alert('Erreur', 'Le transfert des notes a échoué');
      }
    } catch (error) {
      console.error('Error during transfer:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du rattachement');
    } finally {
      setLoading(false);
    }
  };

  const filteredElevesOfficiels = elevesOfficiels.filter(eleve =>
    `${eleve.prenom} ${eleve.nom}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    eleve.matricule?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>Choisir la classe officielle cible</Text>
      <Text style={styles.stepDescription}>
        Sélectionnez la classe officielle vers laquelle vous souhaitez rattacher "{classePersonnelleNom}".
      </Text>

      {loadingClasses ? (
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
      ) : classesOfficielles.length === 0 ? (
        <Text style={styles.emptyText}>Aucune classe officielle trouvée</Text>
      ) : (
        classesOfficielles.map((classe) => (
          <TouchableOpacity
            key={classe.id}
            style={styles.classeCard}
            onPress={() => handleSelectionClasse(classe.id, classe.nom)}
          >
            <Building2 size={20} color={theme.colors.primary.DEFAULT} />
            <View style={styles.classeCardContent}>
              <Text style={styles.classeCardNom}>{classe.nom}</Text>
              <Text style={styles.classeCardDetails}>
                {classe.niveau} • {classe.etablissement_nom}
              </Text>
            </View>
            <ArrowRight size={18} color="#9CA3AF" />
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>Associer les élèves</Text>
      <Text style={styles.stepDescription}>
        Associez chaque élève de votre classe personnelle à un élève de la classe officielle "{selectedClasseOfficielleNom}".
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
      ) : (
        <>
          {correspondances.map((corresp, idx) => {
            const eleve = elevesPersonnels[corresp.elevePersonnelIndex];
            const estAssocie = !!corresp.eleveOfficielId;
            
            return (
              <TouchableOpacity
                key={idx}
                style={[styles.correspondanceRow, estAssocie && styles.correspondanceRowAssocie]}
                onPress={() => openEleveSelector(idx)}
              >
                <View style={styles.elevePersonnel}>
                  <Text style={styles.eleveNom}>{eleve.prenom} {eleve.nom}</Text>
                  {eleve.matricule && <Text style={styles.eleveMatricule}>{eleve.matricule}</Text>}
                </View>
                <ArrowRight size={16} color="#9CA3AF" />
                <View style={styles.eleveOfficielSelector}>
                  <Text style={estAssocie ? styles.eleveOfficielNom : styles.eleveOfficielEmpty}>
                    {estAssocie 
                      ? `${corresp.eleveOfficielPrenom} ${corresp.eleveOfficielNom}`
                      : 'Sélectionner un élève'
                    }
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity 
            style={[styles.transferButton, (transferLoading || loading) && styles.transferButtonDisabled]}
            onPress={handleTransfert}
            disabled={transferLoading || loading}
          >
            {(transferLoading || loading) ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Check size={18} color="#FFFFFF" />
                <Text style={styles.transferButtonText}>Confirmer le rattachement</Text>
              </>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );

  return (
    <>
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Rattacher à l'établissement</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.progressContainer}>
            <View style={[styles.progressStep, step >= 1 && styles.progressStepActive]}>
              <Text style={[styles.progressStepNumber, step >= 1 && styles.progressStepNumberActive]}>1</Text>
              <Text style={styles.progressStepLabel}>Classe cible</Text>
            </View>
            <View style={styles.progressLine} />
            <View style={[styles.progressStep, step >= 2 && styles.progressStepActive]}>
              <Text style={[styles.progressStepNumber, step >= 2 && styles.progressStepNumberActive]}>2</Text>
              <Text style={styles.progressStepLabel}>Associations</Text>
            </View>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
          </ScrollView>
        </View>
      </Modal>

      {/* Modal de sélection d'élève */}
      <Modal visible={showEleveSelector} animationType="slide" transparent onRequestClose={() => setShowEleveSelector(false)}>
        <View style={styles.selectorOverlay}>
          <View style={styles.selectorContainer}>
            <View style={styles.selectorHeader}>
              <Text style={styles.selectorTitle}>Choisir un élève</Text>
              <TouchableOpacity onPress={() => setShowEleveSelector(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBar}>
              <Search size={16} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher un élève..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <FlatList
              data={filteredElevesOfficiels}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.selectorItem}
                  onPress={() => selectEleveOfficiel(item)}
                >
                  <View>
                    <Text style={styles.selectorItemName}>{item.prenom} {item.nom}</Text>
                    {item.matricule && (
                      <Text style={styles.selectorItemMatricule}>{item.matricule}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Aucun élève trouvé</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  progressStep: {
    alignItems: 'center',
  },
  progressStepActive: {
    opacity: 1,
  },
  progressStepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    textAlign: 'center',
    lineHeight: 28,
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  progressStepNumberActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
    color: '#FFFFFF',
  },
  progressStepLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 12,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  classeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  classeCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  classeCardNom: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  classeCardDetails: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  correspondanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  correspondanceRowAssocie: {
    backgroundColor: '#F0FDF4',
    borderColor: '#D1FAE5',
  },
  elevePersonnel: {
    flex: 1,
  },
  eleveNom: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  eleveMatricule: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  eleveOfficielSelector: {
    flex: 1,
    marginLeft: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
  },
  eleveOfficielNom: {
    fontSize: 13,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  eleveOfficielEmpty: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    paddingVertical: 20,
  },
  transferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 24,
  },
  transferButtonDisabled: {
    opacity: 0.6,
  },
  transferButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  selectorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  selectorContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  selectorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  selectorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    margin: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  selectorItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  selectorItemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  selectorItemMatricule: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
});