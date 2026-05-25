// /home/project/components/notes/ElevesTab.tsx
// Onglet Élèves – Liste des élèves, recherche, tri, génération bulletin
// PHASE C.3 : Ajout de selectedPeriodeId pour la génération batch

import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Modal, TouchableOpacity, Alert } from 'react-native';
import { useState, useMemo, useEffect } from 'react';
import { FileText, CheckCircle, XCircle } from 'lucide-react-native';
import ElevesSearchBar from './ElevesSearchBar';
import ElevesListCard from './ElevesListCard';
import EleveDetailModal from './EleveDetailModal';
import { EleveWithMoyenne } from '@/types/notes.types';
import { useEligibiliteBatch } from '@/hooks/useEligibilite';
import { StatutEligibilite } from '@/types/eligibilite.types';
import theme from '@/constants/theme';

interface ElevesTabProps {
  elevesList: EleveWithMoyenne[];
  selectedClasseNom: string;
  selectedClasseId: string | null;
  anneeScolaireId: string | null;
  selectedPeriodeId: string;  // ← AJOUTÉ
  onSelectEleve: (eleveId: string, eleveNom: string) => void;
  onGenerateBulletin: (eleveId: string) => Promise<void>;
  onGenerateBulletinsBatch?: (eleveIds: string[], periodeId: string, onProgress?: (current: number, total: number, eleveNom?: string) => void) => Promise<void>;
  isSubscribed: boolean;
  loading: boolean;
}

type SortField = 'moyenne' | 'rang' | 'nom';
type SortOrder = 'asc' | 'desc';

