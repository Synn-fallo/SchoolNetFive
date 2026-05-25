import { View, StyleSheet, ScrollView, ActivityIndicator, Text, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveEtablissement } from '@/hooks/useActiveEtablissement';
import { useEleves } from '@/hooks/useEleves';
import { useEducMaster } from '@/hooks/useEducMaster';
import { useParents } from '@/hooks/useParents';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import EleveForm from '@/components/eleves/EleveForm';
import EleveCreationSummary from '@/components/eleves/EleveCreationSummary';
import theme from '@/constants/theme';

interface Classe {
  id: string;
  nom: string;
}

export default function AjouterEleveScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { activeEtablissement } = useActiveEtablissement();
  const { createEleve, loading } = useEleves();
  const { generateIdentifiant } = useEducMaster();
  const { createParentInvitation, linkParentToEleve } = useParents();
  const [classes, setClasses] = useState<Classe[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [nouvelEleve, setNouvelEleve] = useState<{ 
    nom: string; 
    prenom: string; 
    identifiant_connexion: string; 
    motDePasseTemp: string;
    classe_nom?: string;
  } | null>(null);

  useEffect(() => {
    if (activeEtablissement) {
      loadClasses();
    }
  }, [activeEtablissement]);

  const loadClasses = async () => {
    if (!activeEtablissement) return;
    setLoadingClasses(true);
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, nom')
        .eq('etablissement_id', activeEtablissement.id)
        .eq('is_active', true)
        .order('nom');

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleSubmit = async (formData: any, identifiantConnexion: string) => {
    if (!activeEtablissement) return;
    
    setIsSubmitting(true);
    
    try {
      const { parents, ...eleveData } = formData;
      
      const result = await createEleve(
        {
          ...eleveData,
          etablissement_id: activeEtablissement.id,
          parents: parents || [],
        },
        identifiantConnexion
      );
      
      if (!result.success || !result.data) {
        Alert.alert('Erreur', result.error || 'Impossible de créer l\'élève');
        return;
      }
      
      const classe = classes.find(c => c.id === formData.classe_id);
      
      setNouvelEleve({
        nom: formData.nom,
        prenom: formData.prenom,
        identifiant_connexion: result.data.identifiant_connexion || '',
        motDePasseTemp: (result.data as any).motDePasseTemp || '',
        classe_nom: classe?.nom,
        parents: result.parentsResults || [],
      });
      setShowSummary(true);
      
    } catch (error) {
      console.error('Error in submission:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingClasses) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement des classes...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <EleveForm
        etablissementId={activeEtablissement?.id || ''}
        classes={classes}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        isLoading={isSubmitting}
      />
      <EleveCreationSummary
        visible={showSummary}
        onClose={() => {
          setShowSummary(false);
          router.back();
        }}
        eleve={nouvelEleve}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
});