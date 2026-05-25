import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/Card';
import theme from '@/constants/theme';

interface LierEnfantFormProps {
  onSuccess: (nom: string, prenom: string) => void;
}

export default function LierEnfantForm({ onSuccess }: LierEnfantFormProps) {
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [educmaster, setEducmaster] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!code.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir le code d\'invitation');
      return;
    }

    if (!educmaster.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir l\'EducMaster de l\'enfant');
      return;
    }

    setLoading(true);

    try {
      // Appeler l'edge function pour valider l'invitation
      const { data, error } = await supabase.functions.invoke('validate-eleve-invitation', {
        body: {
          code: code.trim().toUpperCase(),
          educmaster: educmaster.trim(),
          parent_id: user?.id,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Code invalide ou expiré');
      }

      // Succès
      onSuccess(data.eleve_nom, data.eleve_prenom);

    } catch (error: any) {
      console.error('Error linking child:', error);
      Alert.alert('Erreur', error.message || 'Impossible de lier l\'enfant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>Informations de liaison</Text>

      <Text style={styles.label}>Code d'invitation *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: ABC12345"
        value={code}
        onChangeText={(text) => setCode(text.toUpperCase())}
        autoCapitalize="characters"
        editable={!loading}
      />

      <Text style={styles.label}>EducMaster de l'enfant *</Text>
      <TextInput
        style={styles.input}
        placeholder="Ex: 20240123456789"
        value={educmaster}
        onChangeText={setEducmaster}
        keyboardType="number-pad"
        editable={!loading}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Lier mon enfant</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.note}>
        ℹ️ Le code d'invitation vous a été fourni par l'établissement scolaire de votre enfant.
        Si vous n'avez pas reçu de code, contactez l'établissement.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  button: {
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  note: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 16,
  },
});