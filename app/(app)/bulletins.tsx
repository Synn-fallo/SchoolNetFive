import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import BulletinCard from '@/components/bulletin/BulletinCard';
import { Download, FileText, Calendar } from 'lucide-react-native';

interface Bulletin {
  id: string;
  periode: string;
  moyenne_generale: number;
  appreciation_generale: string;
  bulletin_url: string | null;
  is_published: boolean;
  created_at: string;
  annee_scolaire: {
    libelle: string;
  };
}

export default function BulletinsScreen() {
  const { user, primaryRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bulletins, setBulletins] = useState<Bulletin[]>([]);
  const [eleveId, setEleveId] = useState<string | null>(null);

  useEffect(() => {
    loadBulletins();
  }, [user, primaryRole]);

  const loadBulletins = async () => {
    try {
      setLoading(true);

      let eleveIdToUse: string | null = null;

      if (primaryRole === 'eleve') {
        const { data: eleve } = await supabase
          .from('eleves')
          .select('id')
          .eq('user_id', user?.id)
          .maybeSingle();
        eleveIdToUse = eleve?.id || null;
        setEleveId(eleveIdToUse);
      } else if (primaryRole === 'parent') {
        const { data: eleves } = await supabase
          .from('eleves')
          .select('id')
          .eq('parent_id', user?.id)
          .limit(1);
        eleveIdToUse = eleves?.[0]?.id || null;
        setEleveId(eleveIdToUse);
      }

      if (!eleveIdToUse) {
        setBulletins([]);
        return;
      }

      const { data, error } = await supabase
        .from('bulletins')
        .select(`
          *,
          annee_scolaire:annee_scolaire_id(libelle)
        `)
        .eq('eleve_id', eleveIdToUse)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBulletins(data || []);
    } catch (error) {
      console.error('Error loading bulletins:', error);
      Alert.alert('Erreur', 'Impossible de charger les bulletins');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBulletin = async (periode: string) => {
    if (!eleveId) {
      Alert.alert('Erreur', 'Aucun élève associé');
      return;
    }

    try {
      // Récupérer l'année scolaire active
      const { data: anneeScolaire } = await supabase
        .from('annees_scolaires')
        .select('id')
        .eq('is_active', true)
        .maybeSingle();

      if (!anneeScolaire) {
        Alert.alert('Erreur', 'Aucune année scolaire active');
        return;
      }

      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-bulletin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          eleve_id: eleveId,
          periode,
          annee_scolaire_id: anneeScolaire.id,
        }),
      });

      const result = await response.json();

      if (result.success) {
        Alert.alert('Succès', 'Bulletin généré avec succès');
        loadBulletins();
      } else {
        Alert.alert('Erreur', result.error || 'Échec de la génération');
      }
    } catch (error) {
      console.error('Error generating bulletin:', error);
      Alert.alert('Erreur', 'Impossible de générer le bulletin');
    }
  };

  const handleDownload = async (bulletin: Bulletin) => {
    if (!bulletin.bulletin_url) {
      Alert.alert('Information', 'Le bulletin n\'est pas encore disponible');
      return;
    }

    // Ouvrir le lien dans le navigateur
    window.open(bulletin.bulletin_url, '_blank');
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
        <Text style={styles.title}>Mes bulletins</Text>
        <Text style={styles.subtitle}>
          Consultez et téléchargez vos bulletins scolaires
        </Text>
      </View>

      {/* Actions de génération */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleGenerateBulletin('T1')}
        >
          <FileText size={18} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>1er Trimestre</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleGenerateBulletin('T2')}
        >
          <FileText size={18} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>2ème Trimestre</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleGenerateBulletin('T3')}
        >
          <FileText size={18} color="#FFFFFF" />
          <Text style={styles.actionButtonText}>3ème Trimestre</Text>
        </TouchableOpacity>
      </View>

      {/* Liste des bulletins */}
      {bulletins.length > 0 ? (
        bulletins.map((bulletin) => (
          <BulletinCard
            key={bulletin.id}
            bulletin={bulletin}
            onDownload={() => handleDownload(bulletin)}
          />
        ))
      ) : (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            Aucun bulletin disponible. Utilisez les boutons ci-dessus pour générer un bulletin.
          </Text>
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
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});