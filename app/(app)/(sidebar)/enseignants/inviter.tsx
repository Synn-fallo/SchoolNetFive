import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { ArrowLeft, Mail, User, Building2, Calendar, Send, CheckCircle } from 'lucide-react-native';
import { Card } from '@/components/Card';
import theme from '@/constants/theme';

export default function InviterEnseignantScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { id: etablissementId } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [etablissementNom, setEtablissementNom] = useState<string>('');
  const [invitationEmail, setInvitationEmail] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    nom: '',
    prenom: '',
    telephone: '',
  });

  useEffect(() => {
    if (etablissementId) {
      fetchEtablissementNom();
    }
  }, [etablissementId]);

  const fetchEtablissementNom = async () => {
    if (!etablissementId) return;
    
    try {
      const { data, error } = await supabase
        .from('etablissements')
        .select('nom')
        .eq('id', etablissementId)
        .single();
      
      if (error) throw error;
      setEtablissementNom(data?.nom || '');
    } catch (error) {
      console.error('Error fetching etablissement nom:', error);
    }
  };

  const handleSubmit = async () => {
    // Éviter les soumissions multiples
    if (submitting || submitted) return;

    // Réinitialiser l'erreur
    setErrorMessage(null);

    if (!formData.email) {
      Alert.alert('Champ manquant', 'L\'email est obligatoire');
      return;
    }

    if (!formData.nom) {
      Alert.alert('Champ manquant', 'Le nom est obligatoire');
      return;
    }

    if (!formData.prenom) {
      Alert.alert('Champ manquant', 'Le prénom est obligatoire');
      return;
    }

    if (!etablissementId) {
      Alert.alert('Erreur', 'Aucun établissement sélectionné');
      return;
    }

    setSubmitting(true);
    
    try {
      // Générer un code unique
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expire dans 7 jours

      // Créer l'invitation dans invitation_codes
      const { data: invitationData, error: insertError } = await supabase
        .from('invitation_codes')
        .insert({
          etablissement_id: etablissementId,
          code: code,
          role: 'enseignant',
          email: formData.email,
          nom: formData.nom,
          prenom: formData.prenom,
          telephone: formData.telephone || null,
          expires_at: expiresAt.toISOString(),
          is_active: true,
          created_by: user?.id,
          statut: 'en_attente',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Appeler l'edge function pour envoyer l'email d'invitation
      try {
        const { error: edgeError, data: edgeData } = await supabase.functions.invoke('send-enseignant-invitation', {
          body: {
            email: formData.email,
            nom: formData.nom,
            prenom: formData.prenom,
            telephone: formData.telephone,
            etablissement_id: etablissementId,
          },
        });
        
        if (edgeError) {
          console.error('Edge function error:', edgeError);
          setErrorMessage('L\'invitation a été créée mais l\'email n\'a pas pu être envoyé. Vous pouvez renvoyer l\'invitation depuis la page des invitations.');
        } else {
          console.log('Edge function success:', edgeData);
        }
      } catch (edgeError) {
        console.error('Error calling edge function:', edgeError);
        setErrorMessage('L\'invitation a été créée mais l\'email n\'a pas pu être envoyé. Vous pouvez renvoyer l\'invitation depuis la page des invitations.');
      }

      // Mémoriser l'email pour l'affichage
      setInvitationEmail(formData.email);
      setSubmitted(true);
      
    } catch (error) {
      console.error('Error creating invitation:', error);
      Alert.alert('Erreur', 'Impossible de créer l\'invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleInviteAnother = () => {
    // Réinitialiser le formulaire
    setFormData({ email: '', nom: '', prenom: '', telephone: '' });
    setSubmitted(false);
    setInvitationEmail('');
    setErrorMessage(null);
  };

  // Affichage après succès
  if (submitted) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.colors.neutral[600]} />
          </TouchableOpacity>
          <Text style={styles.title}>Invitation envoyée</Text>
          <View style={{ width: 40 }} />
        </View>

        <Card style={styles.successCard}>
          <View style={styles.successIcon}>
            <CheckCircle size={64} color="#10B981" />
          </View>
          <Text style={styles.successTitle}>Invitation créée !</Text>
          <Text style={styles.successText}>
            Une invitation a été créée pour :
          </Text>
          <Text style={styles.successEmail}>{invitationEmail}</Text>
          
          {errorMessage && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>{errorMessage}</Text>
            </View>
          )}
          
          <Text style={styles.successInfo}>
            L'enseignant pourra créer son compte et sera automatiquement rattaché à votre établissement.
          </Text>
          
          <TouchableOpacity style={styles.anotherButton} onPress={handleInviteAnother}>
            <Text style={styles.anotherButtonText}>Inviter un autre enseignant</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.backToListButton} onPress={handleGoBack}>
            <Text style={styles.backToListButtonText}>Retour à la liste</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.neutral[600]} />
        </TouchableOpacity>
        <Text style={styles.title}>Inviter un enseignant</Text>
        <View style={{ width: 40 }} />
      </View>

      {etablissementNom && (
        <View style={styles.etablissementInfo}>
          <Building2 size={16} color={theme.colors.neutral[500]} />
          <Text style={styles.etablissementNom}>{etablissementNom}</Text>
        </View>
      )}

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Informations de l'enseignant</Text>
        
        <Text style={styles.inputLabel}>Email *</Text>
        <TextInput
          style={styles.input}
          placeholder="exemple@email.com"
          value={formData.email}
          onChangeText={(text) => setFormData({ ...formData, email: text })}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!submitting}
        />

        <Text style={styles.inputLabel}>Nom *</Text>
        <TextInput
          style={styles.input}
          placeholder="Nom"
          value={formData.nom}
          onChangeText={(text) => setFormData({ ...formData, nom: text })}
          editable={!submitting}
        />

        <Text style={styles.inputLabel}>Prénom *</Text>
        <TextInput
          style={styles.input}
          placeholder="Prénom"
          value={formData.prenom}
          onChangeText={(text) => setFormData({ ...formData, prenom: text })}
          editable={!submitting}
        />

        <Text style={styles.inputLabel}>Téléphone (optionnel)</Text>
        <TextInput
          style={styles.input}
          placeholder="XX XX XX XX"
          value={formData.telephone}
          onChangeText={(text) => setFormData({ ...formData, telephone: text })}
          keyboardType="phone-pad"
          editable={!submitting}
        />
      </Card>

      <Card style={styles.infoCard}>
        <Text style={styles.infoTitle}>📌 Comment ça marche ?</Text>
        <View style={styles.infoStep}>
          <View style={styles.infoNumber}>
            <Text style={styles.infoNumberText}>1</Text>
          </View>
          <Text style={styles.infoText}>Remplissez les informations de l'enseignant</Text>
        </View>
        <View style={styles.infoStep}>
          <View style={styles.infoNumber}>
            <Text style={styles.infoNumberText}>2</Text>
          </View>
          <Text style={styles.infoText}>Un email d'invitation est envoyé avec un lien unique</Text>
        </View>
        <View style={styles.infoStep}>
          <View style={styles.infoNumber}>
            <Text style={styles.infoNumberText}>3</Text>
          </View>
          <Text style={styles.infoText}>L'enseignant clique sur le lien, crée son compte et rejoint automatiquement votre établissement</Text>
        </View>
      </Card>

      <TouchableOpacity
        style={[styles.submitButton, (submitting || submitted) && styles.submitButtonDisabled]}
        onPress={handleSubmit}
        disabled={submitting || submitted}
      >
        {submitting ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Send size={18} color="#FFFFFF" />
            <Text style={styles.submitButtonText}>Envoyer l'invitation</Text>
          </>
        )}
      </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  etablissementInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  etablissementNom: {
    fontSize: 13,
    color: '#6B7280',
  },
  section: {
    marginBottom: 20,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  infoCard: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 12,
  },
  infoStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  infoNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoNumberText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  successCard: {
    marginTop: 20,
    padding: 24,
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  successText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  successEmail: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary.DEFAULT,
    textAlign: 'center',
    marginBottom: 16,
  },
  successInfo: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  anotherButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  anotherButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  backToListButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  backToListButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    width: '100%',
  },
  warningText: {
    fontSize: 12,
    color: '#D97706',
    textAlign: 'center',
  },
});