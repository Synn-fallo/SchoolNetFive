import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Building2, MapPin, BookOpen, Users, Calendar } from 'lucide-react-native';
import { Card } from '@/components/Card';
import theme from '@/constants/theme';

interface Etablissement {
  id: string;
  nom: string;
  code: string;
  type: string;
  ville: string;
  adresse: string;
  telephone: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

interface Statistiques {
  nbClasses: number;
  nbEleves: number;
  nbEnseignants: number;
}

export default function EtablissementDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [etablissement, setEtablissement] = useState<Etablissement | null>(null);
  const [statistiques, setStatistiques] = useState<Statistiques>({
    nbClasses: 0,
    nbEleves: 0,
    nbEnseignants: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadEtablissement();
      loadStatistiques();
    }
  }, [id]);

  const loadEtablissement = async () => {
    try {
      const { data, error } = await supabase
        .from('etablissements')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setEtablissement(data);
    } catch (error) {
      console.error('Error loading etablissement:', error);
      Alert.alert('Erreur', 'Impossible de charger les détails de l\'établissement');
    }
  };

  const loadStatistiques = async () => {
    try {
      // Nombre de classes
      const { count: nbClasses, error: classesError } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('etablissement_id', id);

      if (!classesError) setStatistiques(prev => ({ ...prev, nbClasses: nbClasses || 0 }));

      // Nombre d'élèves
      const { count: nbEleves, error: elevesError } = await supabase
        .from('eleves')
        .select('*', { count: 'exact', head: true })
        .eq('etablissement_id', id);

      if (!elevesError) setStatistiques(prev => ({ ...prev, nbEleves: nbEleves || 0 }));

      // Nombre d'enseignants
      const { count: nbEnseignants, error: enseignantsError } = await supabase
        .from('user_roles')
        .select('*', { count: 'exact', head: true })
        .eq('etablissement_id', id)
        .eq('role', 'enseignant');

      if (!enseignantsError) setStatistiques(prev => ({ ...prev, nbEnseignants: nbEnseignants || 0 }));
    } catch (error) {
      console.error('Error loading statistiques:', error);
    } finally {
      setLoading(false);
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

  if (!etablissement) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Établissement non trouvé</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* En-tête avec bouton retour */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButtonHeader}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détail de l'établissement</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Informations principales */}
      <Card style={styles.infoCard}>
        <View style={styles.iconContainer}>
          <Building2 size={40} color={theme.colors.primary.DEFAULT} />
        </View>
        <Text style={styles.etablissementNom}>{etablissement.nom}</Text>
        {etablissement.code && (
          <Text style={styles.etablissementCode}>Code: {etablissement.code}</Text>
        )}
        {etablissement.type && (
          <Text style={styles.etablissementType}>Type: {etablissement.type}</Text>
        )}
        {etablissement.ville && (
          <View style={styles.infoRow}>
            <MapPin size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.infoText}>{etablissement.ville}</Text>
          </View>
        )}
        {etablissement.adresse && (
          <Text style={styles.adresseText}>{etablissement.adresse}</Text>
        )}
        {etablissement.telephone && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tél:</Text>
            <Text style={styles.infoText}>{etablissement.telephone}</Text>
          </View>
        )}
        {etablissement.email && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoText}>{etablissement.email}</Text>
          </View>
        )}
      </Card>

      {/* Statistiques */}
      <Card style={styles.statsCard}>
        <Text style={styles.statsTitle}>📊 Statistiques</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <BookOpen size={24} color={theme.colors.primary.DEFAULT} />
            <Text style={styles.statValue}>{statistiques.nbClasses}</Text>
            <Text style={styles.statLabel}>Classes</Text>
          </View>
          <View style={styles.statItem}>
            <Users size={24} color={theme.colors.primary.DEFAULT} />
            <Text style={styles.statValue}>{statistiques.nbEleves}</Text>
            <Text style={styles.statLabel}>Élèves</Text>
          </View>
          <View style={styles.statItem}>
            <Users size={24} color={theme.colors.primary.DEFAULT} />
            <Text style={styles.statValue}>{statistiques.nbEnseignants}</Text>
            <Text style={styles.statLabel}>Enseignants</Text>
          </View>
        </View>
      </Card>

      {/* Date de création */}
      <Card style={styles.dateCard}>
        <View style={styles.infoRow}>
          <Calendar size={16} color={theme.colors.neutral[500]} />
          <Text style={styles.dateText}>
            Créé le: {new Date(etablissement.created_at).toLocaleDateString('fr-FR')}
          </Text>
        </View>
      </Card>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.classesButton}
          onPress={() => router.push('/(app)/classes')}
        >
          <BookOpen size={18} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>Voir les classes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push(`/(app)/etablissement/modifier?id=${etablissement.id}`)}
        >
          <Text style={styles.editButtonText}>Modifier</Text>
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
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButtonHeader: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  infoCard: {
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  etablissementNom: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  etablissementCode: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  etablissementType: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
  },
  adresseText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  statsCard: {
    padding: 16,
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  dateCard: {
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 13,
    color: '#6B7280',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  classesButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 14,
    borderRadius: 10,
  },
  editButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
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
});