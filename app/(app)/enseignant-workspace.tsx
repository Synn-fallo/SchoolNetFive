import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { Plus, BookOpen, Users, GraduationCap, Bell, TrendingUp, Building2 } from 'lucide-react-native';
import { Card } from '@/components/Card';
import { useTeacherCahier, ClassePersonnelle } from '@/hooks/useTeacherCahier';
import { useEnseignantEtablissements } from '@/hooks/useEnseignantEtablissements';
import CreateClassModal from '@/components/enseignant/CreateClassModal';
import ClassCard from '@/components/enseignant/ClassCard';
import theme from '@/constants/theme';

export default function EnseignantWorkspaceScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { getClasses, checkClassesLimit, loading } = useTeacherCahier();
  const { getEtablissementsRattaches, loading: loadingEtablissements } = useEnseignantEtablissements();
  const [classes, setClasses] = useState<ClassePersonnelle[]>([]);
  const [etablissements, setEtablissements] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [classesLimit, setClassesLimit] = useState({ canCreate: true, currentCount: 0, maxLimit: 3 });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [classesData, etabsData, limitData] = await Promise.all([
      getClasses(),
      getEtablissementsRattaches(),
      checkClassesLimit(),
    ]);
    setClasses(classesData);
    setEtablissements(etabsData);
    setClassesLimit(limitData);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCreateClass = () => {
    if (!classesLimit.canCreate) {
      Alert.alert(
        'Limite atteinte',
        `Vous avez atteint la limite de ${classesLimit.maxLimit} classes. Supprimez une classe ou passez à l\'abonnement Premium.`,
        [{ text: 'OK' }]
      );
      return;
    }
    setShowCreateModal(true);
  };

  const handleClassCreated = () => {
    setShowCreateModal(false);
    loadData();
  };

  const handleClassPress = (classeId: string) => {
    router.push(`/(app)/classe-detail?id=${classeId}`);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement de votre espace...</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* En-tête */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bonjour, {profile?.prenom} 👋</Text>
            <Text style={styles.subtitle}>Votre cahier pédagogique</Text>
          </View>
          <View style={styles.limitBadge}>
            <Text style={styles.limitText}>
              {classesLimit.currentCount}/{classesLimit.maxLimit} classes
            </Text>
          </View>
        </View>

        {/* Établissements rattachés */}
        {etablissements.length > 0 && (
          <Card style={styles.etablissementsCard}>
            <Text style={styles.cardTitle}>🏫 Établissements rattachés</Text>
            <View style={styles.etablissementsList}>
              {etablissements.map((etab) => (
                <TouchableOpacity
                  key={etab.id}
                  style={styles.etablissementChip}
                  onPress={() => router.push(`/(app)/(sidebar)/enseignants/rattachement`)}
                >
                  <Building2 size={14} color={theme.colors.primary.DEFAULT} />
                  <Text style={styles.etablissementChipText}>{etab.etablissement_nom}</Text>
                  {etab.est_principal && (
                    <View style={styles.principalBadge}>
                      <Text style={styles.principalBadgeText}>Principal</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        )}

        {/* Mes classes */}
        <View style={styles.classesHeader}>
          <Text style={styles.sectionTitle}>📚 Mes classes</Text>
          <TouchableOpacity style={styles.addButton} onPress={handleCreateClass}>
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Nouvelle classe</Text>
          </TouchableOpacity>
        </View>

        {classes.length === 0 ? (
          <Card style={styles.emptyCard}>
            <BookOpen size={48} color={theme.colors.neutral[300]} />
            <Text style={styles.emptyTitle}>Aucune classe</Text>
            <Text style={styles.emptyText}>
              Créez votre première classe pour commencer à organiser votre enseignement.
            </Text>
            <TouchableOpacity style={styles.createButton} onPress={handleCreateClass}>
              <Text style={styles.createButtonText}>Créer une classe</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          classes.map((classe) => (
            <ClassCard
              key={classe.id}
              id={classe.id}
              nom={classe.nom}
              niveau={classe.niveau}
              statut={classe.statut}
              etablissementNom={classe.etablissement_nom}
              effectif={classe.effectif}
              onPress={() => handleClassPress(classe.id)}
              onRefresh={handleRefresh}
            />
          ))
        )}

        {/* Limite d'avertissement */}
        {!classesLimit.canCreate && classes.length > 0 && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>
              ⚠️ Limite de {classesLimit.maxLimit} classes atteinte. Supprimez une classe ou passez à l'abonnement Premium pour plus de classes.
            </Text>
          </View>
        )}

        {/* Services disponibles */}
        <Card style={styles.servicesCard}>
          <Text style={styles.cardTitle}>✨ Services disponibles</Text>
          <View style={styles.servicesGrid}>
            <TouchableOpacity style={styles.serviceItem} onPress={() => router.push('/(app)/ia-chat')}>
              <GraduationCap size={24} color={theme.colors.primary.DEFAULT} />
              <Text style={styles.serviceLabel}>IA Chool</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.serviceItem} onPress={() => router.push('/(app)/marketplace')}>
              <BookOpen size={24} color={theme.colors.primary.DEFAULT} />
              <Text style={styles.serviceLabel}>Marketplace</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.serviceItem} onPress={() => router.push('/(app)/community')}>
              <Users size={24} color={theme.colors.primary.DEFAULT} />
              <Text style={styles.serviceLabel}>Communauté</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.serviceItem} onPress={() => router.push('/(app)/social')}>
              <Bell size={24} color={theme.colors.primary.DEFAULT} />
              <Text style={styles.serviceLabel}>Actualités</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>

      <CreateClassModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleClassCreated}
        etablissements={etablissements}
      />
    </>
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
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  limitBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  limitText: {
    fontSize: 12,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  etablissementsCard: {
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  etablissementsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  etablissementChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  etablissementChipText: {
    fontSize: 13,
    color: '#374151',
  },
  principalBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  principalBadgeText: {
    fontSize: 9,
    color: '#10B981',
    fontWeight: '500',
  },
  classesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyCard: {
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
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
  warningContainer: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warningText: {
    fontSize: 12,
    color: '#92400E',
    textAlign: 'center',
  },
  servicesCard: {
    padding: 16,
    marginTop: 8,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  serviceItem: {
    flex: 0.22,
    alignItems: 'center',
    gap: 6,
  },
  serviceLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
});