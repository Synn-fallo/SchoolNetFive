import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { useState } from 'react';
import { Card } from '@/components/Card';
import { Plus, Trash2, Edit2, X, Save } from 'lucide-react-native';
import theme from '@/constants/theme';
import { supabase } from '@/lib/supabase';

interface Eleve {
  nom: string;
  prenom: string;
  matricule?: string;
}

interface GestionElevesPersonnelsProps {
  classeId: string;
  eleves: Eleve[];
  onRefresh: () => void;
}

export default function GestionElevesPersonnels({ classeId, eleves, onRefresh }: GestionElevesPersonnelsProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({ nom: '', prenom: '', matricule: '' });

  const handleSave = async () => {
    if (!formData.nom.trim() || !formData.prenom.trim()) {
      Alert.alert('Erreur', 'Le nom et le prénom sont requis');
      return;
    }

    const newEleves = [...eleves];
    if (editingIndex !== null) {
      newEleves[editingIndex] = {
        nom: formData.nom.trim(),
        prenom: formData.prenom.trim(),
        matricule: formData.matricule.trim() || undefined
      };
    } else {
      newEleves.push({
        nom: formData.nom.trim(),
        prenom: formData.prenom.trim(),
        matricule: formData.matricule.trim() || undefined
      });
    }

    try {
      const { error } = await supabase
        .from('classes_personnelles')
        .update({ eleves: newEleves })
        .eq('id', classeId);

      if (error) throw error;
      onRefresh();
      setModalVisible(false);
      resetForm();
    } catch (error) {
      console.error('Error saving students:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder');
    }
  };

  const handleDelete = (index: number) => {
    Alert.alert(
      'Supprimer l\'élève',
      `Supprimer ${eleves[index].prenom} ${eleves[index].nom} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const newEleves = eleves.filter((_, i) => i !== index);
            const { error } = await supabase
              .from('classes_personnelles')
              .update({ eleves: newEleves })
              .eq('id', classeId);
            if (error) throw error;
            onRefresh();
          }
        }
      ]
    );
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setFormData({
      nom: eleves[index].nom,
      prenom: eleves[index].prenom,
      matricule: eleves[index].matricule || ''
    });
    setModalVisible(true);
  };

  const resetForm = () => {
    setEditingIndex(null);
    setFormData({ nom: '', prenom: '', matricule: '' });
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestion des élèves</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => {
          resetForm();
          setModalVisible(true);
        }}>
          <Plus size={16} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      {eleves.length === 0 ? (
        <Text style={styles.emptyText}>Aucun élève. Cliquez sur "Ajouter" pour commencer.</Text>
      ) : (
        <FlatList
          data={eleves}
          keyExtractor={(_, index) => index.toString()}
          renderItem={({ item, index }) => (
            <View style={styles.eleveRow}>
              <View style={styles.eleveInfo}>
                <Text style={styles.eleveNom}>{item.prenom} {item.nom}</Text>
                {item.matricule && <Text style={styles.eleveMatricule}>Matricule: {item.matricule}</Text>}
              </View>
              <View style={styles.eleveActions}>
                <TouchableOpacity onPress={() => handleEdit(index)}>
                  <Edit2 size={16} color="#F59E0B" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(index)}>
                  <Trash2 size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingIndex !== null ? 'Modifier' : 'Ajouter'} un élève</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Nom *</Text>
            <TextInput style={styles.input} value={formData.nom} onChangeText={(v) => setFormData({ ...formData, nom: v })} />

            <Text style={styles.inputLabel}>Prénom *</Text>
            <TextInput style={styles.input} value={formData.prenom} onChangeText={(v) => setFormData({ ...formData, prenom: v })} />

            <Text style={styles.inputLabel}>Matricule (optionnel)</Text>
            <TextInput style={styles.input} value={formData.matricule} onChangeText={(v) => setFormData({ ...formData, matricule: v })} />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setModalVisible(false)}>
                <Text style={styles.modalCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveButton} onPress={handleSave}>
                <Save size={16} color="#FFFFFF" />
                <Text style={styles.modalSaveText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
  eleveRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  eleveInfo: {
    flex: 1,
  },
  eleveNom: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  eleveMatricule: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  eleveActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  modalCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  modalCancelText: {
    fontSize: 14,
    color: '#6B7280',
  },
  modalSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalSaveText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});