import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { ArrowLeft, Send, GraduationCap, Users, BookOpen } from 'lucide-react-native';
import { useSimpleRoleRequest } from '@/hooks/useSimpleRoleRequest';
import theme from '@/constants/theme';

interface SimpleRoleFormProps {
  role: 'eleve' | 'parent' | 'enseignant';
  onSuccess?: () => void;
}

export default function SimpleRoleForm({ role, onSuccess }: SimpleRoleFormProps) {
  const router = useRouter();
  const { submitRequest, loading } = useSimpleRoleRequest({ role });
  const [formData, setFormData] = useState<any>({});

  const getRoleConfig = () => {
    switch (role) {
      case 'eleve':
        return {
          title: 'Demande de rôle Élève',
          description: 'Remplissez ce formulaire pour demander un compte élève.',
          icon: GraduationCap,
          iconColor: '#3B82F6',
          fields: [
            { key: 'classe', label: 'Classe / Niveau', placeholder: 'Ex: 3ème A, Terminale C...', required: true },
            { key: 'matricule', label: 'Matricule (optionnel)', placeholder: 'Votre matricule scolaire', required: false },
          ],
        };
      case 'parent':
        return {
          title: 'Demande de rôle Parent',
          description: 'Remplissez ce formulaire pour demander un compte parent.',
          icon: Users,
          iconColor: '#10B981',
          fields: [
            { key: 'enfants', label: 'Noms des enfants', placeholder: 'Ex: Jean Dupont (CM2), Marie Dupont (6ème)', required: true, multiline: true },
            { key: 'telephone_parent', label: 'Téléphone', placeholder: 'Votre numéro de téléphone', required: true },
          ],
        };
      case 'enseignant':
        return {
          title: 'Demande de rôle Enseignant',
          description: 'Remplissez ce formulaire pour demander un compte enseignant.',
          icon: BookOpen,
          iconColor: '#F59E0B',
          fields: [
            { key: 'diplomes', label: 'Diplômes obtenus', placeholder: 'Ex: Licence, Master, CAP...', required: true, multiline: true },
            { key: 'specialite', label: 'Spécialité', placeholder: 'Ex: Mathématiques, Français, Anglais...', required: true },
            { key: 'annees_experience', label: "Années d'expérience", placeholder: 'Nombre d\'années', required: true, keyboardType: 'numeric' },
          ],
        };
      default:
        return null;
    }
  };

  const config = getRoleConfig();
  if (!config) return null;

  const handleSubmit = async () => {
    const missingFields = config.fields.filter(f => f.required && !formData[f.key]);
    if (missingFields.length > 0) {
      Alert.alert('Champs manquants', 'Veuillez remplir tous les champs obligatoires.');
      return;
    }
  
    const success = await submitRequest({
      role,
      ...formData,
    });
  
    if (success) {
      Alert.alert(
        'Demande acceptée',
        `Votre rôle ${role} a été activé. Redirection vers votre tableau de bord...`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (onSuccess) onSuccess();
              router.push('/(app)');
            }
          }
        ]
      );
    } else {
      Alert.alert('Erreur', 'Une erreur est survenue. Veuillez réessayer.');
    }
  };

  const updateField = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.neutral[600]} />
        </TouchableOpacity>
        <View style={[styles.iconContainer, { backgroundColor: `${config.iconColor}10` }]}>
          <config.icon size={32} color={config.iconColor} />
        </View>
        <Text style={styles.title}>{config.title}</Text>
        <Text style={styles.description}>{config.description}</Text>
      </View>

      <View style={styles.form}>
        {config.fields.map((field) => (
          <View key={field.key} style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>
              {field.label}
              {field.required && <Text style={styles.requiredStar}> *</Text>}
            </Text>
            <TextInput
              style={[styles.input, field.multiline && styles.inputMultiline]}
              placeholder={field.placeholder}
              value={formData[field.key] || ''}
              onChangeText={(value) => updateField(field.key, value)}
              multiline={field.multiline}
              numberOfLines={field.multiline ? 3 : 1}
              keyboardType={field.keyboardType === 'numeric' ? 'numeric' : 'default'}
            />
          </View>
        ))}

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Send size={18} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Envoyer la demande</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  header: {
    backgroundColor: theme.colors.background.primary,
    paddingHorizontal: 24,
    paddingVertical: 32,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  backButton: {
    position: 'absolute',
    top: 32,
    left: 24,
    zIndex: 1,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.neutral[800],
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: theme.colors.neutral[500],
    textAlign: 'center',
    lineHeight: 20,
  },
  form: {
    padding: 24,
    gap: 20,
  },
  fieldContainer: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.neutral[700],
  },
  requiredStar: {
    color: theme.colors.danger.DEFAULT,
  },
  input: {
    backgroundColor: theme.colors.background.primary,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.neutral[800],
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});