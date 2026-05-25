import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useReleveNotes } from '@/hooks/useReleveNotes';
import ReleveNotesView from '@/components/enseignant/ReleveNotesView';
import { supabase } from '@/lib/supabase';
import theme from '@/constants/theme';

interface Eleve {
  id: string;
  nom: string;
  prenom: string;
  matricule?: string;
}

export default function ReleveNotesScreen() {
  const router = useRouter();
  const { eleveId, eleveNom, elevePrenom, classeId, classeNom, type } = useLocalSearchParams<{
    eleveId: string;
    eleveNom: string;
    elevePrenom: string;
    classeId: string;
    classeNom: string;
    type: 'officielle' | 'personnelle';
  }>();

  const [currentEleveId, setCurrentEleveId] = useState(eleveId);
  const [currentEleveNom, setCurrentEleveNom] = useState(eleveNom);
  const [currentElevePrenom, setCurrentElevePrenom] = useState(elevePrenom);
  const [elevesList, setElevesList] = useState<Eleve[]>([]);
  const [loadingEleves, setLoadingEleves] = useState(true);
  const [hideError, setHideError] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { releve, loading, error, selectedPeriode, setSelectedPeriode, refresh } = useReleveNotes({
    eleveId: currentEleveId || eleveId,
    classeId: classeId,
    type: type || 'officielle',
  });

  const displayError = error || localError;

  const handlePeriodeChange = async (newPeriode: string) => {
    if (newPeriode === selectedPeriode) return;

    let hasData = false;
    try {
      if (type === 'officielle') {
        const { data } = await supabase
          .from('devoirs')
          .select('id', { count: 'exact', head: true })
          .eq('classe_id', classeId)
          .eq('periode', newPeriode);
        hasData = (data?.length || 0) > 0;
      } else {
        const { data } = await supabase
          .from('devoirs')
          .select('id', { count: 'exact', head: true })
          .eq('classe_personnelle_id', classeId)
          .eq('periode', newPeriode);
        hasData = (data?.length || 0) > 0;
      }
    } catch (err) {
      hasData = false;
    }

    if (hasData) {
      setSelectedPeriode(newPeriode);
      setHideError(false);
      setLocalError(null);
    } else {
      setLocalError(`Aucune note pour la période ${newPeriode}`);
      setHideError(false);
    }
  };

  useEffect(() => {
    const loadElevesList = async () => {
      if (!classeId) return;
      setLoadingEleves(true);
      
      try {
        if (type === 'officielle') {
          const { data, error } = await supabase
            .from('eleves')
            .select('id, nom, prenom, matricule')
            .eq('classe_id', classeId)
            .order('nom', { ascending: true });
          
          if (error) throw error;
          setElevesList(data || []);
        } else {
          const { data, error } = await supabase
            .from('classes_personnelles')
            .select('eleves')
            .eq('id', classeId)
            .single();
          
          if (error) throw error;
          
          const formattedEleves = (data?.eleves || []).map((e: any, idx: number) => ({
            id: e.id || `temp_${idx}`,
            nom: e.nom,
            prenom: e.prenom,
            matricule: e.matricule,
          }));
          setElevesList(formattedEleves);
        }
      } catch (err) {
        console.error('Error loading students list:', err);
      } finally {
        setLoadingEleves(false);
      }
    };
    
    loadElevesList();
  }, [classeId, type]);

  const handleEleveChange = (newEleveId: string, newEleveNom: string, newElevePrenom: string) => {
    setCurrentEleveId(newEleveId);
    setCurrentEleveNom(newEleveNom);
    setCurrentElevePrenom(newElevePrenom);
  };

  const handleCreateEvaluation = () => {
    if (type === 'officielle') {
      router.push(`/notes?classeId=${classeId}`);
    } else {
      router.push(`/notes?classePersonnelleId=${classeId}`);
    }
  };

  if (loading || loadingEleves) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (displayError && !hideError) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.errorCard}>
          <View style={styles.errorIconContainer}>
            <Text style={styles.errorIcon}>📭</Text>
          </View>
          <Text style={styles.errorTitle}>Aucune note disponible</Text>
          <Text style={styles.errorMessage}>
            {displayError === 'Aucune note pour cette période' || displayError?.includes('Aucune note')
              ? "Il n'y a pas encore de notes pour cette période."
              : displayError}
          </Text>
          <View style={styles.errorActions}>
            <TouchableOpacity 
              style={[styles.errorButton, styles.errorButtonSecondary]} 
              onPress={() => router.back()}
            >
              <Text style={[styles.errorButtonText, { color: theme.colors.primary.DEFAULT }]}>
                ← Retour
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.errorButton, styles.errorButtonPrimary]} 
              onPress={() => setHideError(true)}
            >
              <Text style={styles.errorButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity 
            style={[styles.errorButton, styles.errorButtonOutline]} 
            onPress={handleCreateEvaluation}
          >
            <Text style={[styles.errorButtonText, { color: theme.colors.primary.DEFAULT }]}>
              + Créer une évaluation
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!releve) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>Aucune donnée disponible</Text>
      </View>
    );
  }

  return (
    <ReleveNotesView
      releve={releve}
      eleveNom={currentEleveNom || eleveNom}
      elevePrenom={currentElevePrenom || elevePrenom}
      classeNom={classeNom}
      classeId={classeId}
      type={type || 'officielle'}
      selectedPeriode={selectedPeriode}
      onPeriodeChange={handlePeriodeChange}
      onRefresh={refresh}
      elevesList={elevesList}
      onEleveChange={handleEleveChange}
      currentEleveId={currentEleveId || eleveId}
      onCreateEvaluation={handleCreateEvaluation}
    />
  );
}

const styles = StyleSheet.create({
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
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    width: '90%',
  },
  errorIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorIcon: {
    fontSize: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    width: '100%',
  },
  errorButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  errorButtonPrimary: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  errorButtonSecondary: {
    backgroundColor: '#F3F4F6',
  },
  errorButtonOutline: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: theme.colors.primary.DEFAULT,
    width: '100%',
  },
  errorButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});