export default function ElevesTab({
  elevesList,
  selectedClasseNom,
  selectedClasseId,
  anneeScolaireId,
  selectedPeriodeId,  // ← AJOUTÉ
  onSelectEleve,
  onGenerateBulletin,
  onGenerateBulletinsBatch,
  isSubscribed,
  loading,
}: ElevesTabProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('rang');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [selectedEleve, setSelectedEleve] = useState<EleveWithMoyenne | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [eligibiliteMap, setEligibiliteMap] = useState<Map<string, StatutEligibilite>>(new Map());
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isGeneratingBatch, setIsGeneratingBatch] = useState(false);
  
  const [batchProgress, setBatchProgress] = useState({ 
    current: 0, 
    total: 0, 
    show: false, 
    currentEleve: '' 
  });

  const eleveIds = useMemo(() => elevesList.map(e => e.id), [elevesList]);

  const {
    statuts: eligibiliteStatuts,
    loading: eligibiliteLoading,
    getEligibleCount,
    getNonEligibleCount,
    getNonEligibleIds,
    getStatut,
  } = useEligibiliteBatch(eleveIds, anneeScolaireId);

  useEffect(() => {
    const newMap = new Map<string, StatutEligibilite>();
    for (const eleve of elevesList) {
      const statut = eligibiliteStatuts[eleve.id];
      if (statut) {
        newMap.set(eleve.id, statut);
      }
    }
    setEligibiliteMap(newMap);
  }, [elevesList, eligibiliteStatuts]);

  const filteredEleves = useMemo(() => {
    if (!searchQuery.trim()) return elevesList;
    const query = searchQuery.toLowerCase().trim();
    return elevesList.filter(
      (eleve) =>
        eleve.nom.toLowerCase().includes(query) ||
        eleve.prenom.toLowerCase().includes(query) ||
        eleve.matricule.toLowerCase().includes(query)
    );
  }, [elevesList, searchQuery]);

  const sortedEleves = useMemo(() => {
    const sorted = [...filteredEleves];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'moyenne':
          comparison = a.moyenne - b.moyenne;
          break;
        case 'rang':
          comparison = a.rang - b.rang;
          break;
        case 'nom':
          comparison = `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [filteredEleves, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleSelectEleve = (eleve: EleveWithMoyenne) => {
    setSelectedEleve(eleve);
    setModalVisible(true);
    onSelectEleve(eleve.id, `${eleve.prenom} ${eleve.nom}`);
  };

  const handleGenerateBulletin = async (eleveId: string) => {
    await onGenerateBulletin(eleveId);
  };

  const elevesWithEligibilite = useMemo(() => {
    return sortedEleves.map(eleve => ({
      ...eleve,
      eligible: eligibiliteMap.get(eleve.id)?.eligible ?? true,
      motifs: eligibiliteMap.get(eleve.id)?.motifs ?? [],
    }));
  }, [sortedEleves, eligibiliteMap]);

  const nonEligibleCount = getNonEligibleCount();
  const hasNonEligible = nonEligibleCount > 0;
  
  const eligibleIds = useMemo(() => {
    return elevesWithEligibilite
      .filter(e => e.eligible === true)
      .map(e => e.id);
  }, [elevesWithEligibilite]);

  const handleToggleSelect = (eleveId: string) => {
    setSelectedIds(prev =>
      prev.includes(eleveId)
        ? prev.filter(id => id !== eleveId)
        : [...prev, eleveId]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(eligibleIds);
  };

  const handleDeselectAll = () => {
    setSelectedIds([]);
  };

  const handleGenerateBatch = async () => {
    if (selectedIds.length === 0) {
      Alert.alert('Sélection requise', 'Veuillez sélectionner au moins un élève.');
      return;
    }

    const eligibleSelectedIds = selectedIds.filter(id => 
      elevesWithEligibilite.find(e => e.id === id)?.eligible === true
    );

    if (eligibleSelectedIds.length === 0) {
      Alert.alert('Aucun éligible', 'Les élèves sélectionnés ne sont pas éligibles à la génération de bulletin.');
      return;
    }

    if (eligibleSelectedIds.length !== selectedIds.length) {
      Alert.alert(
        'Attention',
        `${selectedIds.length - eligibleSelectedIds.length} élève(s) sélectionné(s) ne sont pas éligibles et seront ignorés.`,
        [
          { text: 'Annuler', style: 'cancel' },
          { 
            text: `Générer (${eligibleSelectedIds.length})`, 
            onPress: () => executeBatchGeneration(eligibleSelectedIds)
          }
        ]
      );
    } else {
      await executeBatchGeneration(eligibleSelectedIds);
    }
  };

  const executeBatchGeneration = async (ids: string[]) => {
    setIsGeneratingBatch(true);
    
    setBatchProgress({
      current: 0,
      total: ids.length,
      show: true,
      currentEleve: 'Préparation...'
    });
    
    try {
      if (onGenerateBulletinsBatch) {
        await onGenerateBulletinsBatch(ids, selectedPeriodeId, (current: number, total: number, eleveNom?: string) => {
          setBatchProgress({
            current,
            total,
            show: true,
            currentEleve: eleveNom || `Bulletin ${current}/${total}`
          });
        });
      } else {
        let successCount = 0;
        for (let i = 0; i < ids.length; i++) {
          setBatchProgress({
            current: i + 1,
            total: ids.length,
            show: true,
            currentEleve: `Génération du bulletin ${i + 1}/${ids.length}...`
          });
          await onGenerateBulletin(ids[i]);
          successCount++;
        }
        Alert.alert('Succès', `${successCount} bulletin(s) généré(s) avec succès`);
      }
      setSelectedIds([]);
    } catch (error) {
      console.error('Erreur génération batch:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la génération des bulletins');
    } finally {
      setIsGeneratingBatch(false);
      setTimeout(() => {
        setBatchProgress(prev => ({ ...prev, show: false }));
      }, 2000);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Chargement des élèves...</Text>
      </View>
    );
  }

  if (!selectedClasseNom) {
    return (
      <View style={styles.placeholderContainer}>
        <Text style={styles.placeholderTitle}>👨‍🎓 Liste des élèves</Text>
        <Text style={styles.placeholderText}>
          Veuillez sélectionner une classe dans l'onglet Synthèse
        </Text>
      </View>
    );
  }

  if (elevesList.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Aucun élève</Text>
        <Text style={styles.emptyText}>Aucun élève trouvé dans la classe {selectedClasseNom}</Text>
      </View>
    );
  }

  const eligibleSelectedCount = selectedIds.filter(id => 
    elevesWithEligibilite.find(e => e.id === id)?.eligible === true
  ).length;

  return (
    <View style={styles.container}>
      {batchProgress.show && (
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Génération des bulletins</Text>
            {batchProgress.current === batchProgress.total && batchProgress.total > 0 ? (
              <CheckCircle size={20} color="#10B981" />
            ) : (
              <ActivityIndicator size="small" color={theme.colors.primary.DEFAULT} />
            )}
          </View>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBarFill, { width: `${(batchProgress.current / batchProgress.total) * 100}%` }]} />
          </View>
          <View style={styles.progressStats}>
            <Text style={styles.progressText}>{batchProgress.current} / {batchProgress.total} bulletins</Text>
            {batchProgress.currentEleve && (
              <Text style={styles.progressCurrentEleve} numberOfLines={1}>{batchProgress.currentEleve}</Text>
            )}
          </View>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.title}>👨‍🎓 Liste des élèves</Text>
        <Text style={styles.subtitle}>Classe : {selectedClasseNom}</Text>
        {hasNonEligible && !eligibiliteLoading && (
          <View style={styles.warningBadge}>
            <Text style={styles.warningText}>⚠️ {nonEligibleCount} élève(s) non éligible(s) à la génération de bulletin</Text>
          </View>
        )}
      </View>

      {selectedIds.length > 0 && (
        <View style={styles.batchBar}>
          <Text style={styles.batchText}>{eligibleSelectedCount} / {selectedIds.length} élève(s) éligible(s) sélectionné(s)</Text>
          <TouchableOpacity
            style={[styles.batchButton, (isGeneratingBatch || eligibleSelectedCount === 0) && styles.batchButtonDisabled]}
            onPress={handleGenerateBatch}
            disabled={isGeneratingBatch || eligibleSelectedCount === 0}
          >
            {isGeneratingBatch ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <FileText size={16} color="#FFFFFF" />
                <Text style={styles.batchButtonText}>Générer ({eligibleSelectedCount})</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <ElevesSearchBar
        onSearch={setSearchQuery}
        onSort={handleSort}
        sortField={sortField}
        sortOrder={sortOrder}
        isSubscribed={isSubscribed}
      />

      <ElevesListCard
        data={elevesWithEligibilite}
        onSelectEleve={handleSelectEleve}
        onGenerateBulletin={handleGenerateBulletin}
        isSubscribed={isSubscribed}
        eligibiliteLoading={eligibiliteLoading}
        selectable={true}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
      />

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        {selectedEleve && (
          <EleveDetailModal
            eleve={selectedEleve}
            classeNom={selectedClasseNom}
            anneeScolaireId={anneeScolaireId}
            onClose={() => setModalVisible(false)}
            onGenerateBulletin={handleGenerateBulletin}
          />
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { marginBottom: 16 },
  title: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  warningBadge: { backgroundColor: '#FEF3C7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, marginTop: 8 },
  warningText: { fontSize: 12, color: '#D97706', fontWeight: '500' },
  batchBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, marginBottom: 16 },
  batchText: { fontSize: 13, fontWeight: '500', color: '#1E40AF' },
  batchButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.primary.DEFAULT, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  batchButtonDisabled: { backgroundColor: '#9CA3AF' },
  batchButtonText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF' },
  loadingContainer: { paddingVertical: 40, alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  placeholderContainer: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB', borderStyle: 'dashed' },
  placeholderTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  placeholderText: { fontSize: 13, color: '#6B7280', textAlign: 'center' },
  emptyContainer: { paddingVertical: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 8 },
  emptyText: { fontSize: 13, color: '#6B7280', textAlign: 'center' },
  progressContainer: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  progressTitle: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  progressBarContainer: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: '100%', backgroundColor: theme.colors.primary.DEFAULT, borderRadius: 4 },
  progressStats: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressText: { fontSize: 12, color: '#6B7280' },
  progressCurrentEleve: { fontSize: 12, color: '#9CA3AF', maxWidth: 200, textAlign: 'right' },
});