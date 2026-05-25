import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Plus, Trash2, Edit2, Users, Save, X } from 'lucide-react-native';

interface GroupesManagerProps {
  classeId: string;
  onRefresh?: () => void;
}

interface Groupe {
  id: string;
  nom: string;
  description?: string;
  eleves?: { id: string; matricule: string; nom?: string; prenom?: string }[];
}

interface Eleve {
  id: string;
  matricule: string;
  user?: { prenom: string; nom: string };
}

export default function GroupesManager({ classeId, onRefresh }: GroupesManagerProps) {
  const [groupes, setGroupes] = useState<Groupe[]>([]);
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingGroupe, setEditingGroupe] = useState<Groupe | null>(null);
  const [formNom, setFormNom] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [selectedEleve, setSelectedEleve] = useState<string | null>(null);
  const [selectedGroupeId, setSelectedGroupeId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [classeId]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('[GroupesManager] Début chargement, classeId:', classeId);
      
      // Charger les élèves de la classe
      console.log('[GroupesManager] Chargement des élèves...');
      const { data: elevesData, error: elevesError } = await supabase
        .from('eleves')
        .select('id, matricule, user:user_id(prenom, nom)')
        .eq('classe_id', classeId)
        .eq('statut', 'actif');
      
      if (elevesError) {
        console.error('[GroupesManager] Erreur chargement élèves:', elevesError);
        setEleves([]);
      } else {
        console.log('[GroupesManager] Élèves chargés:', elevesData?.length || 0);
        setEleves(elevesData || []);
      }
      
      // Charger les groupes de la classe
      console.log('[GroupesManager] Chargement des groupes...');
      const { data: groupesData, error: groupesError } = await supabase
        .from('groupes_eleves')
        .select('*')
        .eq('classe_id', classeId)
        .order('nom');
      
      if (groupesError) {
        console.error('[GroupesManager] Erreur chargement groupes:', groupesError);
        setGroupes([]);
      } else {
        console.log('[GroupesManager] Groupes chargés:', groupesData?.length || 0);
        
        // Charger les appartenances aux groupes
        let appartenances: any[] = [];
        if (groupesData && groupesData.length > 0) {
          console.log('[GroupesManager] Chargement des appartenances...');
          const { data: appData, error: appError } = await supabase
            .from('eleve_groupes')
            .select('eleve_id, groupe_id');
          
          if (appError) {
            console.error('[GroupesManager] Erreur chargement appartenances:', appError);
          } else {
            appartenances = appData || [];
            console.log('[GroupesManager] Appartenances chargées:', appartenances.length);
          }
        }
        
        // Construire la liste des groupes avec leurs élèves
        const groupesAvecEleves = (groupesData || []).map(g => ({
          ...g,
          eleves: (elevesData || []).filter(e => 
            appartenances.some(a => a.eleve_id === e.id && a.groupe_id === g.id)
          ),
        }));
        
        setGroupes(groupesAvecEleves);
      }
      
    } catch (error) {
      console.error('[GroupesManager] Erreur générale:', error);
      setGroupes([]);
      setEleves([]);
    } finally {
      console.log('[GroupesManager] Chargement terminé, loading=false');
      setLoading(false);
    }
  };

  const handleCreateGroupe = async () => {
    if (!formNom.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un nom pour le groupe');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('groupes_eleves')
        .insert({
          classe_id: classeId,
          nom: formNom,
          description: formDescription || null,
        });
      
      if (error) throw error;
      
      setShowForm(false);
      setFormNom('');
      setFormDescription('');
      loadData();
      if (onRefresh) onRefresh();
      
      Alert.alert('Succès', 'Groupe créé avec succès');
    } catch (error) {
      console.error('Error creating groupe:', error);
      Alert.alert('Erreur', 'Impossible de créer le groupe');
    }
  };

  const handleUpdateGroupe = async () => {
    if (!editingGroupe || !formNom.trim()) return;
    
    try {
      const { error } = await supabase
        .from('groupes_eleves')
        .update({
          nom: formNom,
          description: formDescription || null,
        })
        .eq('id', editingGroupe.id);
      
      if (error) throw error;
      
      setEditingGroupe(null);
      setFormNom('');
      setFormDescription('');
      loadData();
      if (onRefresh) onRefresh();
      
      Alert.alert('Succès', 'Groupe modifié avec succès');
    } catch (error) {
      console.error('Error updating groupe:', error);
      Alert.alert('Erreur', 'Impossible de modifier le groupe');
    }
  };

  const handleDeleteGroupe = async (groupeId: string) => {
    Alert.alert(
      'Confirmation',
      'Supprimer ce groupe ? Les élèves seront retirés du groupe.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('groupes_eleves')
                .delete()
                .eq('id', groupeId);
              
              if (error) throw error;
              
              loadData();
              if (onRefresh) onRefresh();
              
              Alert.alert('Succès', 'Groupe supprimé');
            } catch (error) {
              console.error('Error deleting groupe:', error);
              Alert.alert('Erreur', 'Impossible de supprimer le groupe');
            }
          },
        },
      ]
    );
  };

  const handleAddEleveToGroupe = async () => {
    if (!selectedEleve || !selectedGroupeId) return;
    
    try {
      const { error } = await supabase
        .from('eleve_groupes')
        .insert({
          eleve_id: selectedEleve,
          groupe_id: selectedGroupeId,
        });
      
      if (error) throw error;
      
      setSelectedEleve(null);
      setSelectedGroupeId(null);
      loadData();
      
      Alert.alert('Succès', 'Élève ajouté au groupe');
    } catch (error) {
      console.error('Error adding eleve to groupe:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter l\'élève');
    }
  };

  const handleRemoveEleveFromGroupe = async (eleveId: string, groupeId: string) => {
    try {
      const { error } = await supabase
        .from('eleve_groupes')
        .delete()
        .eq('eleve_id', eleveId)
        .eq('groupe_id', groupeId);
      
      if (error) throw error;
      
      loadData();
    } catch (error) {
      console.error('Error removing eleve from groupe:', error);
    }
  };

  const getEleveName = (eleve: Eleve) => {
    if (eleve.user?.prenom && eleve.user?.nom) {
      return `${eleve.user.prenom} ${eleve.user.nom}`;
    }
    return eleve.matricule;
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestion des groupes</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(true)}>
          <Plus size={18} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Nouveau groupe</Text>
        </TouchableOpacity>
      </View>

      {/* Formulaire de création/édition */}
      {(showForm || editingGroupe) && (
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>
            {editingGroupe ? 'Modifier le groupe' : 'Créer un groupe'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Nom du groupe"
            value={formNom}
            onChangeText={setFormNom}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description (optionnel)"
            value={formDescription}
            onChangeText={setFormDescription}
            multiline
            numberOfLines={3}
          />
          <View style={styles.formButtons}>
            <TouchableOpacity
              style={styles.cancelFormButton}
              onPress={() => {
                setShowForm(false);
                setEditingGroupe(null);
                setFormNom('');
                setFormDescription('');
              }}
            >
              <X size={16} color="#6B7280" />
              <Text style={styles.cancelFormText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveFormButton}
              onPress={editingGroupe ? handleUpdateGroupe : handleCreateGroupe}
            >
              <Save size={16} color="#FFFFFF" />
              <Text style={styles.saveFormText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>
        </Card>
      )}

      {/* Liste des groupes */}
      {groupes.length > 0 ? (
        groupes.map((groupe) => (
          <Card key={groupe.id} style={styles.groupeCard}>
            <View style={styles.groupeHeader}>
              <View>
                <Text style={styles.groupeName}>{groupe.nom}</Text>
                {groupe.description && (
                  <Text style={styles.groupeDescription}>{groupe.description}</Text>
                )}
                <Text style={styles.eleveCount}>{groupe.eleves?.length || 0} élèves</Text>
              </View>
              <View style={styles.groupeActions}>
                <TouchableOpacity
                  onPress={() => {
                    setEditingGroupe(groupe);
                    setFormNom(groupe.nom);
                    setFormDescription(groupe.description || '');
                    setShowForm(false);
                  }}
                >
                  <Edit2 size={18} color="#6B7280" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteGroupe(groupe.id)}>
                  <Trash2 size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Liste des élèves du groupe */}
            {groupe.eleves && groupe.eleves.length > 0 && (
              <View style={styles.elevesList}>
                {groupe.eleves.map((eleve) => (
                  <View key={eleve.id} style={styles.eleveItem}>
                    <Text style={styles.eleveName}>{eleve.matricule}</Text>
                    <TouchableOpacity
                      onPress={() => handleRemoveEleveFromGroupe(eleve.id, groupe.id)}
                    >
                      <X size={14} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Ajouter un élève */}
            <View style={styles.addEleveContainer}>
              <View style={styles.addEleveSelect}>
                {eleves.filter(e => !groupe.eleves?.some(ge => ge.id === e.id)).length > 0 ? (
                  <TouchableOpacity
                    style={styles.eleveSelector}
                    onPress={() => {
                      const elevesDisponibles = eleves.filter(e => !groupe.eleves?.some(ge => ge.id === e.id));
                      Alert.alert(
                        'Ajouter un élève',
                        'Sélectionnez un élève',
                        [
                          ...elevesDisponibles.map(e => ({
                            text: getEleveName(e),
                            onPress: () => {
                              setSelectedEleve(e.id);
                              setSelectedGroupeId(groupe.id);
                              handleAddEleveToGroupe();
                            },
                          })),
                          { text: 'Annuler', style: 'cancel' },
                        ]
                      );
                    }}
                  >
                    <Plus size={14} color="#3B82F6" />
                    <Text style={styles.addEleveText}>Ajouter un élève</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.noEleveText}>Tous les élèves sont déjà dans un groupe</Text>
                )}
              </View>
            </View>
          </Card>
        ))
      ) : (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>Aucun groupe créé</Text>
          <Text style={styles.emptySubtext}>
            Cliquez sur "Nouveau groupe" pour créer votre premier groupe d'élèves.
          </Text>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  formCard: {
    marginBottom: 16,
    padding: 16,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
    marginBottom: 12,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelFormButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  cancelFormText: {
    fontSize: 13,
    color: '#6B7280',
  },
  saveFormButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveFormText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  groupeCard: {
    marginBottom: 16,
    padding: 16,
  },
  groupeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  groupeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  groupeDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  eleveCount: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  groupeActions: {
    flexDirection: 'row',
    gap: 12,
  },
  elevesList: {
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  eleveItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  eleveName: {
    fontSize: 13,
    color: '#4B5563',
  },
  addEleveContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  eleveSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addEleveText: {
    fontSize: 12,
    color: '#3B82F6',
  },
  noEleveText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});