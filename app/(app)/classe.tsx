import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';

export default function ClasseScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [classe, setClasse] = useState<any>(null);
  const [eleves, setEleves] = useState<any[]>([]);

  useEffect(() => {
    loadClassData();
  }, [user]);

  const loadClassData = async () => {
    try {
      setLoading(true);

      const { data: eleve } = await supabase
        .from('eleves')
        .select('*, classes:classe_id(*)')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (eleve?.classes) {
        setClasse(eleve.classes);

        // Get all eleves in the class
        const { data: classEleves } = await supabase
          .from('eleves')
          .select('*')
          .eq('classe_id', eleve.classes.id);

        setEleves(classEleves || []);
      }
    } catch (error) {
      console.error('Error loading class data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Ma classe</Text>
      </View>

      {classe ? (
        <>
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Informations de classe</Text>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Classe:</Text>
              <Text style={styles.value}>{classe.nom}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Niveau:</Text>
              <Text style={styles.value}>{classe.niveau}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Capacité:</Text>
              <Text style={styles.value}>{classe.capacite} élèves</Text>
            </View>
          </Card>

          {eleves.length > 0 && (
            <Card style={styles.card}>
              <Text style={styles.cardTitle}>Camarades ({eleves.length})</Text>
              {eleves.slice(0, 10).map((e: any) => (
                <View key={e.id} style={styles.eleveItem}>
                  <View style={styles.eleveInfo}>
                    <Text style={styles.eleveName}>{e.matricule}</Text>
                    <Text style={styles.eleveStatus}>{e.statut}</Text>
                  </View>
                </View>
              ))}
              {eleves.length > 10 && (
                <Text style={styles.moreText}>+ {eleves.length - 10} autres</Text>
              )}
            </Card>
          )}
        </>
      ) : (
        <Card style={styles.card}>
          <Text style={styles.emptyText}>Aucune classe assignée</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  card: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  eleveItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  eleveInfo: {
    flex: 1,
  },
  eleveName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  eleveStatus: {
    fontSize: 12,
    color: '#6B7280',
  },
  moreText: {
    fontSize: 12,
    color: '#6B7280',
    paddingVertical: 8,
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
