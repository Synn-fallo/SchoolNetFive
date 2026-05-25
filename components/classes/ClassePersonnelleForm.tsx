import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useState } from 'react';
import { Card } from '@/components/Card';
import { X, Save, Building2 } from 'lucide-react-native';
import theme from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import EtablissementSearchModal from '@/components/etablissement/EtablissementSearchModal';

interface ClassePersonnelleFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: {
    id?: string;
    nom: string;
    description: string;
    etablissement_nom?: string;
    etablissement_id?: string | null;
  };
}

export default function ClassePersonnelleForm({ onSuccess, onCancel, initialData }: ClassePersonnelleFormProps) {
  const { user } = useAuth();
  const [nom, setNom] = useState(initialData?.nom || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [etablissementNom, setEtablissementNom] = useState(initialData?.etablissement_nom || '');
  const [etablissementId, setEtablissementId] = useState(initialData?.etablissement_id || null);
  const [loading, setLoading] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

  const isEditing = !!initialData?.id;

  const handleSelectEtablissement = (etablissement: { id: string; nom: string; ville?: string | null }) => {
    setEtablissementNom(etablissement.nom);
    setEtablissementId(etablissement.id);
  };

  const handleSubmit = async () => {
    if (!nom.trim()) {
      Alert.alert('Erreur', 'Le nom de la classe est requis');
      return;
    }

    if (!user) {
      Alert.alert('Erreur', 'Utilisateur non connecté');
      return;
    }

    setLoading(true);

    try {
      const dataToSave: any = {
        nom: nom.trim(),
        description: description.trim() || null,
        updated_at: new Date().toISOString(),
      };

      if (etablissementId) {
        dataToSave.etablissement_id = etablissementId;
        dataToSave.etablissement_nom = etablissementNom;
      } else if (etablissementNom.trim()) {
        dataToSave.etablissement_nom = etablissementNom.trim();
        dataToSave.etablissement_id = null;
      }

      if (isEditing) {
        const { error } = await supabase
          .from('classes_personnelles')
          .update(dataToSave)
          .eq('id', initialData.id)
          .eq('enseignant_id', user.id);

        if (error) throw error;
        Alert.alert('Succès', 'Classe modifiée');
      } else {
        const { error } = await supabase
          .from('classes_personnelles')
          .insert({
            enseignant_id: user.id,
            nom: nom.trim(),
            description: description.trim() || null,
            matieres: [],
            eleves: [],
            etablissement_nom: etablissementNom.trim() || null,
            etablissement_id: etablissementId || null,
          });

        if (error) throw error;
        Alert.alert('Succès', 'Classe créée');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving class:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder la classe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>{isEditing ? 'Modifier la classe' : 'Nouvelle classe personnelle'}</Text>
          <TouchableOpacity onPress={onCancel}>
            <X size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Nom de la classe *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Tle D, 3ème A, Classe de soutien..."
            value={nom}
            onChangeText={setNom}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Établissement</Text>
          <TouchableOpacity style={styles.etablissementButton} onPress={() => setShowSearchModal(true)}>
            <Building2 size={16} color={theme.colors.primary.DEFAULT} />
            <Text style={etablissementNom ? styles.etablissementText : styles.etablissementPlaceholder}>
              {etablissementNom || 'Rechercher un établissement'}
            </Text>
          </TouchableOpacity>
          {etablissementNom && (
            <TouchableOpacity onPress={() => { setEtablissementNom(''); setEtablissementId(null); }}>
              <Text style={styles.clearText}>Effacer</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Description (optionnelle)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description de la classe..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Save size={16} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>{isEditing ? 'Enregistrer' : 'Créer'}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </Card>

      <EtablissementSearchModal
        visible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelect={handleSelectEtablissement}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  etablissementButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  etablissementText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  etablissementPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: '#9CA3AF',
  },
  clearText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});