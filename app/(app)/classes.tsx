import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveEtablissement } from '@/hooks/useActiveEtablissement';
import { useAcademicStructure } from '@/hooks/useAcademicStructure';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import ClasseForm from '@/components/classes/ClasseForm';
import EditClasseModal from '@/components/classes/EditClasseModal';
import ImportElevesModal from '@/components/classes/ImportElevesModal';
import AssignerPrincipalModal from '@/components/classes/AssignerPrincipalModal';
import ClassePersonnelleCard from '@/components/classes/ClassePersonnelleCard';
import ClassePersonnelleForm from '@/components/classes/ClassePersonnelleForm';
import BackButton from '@/components/common/BackButton';
import { Plus, Building2, Users, BookOpen, ChevronRight, Trash2, Edit2, Upload, User, UserPlus } from 'lucide-react-native';
import theme from '@/constants/theme';
import { useClassesPersonnelles } from '@/hooks/useClassesPersonnelles';

interface Classe {
  id: string;
  nom: string;
  niveau?: string;
  capacite?: number;
  effectif?: number;
  is_manuel?: boolean;
  enseignant_principal_id?: string;
  enseignant_principal_nom?: string;
  annee_scolaire_id?: string;
  cycle_id?: string;  // ✅ AJOUTÉ - cycle_id pour la modification
}

