import { View, StyleSheet, ScrollView, Alert, Text, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveEtablissement } from '@/hooks/useActiveEtablissement';
import { useEleves } from '@/hooks/useEleves';
import { useParents } from '@/hooks/useParents';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import EleveForm from '@/components/eleves/EleveForm';
import { ActivityIndicator } from 'react-native';
import theme from '@/constants/theme';

interface Classe {
  id: string;
  nom: string;
}

interface ParentInfo {
  type_lien: string;
  telephone: string;
  nom: string;
  prenom: string;
  email_personnel?: string;
  existing_parent_id?: string;
  is_complete: boolean;
}

export default function ModifierEleveScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { activeEtablissement } = useActiveEtablissement();
  const { getEleveById, updateEleve, loading } = useEleves();
  const { getParentsByEleve } = useParents();
  const [classes, setClasses] = useState<Classe[]>([]);
  const [initialData, setInitialData] = useState<any>(null);
  const [initialParents, setInitialParents] = useState<Record<string, ParentInfo>>({});
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingEleve, setLoadingEleve] = useState(true);
  const [loadingParents, setLoadingParents] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (activeEtablissement) {
      loadClasses();
      loadEleve();
      loadParents();
    }
  }, [activeEtablissement, id]);

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
      console.log('🔍 loadClasses - classes chargées:', data?.length);
      setClasses(data || []);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoadingClasses(false);
    }
  };

  const loadEleve = async () => {
    console.log('🔍 loadEleve - id:', id);
    const data = await getEleveById(id as string);
    console.log('🔍 loadEleve - data reçue:', JSON.stringify(data, null, 2));
    
    if (data) {
      setInitialData({
        id: data.id,
        nom: data.nom,
        prenom: data.prenom,
        identifiant_connexion: data.identifiant_connexion,
        educmaster: data.educmaster,
        sexe: data.sexe,
        date_naissance: data.date_naissance,
        email: data.email,
        telephone: data.telephone,
        classe_id: data.classe_id,
        groupe_id: data.groupe_id,
        matricule: data.matricule,
      });
    } else {
      console.log('🔍 loadEleve - Aucune donnée reçue pour id:', id);
    }
    setLoadingEleve(false);
  };

  const loadParents = async () => {
    console.log('🔍 loadParents - id:', id);
    setLoadingParents(true);
    try {
      const parents = await getParentsByEleve(id as string);
      console.log('🔍 loadParents - parents reçus:', JSON.stringify(parents, null, 2));
      
      const parentsMap: Record<string, ParentInfo> = {};
      for (const parent of parents) {
        const typeLien = parent.lien_parente || 'autre';
        parentsMap[typeLien] = {
          type_lien: typeLien,
          telephone: parent.parent_telephone || '',
          nom: parent.parent_nom || '',
          prenom: parent.parent_prenom || '',
          email_personnel: parent.parent_email || '',
          existing_parent_id: parent.parent_id,
          is_complete: true,
        };
      }
      
      console.log('🔍 loadParents - parentsMap:', JSON.stringify(parentsMap, null, 2));
      setInitialParents(parentsMap);
    } catch (error) {
      console.error('Error loading parents:', error);
    } finally {
      setLoadingParents(false);
    }
  };

  const handleSubmit = async (formData: any, identifiantConnexion: string) => {
    console.log('🚀 Modification - formData reçu:', JSON.stringify(formData, null, 2));
    console.log('🚀 Modification - id:', id);
    
    setIsSubmitting(true);
    
    try {
      const result = await updateEleve(id as string, {
        nom: formData.nom,
        prenom: formData.prenom,
        sexe: formData.sexe,
        date_naissance: formData.date_naissance,
        email: formData.email,
        telephone: formData.telephone,
        classe_id: formData.classe_id,
        groupe_id: formData.groupe_id,
      });
      
      console.log('🚀 Modification - result:', result);
      
      if (result.success) {
        Alert.alert('Succès', 'Élève modifié avec succès', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        Alert.alert('Erreur', result.error || 'Impossible de modifier l\'élève');
      }
    } catch (error) {
      console.error('Error in submission:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingEleve || loadingClasses || loadingParents) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!initialData) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Élève non trouvé</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <EleveForm
        etablissementId={activeEtablissement?.id || ''}
        initialData={initialData}
        classes={classes}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        isLoading={isSubmitting}
        isEdit={true}
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
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});