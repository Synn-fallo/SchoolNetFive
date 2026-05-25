// /home/project/components/classes/GroupeDetailModal.tsx

import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { X, User, BookOpen, Users, Search, ChevronDown, ChevronUp, Circle, Plus, Trash2, Check } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import theme from '@/constants/theme';

interface GroupeDetailModalProps {
  visible: boolean;
  onClose: () => void;
  groupeId: string;
  groupeNom: string;
  classeId: string;
}

interface Eleve {
  id: string;
  matricule: string;
  prenom?: string;
  nom?: string;
  statut?: string;
}

interface EleveDisponible {
  id: string;
  matricule: string;
  prenom?: string;
  nom?: string;
  statut?: string;
}

interface Enseignant {
  id: string;
  nom: string;
  prenom: string;
  matiere_nom: string;
}

type SortField = 'nom' | 'matricule';
type SortOrder = 'asc' | 'desc';

export default function GroupeDetailModal({
  visible,
  onClose,
  groupeId,
  groupeNom,
  classeId,
}: GroupeDetailModalProps) {
  const router = useRouter();
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [filteredEleves, setFilteredEleves] = useState<Eleve[]>([]);
  const [enseignant, setEnseignant] = useState<Enseignant | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  
  // Ajout d'élève
  const [showAddModal, setShowAddModal] = useState(false);
  const [elevesDisponibles, setElevesDisponibles] = useState<EleveDisponible[]>([]);
  const [filteredDisponibles, setFilteredDisponibles] = useState<EleveDisponible[]>([]);
  const [selectedEleveIds, setSelectedEleveIds] = useState<Set<string>>(new Set());
  const [searchDisponibleQuery, setSearchDisponibleQuery] = useState('');

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ eleveId: string; eleveNom: string } | null>(null);
  
  // Recherche
  const [searchQuery, setSearchQuery] = useState('');
  
  // Tri
  const [sortField, setSortField] = useState<SortField>('nom');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredEleves.length / itemsPerPage);
  const paginatedEleves = filteredEleves.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => {
    if (visible && groupeId) {
      loadData();
    }
  }, [visible, groupeId]);

  useEffect(() => {
    filterAndSortEleves();
  }, [searchQuery, eleves, sortField, sortOrder]);

  useEffect(() => {
    if (showAddModal && classeId) {
      loadElevesDisponibles();
    }
  }, [showAddModal, classeId]);

  useEffect(() => {
    filterDisponibles();
  }, [searchDisponibleQuery, elevesDisponibles]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadEleves(), loadEnseignant()]);
    } catch (error) {
      console.error('Error loading groupe details:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEleves = async () => {
    try {
      const { data: liens, error: liensError } = await supabase
        .from('eleve_groupes')
        .select('eleve_id')
        .eq('groupe_id', groupeId);

      if (liensError) throw liensError;

      if (!liens || liens.length === 0) {
        setEleves([]);
        setFilteredEleves([]);
        return;
      }

      const eleveIds = liens.map(l => l.eleve_id);

      const { data: elevesData, error: elevesError } = await supabase
        .from('eleves')
        .select('id, matricule, user_id, statut')
        .in('id', eleveIds);

      if (elevesError) throw elevesError;

      if (!elevesData || elevesData.length === 0) {
        setEleves([]);
        setFilteredEleves([]);
        return;
      }

      const userIds = elevesData.map(e => e.user_id).filter(Boolean);
      let profileMap = new Map();

      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, nom, prenom')
          .in('id', userIds);

        if (!profilesError && profilesData) {
          profilesData.forEach(p => {
            profileMap.set(p.id, { nom: p.nom || '', prenom: p.prenom || '' });
          });
        }
      }

      const formattedEleves: Eleve[] = elevesData.map(e => {
        const profile = profileMap.get(e.user_id);
        return {
          id: e.id,
          matricule: e.matricule || '',
          prenom: profile?.prenom,
          nom: profile?.nom,
          statut: e.statut || 'inconnu',
        };
      });

      setEleves(formattedEleves);
      setFilteredEleves(formattedEleves);
    } catch (error) {
      console.error('Error loading eleves:', error);
      setEleves([]);
      setFilteredEleves([]);
    }
  };

  const loadElevesDisponibles = async () => {
    try {
      // 1. Récupérer tous les groupes de la classe
      const { data: tousLesGroupes, error: groupesError } = await supabase
        .from('groupes_eleves')
        .select('id')
        .eq('classe_id', classeId);

      if (groupesError) throw groupesError;

      const tousLesGroupesIds = tousLesGroupes?.map(g => g.id) || [];

      // 2. Récupérer les élèves qui ont déjà un groupe
      let elevesAvecGroupeIds = new Set<string>();
      
      if (tousLesGroupesIds.length > 0) {
        const { data: elevesAvecGroupe, error: elevesAvecGroupeError } = await supabase
          .from('eleve_groupes')
          .select('eleve_id')
          .in('groupe_id', tousLesGroupesIds);

        if (!elevesAvecGroupeError && elevesAvecGroupe) {
          elevesAvecGroupeIds = new Set(elevesAvecGroupe.map(eg => eg.eleve_id));
        }
      }

      // 3. Récupérer tous les élèves de la classe
      const { data: elevesClasse, error: elevesError } = await supabase
        .from('eleves')
        .select('id, matricule, user_id, statut')
        .eq('classe_id', classeId);

      if (elevesError) throw elevesError;

      if (!elevesClasse || elevesClasse.length === 0) {
        setElevesDisponibles([]);
        setFilteredDisponibles([]);
        return;
      }

      // 4. Filtrer les élèves sans groupe
      const elevesNonAssignes = elevesClasse.filter(e => !elevesAvecGroupeIds.has(e.id));

      if (elevesNonAssignes.length === 0) {
        setElevesDisponibles([]);
        setFilteredDisponibles([]);
        return;
      }

      const userIds = elevesNonAssignes.map(e => e.user_id).filter(Boolean);
      let profileMap = new Map();

      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, nom, prenom')
          .in('id', userIds);

        if (!profilesError && profilesData) {
          profilesData.forEach(p => {
            profileMap.set(p.id, { nom: p.nom || '', prenom: p.prenom || '' });
          });
        }
      }

      const formattedEleves: EleveDisponible[] = elevesNonAssignes.map(e => {
        const profile = profileMap.get(e.user_id);
        return {
          id: e.id,
          matricule: e.matricule || '',
          prenom: profile?.prenom,
          nom: profile?.nom,
          statut: e.statut || 'inconnu',
        };
      });

      setElevesDisponibles(formattedEleves);
      setFilteredDisponibles(formattedEleves);
    } catch (error) {
      console.error('Error loading eleves disponibles:', error);
      setElevesDisponibles([]);
      setFilteredDisponibles([]);
    }
  };

  // ✅ CORRECTION: Chargement de l'enseignant sans jointures incorrectes
  const loadEnseignant = async () => {
    try {
      // 1. Récupérer l'enseignant du groupe
      const { data, error } = await supabase
        .from('enseignant_groupes')
        .select('enseignant_id, matiere_id')
        .eq('groupe_id', groupeId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setEnseignant(null);
        return;
      }

      // 2. Récupérer les infos de l'enseignant
      let enseignantNom = '';
      let enseignantPrenom = '';

      if (data.enseignant_id) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('nom, prenom')
          .eq('id', data.enseignant_id)
          .maybeSingle();

        if (!profileError && profileData) {
          enseignantNom = profileData.nom || '';
          enseignantPrenom = profileData.prenom || '';
        }
      }

      // 3. Récupérer le nom de la matière
      let matiereNom = '';
      if (data.matiere_id) {
        const { data: matiereData, error: matiereError } = await supabase
          .from('matieres')
          .select('nom')
          .eq('id', data.matiere_id)
          .maybeSingle();

        if (!matiereError && matiereData) {
          matiereNom = matiereData.nom || '';
        }
      }

      setEnseignant({
        id: data.enseignant_id,
        nom: enseignantNom,
        prenom: enseignantPrenom,
        matiere_nom: matiereNom,
      });
    } catch (error) {
      console.error('Error loading enseignant:', error);
      setEnseignant(null);
    }
  };

  const filterAndSortEleves = () => {
    let filtered = [...eleves];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        e => 
          (e.prenom && e.prenom.toLowerCase().includes(query)) ||
          (e.nom && e.nom.toLowerCase().includes(query)) ||
          (e.matricule && e.matricule.toLowerCase().includes(query))
      );
    }
    
    filtered.sort((a, b) => {
      let valueA: string;
      let valueB: string;
      
      if (sortField === 'nom') {
        valueA = `${a.prenom || ''} ${a.nom || ''}`.toLowerCase();
        valueB = `${b.prenom || ''} ${b.nom || ''}`.toLowerCase();
      } else {
        valueA = a.matricule?.toLowerCase() || '';
        valueB = b.matricule?.toLowerCase() || '';
      }
      
      if (sortOrder === 'asc') {
        return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
      } else {
        return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
      }
    });
    
    setFilteredEleves(filtered);
    setCurrentPage(1);
  };

  const filterDisponibles = () => {
    let filtered = [...elevesDisponibles];
    
    if (searchDisponibleQuery.trim()) {
      const query = searchDisponibleQuery.toLowerCase();
      filtered = filtered.filter(
        e => 
          (e.prenom && e.prenom.toLowerCase().includes(query)) ||
          (e.nom && e.nom.toLowerCase().includes(query)) ||
          (e.matricule && e.matricule.toLowerCase().includes(query))
      );
    }
    
    setFilteredDisponibles(filtered);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const toggleSelectEleve = (eleveId: string) => {
    const newSelected = new Set(selectedEleveIds);
    if (newSelected.has(eleveId)) {
      newSelected.delete(eleveId);
    } else {
      newSelected.add(eleveId);
    }
    setSelectedEleveIds(newSelected);
  };

  const handleAddEleves = async () => {
    if (selectedEleveIds.size === 0) {
      Alert.alert('Aucune sélection', 'Veuillez sélectionner au moins un élève');
      return;
    }

    setLoadingAction(true);
    try {
      const inserts = Array.from(selectedEleveIds).map(eleveId => ({
        eleve_id: eleveId,
        groupe_id: groupeId,
      }));

      const { error } = await supabase
        .from('eleve_groupes')
        .insert(inserts);

      if (error) throw error;

      Alert.alert('Succès', `${selectedEleveIds.size} élève(s) ajouté(s) au groupe`);
      
      setShowAddModal(false);
      setSelectedEleveIds(new Set());
      setSearchDisponibleQuery('');
      await loadEleves();
    } catch (error) {
      console.error('Error adding eleves:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter les élèves');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRemoveEleve = (eleveId: string, eleveNom: string) => {
    setConfirmAction({ eleveId, eleveNom });
    setShowConfirmModal(true);
  };
  
  const executeRemoveEleve = async () => {
    if (!confirmAction) return;
    
    const { eleveId, eleveNom } = confirmAction;
    console.log('🟢 Suppression confirmée - eleveId:', eleveId);
    
    setLoadingAction(true);
    try {
      const { error } = await supabase
        .from('eleve_groupes')
        .delete()
        .eq('eleve_id', eleveId)
        .eq('groupe_id', groupeId);
  
      if (error) throw error;
  
      await loadEleves();
      Alert.alert('Succès', `${eleveNom} a été retiré du groupe`);
    } catch (error) {
      console.error('❌ Error removing eleve:', error);
      Alert.alert('Erreur', 'Impossible de retirer l\'élève');
    } finally {
      setLoadingAction(false);
      setShowConfirmModal(false);
      setConfirmAction(null);
    }
  };
  
  const cancelRemoveEleve = () => {
    setShowConfirmModal(false);
    setConfirmAction(null);
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'actif': return '#10B981';
      case 'PRE_ACCEPTED': return '#F59E0B';
      case 'inactif': return '#EF4444';
      default: return '#9CA3AF';
    }
  };

  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case 'actif': return 'Actif';
      case 'PRE_ACCEPTED': return 'Pré-inscrit';
      case 'inactif': return 'Inactif';
      default: return statut;
    }
  };

  const getAvatarInitials = (eleve: Eleve | EleveDisponible) => {
    const prenom = eleve.prenom || '';
    const nom = eleve.nom || '';
    if (prenom && nom) {
      return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
    }
    return eleve.matricule?.charAt(0) || '?';
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const getEleveName = (eleve: Eleve | EleveDisponible) => {
    if (eleve.prenom && eleve.nom) {
      return `${eleve.prenom} ${eleve.nom}`;
    }
    return eleve.matricule;
  };

  const handleElevePress = (eleveId: string) => {
    onClose();
    setTimeout(() => {
      router.push(`/(app)/(sidebar)/eleves/${eleveId}`);
    }, 100);
  };

  const handleEnseignantPress = (enseignantId: string) => {
    onClose();
    setTimeout(() => {
      router.push(`/(app)/(sidebar)/enseignants/${enseignantId}/detail`);
    }, 100);
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    
    return (
      <View style={styles.paginationContainer}>
        <TouchableOpacity
          style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
          onPress={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <Text style={styles.pageButtonText}>‹ Préc.</Text>
        </TouchableOpacity>
        
        <Text style={styles.pageInfo}>
          Page {currentPage} / {totalPages}
        </Text>
        
        <TouchableOpacity
          style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
          onPress={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <Text style={styles.pageButtonText}>Suiv. ›</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp size={14} color={theme.colors.primary.DEFAULT} /> : <ChevronDown size={14} color={theme.colors.primary.DEFAULT} />;
  };

  return (
    <>
      {/* Modal principal */}
      <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Détails du groupe</Text>
                <Text style={styles.modalSubtitle}>{groupeNom}</Text>
              </View>
              <TouchableOpacity onPress={onClose}>
                <X size={20} color={theme.colors.neutral[600]} />
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
                <Text style={styles.loadingText}>Chargement...</Text>
              </View>
            ) : (
              <>
                {/* Barre de recherche */}
                <View style={styles.searchContainer}>
                  <Search size={18} color={theme.colors.neutral[400]} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Rechercher un élève (nom, prénom, matricule)"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor={theme.colors.neutral[400]}
                  />
                </View>

                <ScrollView style={styles.modalBody}>
                  {/* Professeur Principal assigné */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                      <User size={16} color={theme.colors.neutral[500]} /> Professeur Principal
                    </Text>
                    {enseignant ? (
                      <TouchableOpacity onPress={() => handleEnseignantPress(enseignant.id)}>
                        <View style={styles.infoCard}>
                          <Text style={styles.enseignantName}>
                            {enseignant.prenom} {enseignant.nom}
                          </Text>
                          <Text style={styles.matiereText}>
                            <BookOpen size={12} color={theme.colors.neutral[500]} /> {enseignant.matiere_nom}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.emptyInfoText}>Aucun professeur principal assigné</Text>
                    )}
                  </View>

                  {/* Élèves assignés avec tri et bouton ajouter */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <Text style={styles.sectionTitle}>
                        <Users size={16} color={theme.colors.neutral[500]} /> Élèves ({filteredEleves.length})
                      </Text>
                      <View style={styles.headerButtons}>
                        <TouchableOpacity 
                          style={styles.addButton}
                          onPress={() => setShowAddModal(true)}
                        >
                          <Plus size={16} color={theme.colors.primary.DEFAULT} />
                          <Text style={styles.addButtonText}>Ajouter</Text>
                        </TouchableOpacity>
                        <View style={styles.sortButtons}>
                          <TouchableOpacity 
                            style={styles.sortButton} 
                            onPress={() => toggleSort('nom')}
                          >
                            <Text style={[styles.sortButtonText, sortField === 'nom' && styles.sortButtonTextActive]}>
                              Nom
                            </Text>
                            {renderSortIndicator('nom')}
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={styles.sortButton} 
                            onPress={() => toggleSort('matricule')}
                          >
                            <Text style={[styles.sortButtonText, sortField === 'matricule' && styles.sortButtonTextActive]}>
                              Matricule
                            </Text>
                            {renderSortIndicator('matricule')}
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    {filteredEleves.length === 0 ? (
                      <Text style={styles.emptyInfoText}>
                        {searchQuery ? 'Aucun élève ne correspond à la recherche' : 'Aucun élève assigné'}
                      </Text>
                    ) : (
                      <>
                        {paginatedEleves.map((eleve) => (
                          <View key={eleve.id} style={styles.eleveItem}>
                            <TouchableOpacity 
                              style={styles.eleveContent}
                              onPress={() => handleElevePress(eleve.id)}
                            >
                              <View style={styles.eleveAvatar}>
                                <Text style={styles.eleveAvatarText}>{getAvatarInitials(eleve)}</Text>
                              </View>
                              <View style={styles.eleveInfo}>
                                <View style={styles.eleveHeader}>
                                  <Text style={styles.eleveName}>{getEleveName(eleve)}</Text>
                                  <View style={[styles.statusBadge, { backgroundColor: getStatutColor(eleve.statut || '') + '20' }]}>
                                    <Circle size={6} color={getStatutColor(eleve.statut || '')} />
                                    <Text style={[styles.statusText, { color: getStatutColor(eleve.statut || '') }]}>
                                      {getStatutLabel(eleve.statut || '')}
                                    </Text>
                                  </View>
                                </View>
                                <Text style={styles.eleveMatricule}>{eleve.matricule}</Text>
                              </View>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              style={styles.removeButton}
                              onPress={() => handleRemoveEleve(eleve.id, getEleveName(eleve))}
                              disabled={loadingAction}
                            >
                              <Trash2 size={18} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        ))}
                        {renderPagination()}
                      </>
                    )}
                  </View>
                </ScrollView>
              </>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal d'ajout d'élèves */}
      <Modal visible={showAddModal} transparent={true} animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Ajouter des élèves</Text>
                <Text style={styles.modalSubtitle}>Sélectionnez les élèves à ajouter au groupe {groupeNom}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={20} color={theme.colors.neutral[600]} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Search size={18} color={theme.colors.neutral[400]} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher un élève..."
                value={searchDisponibleQuery}
                onChangeText={setSearchDisponibleQuery}
                placeholderTextColor={theme.colors.neutral[400]}
              />
            </View>

            <ScrollView style={styles.modalBody}>
              {filteredDisponibles.length === 0 ? (
                <Text style={styles.emptyInfoText}>
                  {searchDisponibleQuery ? 'Aucun élève ne correspond' : 'Aucun élève disponible à ajouter'}
                </Text>
              ) : (
                filteredDisponibles.map((eleve) => (
                  <TouchableOpacity
                    key={eleve.id}
                    style={[styles.eleveSelectItem, selectedEleveIds.has(eleve.id) && styles.eleveSelectItemActive]}
                    onPress={() => toggleSelectEleve(eleve.id)}
                  >
                    <View style={styles.eleveAvatar}>
                      <Text style={styles.eleveAvatarText}>{getAvatarInitials(eleve)}</Text>
                    </View>
                    <View style={styles.eleveInfo}>
                      <Text style={styles.eleveName}>{getEleveName(eleve)}</Text>
                      <Text style={styles.eleveMatricule}>{eleve.matricule}</Text>
                    </View>
                    {selectedEleveIds.has(eleve.id) && (
                      <View style={styles.checkIcon}>
                        <Check size={18} color={theme.colors.primary.DEFAULT} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => {
                  setShowAddModal(false);
                  setSelectedEleveIds(new Set());
                  setSearchDisponibleQuery('');
                }}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmButton, (selectedEleveIds.size === 0 || loadingAction) && styles.confirmButtonDisabled]}
                onPress={handleAddEleves}
                disabled={selectedEleveIds.size === 0 || loadingAction}
              >
                {loadingAction ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>Ajouter ({selectedEleveIds.size})</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de confirmation de suppression */}
      <Modal visible={showConfirmModal} transparent={true} animationType="fade" onRequestClose={cancelRemoveEleve}>
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.confirmModalHeader}>
              <Text style={styles.confirmModalTitle}>Confirmer le retrait</Text>
            </View>
            <View style={styles.confirmModalBody}>
              <Text style={styles.confirmModalText}>
                Êtes-vous sûr de vouloir retirer{' '}
                <Text style={styles.confirmModalHighlight}>{confirmAction?.eleveNom}</Text>{' '}
                du groupe ?
              </Text>
              <Text style={styles.confirmModalWarning}>
                Cette action est réversible.
              </Text>
            </View>
            <View style={styles.confirmModalFooter}>
              <TouchableOpacity style={styles.confirmCancelButton} onPress={cancelRemoveEleve}>
                <Text style={styles.confirmCancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmDeleteButton} onPress={executeRemoveEleve}>
                <Trash2 size={16} color="#FFFFFF" />
                <Text style={styles.confirmDeleteButtonText}>Retirer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#1F2937',
    paddingVertical: 4,
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    maxHeight: '65%',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  addButtonText: {
    fontSize: 12,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  sortButtonText: {
    fontSize: 12,
    color: '#6B7280',
  },
  sortButtonTextActive: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
  },
  enseignantName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  matiereText: {
    fontSize: 13,
    color: '#6B7280',
  },
  emptyInfoText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 12,
  },
  eleveItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 8,
  },
  eleveContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  eleveAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eleveAvatarText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  eleveInfo: {
    flex: 1,
  },
  eleveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  eleveName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  eleveMatricule: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  removeButton: {
    padding: 8,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  pageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageButtonText: {
    fontSize: 13,
    color: '#374151',
  },
  pageInfo: {
    fontSize: 13,
    color: '#6B7280',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  closeButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  eleveSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  eleveSelectItemActive: {
    backgroundColor: '#EFF6FF',
  },
  checkIcon: {
    width: 24,
    alignItems: 'flex-end',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  confirmModalContent: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  confirmModalHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  confirmModalBody: {
    padding: 20,
  },
  confirmModalText: {
    fontSize: 14,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 20,
  },
  confirmModalHighlight: {
    fontWeight: '700',
    color: '#1F2937',
  },
  confirmModalWarning: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 12,
  },
  confirmModalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  confirmCancelButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmCancelButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  confirmDeleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    backgroundColor: '#EF4444',
    borderRadius: 8,
  },
  confirmDeleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});