export default function ClassesScreen() {
  const { user, primaryRole } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const { activeEtablissement, loading: etablissementLoading } = useActiveEtablissement();
  const { refresh } = useAcademicStructure();
  const { classes: classesPersonnelles, loading: loadingPersonnelles, createClasse, updateClasse, deleteClasse } = useClassesPersonnelles();
  
  const [classes, setClasses] = useState<Classe[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showPersonnelleForm, setShowPersonnelleForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'officielles' | 'personnelles'>('officielles');
  
  // États pour les modals
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedClasse, setSelectedClasse] = useState<Classe | null>(null);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [importClasseId, setImportClasseId] = useState<string | null>(null);
  const [principalModalVisible, setPrincipalModalVisible] = useState(false);
  const [principalClasse, setPrincipalClasse] = useState<Classe | null>(null);

  const isChefOrDE = primaryRole === 'chef_etablissement';
  const isEnseignant = primaryRole === 'enseignant';
  const hasActiveEtablissement = !!activeEtablissement;

  // Configuration du header
  useEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerLeft: () => <BackButton />,
      title: 'Mes classes',
      headerTitleAlign: 'center',
      headerStyle: {
        backgroundColor: '#FFFFFF',
      },
      headerShadowVisible: false,
      headerTitleStyle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
      },
    });
  }, [navigation]);

  useEffect(() => {
    if (hasActiveEtablissement) {
      loadClassesOfficielles();
    } else {
      setLoading(false);
    }
  }, [activeEtablissement]);

  const loadClassesOfficielles = async () => {
    if (!activeEtablissement) return;

    setLoading(true);
    try {
      // ✅ MODIFICATION 1: Ajout de cycle_id dans la requête SELECT
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select(`
          id,
          nom,
          niveau,
          capacite,
          is_manuel,
          enseignant_principal_id,
          annee_scolaire_id,
          cycle_id
        `)
        .eq('etablissement_id', activeEtablissement.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (classesError) throw classesError;

      const classesWithCount = await Promise.all(
        (classesData || []).map(async (classe: any) => {
          const { count, error: countError } = await supabase
            .from('eleves')
            .select('*', { count: 'exact', head: true })
            .eq('classe_id', classe.id);

          let enseignantNom = '';
          if (classe.enseignant_principal_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('nom, prenom')
              .eq('id', classe.enseignant_principal_id)
              .single();
            if (profile) {
              enseignantNom = `${profile.prenom} ${profile.nom}`;
            }
          }

          // ✅ MODIFICATION 2: Ajout de cycle_id dans l'objet retourné
          return {
            id: classe.id,
            nom: classe.nom,
            niveau: classe.niveau,
            capacite: classe.capacite,
            effectif: countError ? 0 : (count || 0),
            is_manuel: classe.is_manuel,
            enseignant_principal_id: classe.enseignant_principal_id,
            enseignant_principal_nom: enseignantNom,
            annee_scolaire_id: classe.annee_scolaire_id,
            cycle_id: classe.cycle_id,
          };
        })
      );

      setClasses(classesWithCount);
    } catch (error) {
      console.error('Error loading classes:', error);
      Alert.alert('Erreur', 'Impossible de charger les classes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClassSuccess = async () => {
    setShowForm(false);
    await loadClassesOfficielles();
    await refresh();
  };

  const handleCreatePersonnelleSuccess = () => {
    setShowPersonnelleForm(false);
  };

  const handleDeleteClass = (classeId: string, classeNom: string) => {
    Alert.alert(
      'Supprimer la classe',
      `Êtes-vous sûr de vouloir supprimer la classe "${classeNom}" ?\n\nCette action est irréversible.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('classes')
                .update({ is_active: false })
                .eq('id', classeId);

              if (error) throw error;
              Alert.alert('Succès', 'Classe supprimée');
              await loadClassesOfficielles();
            } catch (error) {
              console.error('Error deleting class:', error);
              Alert.alert('Erreur', 'Impossible de supprimer la classe');
            }
          }
        }
      ]
    );
  };

  const handleEditClass = (classe: Classe) => {
    setSelectedClasse(classe);
    setEditModalVisible(true);
  };

  const handleEditSuccess = () => {
    loadClassesOfficielles();
  };

  const handleImportEleves = (classeId: string) => {
    setImportClasseId(classeId);
    setImportModalVisible(true);
  };

  const handleImportSuccess = () => {
    loadClassesOfficielles();
  };

  const handleAssignPrincipal = (classe: Classe) => {
    setPrincipalClasse(classe);
    setPrincipalModalVisible(true);
  };

  const handlePrincipalSuccess = () => {
    loadClassesOfficielles();
  };

  const handleManageGroups = (classeId: string) => {
    router.push(`/(app)/(sidebar)/classes/groupes?id=${classeId}`);
  };

  const handleExportClasse = (classeNom: string, eleves: any[], matieres: any[]) => {
    Alert.alert('Export', `Export de la classe ${classeNom} en cours...`);
  };

  const handleMigrateToEtablissement = () => {
    router.push('/(app)/migration-enseignant');
  };

  // Rendu pour enseignant sans établissement (indépendant pur)
  if (!hasActiveEtablissement && isEnseignant) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Mes classes</Text>
        </View>

        <Card style={styles.infoCard}>
          <Building2 size={48} color={theme.colors.neutral[300]} />
          <Text style={styles.infoTitle}>Mode indépendant</Text>
          <Text style={styles.infoText}>
            Vous n'êtes actuellement affilié à aucun établissement.
          </Text>
          <Text style={styles.infoSubtext}>
            En tant qu'enseignant indépendant, vous pouvez créer vos propres classes personnelles.
          </Text>
        </Card>

        {/* Classes personnelles */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Mes classes personnelles</Text>
          <TouchableOpacity
            style={styles.addPersonnelleButton}
            onPress={() => setShowPersonnelleForm(true)}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.addPersonnelleButtonText}>Nouvelle classe</Text>
          </TouchableOpacity>
        </View>

        {loadingPersonnelles ? (
          <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        ) : classesPersonnelles.length === 0 ? (
          <Card style={styles.emptyCard}>
            <BookOpen size={48} color={theme.colors.neutral[300]} />
            <Text style={styles.emptyTitle}>Aucune classe personnelle</Text>
            <Text style={styles.emptyText}>
              Créez votre première classe pour commencer à saisir des notes.
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => setShowPersonnelleForm(true)}
            >
              <Text style={styles.createButtonText}>Créer une classe</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          classesPersonnelles.map((classe) => (
            <ClassePersonnelleCard
              key={classe.id}
              classe={classe}
              onEdit={() => updateClasse(classe.id, { nom: classe.nom })}
              onDelete={() => deleteClasse(classe.id)}
              onExport={() => handleExportClasse(classe.nom, classe.eleves, classe.matieres)}
              onManageEleves={() => router.push(`/classe-personnelle-detail?id=${classe.id}&tab=eleves`)}
              onManageMatieres={() => router.push(`/classe-personnelle-detail?id=${classe.id}&tab=matieres`)}
              onViewNotes={() => router.push(`/notes?classePersonnelleId=${classe.id}`)}
            />
          ))
        )}

        {/* Bouton de migration */}
        {classesPersonnelles.length > 0 && (
          <TouchableOpacity style={styles.migrateButton} onPress={handleMigrateToEtablissement}>
            <Text style={styles.migrateButtonText}>Migrer vers un établissement</Text>
          </TouchableOpacity>
        )}

        {/* Formulaire de création de classe personnelle */}
        {showPersonnelleForm && (
          <ClassePersonnelleForm
            onSuccess={handleCreatePersonnelleSuccess}
            onCancel={() => setShowPersonnelleForm(false)}
          />
        )}
      </ScrollView>
    );
  }

  // Rendu pour enseignant avec établissement (affilié)
  if (etablissementLoading || loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement des classes...</Text>
      </View>
    );
  }

  if (showForm) {
    return (
      <ClasseForm
        etablissementId={activeEtablissement?.id || ''}
        onSuccess={handleCreateClassSuccess}
        onCancel={() => setShowForm(false)}
      />
    );
  }

  if (showPersonnelleForm) {
    return (
      <ClassePersonnelleForm
        onSuccess={handleCreatePersonnelleSuccess}
        onCancel={() => setShowPersonnelleForm(false)}
      />
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Mes classes</Text>
          {hasActiveEtablissement && (
            <View style={styles.etablissementInfo}>
              <Building2 size={12} color={theme.colors.neutral[500]} />
              <Text style={styles.etablissementNom}>{activeEtablissement?.nom}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Onglets */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'officielles' && styles.tabActive]}
          onPress={() => setActiveTab('officielles')}
        >
          <Text style={[styles.tabText, activeTab === 'officielles' && styles.tabTextActive]}>
            Classes officielles
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'personnelles' && styles.tabActive]}
          onPress={() => setActiveTab('personnelles')}
        >
          <Text style={[styles.tabText, activeTab === 'personnelles' && styles.tabTextActive]}>
            Classes personnelles
          </Text>
        </TouchableOpacity>
      </View>

      {/* Classes officielles */}
      {activeTab === 'officielles' && (
        <>
          {isChefOrDE && (
            <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(true)}>
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Nouvelle classe officielle</Text>
            </TouchableOpacity>
          )}

          {classes.length === 0 ? (
            <Card style={styles.emptyCard}>
              <BookOpen size={48} color={theme.colors.neutral[300]} />
              <Text style={styles.emptyTitle}>Aucune classe officielle</Text>
              <Text style={styles.emptyText}>
                Vous n'êtes pas encore rattaché à une classe.
              </Text>
            </Card>
          ) : (
            classes.map((classe) => (
              <Card key={classe.id} style={styles.classeCard}>
                <View style={styles.classeHeader}>
                  <View>
                    <Text style={styles.classeName}>{classe.nom}</Text>
                    {classe.niveau && (
                      <Text style={styles.classeNiveau}>{classe.niveau}</Text>
                    )}
                  </View>
                  <View style={styles.classeActions}>
                    {isChefOrDE && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleManageGroups(classe.id)}
                      >
                        <Users size={18} color={theme.colors.primary.DEFAULT} />
                      </TouchableOpacity>
                    )}
                    {isChefOrDE && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleEditClass(classe)}
                      >
                        <Edit2 size={18} color={theme.colors.neutral[600]} />
                      </TouchableOpacity>
                    )}
                    {isChefOrDE && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDeleteClass(classe.id, classe.nom)}
                      >
                        <Trash2 size={18} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <View style={styles.classeStats}>
                  <View style={styles.statItem}>
                    <Users size={14} color={theme.colors.neutral[500]} />
                    <Text style={styles.statText}>
                      {classe.effectif || 0} / {classe.capacite || '∞'} élèves
                    </Text>
                  </View>
                  {classe.is_manuel && (
                    <View style={styles.manuelBadge}>
                      <Text style={styles.manuelBadgeText}>Manuel</Text>
                    </View>
                  )}
                </View>

                <View style={styles.principalRow}>
                  <User size={14} color={theme.colors.neutral[500]} />
                  <Text style={styles.principalLabel}>Professeur principal :</Text>
                  <Text style={styles.principalValue}>
                    {classe.enseignant_principal_nom || 'Non assigné'}
                  </Text>
                  {isChefOrDE && (
                    <TouchableOpacity onPress={() => handleAssignPrincipal(classe)}>
                      <Text style={styles.assignLink}>
                        {classe.enseignant_principal_id ? 'Modifier' : 'Assigner'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.extraActions}>
                  {isChefOrDE && (
                    <TouchableOpacity
                      style={styles.importButton}
                      onPress={() => handleImportEleves(classe.id)}
                    >
                      <Upload size={14} color={theme.colors.primary.DEFAULT} />
                      <Text style={styles.importButtonText}>Importer élèves</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.detailButton}
                    onPress={() => router.push(`/(app)/classe-detail?id=${classe.id}`)}
                  >
                    <Text style={styles.detailButtonText}>Voir les détails</Text>
                    <ChevronRight size={16} color={theme.colors.primary.DEFAULT} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))
          )}
        </>
      )}

      {/* Classes personnelles */}
      {activeTab === 'personnelles' && (
        <>
          <TouchableOpacity
            style={styles.addPersonnelleButton}
            onPress={() => setShowPersonnelleForm(true)}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.addPersonnelleButtonText}>Nouvelle classe personnelle</Text>
          </TouchableOpacity>

          {loadingPersonnelles ? (
            <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
          ) : classesPersonnelles.length === 0 ? (
            <Card style={styles.emptyCard}>
              <BookOpen size={48} color={theme.colors.neutral[300]} />
              <Text style={styles.emptyTitle}>Aucune classe personnelle</Text>
              <Text style={styles.emptyText}>
                Créez votre première classe personnelle.
              </Text>
            </Card>
          ) : (
            classesPersonnelles.map((classe) => (
              <ClassePersonnelleCard
                key={classe.id}
                classe={classe}
                onEdit={() => updateClasse(classe.id, { nom: classe.nom })}
                onDelete={() => deleteClasse(classe.id)}
                onExport={() => handleExportClasse(classe.nom, classe.eleves, classe.matieres)}
                onManageEleves={() => router.push(`/classe-personnelle-detail?id=${classe.id}&tab=eleves`)}
                onManageMatieres={() => router.push(`/classe-personnelle-detail?id=${classe.id}&tab=matieres`)}
                onViewNotes={() => router.push(`/notes?classePersonnelleId=${classe.id}`)}
              />
            ))
          )}
        </>
      )}

      {/* Modals pour classes officielles */}
      {selectedClasse && (
        <EditClasseModal
          visible={editModalVisible}
          onClose={() => {
            setEditModalVisible(false);
            setSelectedClasse(null);
          }}
          classeId={selectedClasse.id}
          classeNom={selectedClasse.nom}
          classeNiveau={selectedClasse.niveau || ''}
          classeCycleId={selectedClasse.cycle_id}  // ✅ AJOUTÉ - passage du cycle_id
          classeCapacite={selectedClasse.capacite}
          anneeScolaireId={selectedClasse.annee_scolaire_id}
          onSave={handleEditSuccess}
        />
      )}

      {importClasseId && activeEtablissement && (
        <ImportElevesModal
          visible={importModalVisible}
          onClose={() => {
            setImportModalVisible(false);
            setImportClasseId(null);
          }}
          classeId={importClasseId}
          etablissementId={activeEtablissement.id}
          onSuccess={handleImportSuccess}
        />
      )}

      {principalClasse && (
        <AssignerPrincipalModal
          visible={principalModalVisible}
          onClose={() => {
            setPrincipalModalVisible(false);
            setPrincipalClasse(null);
          }}
          classeId={principalClasse.id}
          classeNom={principalClasse.nom}
          currentPrincipalId={principalClasse.enseignant_principal_id}
          currentPrincipalNom={principalClasse.enseignant_principal_nom}
          onSave={handlePrincipalSuccess}
        />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  etablissementInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  etablissementNom: {
    fontSize: 12,
    color: '#6B7280',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  addPersonnelleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  addPersonnelleButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoCard: {
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  infoSubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  migrateButton: {
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  migrateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  classeCard: {
    padding: 16,
    marginBottom: 12,
  },
  classeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  classeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  classeNiveau: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  classeActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 6,
  },
  classeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 13,
    color: '#6B7280',
  },
  manuelBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  manuelBadgeText: {
    fontSize: 10,
    color: '#D97706',
    fontWeight: '500',
  },
  principalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 8,
  },
  principalLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  principalValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1F2937',
  },
  assignLink: {
    fontSize: 12,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
    marginLeft: 4,
  },
  extraActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
  },
  importButtonText: {
    fontSize: 12,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailButtonText: {
    fontSize: 13,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
});