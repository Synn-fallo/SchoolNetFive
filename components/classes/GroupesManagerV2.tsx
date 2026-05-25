import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { Plus, Trash2, Users, RefreshCw, Edit2, UserPlus, X, Check, Search } from 'lucide-react-native';
import { Card } from '@/components/Card';
import { supabase } from '@/lib/supabase';
import { useGroupes, ModeleGroupe } from '@/hooks/useGroupes';
import { useAcademicStructure } from '@/hooks/useAcademicStructure';
import GroupeModal from '@/components/classes/GroupeModal';
import AssignerEnseignantModal from '@/components/classes/AssignerEnseignantModal';
import GroupeDetailModal from '@/components/classes/GroupeDetailModal';
import CreerGroupeModal from '@/components/classes/CreerGroupeModal';
import GenererGroupesModal from '@/components/classes/GenererGroupesModal';
import ConfirmationModal from '@/components/common/ConfirmationModal';
import theme from '@/constants/theme';

interface GroupesManagerV2Props {
  classeId: string;
  classeNom?: string;
  onRefresh?: () => void;
}

export default function GroupesManagerV2({ classeId, classeNom, onRefresh }: GroupesManagerV2Props) {
  const { 
    groupes, 
    loading, 
    error, 
    deleteGroupe, 
    generateGroupesFromModele, 
    refresh, 
    createGroupe, 
    updateGroupe 
  } = useGroupes(classeId);
  const { modelesGroupes, loading: modelesLoading } = useAcademicStructure();
  
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isModelesLoading, setIsModelesLoading] = useState(true);
  
  // États pour les modals
  const [showCreerModal, setShowCreerModal] = useState(false);
  const [showGenererModal, setShowGenererModal] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingGroupe, setEditingGroupe] = useState<{ id: string; nom: string; description?: string } | null>(null);
  const [assignEnseignantModalVisible, setAssignEnseignantModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  
  // États pour confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [groupeToDelete, setGroupeToDelete] = useState<{ id: string; nom: string } | null>(null);

  // ============================================================
  // ÉTATS POUR LE MODAL D'AJOUT D'ÉLÈVES
  // ============================================================

  const [showAddElevesModal, setShowAddElevesModal] = useState(false);
  const [currentGroupeId, setCurrentGroupeId] = useState<string | null>(null);
  const [currentGroupeNom, setCurrentGroupeNom] = useState('');
  const [elevesDisponibles, setElevesDisponibles] = useState<any[]>([]);
  const [filteredDisponibles, setFilteredDisponibles] = useState<any[]>([]);
  const [selectedEleveIds, setSelectedEleveIds] = useState<Set<string>>(new Set());
  const [searchDisponibleQuery, setSearchDisponibleQuery] = useState('');
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [loadingActionAdd, setLoadingActionAdd] = useState(false);

  // Suivre le chargement des modèles
  useEffect(() => {
    if (modelesGroupes) {
      setIsModelesLoading(false);
    }
  }, [modelesGroupes]);

  const handleGenerateFromModele = async (modele: ModeleGroupe) => {
    setGenerating(true);
    const result = await generateGroupesFromModele(modele);
    setGenerating(false);
    
    if (result.success) {
      if (onRefresh) onRefresh();
    } else {
      console.error('Erreur:', result.error);
    }
  };

  const handleDeleteGroupe = (groupeId: string, groupeNom: string) => {
    setGroupeToDelete({ id: groupeId, nom: groupeNom });
    setShowDeleteConfirm(true);
  };

  const confirmDeleteGroupe = async () => {
    if (!groupeToDelete) return;
    
    setDeleting(true);
    const result = await deleteGroupe(groupeToDelete.id);
    setDeleting(false);
    
    if (result.success) {
      setShowDeleteConfirm(false);
      setGroupeToDelete(null);
      if (onRefresh) onRefresh();
    } else {
      console.error('Erreur:', result.error);
    }
  };

  const handleCreateGroupe = async (nom: string, description?: string) => {
    const result = await createGroupe(nom, description);
    if (result.success) {
      setShowCreerModal(false);
      if (onRefresh) onRefresh();
    } else {
      console.error('Erreur:', result.error);
    }
  };

  const handleUpdateGroupe = async (nom: string, description?: string) => {
    if (!editingGroupe) return;
    const result = await updateGroupe(editingGroupe.id, { nom, description });
    if (result.success) {
      setEditModalVisible(false);
      setEditingGroupe(null);
      if (onRefresh) onRefresh();
    } else {
      console.error('Erreur:', result.error);
    }
  };

  const openEditModal = (groupe: { id: string; nom: string; description?: string }) => {
    setEditingGroupe(groupe);
    setEditModalVisible(true);
  };

  const openAssignEnseignantModal = (groupeId: string, groupeNom: string) => {
    setCurrentGroupeId(groupeId);
    setCurrentGroupeNom(groupeNom);
    setAssignEnseignantModalVisible(true);
  };

  const openDetailModal = (groupeId: string, groupeNom: string) => {
    setCurrentGroupeId(groupeId);
    setCurrentGroupeNom(groupeNom);
    setDetailModalVisible(true);
  };

  const handleAssignSuccess = () => {
    if (onRefresh) onRefresh();
  };

  const handleOpenGenererModal = () => {
    setShowGenererModal(true);
  };

  // ============================================================
  // FONCTIONS POUR LE MODAL D'AJOUT D'ÉLÈVES
  // ============================================================

  const loadElevesDisponibles = async (groupeId: string) => {
    setLoadingAdd(true);
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

      // 5. Récupérer les profils
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

      // 6. Formater les élèves
      const formatted = elevesNonAssignes.map(e => {
        const profile = profileMap.get(e.user_id);
        return {
          id: e.id,
          matricule: e.matricule || '',
          prenom: profile?.prenom,
          nom: profile?.nom,
          statut: e.statut || 'inconnu',
        };
      });

      setElevesDisponibles(formatted);
      setFilteredDisponibles(formatted);
    } catch (error) {
      console.error('Error loading eleves disponibles:', error);
      setElevesDisponibles([]);
      setFilteredDisponibles([]);
    } finally {
      setLoadingAdd(false);
    }
  };

  const openAddElevesModal = async (groupeId: string, groupeNom: string) => {
    setCurrentGroupeId(groupeId);
    setCurrentGroupeNom(groupeNom);
    setSelectedEleveIds(new Set());
    setSearchDisponibleQuery('');
    await loadElevesDisponibles(groupeId);
    setShowAddElevesModal(true);
  };

  const handleAddEleves = async () => {
    if (selectedEleveIds.size === 0 || !currentGroupeId) {
      Alert.alert('Aucune sélection', 'Veuillez sélectionner au moins un élève');
      return;
    }

    setLoadingActionAdd(true);
    try {
      const inserts = Array.from(selectedEleveIds).map(eleveId => ({
        eleve_id: eleveId,
        groupe_id: currentGroupeId,
      }));

      const { error } = await supabase
        .from('eleve_groupes')
        .insert(inserts);

      if (error) throw error;

      Alert.alert('Succès', `${selectedEleveIds.size} élève(s) ajouté(s) au groupe`);
      
      setShowAddElevesModal(false);
      setSelectedEleveIds(new Set());
      setSearchDisponibleQuery('');
      
      if (onRefresh) onRefresh();
      refresh();
    } catch (error) {
      console.error('Error adding eleves:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter les élèves');
    } finally {
      setLoadingActionAdd(false);
    }
  };

  const filterDisponibles = (query: string) => {
    let filtered = [...elevesDisponibles];
    if (query.trim()) {
      const q = query.toLowerCase();
      filtered = filtered.filter(
        e => 
          (e.prenom && e.prenom.toLowerCase().includes(q)) ||
          (e.nom && e.nom.toLowerCase().includes(q)) ||
          (e.matricule && e.matricule.toLowerCase().includes(q))
      );
    }
    setFilteredDisponibles(filtered);
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

  const getAvatarInitials = (eleve: any) => {
    const prenom = eleve.prenom || '';
    const nom = eleve.nom || '';
    if (prenom && nom) {
      return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
    }
    return eleve.matricule?.charAt(0) || '?';
  };

  const getEleveName = (eleve: any) => {
    if (eleve.prenom && eleve.nom) {
      return `${eleve.prenom} ${eleve.nom}`;
    }
    return eleve.matricule;
  };

  if (loading || modelesLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement des groupes...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refresh}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {classeNom && (
        <View style={styles.header}>
          <Users size={20} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.headerTitle}>Groupes de {classeNom}</Text>
        </View>
      )}

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={() => setShowCreerModal(true)}>
          <Plus size={18} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Créer un groupe</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.actionButton, styles.secondaryButton]} 
          onPress={handleOpenGenererModal}
        >
          <RefreshCw size={18} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.secondaryButtonText}>Générer depuis modèle</Text>
        </TouchableOpacity>
      </View>

      <Card style={styles.groupesCard}>
        <View style={styles.groupesHeader}>
          <Text style={styles.groupesTitle}>Groupes existants</Text>
          <Text style={styles.groupesCount}>({groupes.length})</Text>
        </View>
        
        {groupes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucun groupe</Text>
            <Text style={styles.emptySubtext}>
              Créez un groupe manuellement ou générez-le à partir d'un modèle
            </Text>
          </View>
        ) : (
          groupes.map((groupe) => (
            <View key={groupe.id} style={styles.groupeItem}>
              <TouchableOpacity style={styles.groupeInfo} onPress={() => openDetailModal(groupe.id, groupe.nom)}>
                <View style={styles.groupeBadge}>
                  <Text style={styles.groupeBadgeText}>{groupe.nom}</Text>
                </View>
                <Text style={styles.groupeCount}>
                  {groupe.eleves_count || 0} élève(s)
                </Text>
                {groupe.description && (
                  <Text style={styles.groupeDescription}>{groupe.description}</Text>
                )}
                {groupe.enseignant && (
                  <Text style={styles.enseignantInfo}>
                    👨‍🏫 {groupe.enseignant.prenom} {groupe.enseignant.nom} - {groupe.enseignant.matiere_nom}
                  </Text>
                )}
              </TouchableOpacity>
              <View style={styles.groupeActions}>
                <TouchableOpacity
                  style={styles.actionIcon}
                  onPress={() => openAddElevesModal(groupe.id, groupe.nom)}
                >
                  <Users size={16} color={theme.colors.primary.DEFAULT} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionIcon}
                  onPress={() => openAssignEnseignantModal(groupe.id, groupe.nom)}
                >
                  <UserPlus size={16} color={theme.colors.primary.DEFAULT} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionIcon}
                  onPress={() => openEditModal(groupe)}
                >
                  <Edit2 size={16} color={theme.colors.neutral[600]} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionIcon}
                  onPress={() => handleDeleteGroupe(groupe.id, groupe.nom)}
                >
                  <Trash2 size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </Card>

      <View style={styles.noteContainer}>
        <Text style={styles.noteText}>
          ℹ️ Les groupes permettent de subdiviser une classe pour les cours pratiques (ateliers, TP, etc.).
        </Text>
      </View>

      <CreerGroupeModal
        visible={showCreerModal}
        onClose={() => setShowCreerModal(false)}
        onCreate={handleCreateGroupe}
        isLoading={loading}
      />

      <GenererGroupesModal
        visible={showGenererModal}
        onClose={() => setShowGenererModal(false)}
        onGenerate={handleGenerateFromModele}
        isLoading={generating}
      />

      <GroupeModal
        visible={editModalVisible}
        onClose={() => {
          setEditModalVisible(false);
          setEditingGroupe(null);
        }}
        onSave={handleUpdateGroupe}
        initialNom={editingGroupe?.nom || ''}
        initialDescription={editingGroupe?.description || ''}
        title="Modifier le groupe"
      />

      {currentGroupeId && (
        <>
          <AssignerEnseignantModal
            visible={assignEnseignantModalVisible}
            onClose={() => setAssignEnseignantModalVisible(false)}
            etablissementId={classeId}
            groupeId={currentGroupeId}
            groupeNom={currentGroupeNom}
            onAssign={handleAssignSuccess}
          />
          <GroupeDetailModal
            visible={detailModalVisible}
            onClose={() => setDetailModalVisible(false)}
            groupeId={currentGroupeId}
            groupeNom={currentGroupeNom}
            classeId={classeId}
          />
        </>
      )}

      <ConfirmationModal
        visible={showDeleteConfirm}
        title="Supprimer le groupe"
        message={`Êtes-vous sûr de vouloir supprimer le groupe "${groupeToDelete?.nom}" ?\n\nLes élèves ne seront pas supprimés, mais retirés du groupe.`}
        confirmText="Supprimer"
        variant="danger"
        onConfirm={confirmDeleteGroupe}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setGroupeToDelete(null);
        }}
      />

      {/* Modal d'ajout d'élèves */}
      <Modal visible={showAddElevesModal} transparent={true} animationType="fade" onRequestClose={() => setShowAddElevesModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Ajouter des élèves</Text>
                <Text style={styles.modalSubtitle}>Sélectionnez les élèves à ajouter au groupe {currentGroupeNom}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddElevesModal(false)}>
                <X size={20} color={theme.colors.neutral[600]} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Search size={18} color={theme.colors.neutral[400]} />
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher un élève..."
                value={searchDisponibleQuery}
                onChangeText={(text) => {
                  setSearchDisponibleQuery(text);
                  filterDisponibles(text);
                }}
                placeholderTextColor={theme.colors.neutral[400]}
              />
            </View>

            <ScrollView style={styles.modalBody}>
              {loadingAdd ? (
                <View style={styles.centerContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
                  <Text style={styles.loadingText}>Chargement...</Text>
                </View>
              ) : filteredDisponibles.length === 0 ? (
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
                  setShowAddElevesModal(false);
                  setSelectedEleveIds(new Set());
                  setSearchDisponibleQuery('');
                }}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmButton, (selectedEleveIds.size === 0 || loadingActionAdd) && styles.confirmButtonDisabled]}
                onPress={handleAddEleves}
                disabled={selectedEleveIds.size === 0 || loadingActionAdd}
              >
                {loadingActionAdd ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>Ajouter ({selectedEleveIds.size})</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary.DEFAULT,
  },
  groupesCard: {
    padding: 16,
    marginBottom: 16,
  },
  groupesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  groupesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  groupesCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  groupeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  groupeInfo: {
    flex: 1,
  },
  groupeBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  groupeBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  groupeCount: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  groupeDescription: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  enseignantInfo: {
    fontSize: 11,
    color: theme.colors.primary.DEFAULT,
    marginTop: 4,
  },
  groupeActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionIcon: {
    padding: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  noteContainer: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  noteText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  // Styles pour le modal d'ajout d'élèves
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
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
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    backgroundColor: '#F9FAFB',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  modalBody: {
    maxHeight: 400,
    paddingHorizontal: 8,
  },
  emptyInfoText: {
    textAlign: 'center',
    padding: 20,
    fontSize: 14,
    color: '#9CA3AF',
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
  eleveName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  eleveMatricule: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  checkIcon: {
    width: 24,
    alignItems: 'flex-end',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
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
    borderRadius: 10,
    backgroundColor: theme.colors.primary.DEFAULT,
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
});