import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { UserPlus, Trash2, Mail, Phone, BookOpen, ChevronRight, Search, X } from 'lucide-react-native';
import theme from '@/constants/theme';

interface Enseignant {
  id: string;
  user_id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  matieres?: string[];
  classes?: { id: string; nom: string }[];
}

export default function EnseignantsScreen() {
  const { user, isChefEtablissement, isDirecteurEtudes, isAnimateurEtablissement, getAdminMetadata } = useAuth();
  const router = useRouter();
  const [enseignants, setEnseignants] = useState<Enseignant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEnseignantEmail, setNewEnseignantEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [etablissementId, setEtablissementId] = useState<string | null>(null);

  useEffect(() => {
    fetchEtablissementId();
  }, [user]);

  useEffect(() => {
    if (etablissementId) {
      fetchEnseignants();
    }
  }, [etablissementId, searchQuery]);

  const fetchEtablissementId = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('etablissement_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        setEtablissementId(data[0].etablissement_id);
      }
    } catch (error) {
      console.error('Error fetching etablissement:', error);
    }
  };

  const fetchEnseignants = async () => {
    if (!etablissementId) return;

    setLoading(true);
    try {
      let query = supabase
        .from('user_roles')
        .select(`
          user_id,
          profiles!user_roles_user_id_fkey (
            id, nom, prenom, telephone, email
          )
        `)
        .eq('etablissement_id', etablissementId)
        .eq('role', 'enseignant')
        .eq('is_active', true);

      const { data, error } = await query;

      if (error) throw error;

      const enseignantsList = (data || []).map((item: any) => ({
        id: item.user_id,
        user_id: item.user_id,
        nom: item.profiles?.nom || '',
        prenom: item.profiles?.prenom || '',
        email: item.profiles?.email || '',
        telephone: item.profiles?.telephone || '',
      }));

      setEnseignants(enseignantsList);
    } catch (error) {
      console.error('Error fetching enseignants:', error);
      Alert.alert('Erreur', 'Impossible de charger les enseignants');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEnseignant = async () => {
    if (!newEnseignantEmail.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un email');
      return;
    }

    setAdding(true);
    try {
      // Vérifier si l'utilisateur existe
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, nom, prenom, email')
        .eq('email', newEnseignantEmail.trim())
        .maybeSingle();

      if (userError) throw userError;

      if (!userData) {
        Alert.alert('Erreur', 'Aucun utilisateur trouvé avec cet email');
        return;
      }

      // Vérifier si déjà enseignant dans cet établissement
      const { data: existingRole, error: roleError } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userData.id)
        .eq('etablissement_id', etablissementId)
        .eq('role', 'enseignant')
        .maybeSingle();

      if (roleError) throw roleError;

      if (existingRole) {
        Alert.alert('Erreur', 'Cet utilisateur est déjà enseignant dans cet établissement');
        return;
      }

      // Ajouter le rôle enseignant
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userData.id,
          etablissement_id: etablissementId,
          role: 'enseignant',
          is_active: true,
        });

      if (insertError) throw insertError;

      Alert.alert('Succès', 'L\'enseignant a été ajouté');
      setNewEnseignantEmail('');
      setShowAddModal(false);
      fetchEnseignants();
    } catch (error) {
      console.error('Error adding enseignant:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter l\'enseignant');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveEnseignant = async (enseignantId: string, nom: string) => {
    Alert.alert(
      'Retirer l\'enseignant',
      `Êtes-vous sûr de vouloir retirer ${nom} de l'établissement ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('user_roles')
                .update({ is_active: false })
                .eq('user_id', enseignantId)
                .eq('etablissement_id', etablissementId)
                .eq('role', 'enseignant');

              if (error) throw error;

              Alert.alert('Succès', 'L\'enseignant a été retiré');
              fetchEnseignants();
            } catch (error) {
              console.error('Error removing enseignant:', error);
              Alert.alert('Erreur', 'Impossible de retirer l\'enseignant');
            }
          },
        },
      ]
    );
  };

  const filteredEnseignants = enseignants.filter(e => 
    e.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.prenom.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderEnseignantCard = ({ item }: { item: Enseignant }) => (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {item.prenom?.charAt(0)}{item.nom?.charAt(0)}
          </Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.name}>{item.prenom} {item.nom}</Text>
          <View style={styles.contactRow}>
            <Mail size={12} color={theme.colors.neutral[400]} />
            <Text style={styles.contactText}>{item.email}</Text>
          </View>
          {item.telephone && (
            <View style={styles.contactRow}>
              <Phone size={12} color={theme.colors.neutral[400]} />
              <Text style={styles.contactText}>{item.telephone}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveEnseignant(item.id, `${item.prenom} ${item.nom}`)}
        >
          <Trash2 size={18} color={theme.colors.danger.DEFAULT} />
        </TouchableOpacity>
      </View>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestion des enseignants</Text>
        <Text style={styles.subtitle}>
          {isChefEtablissement && 'Gérez les enseignants de votre établissement'}
          {isDirecteurEtudes && 'Gérez les enseignants de l\'établissement'}
          {isAnimateurEtablissement && `Gérez les enseignants du département ${getAdminMetadata()?.departement || ''}`}
        </Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <UserPlus size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Ajouter un enseignant</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={18} color={theme.colors.neutral[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher par nom, prénom ou email..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={theme.colors.neutral[400]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color={theme.colors.neutral[400]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filteredEnseignants}
        keyExtractor={(item) => item.id}
        renderItem={renderEnseignantCard}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucun enseignant trouvé</Text>
          </View>
        }
      />

      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter un enseignant</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={20} color={theme.colors.neutral[500]} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Email de l'enseignant</Text>
              <Input
                placeholder="ex: jean.dupont@email.com"
                value={newEnseignantEmail}
                onChangeText={setNewEnseignantEmail}
                autoCapitalize="none"
              />
              <Button
                title={adding ? "Ajout en cours..." : "Ajouter"}
                onPress={handleAddEnseignant}
                loading={adding}
                disabled={adding}
                fullWidth
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: theme.colors.background.primary,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.neutral[800],
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.neutral[500],
    marginBottom: 20,
    lineHeight: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    backgroundColor: theme.colors.background.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.neutral[100],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.neutral[800],
    marginLeft: 8,
    paddingVertical: 4,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    marginBottom: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.neutral[800],
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  contactText: {
    fontSize: 12,
    color: theme.colors.neutral[500],
  },
  removeButton: {
    padding: 8,
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.neutral[400],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: theme.colors.background.primary,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.neutral[800],
  },
  modalBody: {
    padding: 16,
    gap: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.neutral[700],
    marginBottom: 4,
  },
});