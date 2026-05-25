import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { BookOpen, Users, Calendar, Bell, ChevronRight, GraduationCap } from 'lucide-react-native';

interface EnseignantData {
  id: string;
  nom: string;
  prenom: string;
  classes: Array<{
    id: string;
    nom: string;
    niveau: string;
    role: string;
    elevesCount: number;
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
    elevesCount: number;
  }>;
  devoirs: Array<{
    id: string;
    titre: string;
    date_devoir: string;
    classe_nom: string;
    matiere_nom: string;
  }>;
  notifications: Array<{
    id: string;
    titre: string;
    contenu: string;
    created_at: string;
  }>;
}

export default function EnseignantTableauDeBordScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<EnseignantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Récupérer les classes de l'enseignant
      const { data: classesData } = await supabase
        .from('enseignant_classes')
        .select(`
          classe:classe_id(id, nom, niveau),
          role
        `)
        .eq('enseignant_id', user.id);

      // Compter les élèves par classe
      const classesWithCount = await Promise.all(
        (classesData || []).map(async (item) => {
          const { count } = await supabase
            .from('eleves')
            .select('*', { count: 'exact', head: true })
            .eq('classe_id', item.classe.id)
            .eq('statut', 'actif');

          return {
            id: item.classe.id,
            nom: item.classe.nom,
            niveau: item.classe.niveau,
            role: item.role,
            elevesCount: count || 0,
          };
        })
      );

      // Récupérer les matières
      const { data: matieresData } = await supabase
        .from('enseignant_matieres')
        .select(`
          matiere:matiere_id(id, nom, code)
        `)
        .eq('enseignant_id', user.id);

      // Récupérer les groupes
      const { data: groupesData } = await supabase
        .from('enseignant_groupes')
        .select(`
          groupe:groupe_id(id, nom),
          matiere:matiere_id(id, nom),
          role
        `)
        .eq('enseignant_id', user.id);

      const groupesWithDetails = await Promise.all(
        (groupesData || []).map(async (g) => {
          const { data: groupeDetail } = await supabase
            .from('groupes_eleves')
            .select('classe:classe_id(nom)')
            .eq('id', g.groupe.id)
            .single();

          const { count } = await supabase
            .from('eleve_groupes')
            .select('*', { count: 'exact', head: true })
            .eq('groupe_id', g.groupe.id);

          return {
            id: g.groupe.id,
            nom: g.groupe.nom,
            classe_nom: groupeDetail?.classe?.nom || '',
            matiere_nom: g.matiere?.nom || '',
            role: g.role,
            elevesCount: count || 0,
          };
        })
      );

      // Récupérer les devoirs à venir
      const { data: devoirsData } = await supabase
        .from('devoirs')
        .select(`
          *,
          classe:classe_id(nom),
          matiere:matiere_id(nom)
        `)
        .eq('enseignant_id', user.id)
        .gte('date_devoir', new Date().toISOString().split('T')[0])
        .order('date_devoir', { ascending: true })
        .limit(5);

      // Récupérer les notifications non lues
      const { data: notificationsData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      setData({
        id: user.id,
        nom: profile?.nom || '',
        prenom: profile?.prenom || '',
        classes: classesWithCount,
        matieres: matieresData?.map(m => ({
          id: m.matiere.id,
          nom: m.matiere.nom,
          code: m.matiere.code,
        })) || [],
        groupes: groupesWithDetails,
        devoirs: devoirsData?.map(d => ({
          id: d.id,
          titre: d.titre,
          date_devoir: d.date_devoir,
          classe_nom: d.classe?.nom || '',
          matiere_nom: d.matiere?.nom || '',
        })) || [],
        notifications: notificationsData || [],
      });

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#3B82F6']} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour, {data?.prenom || 'Enseignant'}!</Text>
          <Text style={styles.subtitle}>Tableau de bord enseignant</Text>
        </View>
        <View style={styles.statsBadge}>
          <GraduationCap size={18} color="#3B82F6" />
          <Text style={styles.statsText}>
            {data?.classes.length || 0} classe(s)
          </Text>
        </View>
      </View>

      {/* Notifications */}
      {data?.notifications && data.notifications.length > 0 && (
        <Card style={styles.notificationCard}>
          <View style={styles.sectionHeader}>
            <Bell size={18} color="#F59E0B" />
            <Text style={styles.sectionTitle}>Notifications</Text>
          </View>
          {data.notifications.slice(0, 3).map((notif) => (
            <View key={notif.id} style={styles.notificationItem}>
              <Text style={styles.notificationTitle}>{notif.titre}</Text>
              <Text style={styles.notificationContent} numberOfLines={1}>
                {notif.contenu}
              </Text>
            </View>
          ))}
          {data.notifications.length > 3 && (
            <TouchableOpacity
              style={styles.viewMore}
              onPress={() => router.push('/(app)/messages')}
            >
              <Text style={styles.viewMoreText}>Voir toutes</Text>
              <ChevronRight size={14} color="#3B82F6" />
            </TouchableOpacity>
          )}
        </Card>
      )}

      {/* Mes classes */}
      {data?.classes && data.classes.length > 0 && (
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Users size={18} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Mes classes</Text>
          </View>
          {data.classes.map((classe) => (
            <TouchableOpacity
              key={classe.id}
              style={styles.classItem}
              onPress={() => router.push(`/(app)/classes?id=${classe.id}`)}
            >
              <View>
                <Text style={styles.className}>{classe.nom}</Text>
                <Text style={styles.classDetails}>
                  {classe.niveau} • {classe.elevesCount} élève(s) • {classe.role === 'responsable' ? 'Responsable' : 'Intervenant'}
                </Text>
              </View>
              <ChevronRight size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </Card>
      )}

      {/* Mes matières */}
      {data?.matieres && data.matieres.length > 0 && (
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <BookOpen size={18} color="#10B981" />
            <Text style={styles.sectionTitle}>Mes matières</Text>
          </View>
          <View style={styles.chipsContainer}>
            {data.matieres.map((matiere) => (
              <View key={matiere.id} style={styles.chip}>
                <Text style={styles.chipText}>{matiere.nom}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      {/* Groupes pédagogiques */}
      {data?.groupes && data.groupes.length > 0 && (
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Users size={18} color="#F59E0B" />
            <Text style={styles.sectionTitle}>Groupes pédagogiques</Text>
          </View>
          {data.groupes.map((groupe) => (
            <View key={groupe.id} style={styles.groupeItem}>
              <View>
                <Text style={styles.groupeName}>{groupe.nom}</Text>
                <Text style={styles.groupeDetails}>
                  {groupe.classe_nom} • {groupe.matiere_nom} • {groupe.elevesCount} élève(s)
                </Text>
              </View>
              <Text style={[
                styles.groupeRole,
                groupe.role === 'responsable' ? styles.responsableRole : styles.intervenantRole
              ]}>
                {groupe.role === 'responsable' ? 'Responsable' : 'Intervenant'}
              </Text>
            </View>
          ))}
        </Card>
      )}

      {/* Devoirs à venir */}
      {data?.devoirs && data.devoirs.length > 0 && (
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <Calendar size={18} color="#EF4444" />
            <Text style={styles.sectionTitle}>Devoirs à venir</Text>
          </View>
          {data.devoirs.map((devoir) => (
            <View key={devoir.id} style={styles.devoirItem}>
              <View>
                <Text style={styles.devoirTitle}>{devoir.titre}</Text>
                <Text style={styles.devoirDetails}>
                  {devoir.classe_nom} • {devoir.matiere_nom}
                </Text>
              </View>
              <Text style={styles.devoirDate}>{formatDate(devoir.date_devoir)}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* Actions rapides */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(app)/notes')}
        >
          <BookOpen size={20} color="#3B82F6" />
          <Text style={styles.actionText}>Saisir notes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(app)/classes')}
        >
          <Users size={20} color="#3B82F6" />
          <Text style={styles.actionText}>Mes classes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/(app)/messages')}
        >
          <Bell size={20} color="#3B82F6" />
          <Text style={styles.actionText}>Messages</Text>
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
  statsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statsText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  notificationCard: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  card: {
    marginBottom: 16,
    padding: 16,
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
  notificationItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FEF3C7',
  },
  notificationTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#F59E0B',
    marginBottom: 2,
  },
  notificationContent: {
    fontSize: 12,
    color: '#6B7280',
  },
  viewMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 8,
  },
  viewMoreText: {
    fontSize: 12,
    color: '#3B82F6',
  },
  classItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  className: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  classDetails: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
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
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  responsableRole: {
    backgroundColor: '#EFF6FF',
    color: '#3B82F6',
  },
  intervenantRole: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  devoirItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  devoirTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  devoirDetails: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  devoirDate: {
    fontSize: 12,
    color: '#EF4444',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionText: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '500',
  },
});