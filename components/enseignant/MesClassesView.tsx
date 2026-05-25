// /home/project/components/enseignant/MesClassesView.tsx
// Phase 1 – Version complète corrigée
// Onglet "Officielles" toujours visible mais accessible uniquement si l'enseignant a un établissement
// Avec persistance du dernier onglet actif (AsyncStorage)
// AJOUT : Gestion des matières pour classes personnelles avec composant existant
// AJOUT : Modification de l'établissement dans le modal d'édition

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput, Modal, Alert } from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveEtablissement } from '@/hooks/useActiveEtablissement';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Card } from '@/components/Card';
import ClassePersonnelleCard from '@/components/classes/ClassePersonnelleCard';
import ClassePersonnelleForm from '@/components/classes/ClassePersonnelleForm';
import ClasseDetailModal from './ClasseDetailModal';
import ElevesListModal from './ElevesListModal';
import GestionElevesPersonnels from '@/components/classes/GestionElevesPersonnels';
import GestionMatieresPersonnelles from '@/components/classes/GestionMatieresPersonnelles';
import ClassePersonnelleDetailModal from '@/components/classes/ClassePersonnelleDetailModal';
import EtablissementSearchModal from '@/components/etablissement/EtablissementSearchModal';
import { Building2, Users, BookOpen, Plus, Search, ChevronDown, X, Save } from 'lucide-react-native';
import theme from '@/constants/theme';
import { useClassesPersonnelles } from '@/hooks/useClassesPersonnelles';
import { useRouter } from 'expo-router';
import { exportElevesToCSV, exportMatieresToCSV } from '@/utils/exportCSV';

const STORAGE_KEY = '@MesClasses_last_tab';

interface ClasseOfficielle {
  id: string;
  nom: string;
  niveau: string;
  effectif: number;
  etablissement_id: string;
  etablissement_nom: string;
  enseignant_principal_nom?: string;
  matieres?: Array<{ id: string; nom: string; coefficient: number }>;
}

interface ClassePersonnelle {
  id: string;
  enseignant_id: string;
  nom: string;
  description: string | null;
  matieres: any[];
  eleves: any[];
  rattachee_a: string | null;
  etablissement_nom: string | null;
  etablissement_id: string | null;
  created_at: string;
  updated_at: string;
}

