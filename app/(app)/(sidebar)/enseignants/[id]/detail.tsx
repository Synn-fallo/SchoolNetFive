import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { ArrowLeft, Mail, Phone, BookOpen, Users, Calendar, Edit2 } from 'lucide-react-native';

interface EnseignantDetail {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  is_active: boolean;
  created_at: string;
  classes: Array<{
    id: string;
    nom: string;
    niveau: string;
    role: string;
  }>;
  matieres: Array<{
    id: string;
    nom: string;
    code: string;
  }>;
  groupes: Array<{
    id: string;
    nom: string;
    classe_nom: string;
    matiere_nom: string;
    role: string;
  }>;
}

export default function EnseignantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [enseignant, setEnseignant] = useState<EnseignantDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadEnseignantDetail();
    }
  }, [id]);

  const loadEnseignantDetail = async () => {
    try {
      setLoading(true);

      // Récupérer le profil
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (profileError) throw profileError;

      // Récupérer les classes
      const { data: classesData } = await supabase
        .from('enseignant_classes')
        .select(`
          classe:classe_id(id, nom, niveau),
          role
        `)
        .eq('enseignant_id', id);

      // Récupérer les matières
      const { data: matieresData } = await supabase
        .from('enseignant_matieres')
        .select(`
          matiere:matiere_id(id, nom, code)
        `)
        .eq('enseignant_id', id);

      // Récupérer les groupes
      const { data: groupesData } = await supabase
        .from('enseignant_groupes')
        .select(`
          groupe:groupe_id(id, nom),
          matiere:matiere_id(id, nom),
          role
        `)
        .eq('enseignant_id', id);

      // Enrichir les groupes avec le nom de la classe
      const groupesEnriched = await Promise.all(
        (groupesData || []).map(async (g) => {
          const { data: groupe } = await supabase
            .from('groupes_eleves')
            .select('classe:classe_id(nom)')
            .eq('id', g.groupe.id)
            .single();
          return {
            id: g.groupe.id,
            nom: g.groupe.nom,
            classe_nom: groupe?.classe?.nom || '',
            matiere_nom: g.matiere?.nom || '',
            role: g.role,
          };
        })
      );

      setEnseignant({
        id: profile.id,
        nom: profile.nom,
        prenom: profile.prenom,
        email: profile.email,
        telephone: profile.telephone,
        is_active: true,
        created_at: profile.created_at,
        classes: classesData?.map(c => ({
          id: c.classe.id,
          nom: c.classe.nom,
          niveau: c.classe.niveau,
          role: c.role,
        })) || [],
        matieres: matieresData?.map(m => ({
          id: m.matiere.id,
          nom: m.matiere.nom,
          code: m.matiere.code,
        })) || [],
        groupes: groupesEnriched,
      });

    } catch (error) {
      console.error('Error loading enseignant detail:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!enseignant) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Enseignant non trouvé</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détail enseignant</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => router.push(`/(app)/(sidebar)/enseignants/${id}/modifier`)}
        >
          <Edit2 size={18} color="#3B82F6" />
          <Text style={styles.editButtonText}>Modifier</Text>
        </TouchableOpacity>
      </View>

      {/* Profil */}
      <Card style={styles.card}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarLargeText}>
            {enseignant.prenom[0]}{enseignant.nom[0]}
          </Text>
        </View>
        <Text style={styles.name}>{enseignant.prenom} {enseignant.nom}</Text>
        <View style={styles.contactRow}>
          <Mail size={16} color="#9CA3AF" />
          <Text style={styles.contactText}>{enseignant.email}</Text>
        </View>
        {enseignant.telephone && (
          <View style={styles.contactRow}>
            <Phone size={16} color="#9CA3AF" />
            <Text style={styles.contactText}>{enseignant.telephone}</Text>
          </View>
        )}
        <View style={styles.dateRow}>
          <Calendar size={14} color="#9CA3AF" />
          <Text style={styles.dateText}>Membre depuis le {formatDate(enseignant.created_at)}</Text>
        </View>
      </Card>

      {/* Classes */}
      {enseignant.classes.length > 0 && (
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Users size={20} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Classes</Text>
          </View>
          {enseignant.classes.map((classe) => (
            <View key={classe.id} style={styles.itemRow}>
              <Text style={styles.itemName}>{classe.nom} ({classe.niveau})</Text>
              <Text style={styles.itemRole}>{classe.role === 'responsable' ? 'Responsable' : 'Intervenant'}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* Matières */}
      {enseignant.matieres.length > 0 && (
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <BookOpen size={20} color="#10B981" />
            <Text style={styles.sectionTitle}>Matières</Text>
          </View>
          <View style={styles.chipsContainer}>
            {enseignant.matieres.map((matiere) => (
              <View key={matiere.id} style={styles.chip}>
                <Text style={styles.chipText}>{matiere.nom}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* Groupes */}
      {enseignant.groupes.length > 0 && (
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Users size={20} color="#F59E0B" />
            <Text style={styles.sectionTitle}>Groupes pédagogiques</Text>
          </View>
          {enseignant.groupes.map((groupe) => (
            <View key={groupe.id} style={styles.groupeItem}>
              <View>
                <Text style={styles.groupeName}>{groupe.nom}</Text>
                <Text style={styles.groupeDetails}>
                  {groupe.classe_nom} • {groupe.matiere_nom}
                </Text>
              </View>
              <Text style={styles.groupeRole}>
                {groupe.role === 'responsable' ? 'Responsable' : 'Intervenant'}
              </Text>
            </View>
          ))}
        </Card>
      )}

      {enseignant.classes.length === 0 && enseignant.matieres.length === 0 && enseignant.groupes.length === 0 && (
        <Card style={styles.card}>
          <Text style={styles.emptyText}>Aucun rattachement pour le moment</Text>
        </Card>
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
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 12,
  },
  backText: {
    fontSize: 14,
    color: '#3B82F6',
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
  },
  editButtonText: {
    fontSize: 14,
    color: '#3B82F6',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  avatarLargeText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#6B7280',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemName: {
    fontSize: 14,
    color: '#4B5563',
  },
  itemRole: {
    fontSize: 12,
    color: '#3B82F6',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: {
    fontSize: 13,
    color: '#4B5563',
  },
  groupeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  groupeName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  groupeDetails: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  groupeRole: {
    fontSize: 12,
    color: '#F59E0B',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
});