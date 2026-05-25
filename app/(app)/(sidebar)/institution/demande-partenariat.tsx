import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import RequestForm from '@/components/institution/RequestForm';
import { useState, useEffect } from 'react';

export default function DemandePartenariatScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [checking, setChecking] = useState(true);

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
        .from('demandes_partenariat')
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

  const handleSubmit = async (formData: any) => {
    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté pour soumettre une demande');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('demandes_partenariat')
        .insert({
          demandeur_id: user.id,
          type_partenaire: formData.type_partenaire,
          organisation_nom: formData.organisation_nom,
          organisation_site: formData.organisation_site || null,
          organisation_siege: formData.organisation_siege || null,
          contact_nom: formData.contact_nom,
          contact_email: formData.contact_email,
          contact_telephone: formData.contact_telephone,
          type_collaboration: formData.type_collaboration,
          proposition: formData.proposition,
          montant_propose: formData.montant_propose ? parseFloat(formData.montant_propose) : null,
          statut: 'en_attente',
        })
        .select()
        .single();

      if (error) throw error;

      Alert.alert(
        'Demande envoyée',
        'Votre demande de partenariat a été envoyée. Vous serez notifié de sa validation.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Erreur lors de l\'envoi');
    } finally {
      setIsSubmitting(false);
    }
  };

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
            Vous avez déjà une demande de partenariat en attente de traitement.
            Veuillez patienter jusqu'à la validation ou le rejet de votre demande actuelle.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Devenir partenaire</Text>
        <Text style={styles.subtitle}>
          Remplissez ce formulaire pour soumettre une demande de partenariat avec SchoolNet.
          Un administrateur examinera votre demande.
        </Text>
      </View>

      <RequestForm
        type="partenariat"
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
  },
});