export default function MesClassesView() {
  const { user, primaryRole, roles } = useAuth();
  const { activeEtablissement } = useActiveEtablissement();
  const router = useRouter();
  const { classes: classesPersonnelles, loading: loadingPersonnelles, createClasse, deleteClasse, updateClasse, refresh: refreshPersonnelles } = useClassesPersonnelles();
  
  const [classesOfficielles, setClassesOfficielles] = useState<ClasseOfficielle[]>([]);
  const [loadingOfficielles, setLoadingOfficielles] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNiveau, setSelectedNiveau] = useState<string>('tous');
  const [activeTab, setActiveTab] = useState<'officielles' | 'personnelles'>('officielles');
  const [showPersonnelleForm, setShowPersonnelleForm] = useState(false);
  const [showNiveauFilter, setShowNiveauFilter] = useState(false);
  
  // Modals
  const [selectedClasseOfficielle, setSelectedClasseOfficielle] = useState<ClasseOfficielle | null>(null);
  const [showClasseDetail, setShowClasseDetail] = useState(false);
  const [selectedClassePersonnelle, setSelectedClassePersonnelle] = useState<ClassePersonnelle | null>(null);
  const [showClassePersonnelleDetail, setShowClassePersonnelleDetail] = useState(false);
  const [showElevesList, setShowElevesList] = useState(false);
  const [currentEleves, setCurrentEleves] = useState<any[]>([]);
  const [currentClasseNom, setCurrentClasseNom] = useState('');
  const [currentClasseId, setCurrentClasseId] = useState('');
  const [currentClasseType, setCurrentClasseType] = useState<'officielle' | 'personnelle'>('officielle');
  const [showGestionEleves, setShowGestionEleves] = useState(false);
  
  // États pour la gestion des matières
  const [showGestionMatieres, setShowGestionMatieres] = useState(false);
  const [currentClasseMatieres, setCurrentClasseMatieres] = useState<any[]>([]);
  
  // États pour la modification de la classe personnelle
  const [currentClasseForEdit, setCurrentClasseForEdit] = useState<ClassePersonnelle | null>(null);
  const [showEditClasseModal, setShowEditClasseModal] = useState(false);
  const [editClasseNom, setEditClasseNom] = useState('');
  const [editClasseDescription, setEditClasseDescription] = useState('');
  const [editEtablissementNom, setEditEtablissementNom] = useState('');
  const [editEtablissementId, setEditEtablissementId] = useState<string | null>(null);
  const [showEditEtablissementSearch, setShowEditEtablissementSearch] = useState(false);

  // Déterminer si l'enseignant a accès aux classes officielles
  const aUnEtablissement = !!activeEtablissement;
  const peutAccederOfficielles = aUnEtablissement;

  const niveauxDisponibles = ['tous', '6ème', '5ème', '4ème', '3ème', 'Seconde', 'Première', 'Terminale', 'Autre'];

  // Charger le dernier onglet sauvegardé
  useEffect(() => {
    const loadLastTab = async () => {
      try {
        const savedTab = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedTab === 'officielles' || savedTab === 'personnelles') {
          setActiveTab(savedTab);
        }
      } catch (error) {
        console.error('Error loading last tab:', error);
      }
    };
    loadLastTab();
  }, []);

  // Sauvegarder l'onglet actif à chaque changement
  const handleTabChange = (tab: 'officielles' | 'personnelles') => {
    setActiveTab(tab);
    AsyncStorage.setItem(STORAGE_KEY, tab).catch(console.error);
  };

  // Charger les classes officielles
  const loadClassesOfficielles = useCallback(async () => {
    if (!user || !peutAccederOfficielles) {
      setClassesOfficielles([]);
      setLoadingOfficielles(false);
      return;
    }

    setLoadingOfficielles(true);
    try {
      const { data: enseignantClasses, error: ecError } = await supabase
        .from('enseignant_classes')
        .select(`
          classe_id,
          classes!inner(
            id,
            nom,
            niveau,
            etablissement_id,
            enseignant_principal_id,
            etablissements!inner(id, nom)
          )
        `)
        .eq('enseignant_id', user.id)
        .eq('est_actif', true);

      if (ecError) throw ecError;

      if (!enseignantClasses || enseignantClasses.length === 0) {
        setClassesOfficielles([]);
        setLoadingOfficielles(false);
        return;
      }

      const classesWithData = await Promise.all(
        enseignantClasses.map(async (item: any) => {
          const classe = item.classes;
          
          const { count, error: countError } = await supabase
            .from('eleves')
            .select('*', { count: 'exact', head: true })
            .eq('classe_id', classe.id);

          const { data: matieres, error: matieresError } = await supabase
            .from('matieres')
            .select('id, nom, coefficient')
            .eq('etablissement_id', classe.etablissement_id);

          let principalNom = '';
          if (classe.enseignant_principal_id) {
            const { data: prof } = await supabase
              .from('profiles')
              .select('nom, prenom')
              .eq('id', classe.enseignant_principal_id)
              .single();
            if (prof) {
              principalNom = `${prof.prenom} ${prof.nom}`;
            }
          }

          return {
            id: classe.id,
            nom: classe.nom,
            niveau: classe.niveau || 'Non spécifié',
            effectif: countError ? 0 : (count || 0),
            etablissement_id: classe.etablissement_id,
            etablissement_nom: classe.etablissements?.nom || 'Établissement',
            enseignant_principal_nom: principalNom || undefined,
            matieres: matieresError ? [] : matieres
          };
        })
      );

      setClassesOfficielles(classesWithData);
    } catch (error) {
      console.error('Error loading official classes:', error);
    } finally {
      setLoadingOfficielles(false);
    }
  }, [user, peutAccederOfficielles]);

  useEffect(() => {
    loadClassesOfficielles();
  }, [loadClassesOfficielles]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadClassesOfficielles(), refreshPersonnelles()]);
    setRefreshing(false);
  }, [loadClassesOfficielles, refreshPersonnelles]);

  const handleCliqueOfficielle = (classe: ClasseOfficielle) => {
    setSelectedClasseOfficielle(classe);
    setShowClasseDetail(true);
  };

  const handleCliquePersonnelle = (classe: ClassePersonnelle) => {
    console.log('🔴🔴🔴 Clic détecté sur:', classe.nom);
    setSelectedClassePersonnelle(classe);
    setShowClassePersonnelleDetail(true);
  };

  const handleVoirEleves = async (classeId: string, classeNom: string, type: 'officielle' | 'personnelle') => {
    setCurrentClasseNom(classeNom);
    setCurrentClasseId(classeId);
    setCurrentClasseType(type);
    
    if (type === 'officielle') {
      const { data: eleves, error } = await supabase
        .from('eleves')
        .select('id, nom, prenom, matricule')
        .eq('classe_id', classeId)
        .order('nom', { ascending: true });
      
      if (!error && eleves) {
        setCurrentEleves(eleves);
        setShowElevesList(true);
      }
    } else if (type === 'personnelle') {
      const classe = classesPersonnelles.find(c => c.id === classeId);
      if (classe?.eleves) {
        setCurrentEleves(classe.eleves);
        setShowElevesList(true);
      }
    }
  };

  const handleGererElevesPersonnelle = () => {
    setShowClassePersonnelleDetail(false);
    setShowGestionEleves(true);
  };

  const handleGestionElevesSuccess = () => {
    setShowGestionEleves(false);
    refreshPersonnelles();
    if (selectedClassePersonnelle) {
      setSelectedClassePersonnelle(null);
    }
  };

  const handleCreatePersonnelleSuccess = () => {
    setShowPersonnelleForm(false);
    refreshPersonnelles();
  };

  // Gestion des matières
  const handleGererMatieres = (classe: ClassePersonnelle) => {
    setCurrentClasseId(classe.id);
    setCurrentClasseMatieres(classe.matieres || []);
    setShowGestionMatieres(true);
  };

  const handleGestionMatieresSuccess = () => {
    setShowGestionMatieres(false);
    refreshPersonnelles();
  };

  // Modification de la classe personnelle
  const handleEditClasse = (classe: ClassePersonnelle) => {
    setCurrentClasseForEdit(classe);
    setEditClasseNom(classe.nom);
    setEditClasseDescription(classe.description || '');
    setEditEtablissementNom(classe.etablissement_nom || '');
    setEditEtablissementId(classe.etablissement_id || null);
    setShowEditClasseModal(true);
  };

  const handleSaveEditClasse = async () => {
    if (!editClasseNom.trim()) {
      Alert.alert('Erreur', 'Le nom de la classe est requis');
      return;
    }

    const updateData: any = {
      nom: editClasseNom.trim(),
      description: editClasseDescription.trim() || null,
    };

    if (editEtablissementId) {
      updateData.etablissement_id = editEtablissementId;
      updateData.etablissement_nom = editEtablissementNom;
    } else if (editEtablissementNom.trim()) {
      updateData.etablissement_nom = editEtablissementNom.trim();
      updateData.etablissement_id = null;
    }

    const success = await updateClasse(currentClasseForEdit!.id, updateData);

    if (success) {
      Alert.alert('Succès', 'Classe modifiée avec succès');
      setShowEditClasseModal(false);
      setCurrentClasseForEdit(null);
      refreshPersonnelles();
    } else {
      Alert.alert('Erreur', 'Impossible de modifier la classe');
    }
  };

  // Filtrage
  const filteredOfficielles = classesOfficielles.filter(classe => {
    const matchNom = classe.nom.toLowerCase().includes(searchQuery.toLowerCase());
    const matchNiveau = selectedNiveau === 'tous' || classe.niveau === selectedNiveau;
    return matchNom && matchNiveau;
  });

  const filteredPersonnelles = classesPersonnelles.filter(classe =>
    classe.nom.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isLoading = (loadingOfficielles && peutAccederOfficielles) || loadingPersonnelles;

  if (isLoading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement de vos classes...</Text>
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
          <Text style={styles.title}>Mes classes</Text>
          <Text style={styles.subtitle}>
            Gérez vos classes et suivez vos élèves
          </Text>
        </View>

        {/* Barre de recherche */}
        <View style={styles.searchBar}>
          <Search size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une classe..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity onPress={() => setShowNiveauFilter(!showNiveauFilter)}>
            <ChevronDown size={18} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Filtre par niveau (uniquement si accès aux officielles) */}
        {showNiveauFilter && peutAccederOfficielles && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.niveauFilterContainer}>
            {niveauxDisponibles.map((niveau) => (
              <TouchableOpacity
                key={niveau}
                style={[styles.niveauChip, selectedNiveau === niveau && styles.niveauChipActive]}
                onPress={() => setSelectedNiveau(niveau)}
              >
                <Text style={[styles.niveauChipText, selectedNiveau === niveau && styles.niveauChipTextActive]}>
                  {niveau === 'tous' ? 'Tous niveaux' : niveau}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Onglets (toujours visibles) */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'officielles' && styles.tabActive]}
            onPress={() => handleTabChange('officielles')}
          >
            <Building2 size={16} color={activeTab === 'officielles' ? '#FFFFFF' : '#6B7280'} />
            <Text style={[styles.tabText, activeTab === 'officielles' && styles.tabTextActive]}>
              Officielles ({peutAccederOfficielles ? filteredOfficielles.length : 0})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'personnelles' && styles.tabActive]}
            onPress={() => handleTabChange('personnelles')}
          >
            <BookOpen size={16} color={activeTab === 'personnelles' ? '#FFFFFF' : '#6B7280'} />
            <Text style={[styles.tabText, activeTab === 'personnelles' && styles.tabTextActive]}>
              Personnelles ({filteredPersonnelles.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Classes officielles */}
        {activeTab === 'officielles' && (
          <>
            {!peutAccederOfficielles ? (
              <Card style={styles.emptyCard}>
                <Building2 size={48} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>Aucune classe officielle</Text>
                <Text style={styles.emptyText}>
                  Vous n'avez jamais été affilié à un établissement. Les classes officielles ne sont pas accessibles.
                </Text>
                <Text style={styles.emptySubtext}>
                  En mode indépendant, vous pouvez créer vos propres classes personnelles.
                </Text>
              </Card>
            ) : filteredOfficielles.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Building2 size={48} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>
                  {searchQuery || selectedNiveau !== 'tous' ? 'Aucun résultat' : 'Aucune classe officielle'}
                </Text>
                <Text style={styles.emptyText}>
                  {searchQuery || selectedNiveau !== 'tous' 
                    ? 'Aucune classe ne correspond à vos critères.'
                    : 'Vous n\'êtes pas encore rattaché à une classe officielle.'}
                </Text>
              </Card>
            ) : (
              filteredOfficielles.map((classe) => (
                <Card key={classe.id} style={styles.classeCard}>
                  <TouchableOpacity onPress={() => handleCliqueOfficielle(classe)}>
                    <View style={styles.classeHeader}>
                      <View style={styles.classeHeaderLeft}>
                        <Building2 size={18} color="#3B82F6" />
                        <Text style={styles.classeNom}>{classe.nom}</Text>
                      </View>
                      <View style={styles.officielBadge}>
                        <Text style={styles.officielBadgeText}>Officiel</Text>
                      </View>
                    </View>
                    
                    {classe.niveau && classe.niveau !== 'Non spécifié' && (
                      <Text style={styles.classeNiveau}>{classe.niveau}</Text>
                    )}
                    
                    <View style={styles.classeStats}>
                      <View style={styles.statItem}>
                        <Users size={14} color="#6B7280" />
                        <Text style={styles.statText}>{classe.effectif} élèves</Text>
                      </View>
                      <View style={styles.statItem}>
                        <Building2 size={14} color="#6B7280" />
                        <Text style={styles.statText}>{classe.etablissement_nom}</Text>
                      </View>
                    </View>
                    
                    {classe.enseignant_principal_nom && (
                      <Text style={styles.principalText}>
                        PP : {classe.enseignant_principal_nom}
                      </Text>
                    )}
                    
                    <View style={styles.classeActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleVoirEleves(classe.id, classe.nom, 'officielle')}
                      >
                        <Users size={14} color={theme.colors.primary.DEFAULT} />
                        <Text style={styles.actionButtonText}>Élèves</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => router.push(`/notes?classeId=${classe.id}`)}
                      >
                        <BookOpen size={14} color={theme.colors.primary.DEFAULT} />
                        <Text style={styles.actionButtonText}>Notes</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                </Card>
              ))
            )}
          </>
        )}

        {/* Classes personnelles */}
        {activeTab === 'personnelles' && (
          <>
            <TouchableOpacity
              style={styles.createPersonnelleButton}
              onPress={() => setShowPersonnelleForm(true)}
            >
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.createPersonnelleButtonText}>Nouvelle classe personnelle</Text>
            </TouchableOpacity>

            {filteredPersonnelles.length === 0 ? (
              <Card style={styles.emptyCard}>
                <BookOpen size={48} color="#9CA3AF" />
                <Text style={styles.emptyTitle}>
                  {searchQuery ? 'Aucun résultat' : 'Aucune classe personnelle'}
                </Text>
                <Text style={styles.emptyText}>
                  {searchQuery 
                    ? 'Aucune classe ne correspond à votre recherche.'
                    : 'Créez votre première classe personnelle pour commencer.'}
                </Text>
              </Card>
            ) : (
              filteredPersonnelles.map((classe) => (
                <ClassePersonnelleCard
                  key={classe.id}
                  classe={classe}
                  onPress={() => handleCliquePersonnelle(classe)}
                  onEdit={() => handleEditClasse(classe)}
                  onDelete={() => deleteClasse(classe.id)}
                  onExport={() => {
                    exportElevesToCSV(classe.eleves, classe.nom);
                    exportMatieresToCSV(classe.matieres, classe.nom);
                    Alert.alert('Succès', `Export des données de ${classe.nom} lancé`);
                  }}
                  onManageEleves={() => handleVoirEleves(classe.id, classe.nom, 'personnelle')}
                  onManageMatieres={() => handleGererMatieres(classe)}
                  onPressDetails={() => handleCliquePersonnelle(classe)}
                  onViewNotes={() => router.push(`/notes?classePersonnelleId=${classe.id}`)}
                />
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Modal détail classe officielle */}
      <ClasseDetailModal
        visible={showClasseDetail}
        classe={selectedClasseOfficielle}
        onClose={() => {
          setShowClasseDetail(false);
          setSelectedClasseOfficielle(null);
        }}
        onVoirEleves={() => {
          if (selectedClasseOfficielle) {
            setShowClasseDetail(false);
            handleVoirEleves(selectedClasseOfficielle.id, selectedClasseOfficielle.nom, 'officielle');
          }
        }}
      />

      {/* Modal détail classe personnelle */}
      <ClassePersonnelleDetailModal
        visible={showClassePersonnelleDetail}
        classeId={selectedClassePersonnelle?.id || ''}
        onClose={() => {
          setShowClassePersonnelleDetail(false);
          setSelectedClassePersonnelle(null);
        }}
        onRefresh={() => {
          refreshPersonnelles();
        }}
      />

      {/* Modal liste des élèves */}
      <ElevesListModal
        visible={showElevesList}
        eleves={currentEleves}
        classeNom={currentClasseNom}
        classeId={currentClasseId}
        classeType={currentClasseType}
        onClose={() => {
          setShowElevesList(false);
          setCurrentEleves([]);
          setCurrentClasseNom('');
        }}
      />

      {/* Modal gestion des élèves (classe personnelle) */}
      <Modal visible={showGestionEleves} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowGestionEleves(false)}>
        <View style={styles.gestionContainer}>
          <View style={styles.gestionHeader}>
            <Text style={styles.gestionTitle}>Gérer les élèves - {selectedClassePersonnelle?.nom}</Text>
            <TouchableOpacity onPress={() => setShowGestionEleves(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          {selectedClassePersonnelle && (
            <GestionElevesPersonnels
              classeId={selectedClassePersonnelle.id}
              eleves={selectedClassePersonnelle.eleves || []}
              onRefresh={handleGestionElevesSuccess}
            />
          )}
        </View>
      </Modal>

      {/* Modal gestion des matières (classe personnelle) */}
      <Modal visible={showGestionMatieres} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowGestionMatieres(false)}>
        <View style={styles.gestionContainer}>
          <View style={styles.gestionHeader}>
            <Text style={styles.gestionTitle}>Gérer les matières</Text>
            <TouchableOpacity onPress={() => setShowGestionMatieres(false)}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <GestionMatieresPersonnelles
            classeId={currentClasseId}
            matieres={currentClasseMatieres}
            onRefresh={handleGestionMatieresSuccess}
          />
        </View>
      </Modal>

      {/* Modal modification de la classe personnelle */}
      <Modal visible={showEditClasseModal} animationType="slide" transparent onRequestClose={() => setShowEditClasseModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier la classe</Text>
              <TouchableOpacity onPress={() => setShowEditClasseModal(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <Text style={styles.inputLabel}>Nom de la classe *</Text>
              <TextInput
                style={styles.input}
                value={editClasseNom}
                onChangeText={setEditClasseNom}
                placeholder="Nom de la classe"
              />

              <Text style={styles.inputLabel}>Description (optionnelle)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editClasseDescription}
                onChangeText={setEditClasseDescription}
                placeholder="Description de la classe"
                multiline
                numberOfLines={3}
              />

              <Text style={styles.inputLabel}>Établissement</Text>
              <TouchableOpacity
                style={styles.etablissementButton}
                onPress={() => setShowEditEtablissementSearch(true)}
              >
                <Building2 size={16} color={theme.colors.primary.DEFAULT} />
                <Text style={editEtablissementNom ? styles.etablissementText : styles.etablissementPlaceholder}>
                  {editEtablissementNom || 'Rechercher un établissement'}
                </Text>
              </TouchableOpacity>
              {editEtablissementNom && (
                <TouchableOpacity onPress={() => { setEditEtablissementNom(''); setEditEtablissementId(null); }}>
                  <Text style={styles.clearText}>Effacer</Text>
                </TouchableOpacity>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowEditClasseModal(false)}>
                  <Text style={styles.modalCancelText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSaveButton} onPress={handleSaveEditClasse}>
                  <Save size={16} color="#FFFFFF" />
                  <Text style={styles.modalSaveText}>Enregistrer</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal recherche établissement pour modification */}
      <EtablissementSearchModal
        visible={showEditEtablissementSearch}
        onClose={() => setShowEditEtablissementSearch(false)}
        onSelect={(etablissement) => {
          setEditEtablissementNom(etablissement.nom);
          setEditEtablissementId(etablissement.id);
          setShowEditEtablissementSearch(false);
        }}
      />

      {/* Formulaire de création de classe personnelle */}
      {showPersonnelleForm && (
        <ClassePersonnelleForm
          onSuccess={handleCreatePersonnelleSuccess}
          onCancel={() => setShowPersonnelleForm(false)}
        />
      )}
    </>
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  header: {
    marginBottom: 16,
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  niveauFilterContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  niveauChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  niveauChipActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  niveauChipText: {
    fontSize: 12,
    color: '#6B7280',
  },
  niveauChipTextActive: {
    color: '#FFFFFF',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  createPersonnelleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8B5CF6',
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  createPersonnelleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  classeCard: {
    padding: 16,
    marginBottom: 12,
  },
  classeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  classeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  classeNom: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  officielBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  officielBadgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  classeNiveau: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  classeStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: '#6B7280',
  },
  principalText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  classeActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    fontSize: 12,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  modalContent: {
    padding: 16,
  },
  modalDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    marginTop: 16,
  },
  modalMatiereRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalMatiereNom: {
    fontSize: 14,
    color: '#1F2937',
  },
  modalMatiereCoef: {
    fontSize: 12,
    color: '#6B7280',
  },
  modalEmptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 16,
  },
  modalStatText: {
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 16,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  gestionContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  gestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  gestionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  etablissementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  etablissementText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  etablissementPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: '#9CA3AF',
  },
  clearText: {
    fontSize: 12,
    color: '#EF4444',
    textAlign: 'right',
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  modalCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  modalCancelText: {
    fontSize: 14,
    color: '#6B7280',
  },
  modalSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalSaveText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});