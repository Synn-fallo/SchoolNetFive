import { View, Text, StyleSheet, Alert, ActivityIndicator, Linking, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import RequestForm from '@/components/institution/RequestForm';
import { useState, useEffect } from 'react';

export default function DemandeEtablissementScreen() {
  const { user, hasRole } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [checking, setChecking] = useState(true);

  const isChef = hasRole('chef_etablissement');

  useEffect(() => {
    checkPendingRequest();
  }, [user]);

  const checkPendingRequest = async () => {
    if (!user) {
      setChecking(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('demandes_etablissement')
        .select('id, statut')
        .eq('demandeur_id', user.id)
        .in('statut', ['en_attente', 'en_cours'])
        .maybeSingle();

      if (error) throw error;
      setHasPendingRequest(!!data);
    } catch (error) {
      console.error('Error checking pending request:', error);
    } finally {
      setChecking(false);
    }
  };

  const generateSlug = (nom: string): string => {
    return nom
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const getUniqueSlug = async (baseSlug: string): Promise<string> => {
    let slug = baseSlug;
    let counter = 1;
    
    while (true) {
      const { data, error } = await supabase
        .from('demandes_etablissement')
        .select('slug')
        .eq('slug', slug)
        .maybeSingle();
      
      if (error || !data) {
        return slug;
      }
      
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
  };

  const checkExistingEtablissement = async (nom: string, ville: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('etablissements')
        .select('id, nom, ville')
        .ilike('nom', `%${nom}%`)
        .eq('ville', ville)
        .limit(1);

      if (error) throw error;
      return data && data.length > 0;
    } catch (error) {
      console.error('Error checking existing etablissement:', error);
      return false;
    }
  };

  const handleSubmit = async (formData: any) => {
    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté pour soumettre une demande');
      return;
    }

    // Éviter les soumissions multiples
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const exists = await checkExistingEtablissement(formData.nom_etablissement, formData.ville);
      if (exists) {
        Alert.alert(
          'Établissement déjà existant',
          `Un établissement nommé "${formData.nom_etablissement}" existe déjà dans la ville de ${formData.ville}.`,
          [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Contacter le support',
              onPress: () => Linking.openURL('mailto:support@schoolnet.bj'),
            },
          ]
        );
        return;
      }

      const baseSlug = generateSlug(formData.nom_etablissement);
      const uniqueSlug = await getUniqueSlug(baseSlug);

      const insertData: any = {
        demandeur_id: user.id,
        nom_etablissement: formData.nom_etablissement,
        slug: uniqueSlug,
        type_etablissement: formData.type_etablissement,
        adresse: formData.adresse,
        ville: formData.ville,
        telephone: formData.telephone,
        email_contact: formData.email_contact,
        site_web: formData.site_web || null,
        plan_souhaite: formData.plan_souhaite,
        message_demandeur: formData.message_demandeur || null,
        statut: 'en_attente',
        mode_verification: formData.mode_verification,
        region_id: formData.region_id || null,
        departement_id: formData.departement_id || null,
      };

      if (formData.mode_verification === 'auto') {
        insertData.numero_agrement = formData.numero_agrement;
      } else if (formData.mode_verification === 'manuel_cachet') {
        insertData.justificatif_url = formData.justificatif_url;
      }

      const { error } = await supabase
        .from('demandes_etablissement')
        .insert(insertData);

      if (error) {
        console.error('Insert error:', error);
        Alert.alert('Erreur', error.message || 'Erreur lors de la soumission');
        return;
      }

      // ✅ Succès : alerte + redirection
      Alert.alert(
        'Demande envoyée',
        'Votre demande de création d\'établissement a été envoyée. Vous serez notifié de sa validation.',
        [{ text: 'OK', onPress: () => router.replace('/(app)') }]
      );
    } catch (err) {
      console.error('Submit error:', err);
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Erreur lors de l\'envoi');
    } finally {
      // ✅ Toujours réactiver le bouton, sauf si on redirige (dans ce cas le composant est démonté)
      setIsSubmitting(false);
    }
  };

  if (!checking && !isChef) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Accès non autorisé</Text>
          <Text style={styles.infoText}>
            Seuls les chefs d'établissement peuvent créer un établissement.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/(app)/(sidebar)/demande-institutionnelle?role=chef_etablissement')}
          >
            <Text style={styles.buttonText}>Faire une demande de rôle</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (checking) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (hasPendingRequest) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Demande en cours</Text>
          <Text style={styles.infoText}>
            Vous avez déjà une demande de création d'établissement en attente de traitement.
            Veuillez patienter jusqu'à la validation ou le rejet de votre demande actuelle.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Créer un établissement</Text>
        <Text style={styles.subtitle}>
          Remplissez ce formulaire pour soumettre une demande de création d'établissement sur SchoolNet.
          Un administrateur examinera votre demande.
        </Text>
      </View>

      <RequestForm
        type="etablissement"
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        currentUserId={user?.id}
      />
    </View>
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
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#D97706',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});