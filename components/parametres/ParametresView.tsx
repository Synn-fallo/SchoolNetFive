// /home/project/components/parametres/ParametresView.tsx
// Vue principale des paramètres – Style des onglets identique à ChefNotesView

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import OngletGeneral from './OngletGeneral';
import OngletScolarite from './OngletScolarite';
import OngletNotes from './OngletNotes';
import OngletNotifications from './OngletNotifications';
import OngletSecurite from './OngletSecurite';
import theme from '@/constants/theme';

interface ParametresViewProps {
  etablissementId: string;
  etablissementNom: string;
}

type TabId = 'general' | 'scolarite' | 'notes' | 'notifications' | 'securite';

interface Tab {
  id: TabId;
  label: string;
  component: React.ReactNode;
}

export default function ParametresView({ etablissementId, etablissementNom }: ParametresViewProps) {
  const [activeTab, setActiveTab] = useState<TabId>('notes'); // ← Changé pour tester l'onglet Notes
  const [anneeScolaireId, setAnneeScolaireId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Charger l'année scolaire active
  useEffect(() => {
    loadActiveAnneeScolaire();
  }, [etablissementId]);

  const loadActiveAnneeScolaire = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('annees_scolaires')
        .select('id')
        .eq('etablissement_id', etablissementId)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      
      console.log('🔍 [ParametresView] Année scolaire active chargée:', data?.id);
      setAnneeScolaireId(data?.id || '');
    } catch (error) {
      console.error('Erreur chargement année scolaire active:', error);
      // Fallback : prendre la première année scolaire
      const { data } = await supabase
        .from('annees_scolaires')
        .select('id')
        .eq('etablissement_id', etablissementId)
        .limit(1)
        .single();
      
      if (data) {
        setAnneeScolaireId(data.id);
      }
    } finally {
      setLoading(false);
    }
  };

  const tabs: Tab[] = [
    { id: 'general', label: 'Général', component: <OngletGeneral etablissementId={etablissementId} etablissementNom={etablissementNom} /> },
    { id: 'scolarite', label: 'Scolarité', component: <OngletScolarite etablissementId={etablissementId} /> },
    { id: 'notes', label: 'Notes', component: <OngletNotes etablissementId={etablissementId} anneeScolaireId={anneeScolaireId} /> },
    { id: 'notifications', label: 'Notifications', component: <OngletNotifications etablissementId={etablissementId} /> },
    { id: 'securite', label: 'Sécurité', component: <OngletSecurite etablissementId={etablissementId} /> },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement des paramètres...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.title}>⚙️ Paramètres</Text>
        <Text style={styles.subtitle}>
          Gérez la configuration de votre établissement
        </Text>
      </View>

      {/* 5 onglets - style identique à ChefNotesView */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Contenu de l'onglet actif */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {tabs.find(t => t.id === activeTab)?.component}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  // Style identique aux onglets de ChefNotesView
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  tabText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
});