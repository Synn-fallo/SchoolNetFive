import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useEleves } from '@/hooks/useEleves';
import { useParents, LienParental } from '@/hooks/useParents';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash2, Edit2, UserPlus, Mail, Send } from 'lucide-react-native';
import EleveDetailHeader from '@/components/eleves/EleveDetailHeader';
import LiensParentauxList from '@/components/eleves/LiensParentauxList';
import { Card } from '@/components/Card';
import theme from '@/constants/theme';
import { useActiveEtablissement } from '@/hooks/useActiveEtablissement';

export default function EleveDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { primaryRole } = useAuth();
  const { getEleveById, deleteEleve, loading } = useEleves();
  const { getParentsByEleve, unlinkParentFromEleve } = useParents();
  const { activeEtablissement } = useActiveEtablissement();
  const [eleve, setEleve] = useState<any>(null);
  const [liens, setLiens] = useState<LienParental[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);
  const [invitationLoading, setInvitationLoading] = useState(false);

  const isChefOrDE = primaryRole === 'chef_etablissement';

  useEffect(() => {
    if (id) {
      loadEleve();
      loadParents();
    }
  }, [id]);

  const loadEleve = async () => {
    const data = await getEleveById(id);
    setEleve(data);
  };

  const loadParents = async () => {
    setLoadingParents(true);
    try {
      console.log('🔍 Appel getParentsByEleve pour id:', id);
      const data = await getParentsByEleve(id);
      console.log('📦 Résultat getParentsByEleve:', data);
      setLiens(data);
    } catch (error) {
      console.error('❌ Erreur loadParents:', error);
    } finally {
      setLoadingParents(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Supprimer l\'élève',
      `Êtes-vous sûr de vouloir supprimer ${eleve?.prenom} ${eleve?.nom} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteEleve(id);
            if (result.success) {
              Alert.alert('Succès', 'Élève supprimé');
              router.back();
            } else {
              Alert.alert('Erreur', result.error || 'Impossible de supprimer');
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    router.push(`/(app)/(sidebar)/eleves/modifier?id=${id}`);
  };

  const handleAddParent = () => {
    router.push(`/(app)/(sidebar)/eleves/${id}/ajouter-parent`);
  };

  const handleRemoveParent = async (lienId: string, parentId: string) => {
    const result = await unlinkParentFromEleve(parentId, id);
    if (result.success) {
      await loadParents();
      Alert.alert('Succès', 'Parent retiré');
    } else {
      Alert.alert('Erreur', result.error || 'Impossible de retirer le parent');
    }
  };

  const handleGenerateInvitation = async () => {
    if (!eleve || !activeEtablissement) return;
    
    setInvitationLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-eleve-invitation', {
        body: {
          eleve_id: eleve.id,
          etablissement_id: activeEtablissement.id,
        },
      });
      
      if (error) throw error;
      
      if (data?.success) {
        Alert.alert(
          'Code généré',
          `Code d'invitation : ${data.code}\n\nCe code expire le ${new Date(data.expires_at).toLocaleDateString('fr-FR')}\n\nPartagez-le avec le parent pour qu'il puisse lier son compte.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Erreur', data?.error || 'Impossible de générer le code');
      }
    } catch (error) {
      console.error('Error generating invitation:', error);
      Alert.alert('Erreur', 'Impossible de générer le code');
    } finally {
      setInvitationLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (!eleve) {
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <EleveDetailHeader
        nom={eleve.nom}
        prenom={eleve.prenom}
        matricule={eleve.matricule}
        identifiantConnexion={eleve.identifiant_connexion}
        educmaster={eleve.educmaster}
        classe_nom={eleve.classe_nom}
        statut={eleve.statut}
        date_naissance={eleve.date_naissance}
        email={eleve.email}
        telephone={eleve.telephone}
        onEdit={isChefOrDE ? handleEdit : undefined}
      />

      {/* Parents liés */}
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>👨‍👩‍👧 Parents / Tuteurs</Text>
          {isChefOrDE && (
            <TouchableOpacity style={styles.addParentButton} onPress={handleAddParent}>
              <UserPlus size={16} color={theme.colors.primary.DEFAULT} />
              <Text style={styles.addParentText}>Ajouter</Text>
            </TouchableOpacity>
          )}
        </View>
        {loadingParents ? (
          <ActivityIndicator size="small" color={theme.colors.primary.DEFAULT} />
        ) : (
          <LiensParentauxList
            liens={liens || []}
            onRemove={isChefOrDE ? handleRemoveParent : undefined}
            canEdit={isChefOrDE}
          />
        )}
      </Card>

      {/* Actions */}
      {isChefOrDE && (
        <>
          <TouchableOpacity 
            style={styles.inviteButton} 
            onPress={handleGenerateInvitation}
            disabled={invitationLoading}
          >
            {invitationLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Send size={18} color="#FFFFFF" />
                <Text style={styles.inviteButtonText}>Inviter le parent</Text>
              </>
            )}
          </TouchableOpacity>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
              <Edit2 size={18} color="#FFFFFF" />
              <Text style={styles.editButtonText}>Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Trash2 size={18} color="#FFFFFF" />
              <Text style={styles.deleteButtonText}>Supprimer</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
  card: {
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  addParentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addParentText: {
    fontSize: 13,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  inviteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 14,
    borderRadius: 10,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 10,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});