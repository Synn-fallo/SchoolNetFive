import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { Calendar, Clock, BookOpen, Users, ChevronRight } from 'lucide-react-native';
import theme from '@/constants/theme';

interface Classe {
  id: string;
  nom: string;
  niveau: string;
  emploi?: {
    id: string;
    matiere: string;
    enseignant: string;
    horaire: string;
    jour: string;
  }[];
}

export default function EmploisScreen() {
  const { user, isDirecteurEtudes } = useAuth();
  const [classes, setClasses] = useState<Classe[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClasse, setSelectedClasse] = useState<Classe | null>(null);
  const [etablissementId, setEtablissementId] = useState<string | null>(null);

  useEffect(() => {
    fetchEtablissementId();
  }, [user]);

  useEffect(() => {
    if (etablissementId) {
      fetchClasses();
    }
  }, [etablissementId]);

  const fetchEtablissementId = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('etablissement_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1);

      if (error) throw error;
      if (data && data.length > 0) {
        setEtablissementId(data[0].etablissement_id);
      }
    } catch (error) {
      console.error('Error fetching etablissement:', error);
    }
  };

  const fetchClasses = async () => {
    if (!etablissementId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, nom, niveau')
        .eq('etablissement_id', etablissementId)
        .eq('is_active', true)
        .order('niveau', { ascending: true })
        .order('nom', { ascending: true });

      if (error) throw error;

      // Pour le MVP, on simule des emplois du temps
      const classesWithEmploi = (data || []).map(classe => ({
        ...classe,
        emploi: [
          { id: '1', matiere: 'Mathématiques', enseignant: 'M. KOUASSI', horaire: '08:00-10:00', jour: 'Lundi' },
          { id: '2', matiere: 'Français', enseignant: 'Mme KONE', horaire: '10:00-12:00', jour: 'Lundi' },
          { id: '3', matiere: 'Anglais', enseignant: 'M. TRAORE', horaire: '14:00-16:00', jour: 'Lundi' },
        ],
      }));

      setClasses(classesWithEmploi);
    } catch (error) {
      console.error('Error fetching classes:', error);
      Alert.alert('Erreur', 'Impossible de charger les classes');
    } finally {
      setLoading(false);
    }
  };

  const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  const getEmploiForJour = (classe: Classe, jour: string) => {
    return classe.emploi?.filter(e => e.jour === jour) || [];
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Emplois du temps</Text>
        <Text style={styles.subtitle}>
          Gérez les emplois du temps par classe
        </Text>
      </View>

      {!selectedClasse ? (
        <ScrollView contentContainerStyle={styles.list}>
          {classes.map((classe) => (
            <TouchableOpacity
              key={classe.id}
              style={styles.classeCard}
              onPress={() => setSelectedClasse(classe)}
            >
              <View style={styles.classeIcon}>
                <BookOpen size={24} color={theme.colors.primary.DEFAULT} />
              </View>
              <View style={styles.classeInfo}>
                <Text style={styles.classeName}>{classe.nom}</Text>
                <Text style={styles.classeLevel}>Niveau: {classe.niveau}</Text>
              </View>
              <ChevronRight size={20} color={theme.colors.neutral[400]} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.emploiContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedClasse(null)}
          >
            <ChevronRight size={20} color={theme.colors.primary.DEFAULT} style={styles.backIcon} />
            <Text style={styles.backText}>Retour à la liste des classes</Text>
          </TouchableOpacity>

          <Text style={styles.classeTitle}>{selectedClasse.nom}</Text>

          {jours.map((jour) => {
            const cours = getEmploiForJour(selectedClasse, jour);
            if (cours.length === 0) return null;

            return (
              <Card key={jour} style={styles.jourCard}>
                <View style={styles.jourHeader}>
                  <Calendar size={18} color={theme.colors.primary.DEFAULT} />
                  <Text style={styles.jourTitle}>{jour}</Text>
                </View>
                {cours.map((c, idx) => (
                  <View key={c.id} style={styles.coursItem}>
                    <View style={styles.coursTime}>
                      <Clock size={14} color={theme.colors.neutral[400]} />
                      <Text style={styles.coursTimeText}>{c.horaire}</Text>
                    </View>
                    <View style={styles.coursInfo}>
                      <Text style={styles.coursMatiere}>{c.matiere}</Text>
                      <Text style={styles.coursEnseignant}>{c.enseignant}</Text>
                    </View>
                  </View>
                ))}
              </Card>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: theme.colors.background.primary,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.neutral[800],
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.neutral[500],
    lineHeight: 20,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  classeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    gap: 12,
  },
  classeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  classeInfo: {
    flex: 1,
  },
  classeName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.neutral[800],
    marginBottom: 4,
  },
  classeLevel: {
    fontSize: 12,
    color: theme.colors.neutral[500],
  },
  emploiContent: {
    padding: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backIcon: {
    transform: [{ rotate: '180deg' }],
  },
  backText: {
    fontSize: 14,
    color: theme.colors.primary.DEFAULT,
    marginLeft: 4,
  },
  classeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.neutral[800],
    marginBottom: 20,
  },
  jourCard: {
    marginBottom: 16,
  },
  jourHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  jourTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.neutral[700],
  },
  coursItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[100],
    gap: 12,
  },
  coursTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    width: 90,
  },
  coursTimeText: {
    fontSize: 12,
    color: theme.colors.neutral[500],
  },
  coursInfo: {
    flex: 1,
  },
  coursMatiere: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.neutral[800],
  },
  coursEnseignant: {
    fontSize: 12,
    color: theme.colors.neutral[500],
  },
});