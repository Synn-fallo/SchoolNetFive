import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';

export default function EnfantsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [eleves, setEleves] = useState<any[]>([]);
  const [selectedEleve, setSelectedEleve] = useState<any>(null);

  useEffect(() => {
    loadEleves();
  }, [user]);

  const loadEleves = async () => {
    try {
      setLoading(true);

      const { data } = await supabase
        .from('eleves')
        .select('*')
        .eq('parent_id', user?.id);

      setEleves(data || []);
      if (data && data.length > 0) {
        setSelectedEleve(data[0]);
      }
    } catch (error) {
      console.error('Error loading eleves:', error);
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
        <Text style={styles.title}>Mes enfants</Text>
      </View>

      {eleves.length > 0 ? (
        <>
          <View style={styles.tabsContainer}>
            {eleves.map((eleve: any) => (
              <TouchableOpacity
                key={eleve.id}
                style={[styles.tab, selectedEleve?.id === eleve.id && styles.activeTab]}
                onPress={() => setSelectedEleve(eleve)}
              >
                <Text
                  style={[styles.tabText, selectedEleve?.id === eleve.id && styles.activeTabText]}
                >
                  {eleve.matricule}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedEleve && (
            <>
              <Card style={styles.card}>
                <Text style={styles.cardTitle}>Informations</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Matricule:</Text>
                  <Text style={styles.value}>{selectedEleve.matricule}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.label}>Statut:</Text>
                  <Text style={styles.value}>{selectedEleve.statut}</Text>
                </View>
              </Card>

              <TouchableOpacity style={styles.button}>
                <Text style={styles.buttonText}>Voir les notes</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.button}>
                <Text style={styles.buttonText}>Voir les paiements</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.button, styles.secondaryButton]}>
                <Text style={styles.secondaryButtonText}>Historique</Text>
              </TouchableOpacity>
            </>
          )}
        </>
      ) : (
        <Card style={styles.card}>
          <Text style={styles.emptyText}>Aucun enfant enregistré</Text>
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
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  activeTab: {
    backgroundColor: '#3B82F6',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FFFFFF',
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
  button: {
    height: 48,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#F3F4F6',
  },
  secondaryButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
