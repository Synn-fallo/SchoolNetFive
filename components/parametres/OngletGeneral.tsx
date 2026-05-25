// /home/project/components/parametres/OngletGeneral.tsx
// Version finale corrigée – Toutes les actions (révoquer, réactiver) fonctionnent

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import {
  Building2,
  Calendar,
  Globe,
  FileText,
  Edit2,
  X,
  ChevronDown,
  Save,
  Plus,
  Trash2,
  Key,
  Shield,
  Users,
  UserPlus,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useAnneesScolaires } from '@/hooks/useAnneesScolaires';
import { usePeriodes } from '@/hooks/usePeriodes';
import { useDelegations, Delegation, DELEGATION_TYPES, ROLES_BY_TYPE } from '@/hooks/useDelegations';
import { useDelegationContext } from '@/contexts/DelegationContext';
import { useNominations } from '@/hooks/useNominations';
import CollapsibleSection from './CollapsibleSection';
import NominationModal from './NominationModal';
import theme from '@/constants/theme';
import DelegationCard from '@/components/delegations/DelegationCard';
import DelegationFilters from '@/components/delegations/DelegationFilters';
import NominationCard from '@/components/nominations/NominationCard';
import NominationFilters from '@/components/nominations/NominationFilters';
import Pagination from '@/components/common/Pagination';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { useDelegationFilters } from '@/hooks/useDelegationFilters';
import { useNominationFilters } from '@/hooks/useNominationFilters';

