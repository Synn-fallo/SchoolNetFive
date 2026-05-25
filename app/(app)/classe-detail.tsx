import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { ArrowLeft, Users, BookOpen, User, Calendar, UserCheck } from 'lucide-react-native';
import theme from '@/constants/theme';

interface ClasseDetail {
  id: string;
  nom: string;
  niveau: string;
  capacite: number;
  effectif: number;
  is_manuel: boolean;
  enseignant_principal_id?: string;
  enseignant_principal_nom?: string;
  cycle?: { nom: string };
  serie?: { nom: string };
  option?: { code: string; nom: string };
  indice?: { valeur: string };
}

interface Eleve {
  id: string;
  matricule: string;
  statut: string;
  prenom?: string;
  nom?: string;
}

export default function ClasseDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [classe, setClasse] = useState<ClasseDetail | null>(null);
  const [eleves, setEleves] = useState<Eleve[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadClasseDetail();
      loadEleves();
    }
  }, [id]);

  const loadClasseDetail = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          id,
          nom,
          niveau,
          capacite,
          is_manuel,
          enseignant_principal_id,
          cycle:cycle_id (nom),
          serie:serie_id (nom),
          option:option_serie_id (code, nom),
          indice:indice_id (valeur)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      const { count } = await supabase
        .from('eleves')
        .select('*', { count: 'exact', head: true })
        .eq('classe_id', id);

      let enseignantNom = '';
      if (data.enseignant_principal_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('nom, prenom')
          .eq('id', data.enseignant_principal_id)
          .single();
        if (profile) {
          enseignantNom = `${profile.prenom} ${profile.nom}`;
        }
      }

      setClasse({
        ...data,
        effectif: count || 0,
        enseignant_principal_nom: enseignantNom,
        cycle: data.cycle as any,
        serie: data.serie as any,
        option: data.option as any,
        indice: data.indice as any
      });
    } catch (error) {
      console.error('Error loading class detail:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ CORRECTION: Chargement des élèves sans jointure incorrecte
  const loadEleves = async () => {
    try {
      // 1. Récupérer les élèves de la classe
      const { data: elevesData, error: elevesError } = await supabase
        .from('eleves')
        .select('id, matricule, statut, user_id')
        .eq('classe_id', id);

      if (elevesError) throw elevesError;

      if (!elevesData || elevesData.length === 0) {
        setEleves([]);
        return;
      }

      // 2. Récupérer les profils
      const userIds = elevesData.map(e => e.user_id).filter(Boolean);
      let profileMap = new Map();

      if (userIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, nom, prenom')
          .in('id', userIds);

        if (!profilesError && profilesData) {
          profilesData.forEach(p => {
            profileMap.set(p.id, { nom: p.nom || '', prenom: p.prenom || '' });
          });
        }
      }

      // 3. Formater les élèves
      const formattedEleves: Eleve[] = elevesData.map(e => {
        const profile = profileMap.get(e.user_id);
        return {
          id: e.id,
          matricule: e.matricule || '',
          statut: e.statut || 'inconnu',
          prenom: profile?.prenom,
          nom: profile?.nom,
        };
      });

      setEleves(formattedEleves);
    } catch (error) {
      console.error('Error loading eleves:', error);
      setEleves([]);
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

  if (!classe) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Classe non trouvée</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButtonHeader}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails de la classe</Text>
        <View style={{ width: 40 }} />
      </View>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>{classe.nom}</Text>
        {classe.niveau && (
          <View style={styles.infoRow}>
            <BookOpen size={18} color={theme.colors.neutral[500]} />
            <Text style={styles.infoText}>Niveau: {classe.niveau}</Text>
          </View>
        )}
        {classe.cycle && (
          <View style={styles.infoRow}>
            <Calendar size={18} color={theme.colors.neutral[500]} />
            <Text style={styles.infoText}>Cycle: {classe.cycle.nom}</Text>
          </View>
        )}
        {classe.serie && (
          <View style={styles.infoRow}>
            <BookOpen size={18} color={theme.colors.neutral[500]} />
            <Text style={styles.infoText}>Série: {classe.serie.nom}</Text>
          </View>
        )}
        {classe.option && (
          <View style={styles.infoRow}>
            <BookOpen size={18} color={theme.colors.neutral[500]} />
            <Text style={styles.infoText}>Option: {classe.option.code} - {classe.option.nom}</Text>
          </View>
        )}
        {classe.indice && (
          <View style={styles.infoRow}>
            <BookOpen size={18} color={theme.colors.neutral[500]} />
            <Text style={styles.infoText}>Indice: {classe.indice.valeur}</Text>
          </View>
        )}
        {classe.is_manuel && (
          <View style={styles.manuelBadge}>
            <Text style={styles.manuelBadgeText}>Création manuelle</Text>
          </View>
        )}
      </Card>

      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <UserCheck size={18} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.cardTitle}>Professeur principal</Text>
        </View>
        {classe.enseignant_principal_nom ? (
          <View style={styles.principalInfo}>
            <User size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.principalName}>{classe.enseignant_principal_nom}</Text>
          </View>
        ) : (
          <Text style={styles.emptyInfoText}>Aucun professeur principal assigné</Text>
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Effectifs</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Users size={24} color={theme.colors.primary.DEFAULT} />
            <Text style={styles.statNumber}>{classe.effectif}</Text>
            <Text style={styles.statLabel}>Élèves</Text>
          </View>
          <View style={styles.statItem}>
            <User size={24} color={theme.colors.primary.DEFAULT} />
            <Text style={styles.statNumber}>{classe.capacite || '∞'}</Text>
            <Text style={styles.statLabel}>Capacité</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Élèves ({eleves.length})</Text>
        {eleves.length === 0 ? (
          <Text style={styles.emptyText}>Aucun élève dans cette classe</Text>
        ) : (
          eleves.map((eleve) => (
            <View key={eleve.id} style={styles.eleveItem}>
              <View>
                <Text style={styles.eleveName}>
                  {eleve.prenom} {eleve.nom}
                </Text>
                <Text style={styles.eleveMatricule}>{eleve.matricule}</Text>
              </View>
              <View style={[styles.statusBadge, eleve.statut === 'actif' ? styles.statusActive : styles.statusInactive]}>
                <Text style={styles.statusText}>{eleve.statut === 'actif' ? 'Actif' : 'Inactif'}</Text>
              </View>
            </View>
          ))
        )}
      </Card>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.groupsButton}
          onPress={() => router.push(`/(app)/(sidebar)/classes/groupes?id=${classe.id}`)}
        >
          <Users size={18} color="#FFFFFF" />
          <Text style={styles.groupsButtonText}>Gérer les groupes</Text>
        </TouchableOpacity>
      </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 16,
  },
  backButtonHeader: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
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
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  infoText: {
    fontSize: 14,
    color: '#4B5563',
  },
  manuelBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  manuelBadgeText: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '500',
  },
  principalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  principalName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  emptyInfoText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  statItem: {
    alignItems: 'center',
    gap: 6,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  eleveItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  eleveName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  eleveMatricule: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: '#D1FAE5',
  },
  statusInactive: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
  actions: {
    marginTop: 8,
  },
  groupsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 14,
    borderRadius: 12,
  },
  groupsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});