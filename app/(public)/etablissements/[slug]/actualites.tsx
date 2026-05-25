import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Calendar, User } from 'lucide-react-native';

interface Publication {
  id: string;
  contenu: string;
  created_at: string;
  user_id: string;
  user_nom?: string;
  user_prenom?: string;
}

export default function EtablissementActualitesScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [etablissementId, setEtablissementId] = useState<string | null>(null);

  useEffect(() => {
    fetchEtablissementId();
  }, [slug]);

  const fetchEtablissementId = async () => {
    try {
      const { data, error } = await supabase
        .from('etablissements')
        .select('id')
        .eq('slug', slug)
        .single();

      if (error) throw error;
      if (data) {
        setEtablissementId(data.id);
        fetchPublications(data.id);
      }
    } catch (error) {
      console.error('Error fetching etablissement:', error);
      setLoading(false);
    }
  };

  const fetchPublications = async (etabId: string) => {
    try {
      const { data, error } = await supabase
        .from('publications')
        .select(`
          id,
          contenu,
          created_at,
          user_id,
          profiles:user_id (
            nom,
            prenom
          )
        `)
        .eq('etablissement_id', etabId)
        .eq('visibilite', 'public')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedPublications = (data || []).map((item: any) => ({
        id: item.id,
        contenu: item.contenu,
        created_at: item.created_at,
        user_id: item.user_id,
        user_nom: item.profiles?.nom,
        user_prenom: item.profiles?.prenom,
      }));

      setPublications(formattedPublications);
    } catch (error) {
      console.error('Error fetching publications:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Actualités</Text>
        <Text style={styles.subtitle}>Les dernières publications de l'établissement</Text>
      </View>

      <FlatList
        data={publications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.content}>{item.contenu}</Text>
            <View style={styles.meta}>
              <View style={styles.metaItem}>
                <Calendar size={14} color="#9CA3AF" />
                <Text style={styles.metaText}>{formatDate(item.created_at)}</Text>
              </View>
              {item.user_nom && (
                <View style={styles.metaItem}>
                  <User size={14} color="#9CA3AF" />
                  <Text style={styles.metaText}>
                    {item.user_prenom} {item.user_nom}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucune actualité pour le moment</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  list: {
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  content: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
    marginBottom: 12,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});