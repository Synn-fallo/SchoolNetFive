// /home/project/components/notes/PeriodSelector.tsx
// Sélecteur année scolaire / période
// PHASE C.2 : Retourne l'UUID de la période (periode_id)
// PHASE C.3 : Sélection automatique de la période courante

import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Calendar } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Regime, AnneeScolaire } from '@/types/notes.types';
import theme from '@/constants/theme';

interface PeriodeOption {
  id: string;
  libelle: string;
  ordre: number;
}

interface PeriodSelectorProps {
  anneesScolaires: AnneeScolaire[];
  selectedAnneeScolaireId: string;
  selectedPeriodeId: string;
  selectedPeriodeLabel: string;
  selectedRegime: Regime;
  isSubscribed: boolean;
  onAnneeChange: (anneeId: string) => void;
  onPeriodeChange: (periodeId: string, periodeLabel: string) => void;
  onRegimeChange: (regime: Regime) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  etablissementId: string;
}

export default function PeriodSelector({
  anneesScolaires,
  selectedAnneeScolaireId,
  selectedPeriodeId,
  selectedPeriodeLabel,
  selectedRegime,
  isSubscribed,
  onAnneeChange,
  onPeriodeChange,
  onRegimeChange,
  onRefresh,
  isLoading = false,
  etablissementId,
}: PeriodSelectorProps) {
  const [showAnneeModal, setShowAnneeModal] = useState(false);
  const [showPeriodeModal, setShowPeriodeModal] = useState(false);
  const [periodes, setPeriodes] = useState<PeriodeOption[]>([]);
  const [loadingPeriodes, setLoadingPeriodes] = useState(false);
  const initialSelectionDone = useRef(false);

  // Charger les périodes depuis la base
  useEffect(() => {
    if (selectedAnneeScolaireId && etablissementId && isSubscribed) {
      loadPeriodes();
    }
  }, [selectedAnneeScolaireId, etablissementId, selectedRegime, isSubscribed]);

  const loadPeriodes = async () => {
    setLoadingPeriodes(true);
    try {
      const { data, error } = await supabase
        .from('periodes')
        .select('id, libelle, ordre')
        .eq('etablissement_id', etablissementId)
        .eq('annee_scolaire_id', selectedAnneeScolaireId)
        .eq('type', selectedRegime === 'semestre' ? 'semestre' : 'trimestre')
        .eq('categorie', 'normale')
        .order('ordre', { ascending: true });

      if (error) throw error;

      const periodesData = data || [];
      setPeriodes(periodesData);

      // Sélection automatique de la période par défaut (une seule fois)
      if (periodesData.length > 0 && !initialSelectionDone.current && !selectedPeriodeId) {
        await selectDefaultPeriode(periodesData);
      }
    } catch (error) {
      console.error('Erreur chargement périodes:', error);
    } finally {
      setLoadingPeriodes(false);
    }
  };

  const selectDefaultPeriode = async (periodesList: PeriodeOption[]) => {
    const today = new Date();
    let defaultPeriode: PeriodeOption | null = null;

    // Parcourir les périodes pour trouver celle qui correspond à la date du jour
    for (const periode of periodesList) {
      try {
        const { data, error } = await supabase
          .from('periodes')
          .select('date_debut, date_fin')
          .eq('id', periode.id)
          .single();

        if (error) {
          console.error(`Erreur chargement dates pour période ${periode.id}:`, error);
          continue;
        }

        if (data && data.date_debut && data.date_fin) {
          const debut = new Date(data.date_debut);
          const fin = new Date(data.date_fin);
          
          // Normaliser les dates pour ignorer l'heure
          const todayNorm = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const debutNorm = new Date(debut.getFullYear(), debut.getMonth(), debut.getDate());
          const finNorm = new Date(fin.getFullYear(), fin.getMonth(), fin.getDate());
          
          if (todayNorm >= debutNorm && todayNorm <= finNorm) {
            defaultPeriode = periode;
            break;
          }
        }
      } catch (err) {
        console.error(`Erreur lors de la vérification de la période ${periode.id}:`, err);
      }
    }

    // Si aucune période ne correspond à la date du jour, prendre la première (ordre le plus petit)
    if (!defaultPeriode && periodesList.length > 0) {
      defaultPeriode = periodesList[0];
      console.log(`Aucune période correspondant à la date du jour, sélection de la première: ${defaultPeriode.libelle}`);
    }

    // Appliquer la sélection par défaut
    if (defaultPeriode) {
      console.log(`✅ Sélection automatique de la période: ${defaultPeriode.libelle} (${defaultPeriode.id})`);
      onPeriodeChange(defaultPeriode.id, defaultPeriode.libelle);
      initialSelectionDone.current = true;
    }
  };

  const getSelectedAnneeLabel = () => {
    const annee = anneesScolaires.find(a => a.id === selectedAnneeScolaireId);
    return annee?.libelle || 'Sélectionner';
  };

  const handleSelectPeriode = (periode: PeriodeOption) => {
    onPeriodeChange(periode.id, periode.libelle);
    setShowPeriodeModal(false);
  };

  const periodeOptions = periodes;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Sélecteur Année scolaire */}
        <TouchableOpacity
          style={[styles.selector, !isSubscribed && styles.selectorDisabled]}
          onPress={() => setShowAnneeModal(true)}
          disabled={!isSubscribed || isLoading}
        >
          <Calendar size={16} color={isSubscribed ? theme.colors.neutral[500] : '#9CA3AF'} />
          <Text style={[styles.selectorText, !isSubscribed && styles.disabledText]}>
            {getSelectedAnneeLabel()}
          </Text>
          <ChevronDown size={14} color={isSubscribed ? theme.colors.neutral[500] : '#9CA3AF'} />
        </TouchableOpacity>

        {/* Sélecteur Période */}
        <TouchableOpacity
          style={[styles.selector, !isSubscribed && styles.selectorDisabled]}
          onPress={() => setShowPeriodeModal(true)}
          disabled={!isSubscribed || isLoading || loadingPeriodes}
        >
          <Text style={[styles.selectorText, !isSubscribed && styles.disabledText]}>
            {loadingPeriodes ? 'Chargement...' : selectedPeriodeLabel || 'Sélectionner'}
          </Text>
          <ChevronDown size={14} color={isSubscribed ? theme.colors.neutral[500] : '#9CA3AF'} />
        </TouchableOpacity>
      </View>

      {/* Modal Année scolaire */}
      <Modal visible={showAnneeModal} transparent={true} animationType="fade" onRequestClose={() => setShowAnneeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Année scolaire</Text>
              <TouchableOpacity onPress={() => setShowAnneeModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={anneesScolaires}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    selectedAnneeScolaireId === item.id && styles.modalOptionActive,
                  ]}
                  onPress={() => {
                    onAnneeChange(item.id);
                    setShowAnneeModal(false);
                  }}
                >
                  <Text style={[
                    styles.modalOptionText,
                    selectedAnneeScolaireId === item.id && styles.modalOptionTextActive,
                  ]}>
                    {item.libelle}
                  </Text>
                  {item.is_active && (
                    <Text style={styles.activeBadge}>Active</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Modal Période */}
      <Modal visible={showPeriodeModal} transparent={true} animationType="fade" onRequestClose={() => setShowPeriodeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Période</Text>
              <TouchableOpacity onPress={() => setShowPeriodeModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            {loadingPeriodes ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Chargement des périodes...</Text>
              </View>
            ) : (
              periodeOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.modalOption,
                    selectedPeriodeId === option.id && styles.modalOptionActive,
                  ]}
                  onPress={() => handleSelectPeriode(option)}
                >
                  <Text style={[
                    styles.modalOptionText,
                    selectedPeriodeId === option.id && styles.modalOptionTextActive,
                  ]}>
                    {option.libelle}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </Modal>

      {/* Message si non abonné */}
      {!isSubscribed && (
        <View style={styles.subscriptionMessage}>
          <Text style={styles.subscriptionMessageText}>
            🔒 Sélection de période disponible uniquement avec un abonnement actif
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectorDisabled: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  selectorText: {
    fontSize: 14,
    color: '#1F2937',
  },
  disabledText: {
    color: '#9CA3AF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
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
  modalClose: {
    fontSize: 18,
    color: '#6B7280',
    padding: 4,
  },
  modalOption: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalOptionActive: {
    backgroundColor: '#EFF6FF',
  },
  modalOptionText: {
    fontSize: 15,
    color: '#1F2937',
  },
  modalOptionTextActive: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  activeBadge: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: '600',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  subscriptionMessage: {
    marginTop: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  subscriptionMessageText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
});