// Composant DatePicker simplifié pour web
const DatePicker = ({ value, onChange, placeholder }: { value: string; onChange: (date: string) => void; placeholder: string }) => {
  return (
    <input
      type="date"
      style={{
        width: '100%',
        padding: '10px 12px',
        fontSize: '14px',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        backgroundColor: '#FFFFFF',
        marginBottom: '16px',
      }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
};

interface OngletGeneralProps {
  etablissementId: string;
  etablissementNom: string;
}

interface EtablissementInfos {
  email: string;
  telephone: string;
  adresse: string;
  ville: string;
  code_postal: string;
  regime: 'semestre' | 'trimestre';
}

interface Matiere {
  id: string;
  nom: string;
  code: string;
  coefficient: number;
  etablissement_id: string;
}

interface Utilisateur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
}

export default function OngletGeneral({ etablissementId, etablissementNom }: OngletGeneralProps) {
  const { user, isChefEtablissement, getAdminMetadata } = useAuth();
  const { refreshDelegations } = useDelegationContext();
  
  // États pour les sections accordéon
  const [expandedSection, setExpandedSection] = useState<string | null>('etablissement_infos');
  
  // États pour les infos établissement
  const [infos, setInfos] = useState<EtablissementInfos>({
    email: '',
    telephone: '',
    adresse: '',
    ville: '',
    code_postal: '',
    regime: 'semestre',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  
  // États pour les matières
  const [matieres, setMatieres] = useState<Matiere[]>([]);
  const [matieresLoading, setMatieresLoading] = useState(false);
  const [showMatiereModal, setShowMatiereModal] = useState(false);
  const [editingMatiere, setEditingMatiere] = useState<Matiere | null>(null);
  const [matiereForm, setMatiereForm] = useState({
    nom: '',
    code: '',
    coefficient: '1',
  });
  
  // États pour les délégations
  const {
    delegationsGiven,
    loading: delegationsLoading,
    createDelegation,
    updateDelegation,
    revokeDelegation,
    reactivateDelegation,
    canDelegate,
  } = useDelegations();
  
  // États pour les nominations
  const {
    nominations = [],
    loading: nominationsLoading,
    revokeNomination,
    reactivateNomination,
    refreshNominations,
  } = useNominations();
  
  const [showDelegationModal, setShowDelegationModal] = useState(false);
  const [editingDelegation, setEditingDelegation] = useState<Delegation | null>(null);
  const [selectedDelegation, setSelectedDelegation] = useState<Delegation | null>(null);
  const [showEditDelegationModal, setShowEditDelegationModal] = useState(false);
  const [delegationForm, setDelegationForm] = useState({
    delegueId: '',
    type: 'financiere',
    role_delegue: 'caissier',
    date_fin: '',
    justification: '',
    departement: '',
    plafond: '',
  });
  const [searchEmail, setSearchEmail] = useState('');
  const [searchedUser, setSearchedUser] = useState<Utilisateur | null>(null);
  const [searchingUser, setSearchingUser] = useState(false);
  
  // États pour la modal de nomination
  const [showNominationModal, setShowNominationModal] = useState(false);
  const [selectedNomination, setSelectedNomination] = useState(null);
  const [showEditNominationModal, setShowEditNominationModal] = useState(false);
  
  // États pour les dialogues de confirmation
  const [showRevokeDelegationDialog, setShowRevokeDelegationDialog] = useState(false);
  const [showReactivateDelegationDialog, setShowReactivateDelegationDialog] = useState(false);
  const [showRevokeNominationDialog, setShowRevokeNominationDialog] = useState(false);
  const [showReactivateNominationDialog, setShowReactivateNominationDialog] = useState(false);
  const [actionTarget, setActionTarget] = useState<{ id: string; name: string; typeAdmin?: string } | null>(null);
  
  // États pour les années et périodes
  const [showAnneeModal, setShowAnneeModal] = useState(false);
  const [showPeriodeModal, setShowPeriodeModal] = useState(false);
  const [showAjoutAnneeModal, setShowAjoutAnneeModal] = useState(false);
  const [nouvelleAnnee, setNouvelleAnnee] = useState({ date_debut: '', date_fin: '' });
  const [generatedLibelle, setGeneratedLibelle] = useState('');
  
  const {
    annees,
    anneeActive,
    loading: anneesLoading,
    loadAnnees,
    setActiveAnnee,
    addAnnee,
  } = useAnneesScolaires();
  
  const {
    periodes,
    periodeParDefaut,
    loading: periodesLoading,
    loadPeriodes,
    setPeriodeParDefaut,
  } = usePeriodes();
  
  const [selectedAnneeId, setSelectedAnneeId] = useState<string>('');
  const [selectedPeriodeId, setSelectedPeriodeId] = useState<string>('');
  
  // Filtres et pagination pour les délégations
  const { 
    filteredDelegations, 
    filters: delegationFilters, 
    updateFilter: updateDelegationFilter,
    clearAllFilters: clearDelegationFilters,
    isDelegationExpired 
  } = useDelegationFilters(delegationsGiven);
  
  const [delegationPage, setDelegationPage] = useState(1);
  const itemsPerPage = 5;
  const paginatedDelegations = filteredDelegations.slice(
    (delegationPage - 1) * itemsPerPage,
    delegationPage * itemsPerPage
  );
  const delegationTotalPages = Math.ceil(filteredDelegations.length / itemsPerPage);
  
  // Filtres et pagination pour les nominations
  const { 
    filteredNominations, 
    filters: nominationFilters, 
    updateFilter: updateNominationFilter,
    clearAllFilters: clearNominationFilters 
  } = useNominationFilters(nominations);
  
  const [nominationPage, setNominationPage] = useState(1);
  const paginatedNominations = filteredNominations.slice(
    (nominationPage - 1) * itemsPerPage,
    nominationPage * itemsPerPage
  );
  const nominationTotalPages = Math.ceil(filteredNominations.length / itemsPerPage);
  
  // Vérifier si l'utilisateur peut voir/gérer les délégations
  const canManageDelegations = isChefEtablissement || canDelegate('caissier') || canDelegate('ae');
  
  // Récupérer le type d'admin pour filtrer les délégations visibles
  const adminMeta = getAdminMetadata();
  const isComptable = adminMeta?.type_admin === 'comptable';
  const isDE = adminMeta?.type_admin === 'de';
  
  // Générer le libellé automatiquement à partir des dates
  useEffect(() => {
    if (nouvelleAnnee.date_debut && nouvelleAnnee.date_fin) {
      const debutAnnee = new Date(nouvelleAnnee.date_debut).getFullYear();
      const finAnnee = new Date(nouvelleAnnee.date_fin).getFullYear();
      setGeneratedLibelle(`${debutAnnee}-${finAnnee}`);
    } else {
      setGeneratedLibelle('');
    }
  }, [nouvelleAnnee.date_debut, nouvelleAnnee.date_fin]);
  
  // Charger les matières
  useEffect(() => {
    if (etablissementId) {
      loadMatieres();
    }
  }, [etablissementId]);
  
  // Charger les données initiales
  useEffect(() => {
    loadInitialData();
  }, [etablissementId]);
  
  // Charger les périodes quand une année est sélectionnée
  useEffect(() => {
    if (anneeActive && etablissementId) {
      setSelectedAnneeId(anneeActive.id);
      loadPeriodes(etablissementId, anneeActive.id);
    }
  }, [anneeActive, etablissementId]);
  
  // Récupérer la période par défaut
  useEffect(() => {
    if (periodes.length > 0 && periodeParDefaut) {
      setSelectedPeriodeId(periodeParDefaut.periode_id);
    } else if (periodes.length > 0 && !selectedPeriodeId) {
      setSelectedPeriodeId(periodes[0].id);
    }
  }, [periodes, periodeParDefaut]);
  
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const { data: etabData, error: etabError } = await supabase
        .from('etablissements')
        .select('*')
        .eq('id', etablissementId)
        .single();
      
      if (etabError) throw etabError;
      
      if (etabData) {
        setInfos({
          email: etabData.email || '',
          telephone: etabData.telephone || '',
          adresse: etabData.adresse || '',
          ville: etabData.ville || '',
          code_postal: etabData.code_postal || '',
          regime: etabData.regime || 'semestre',
        });
      }
      
      await loadAnnees(etablissementId);
    } catch (error) {
      console.error('Error loading general data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const loadMatieres = async () => {
    setMatieresLoading(true);
    try {
      const { data, error } = await supabase
        .from('matieres')
        .select('*')
        .eq('etablissement_id', etablissementId)
        .order('nom');
      
      if (error) throw error;
      setMatieres(data || []);
    } catch (error) {
      console.error('Error loading matieres:', error);
      Alert.alert('Erreur', 'Impossible de charger les matières');
    } finally {
      setMatieresLoading(false);
    }
  };
  
  // ============================================================
  // FONCTIONS MATIÈRES
  // ============================================================
  
  const handleSaveMatiere = async () => {
    if (!matiereForm.nom.trim()) {
      Alert.alert('Erreur', 'Le nom de la matière est requis');
      return;
    }
    
    const coefficient = parseFloat(matiereForm.coefficient);
    if (isNaN(coefficient) || coefficient <= 0) {
      Alert.alert('Erreur', 'Le coefficient doit être un nombre positif');
      return;
    }
    
    try {
      if (editingMatiere) {
        const { error } = await supabase
          .from('matieres')
          .update({
            nom: matiereForm.nom.trim(),
            code: matiereForm.code.trim().toUpperCase(),
            coefficient: coefficient,
          })
          .eq('id', editingMatiere.id);
        
        if (error) throw error;
        Alert.alert('Succès', 'Matière modifiée');
      } else {
        const { error } = await supabase
          .from('matieres')
          .insert({
            nom: matiereForm.nom.trim(),
            code: matiereForm.code.trim().toUpperCase(),
            coefficient: coefficient,
            etablissement_id: etablissementId,
          });
        
        if (error) throw error;
        Alert.alert('Succès', 'Matière ajoutée');
      }
      
      closeMatiereModal();
      await loadMatieres();
    } catch (error) {
      console.error('Error saving matiere:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la matière');
    }
  };
  
  const openMatiereModal = (matiere?: Matiere) => {
    if (matiere) {
      setEditingMatiere(matiere);
      setMatiereForm({
        nom: matiere.nom,
        code: matiere.code || '',
        coefficient: matiere.coefficient.toString(),
      });
    } else {
      setEditingMatiere(null);
      setMatiereForm({
        nom: '',
        code: '',
        coefficient: '1',
      });
    }
    setShowMatiereModal(true);
  };
  
  const closeMatiereModal = () => {
    setShowMatiereModal(false);
    setEditingMatiere(null);
    setMatiereForm({
      nom: '',
      code: '',
      coefficient: '1',
    });
  };
  
  const handleDeleteMatiere = async (id: string) => {
    Alert.alert(
      'Confirmation',
      'Êtes-vous sûr de vouloir supprimer cette matière ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('matieres')
                .delete()
                .eq('id', id);
              
              if (error) throw error;
              Alert.alert('Succès', 'Matière supprimée');
              await loadMatieres();
            } catch (error) {
              console.error('Error deleting matiere:', error);
              Alert.alert('Erreur', 'Impossible de supprimer la matière');
            }
          },
        },
      ]
    );
  };
  
  // ============================================================
  // FONCTIONS DÉLÉGATIONS
  // ============================================================
  
  const searchUserByEmail = async () => {
    if (!searchEmail.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un email');
      return;
    }
    
    setSearchingUser(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nom, prenom, email')
        .eq('email', searchEmail.trim())
        .maybeSingle();
      
      if (error) throw error;
      
      if (!data) {
        Alert.alert('Non trouvé', 'Aucun utilisateur trouvé avec cet email');
        setSearchedUser(null);
      } else {
        setSearchedUser({
          id: data.id,
          nom: data.nom || '',
          prenom: data.prenom || '',
          email: data.email,
        });
      }
    } catch (error) {
      console.error('Error searching user:', error);
      Alert.alert('Erreur', 'Impossible de rechercher l\'utilisateur');
    } finally {
      setSearchingUser(false);
    }
  };
  
  const handleOpenNewDelegation = () => {
    setEditingDelegation(null);
    setDelegationForm({
      delegueId: '',
      type: 'financiere',
      role_delegue: 'caissier',
      date_fin: '',
      justification: '',
      departement: '',
      plafond: '',
    });
    setSearchEmail('');
    setSearchedUser(null);
    setShowDelegationModal(true);
  };
  
  const handleEditDelegation = (delegation: Delegation) => {
    setSelectedDelegation(delegation);
    setShowEditDelegationModal(true);
  };
  
  const handleSaveDelegation = async () => {
    if (!searchedUser) {
      Alert.alert('Erreur', 'Veuillez d\'abord rechercher un utilisateur');
      return;
    }
    
    if (editingDelegation) {
      const updates: { date_fin?: string | null; plafond?: number; departement?: string } = {};
      
      if (delegationForm.date_fin) {
        updates.date_fin = delegationForm.date_fin;
      }
      if (delegationForm.plafond) {
        updates.plafond = parseInt(delegationForm.plafond);
      }
      if (delegationForm.departement) {
        updates.departement = delegationForm.departement;
      }
      
      const success = await updateDelegation(editingDelegation.id, updates);
      if (success) {
        Alert.alert('Succès', 'Délégation modifiée');
        setShowDelegationModal(false);
        refreshDelegations();
      } else {
        Alert.alert('Erreur', 'Impossible de modifier la délégation');
      }
    } else {
      try {
        await createDelegation(
          searchedUser.id,
          delegationForm.role_delegue,
          delegationForm.type,
          delegationForm.departement || undefined,
          delegationForm.plafond ? parseInt(delegationForm.plafond) : undefined,
          delegationForm.date_fin || undefined,
          delegationForm.justification || undefined
        );
        Alert.alert('Succès', 'Délégation créée avec succès');
        setShowDelegationModal(false);
        refreshDelegations();
      } catch (error) {
        console.error('Error creating delegation:', error);
        Alert.alert('Erreur', 'Impossible de créer la délégation');
      }
    }
  };
  
  // Révocation délégation
  const handleRevokeDelegation = (delegation: Delegation) => {
    setActionTarget({ id: delegation.id, name: `${delegation.delegue_prenom} ${delegation.delegue_nom}` });
    setShowRevokeDelegationDialog(true);
  };
  
  const confirmRevokeDelegation = async () => {
    if (actionTarget) {
      await revokeDelegation(actionTarget.id);
      await refreshDelegations();
      setShowRevokeDelegationDialog(false);
      setActionTarget(null);
    }
  };
  
  // Réactivation délégation
  const handleReactivateDelegation = (delegation: Delegation) => {
    setActionTarget({ id: delegation.id, name: `${delegation.delegue_prenom} ${delegation.delegue_nom}` });
    setShowReactivateDelegationDialog(true);
  };
  
  const confirmReactivateDelegation = async () => {
    if (actionTarget) {
      await reactivateDelegation(actionTarget.id);
      await refreshDelegations();
      setShowReactivateDelegationDialog(false);
      setActionTarget(null);
    }
  };
  
  // ============================================================
  // FONCTIONS NOMINATIONS
  // ============================================================
  
  const handleOpenNomination = () => {
    setShowNominationModal(true);
  };
  
  const handleNominationSuccess = async () => {
    await refreshNominations();
  };
  
  const handleEditNomination = (nomination: any) => {
    setSelectedNomination(nomination);
    setShowEditNominationModal(true);
  };
  
  // Révocation nomination
  const handleRevokeNomination = (nomination: any) => {
    setActionTarget({ id: nomination.user_id, name: `${nomination.prenom} ${nomination.nom}`, typeAdmin: nomination.type_admin });
    setShowRevokeNominationDialog(true);
  };
  
  const confirmRevokeNomination = async () => {
    if (actionTarget) {
      await revokeNomination(actionTarget.id, actionTarget.typeAdmin);
      await refreshNominations();
      setShowRevokeNominationDialog(false);
      setActionTarget(null);
    }
  };
  
  // Réactivation nomination
  const handleReactivateNomination = (nomination: any) => {
    setActionTarget({ id: nomination.id, name: `${nomination.prenom} ${nomination.nom}` });
    setShowReactivateNominationDialog(true);
  };
  
  const confirmReactivateNomination = async () => {
    if (actionTarget) {
      await reactivateNomination(actionTarget.id);
      await refreshNominations();
      setShowReactivateNominationDialog(false);
      setActionTarget(null);
    }
  };
  
  // ============================================================
  // FONCTIONS ANNÉES ET PÉRIODES
  // ============================================================
  
  const handleSaveInfos = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('etablissements')
        .update({
          email: infos.email,
          telephone: infos.telephone,
          adresse: infos.adresse,
          ville: infos.ville,
          code_postal: infos.code_postal,
          regime: infos.regime,
          updated_at: new Date().toISOString(),
        })
        .eq('id', etablissementId);
      
      if (error) throw error;
      
      Alert.alert('Succès', 'Informations mises à jour');
      setEditing(false);
    } catch (error) {
      console.error('Error saving infos:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder les informations');
    } finally {
      setSaving(false);
    }
  };
  
  const handleSelectAnnee = async (anneeId: string) => {
    setSelectedAnneeId(anneeId);
    setShowAnneeModal(false);
    const success = await setActiveAnnee(anneeId);
    if (success) {
      Alert.alert('Succès', 'Année scolaire active modifiée');
      await loadPeriodes(etablissementId, anneeId);
    } else {
      Alert.alert('Erreur', 'Impossible de modifier l\'année active');
    }
  };
  
  const handleSelectPeriode = async (periodeId: string) => {
    setSelectedPeriodeId(periodeId);
    setShowPeriodeModal(false);
    const success = await setPeriodeParDefaut(periodeId);
    if (success) {
      Alert.alert('Succès', 'Période par défaut modifiée');
    } else {
      Alert.alert('Erreur', 'Impossible de modifier la période par défaut');
    }
  };
  
  const handleAjouterAnnee = async () => {
    if (!nouvelleAnnee.date_debut || !nouvelleAnnee.date_fin) {
      Alert.alert('Erreur', 'Veuillez sélectionner les dates de début et de fin');
      return;
    }
    
    if (!generatedLibelle) {
      Alert.alert('Erreur', 'Impossible de générer le libellé à partir des dates');
      return;
    }
    
    const anneeExistante = annees.find(a => a.libelle === generatedLibelle);
    if (anneeExistante) {
      Alert.alert('Erreur', `L'année scolaire ${generatedLibelle} existe déjà`);
      return;
    }
    
    const success = await addAnnee({
      libelle: generatedLibelle,
      date_debut: nouvelleAnnee.date_debut,
      date_fin: nouvelleAnnee.date_fin,
      is_active: false,
      etablissement_id: etablissementId,
    });
    
    if (success) {
      Alert.alert('Succès', `Année scolaire ${generatedLibelle} ajoutée`);
      setShowAjoutAnneeModal(false);
      setNouvelleAnnee({ date_debut: '', date_fin: '' });
      setGeneratedLibelle('');
      await loadAnnees(etablissementId);
    } else {
      Alert.alert('Erreur', 'Impossible d\'ajouter l\'année scolaire');
    }
  };
  
  const getAnneeLibelle = () => {
    const annee = annees.find(a => a.id === selectedAnneeId);
    return annee?.libelle || 'Sélectionner une année';
  };
  
  const getPeriodeLibelle = () => {
    const periode = periodes.find(p => p.id === selectedPeriodeId);
    return periode?.libelle || 'Sélectionner une période';
  };
  
  // Helpers pour les labels
  const getRoleDelegueLabel = (role: string) => {
    switch (role) {
      case 'caissier': return 'Caissier';
      case 'assistant_comptable': return 'Assistant comptable';
      case 'comptable': return 'Comptable';
      case 'ae': return 'Animateur d\'Établissement';
      case 'de': return 'Directeur des Études';
      case 'personnel_administratif': return 'Personnel Administratif';
      case 'personnel_vie_scolaire': return 'Personnel Vie Scolaire';
      default: return role;
    }
  };
  
  const getDelegationTypeLabel = (type: string) => {
    switch (type) {
      case 'financiere': return 'Financière';
      case 'pedagogique': return 'Pédagogique';
      case 'administrative': return 'Administrative';
      default: return type;
    }
  };
  
  const getNominationTypeLabel = (typeAdmin: string) => {
    switch (typeAdmin) {
      case 'chef_etablissement': return 'Chef d\'établissement';
      case 'comptable': return 'Comptable';
      case 'de': return 'Directeur des Études';
      case 'ae': return 'Animateur d\'Établissement';
      default: return typeAdmin;
    }
  };
  
  // Gestion de l'accordéon
  const handleExpandChange = (sectionId: string, expanded: boolean) => {
    if (expanded) {
      setExpandedSection(sectionId);
    } else if (expandedSection === sectionId) {
      setExpandedSection(null);
    }
  };
  
  if (loading || anneesLoading || periodesLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Bandeau d'information */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerText}>⚙️ Configuration de votre établissement</Text>
        <Text style={styles.infoBannerSubtext}>
          Gérez les informations générales, l'année scolaire, les matières, les délégations et les nominations
        </Text>
      </View>
      
      {/* Section 1 – Informations de l'établissement */}
      <CollapsibleSection
        title="Informations de l'établissement"
        icon={<Building2 size={20} color={theme.colors.primary.DEFAULT} />}
        expanded={expandedSection === 'etablissement_infos'}
        onExpandChange={(expanded) => handleExpandChange('etablissement_infos', expanded)}
        headerRight={
          !editing ? (
            <TouchableOpacity onPress={() => setEditing(true)} style={styles.sectionButton}>
              <Edit2 size={14} color={theme.colors.primary.DEFAULT} />
              <Text style={styles.sectionButtonText}>Modifier</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleSaveInfos} style={[styles.sectionButton, styles.sectionButtonPrimary]} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Save size={14} color="#FFFFFF" />
                  <Text style={[styles.sectionButtonText, { color: '#FFFFFF' }]}>Enregistrer</Text>
                </>
              )}
            </TouchableOpacity>
          )
        }
      >
        <View style={styles.formContainer}>
          <Text style={styles.label}>Nom de l'établissement</Text>
          <View style={styles.readonlyField}>
            <Text style={styles.readonlyText}>{etablissementNom}</Text>
          </View>
          
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={[styles.input, !editing && styles.inputReadonly]}
            value={infos.email}
            onChangeText={(text) => setInfos(prev => ({ ...prev, email: text }))}
            editable={editing}
            placeholder="contact@etablissement.com"
            keyboardType="email-address"
          />
          
          <Text style={styles.label}>Téléphone</Text>
          <TextInput
            style={[styles.input, !editing && styles.inputReadonly]}
            value={infos.telephone}
            onChangeText={(text) => setInfos(prev => ({ ...prev, telephone: text }))}
            editable={editing}
            placeholder="01 23 45 67 89"
            keyboardType="phone-pad"
          />
          
          <Text style={styles.label}>Adresse</Text>
          <TextInput
            style={[styles.input, !editing && styles.inputReadonly]}
            value={infos.adresse}
            onChangeText={(text) => setInfos(prev => ({ ...prev, adresse: text }))}
            editable={editing}
            placeholder="Adresse"
          />
          
          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Text style={styles.label}>Ville</Text>
              <TextInput
                style={[styles.input, !editing && styles.inputReadonly]}
                value={infos.ville}
                onChangeText={(text) => setInfos(prev => ({ ...prev, ville: text }))}
                editable={editing}
                placeholder="Ville"
              />
            </View>
            <View style={styles.rowItem}>
              <Text style={styles.label}>Code postal</Text>
              <TextInput
                style={[styles.input, !editing && styles.inputReadonly]}
                value={infos.code_postal}
                onChangeText={(text) => setInfos(prev => ({ ...prev, code_postal: text }))}
                editable={editing}
                placeholder="Code postal"
                keyboardType="numeric"
              />
            </View>
          </View>
          
          <Text style={styles.label}>Régime scolaire</Text>
          <View style={styles.regimeContainer}>
            <TouchableOpacity
              style={[styles.regimeButton, infos.regime === 'semestre' && styles.regimeButtonActive]}
              onPress={() => editing && setInfos(prev => ({ ...prev, regime: 'semestre' }))}
              disabled={!editing}
            >
              <Text style={[styles.regimeButtonText, infos.regime === 'semestre' && styles.regimeButtonTextActive]}>
                Semestriel (2 périodes)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.regimeButton, infos.regime === 'trimestre' && styles.regimeButtonActive]}
              onPress={() => editing && setInfos(prev => ({ ...prev, regime: 'trimestre' }))}
              disabled={!editing}
            >
              <Text style={[styles.regimeButtonText, infos.regime === 'trimestre' && styles.regimeButtonTextActive]}>
                Trimestriel (3 périodes)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </CollapsibleSection>
      
      {/* Section 2 – Année scolaire active */}
      <CollapsibleSection
        title="Année scolaire active"
        icon={<Calendar size={20} color={theme.colors.primary.DEFAULT} />}
        expanded={expandedSection === 'annee_scolaire'}
        onExpandChange={(expanded) => handleExpandChange('annee_scolaire', expanded)}
        headerRight={
          <TouchableOpacity onPress={() => setShowAjoutAnneeModal(true)} style={styles.sectionButton}>
            <Plus size={14} color={theme.colors.primary.DEFAULT} />
            <Text style={styles.sectionButtonText}>Ajouter</Text>
          </TouchableOpacity>
        }
      >
        <TouchableOpacity style={styles.selector} onPress={() => setShowAnneeModal(true)}>
          <Text style={styles.selectorText}>{getAnneeLibelle()}</Text>
          <ChevronDown size={18} color="#6B7280" />
        </TouchableOpacity>
        
        {anneeActive && (
          <View style={styles.activeInfo}>
            <Text style={styles.activeInfoText}>
              Période : {new Date(anneeActive.date_debut).toLocaleDateString('fr-FR')} - {new Date(anneeActive.date_fin).toLocaleDateString('fr-FR')}
            </Text>
          </View>
        )}
      </CollapsibleSection>
      
      {/* Section 3 – Période par défaut */}
      <CollapsibleSection
        title="Période par défaut"
        icon={<Globe size={20} color={theme.colors.primary.DEFAULT} />}
        expanded={expandedSection === 'periode_defaut'}
        onExpandChange={(expanded) => handleExpandChange('periode_defaut', expanded)}
      >
        <TouchableOpacity
          style={styles.selector}
          onPress={() => setShowPeriodeModal(true)}
          disabled={periodes.length === 0}
        >
          <Text style={[styles.selectorText, periodes.length === 0 && styles.selectorDisabled]}>
            {periodes.length === 0 ? 'Aucune période disponible' : getPeriodeLibelle()}
          </Text>
          {periodes.length > 0 && <ChevronDown size={18} color="#6B7280" />}
        </TouchableOpacity>
        
        {selectedPeriodeId && (
          <View style={styles.activeInfo}>
            <Text style={styles.activeInfoText}>
              La période sélectionnée sera utilisée par défaut dans les vues de notes
            </Text>
          </View>
        )}
      </CollapsibleSection>
      
      {/* Section 4 – Matières */}
      <CollapsibleSection
        title="Matières"
        icon={<FileText size={20} color={theme.colors.primary.DEFAULT} />}
        badge={matieres.length > 0 ? matieres.length : undefined}
        expanded={expandedSection === 'matieres'}
        onExpandChange={(expanded) => handleExpandChange('matieres', expanded)}
        headerRight={
          <TouchableOpacity onPress={() => openMatiereModal()} style={styles.sectionButton}>
            <Plus size={14} color={theme.colors.primary.DEFAULT} />
            <Text style={styles.sectionButtonText}>Ajouter</Text>
          </TouchableOpacity>
        }
      >
        {matieresLoading ? (
          <ActivityIndicator size="small" color={theme.colors.primary.DEFAULT} />
        ) : matieres.length === 0 ? (
          <Text style={styles.emptyText}>Aucune matière définie</Text>
        ) : (
          matieres.map((item) => (
            <View key={item.id} style={styles.matiereItem}>
              <View style={styles.matiereInfo}>
                <Text style={styles.matiereName}>{item.nom}</Text>
                <Text style={styles.matiereCode}>{item.code}</Text>
                <Text style={styles.matiereCoeff}>Coeff: {item.coefficient}</Text>
              </View>
              <View style={styles.matiereActions}>
                <TouchableOpacity onPress={() => openMatiereModal(item)}>
                  <Edit2 size={16} color={theme.colors.primary.DEFAULT} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteMatiere(item.id)}>
                  <Trash2 size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </CollapsibleSection>
      
      {/* Section 5 – Documents officiels */}
      <CollapsibleSection
        title="Documents officiels"
        icon={<FileText size={20} color={theme.colors.primary.DEFAULT} />}
        expanded={expandedSection === 'documents_officiels'}
        onExpandChange={(expanded) => handleExpandChange('documents_officiels', expanded)}
      >
        <Text style={styles.cardDescription}>
          • Templates des certificats de scolarité
          {'\n'}• Templates des attestations de réussite
          {'\n'}• Configuration des signatures automatiques
        </Text>
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>À venir</Text>
        </View>
      </CollapsibleSection>
      
      {/* Section 6 – Délégations */}
      {canManageDelegations && (
        <CollapsibleSection
          title="Délégations"
          icon={<Key size={20} color={theme.colors.primary.DEFAULT} />}
          badge={filteredDelegations.filter(d => d.is_active && !isDelegationExpired(d)).length}
          expanded={expandedSection === 'delegations'}
          onExpandChange={(expanded) => {
            handleExpandChange('delegations', expanded);
            if (expanded) setDelegationPage(1);
          }}
          headerRight={
            <TouchableOpacity onPress={handleOpenNewDelegation} style={styles.sectionButton}>
              <UserPlus size={14} color={theme.colors.primary.DEFAULT} />
              <Text style={styles.sectionButtonText}>Déléguer</Text>
            </TouchableOpacity>
          }
        >
          <DelegationFilters
            activeFilters={delegationFilters}
            onFilterChange={updateDelegationFilter}
            onClearAll={clearDelegationFilters}
          />

          {delegationsLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary.DEFAULT} />
          ) : paginatedDelegations.length === 0 ? (
            <Text style={styles.emptyText}>Aucune délégation</Text>
          ) : (
            <>
              {paginatedDelegations.map((delegation) => (
                <DelegationCard
                  key={delegation.id}
                  id={delegation.id}
                  delegueNom={delegation.delegue_nom || ''}
                  deleguePrenom={delegation.delegue_prenom || ''}
                  roleLabel={getRoleDelegueLabel(delegation.role_delegue)}
                  typeLabel={getDelegationTypeLabel(delegation.type)}
                  isActive={delegation.is_active}
                  dateDebut={delegation.date_debut}
                  dateFin={delegation.date_fin}
                  departement={delegation.departement}
                  plafond={delegation.plafond}
                  isExpired={isDelegationExpired(delegation)}
                  onEdit={() => handleEditDelegation(delegation)}
                  onRevoke={() => handleRevokeDelegation(delegation)}
                  onReactivate={() => handleReactivateDelegation(delegation)}
                />
              ))}
              {delegationTotalPages > 1 && (
                <Pagination
                  currentPage={delegationPage}
                  totalPages={delegationTotalPages}
                  onPageChange={setDelegationPage}
                />
              )}
            </>
          )}
        </CollapsibleSection>
      )}
      
      {/* Section 7 – Nominations */}
      {isChefEtablissement && (
        <CollapsibleSection
          title="Nominations"
          icon={<Shield size={20} color={theme.colors.primary.DEFAULT} />}
          badge={filteredNominations.filter(n => n.is_active).length}
          expanded={expandedSection === 'nominations'}
          onExpandChange={(expanded) => {
            handleExpandChange('nominations', expanded);
            if (expanded) setNominationPage(1);
          }}
          headerRight={
            <TouchableOpacity onPress={handleOpenNomination} style={styles.sectionButton}>
              <Users size={14} color={theme.colors.primary.DEFAULT} />
              <Text style={styles.sectionButtonText}>Nommer</Text>
            </TouchableOpacity>
          }
        >
          <NominationFilters
            activeFilters={nominationFilters}
            onFilterChange={updateNominationFilter}
            onClearAll={clearNominationFilters}
          />

          {nominationsLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary.DEFAULT} />
          ) : paginatedNominations.length === 0 ? (
            <Text style={styles.emptyText}>Aucune nomination</Text>
          ) : (
            <>
              {paginatedNominations.map((nomination) => (
                <NominationCard
                  key={nomination.id}
                  id={nomination.id}
                  userId={nomination.user_id}
                  nom={nomination.nom}
                  prenom={nomination.prenom}
                  email={nomination.email}
                  typeAdmin={nomination.type_admin}
                  typeLabel={getNominationTypeLabel(nomination.type_admin)}
                  fonction={nomination.fonction}
                  departement={nomination.departement}
                  isActive={nomination.is_active}
                  validatedAt={nomination.validated_at}
                  validatedByName={nomination.validated_by_name}
                  onEdit={() => handleEditNomination(nomination)}
                  onRevoke={() => handleRevokeNomination(nomination)}
                  onReactivate={() => handleReactivateNomination(nomination)}
                />
              ))}
              {nominationTotalPages > 1 && (
                <Pagination
                  currentPage={nominationPage}
                  totalPages={nominationTotalPages}
                  onPageChange={setNominationPage}
                />
              )}
            </>
          )}
        </CollapsibleSection>
      )}
      
      {/* Modal de nomination */}
      <NominationModal
        visible={showNominationModal}
        onClose={() => setShowNominationModal(false)}
        onSuccess={handleNominationSuccess}
        etablissementId={etablissementId}
      />
      
      {/* Modal Délégation */}
      <Modal visible={showDelegationModal} transparent animationType="fade" onRequestClose={() => setShowDelegationModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingDelegation ? 'Modifier la délégation' : 'Nouvelle délégation'}
              </Text>
              <TouchableOpacity onPress={() => setShowDelegationModal(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {!editingDelegation && (
                <>
                  <Text style={styles.modalLabel}>Email de l'utilisateur *</Text>
                  <View style={styles.searchRow}>
                    <TextInput
                      style={[styles.modalInput, { flex: 1, marginBottom: 0 }]}
                      placeholder="ex: jean.dupont@email.com"
                      value={searchEmail}
                      onChangeText={setSearchEmail}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={styles.searchButton}
                      onPress={searchUserByEmail}
                      disabled={searchingUser}
                    >
                      <Text style={styles.searchButtonText}>
                        {searchingUser ? '...' : 'Rechercher'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  {searchedUser && (
                    <View style={styles.userCard}>
                      <Text style={styles.userName}>
                        {searchedUser.prenom} {searchedUser.nom}
                      </Text>
                      <Text style={styles.userEmail}>{searchedUser.email}</Text>
                    </View>
                  )}
                </>
              )}
              
              <Text style={styles.modalLabel}>Type de délégation *</Text>
              <View style={styles.typeContainer}>
                {DELEGATION_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeChip,
                      delegationForm.type === type.value && styles.typeChipActive,
                    ]}
                    onPress={() => {
                      setDelegationForm(prev => ({
                        ...prev,
                        type: type.value,
                        role_delegue: ROLES_BY_TYPE[type.value][0]?.value || 'caissier',
                      }));
                    }}
                  >
                    <Text style={[
                      styles.typeChipText,
                      delegationForm.type === type.value && styles.typeChipTextActive,
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={styles.modalLabel}>Rôle à déléguer *</Text>
              <View style={styles.roleContainer}>
                {ROLES_BY_TYPE[delegationForm.type]?.map((role) => (
                  <TouchableOpacity
                    key={role.value}
                    style={[
                      styles.roleChip,
                      delegationForm.role_delegue === role.value && styles.roleChipActive,
                    ]}
                    onPress={() => setDelegationForm(prev => ({ ...prev, role_delegue: role.value }))}
                  >
                    <Text style={[
                      styles.roleChipText,
                      delegationForm.role_delegue === role.value && styles.roleChipTextActive,
                    ]}>
                      {role.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {delegationForm.role_delegue === 'ae' && (
                <>
                  <Text style={styles.modalLabel}>Département (optionnel)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Ex: Sciences, Lettres, Technique"
                    value={delegationForm.departement}
                    onChangeText={(text) => setDelegationForm(prev => ({ ...prev, departement: text }))}
                  />
                  
                  <Text style={styles.modalLabel}>Plafond d'enseignants (optionnel)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Nombre maximum d'enseignants"
                    value={delegationForm.plafond}
                    onChangeText={(text) => setDelegationForm(prev => ({ ...prev, plafond: text }))}
                    keyboardType="numeric"
                  />
                </>
              )}
              
              <Text style={styles.modalLabel}>Date de fin (optionnelle)</Text>
              <Text style={styles.modalHint}>Laisser vide pour une délégation permanente</Text>
              <DatePicker
                value={delegationForm.date_fin}
                onChange={(date) => setDelegationForm(prev => ({ ...prev, date_fin: date }))}
                placeholder="Sélectionner une date"
              />
              
              <Text style={styles.modalLabel}>Justification (optionnelle)</Text>
              <TextInput
                style={[styles.modalInput, styles.textArea]}
                placeholder="Motif de la délégation..."
                multiline
                numberOfLines={3}
                value={delegationForm.justification}
                onChangeText={(text) => setDelegationForm(prev => ({ ...prev, justification: text }))}
              />
              
              <TouchableOpacity
                style={[styles.modalSaveButton, (!editingDelegation && !searchedUser) && styles.modalSaveButtonDisabled]}
                onPress={handleSaveDelegation}
                disabled={!editingDelegation && !searchedUser}
              >
                <Text style={styles.modalSaveButtonText}>
                  {editingDelegation ? 'Modifier' : 'Déléguer'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      {/* Dialogues de confirmation */}
      <ConfirmDialog
        visible={showRevokeDelegationDialog}
        title="Révoquer la délégation"
        message={`Voulez-vous révoquer la délégation de ${actionTarget?.name} ?`}
        confirmVariant="danger"
        onConfirm={confirmRevokeDelegation}
        onCancel={() => setShowRevokeDelegationDialog(false)}
        confirmText="Révoquer"
      />
      
      <ConfirmDialog
        visible={showReactivateDelegationDialog}
        title="Réactiver la délégation"
        message={`Voulez-vous réactiver la délégation de ${actionTarget?.name} ?`}
        onConfirm={confirmReactivateDelegation}
        onCancel={() => setShowReactivateDelegationDialog(false)}
        confirmText="Réactiver"
      />
      
      <ConfirmDialog
        visible={showRevokeNominationDialog}
        title="Révoquer la nomination"
        message={`Voulez-vous révoquer la nomination de ${actionTarget?.name} ?`}
        confirmVariant="danger"
        onConfirm={confirmRevokeNomination}
        onCancel={() => setShowRevokeNominationDialog(false)}
        confirmText="Révoquer"
      />
      
      <ConfirmDialog
        visible={showReactivateNominationDialog}
        title="Réactiver la nomination"
        message={`Voulez-vous réactiver la nomination de ${actionTarget?.name} ?`}
        onConfirm={confirmReactivateNomination}
        onCancel={() => setShowReactivateNominationDialog(false)}
        confirmText="Réactiver"
      />
      
      {/* Modals (années, périodes, matières) */}
      <Modal visible={showAnneeModal} transparent animationType="fade" onRequestClose={() => setShowAnneeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner une année scolaire</Text>
              <TouchableOpacity onPress={() => setShowAnneeModal(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {annees.map(annee => (
                <TouchableOpacity
                  key={annee.id}
                  style={[styles.modalItem, selectedAnneeId === annee.id && styles.modalItemActive]}
                  onPress={() => handleSelectAnnee(annee.id)}
                >
                  <View>
                    <Text style={[styles.modalItemText, selectedAnneeId === annee.id && styles.modalItemTextActive]}>
                      {annee.libelle}
                    </Text>
                    <Text style={styles.modalItemSubText}>
                      {new Date(annee.date_debut).toLocaleDateString('fr-FR')} - {new Date(annee.date_fin).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                  {annee.is_active && (
                    <View style={styles.activeBadge}>
                      <Text style={styles.activeBadgeText}>Active</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      <Modal visible={showPeriodeModal} transparent animationType="fade" onRequestClose={() => setShowPeriodeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner la période par défaut</Text>
              <TouchableOpacity onPress={() => setShowPeriodeModal(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {periodes.map(periode => (
                <TouchableOpacity
                  key={periode.id}
                  style={[styles.modalItem, selectedPeriodeId === periode.id && styles.modalItemActive]}
                  onPress={() => handleSelectPeriode(periode.id)}
                >
                  <Text style={[styles.modalItemText, selectedPeriodeId === periode.id && styles.modalItemTextActive]}>
                    {periode.libelle}
                  </Text>
                  <Text style={styles.modalItemSubText}>
                    {new Date(periode.date_debut).toLocaleDateString('fr-FR')} - {new Date(periode.date_fin).toLocaleDateString('fr-FR')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      <Modal visible={showAjoutAnneeModal} transparent animationType="fade" onRequestClose={() => setShowAjoutAnneeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter une année scolaire</Text>
              <TouchableOpacity onPress={() => setShowAjoutAnneeModal(false)}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              <View style={styles.modalForm}>
                <Text style={styles.modalLabel}>Date de début</Text>
                <DatePicker
                  value={nouvelleAnnee.date_debut}
                  onChange={(date) => setNouvelleAnnee(prev => ({ ...prev, date_debut: date }))}
                  placeholder="Sélectionner une date"
                />
                
                <Text style={styles.modalLabel}>Date de fin</Text>
                <DatePicker
                  value={nouvelleAnnee.date_fin}
                  onChange={(date) => setNouvelleAnnee(prev => ({ ...prev, date_fin: date }))}
                  placeholder="Sélectionner une date"
                />
                
                {generatedLibelle && (
                  <View style={styles.generatedLibelleContainer}>
                    <Text style={styles.generatedLibelleLabel}>Libellé généré :</Text>
                    <Text style={styles.generatedLibelleValue}>{generatedLibelle}</Text>
                  </View>
                )}
                
                <TouchableOpacity style={styles.modalSaveButton} onPress={handleAjouterAnnee}>
                  <Text style={styles.modalSaveButtonText}>Ajouter</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      
      <Modal visible={showMatiereModal} transparent animationType="fade" onRequestClose={closeMatiereModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingMatiere ? 'Modifier la matière' : 'Ajouter une matière'}
              </Text>
              <TouchableOpacity onPress={closeMatiereModal}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              <View style={styles.modalForm}>
                <Text style={styles.modalLabel}>Nom de la matière *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={matiereForm.nom}
                  onChangeText={(text) => setMatiereForm(prev => ({ ...prev, nom: text }))}
                  placeholder="Ex: Mathématiques"
                />
                
                <Text style={styles.modalLabel}>Code (optionnel)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={matiereForm.code}
                  onChangeText={(text) => setMatiereForm(prev => ({ ...prev, code: text }))}
                  placeholder="Ex: MATHS"
                  autoCapitalize="characters"
                />
                
                <Text style={styles.modalLabel}>Coefficient *</Text>
                <TextInput
                  style={styles.modalInput}
                  value={matiereForm.coefficient}
                  onChangeText={(text) => setMatiereForm(prev => ({ ...prev, coefficient: text }))}
                  placeholder="Ex: 1"
                  keyboardType="numeric"
                />
                
                <TouchableOpacity style={styles.modalSaveButton} onPress={handleSaveMatiere}>
                  <Text style={styles.modalSaveButtonText}>
                    {editingMatiere ? 'Modifier' : 'Ajouter'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  infoBanner: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  infoBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  infoBannerSubtext: {
    fontSize: 12,
    color: '#1E40AF',
  },
  formContainer: {
    marginTop: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  readonlyField: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  readonlyText: {
    fontSize: 14,
    color: '#1F2937',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  inputReadonly: {
    backgroundColor: '#F9FAFB',
    color: '#6B7280',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowItem: {
    flex: 1,
  },
  regimeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  regimeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  regimeButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: theme.colors.primary.DEFAULT,
  },
  regimeButtonText: {
    fontSize: 13,
    color: '#6B7280',
  },
  regimeButtonTextActive: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  selectorText: {
    fontSize: 14,
    color: '#1F2937',
  },
  selectorDisabled: {
    color: '#9CA3AF',
  },
  activeInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  activeInfoText: {
    fontSize: 12,
    color: '#6B7280',
  },
  sectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
  },
  sectionButtonPrimary: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  sectionButtonText: {
    fontSize: 12,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
  matiereItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  matiereInfo: {
    flex: 1,
  },
  matiereName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  matiereCode: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  matiereCoeff: {
    fontSize: 12,
    color: theme.colors.primary.DEFAULT,
    marginTop: 2,
  },
  matiereActions: {
    flexDirection: 'row',
    gap: 16,
  },
  cardDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  comingSoonBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  comingSoonText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalList: {
    padding: 8,
  },
  modalForm: {
    padding: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  modalHint: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  searchButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  searchButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  userCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  userEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typeChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: theme.colors.primary.DEFAULT,
  },
  typeChipText: {
    fontSize: 13,
    color: '#6B7280',
  },
  typeChipTextActive: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  roleContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  roleChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: theme.colors.primary.DEFAULT,
  },
  roleChipText: {
    fontSize: 13,
    color: '#6B7280',
  },
  roleChipTextActive: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  modalSaveButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  modalSaveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  modalSaveButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    marginVertical: 2,
  },
  modalItemActive: {
    backgroundColor: '#EFF6FF',
  },
  modalItemText: {
    fontSize: 14,
    color: '#1F2937',
  },
  modalItemTextActive: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  modalItemSubText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  activeBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: 10,
    color: '#065F46',
    fontWeight: '500',
  },
  generatedLibelleContainer: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  generatedLibelleLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  generatedLibelleValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary.DEFAULT,
  },
});
