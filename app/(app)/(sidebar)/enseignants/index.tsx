import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveEtablissement } from '@/hooks/useActiveEtablissement';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Plus, Users, Mail, UserCheck, Building2, BookOpen, GraduationCap } from 'lucide-react-native';
import { Card } from '@/components/Card';
import theme from '@/constants/theme';

interface Enseignant {
  id: string;
  user_id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  matieres: string[];
  classes: string[];
  groupes: { nom: string; role: string }[];
}

export default function EnseignantsListScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { activeEtablissement, loading: etablissementLoading } = useActiveEtablissement();
  const [enseignants, setEnseignants] = useState<Enseignant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeEtablissement) {
      fetchEnseignants();
    } else if (!etablissementLoading) {
      setError('Aucun établissement sélectionné');
      setLoading(false);
    }
  }, [activeEtablissement, etablissementLoading]);

  const fetchEnseignants = async () => {
    if (!activeEtablissement) return;

    setLoading(true);
    setError(null);
    
    try {
      const etablissementId = activeEtablissement.id;

      // 1. Récupérer les IDs des enseignants de l'établissement
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('etablissement_id', etablissementId)
        .eq('role', 'enseignant')
        .eq('is_active', true);

      if (rolesError) throw rolesError;

      if (!rolesData || rolesData.length === 0) {
        setEnseignants([]);
        setLoading(false);
        return;
      }

      const enseignantIds = rolesData.map(r => r.user_id);

      // 2. Récupérer les profils
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nom, prenom, telephone')
        .in('id', enseignantIds);

      if (profilesError) throw profilesError;

      // 3. Récupérer les emails depuis auth.users
      const emailsMap = new Map<string, string>();
      for (const id of enseignantIds) {
        const { data: userData } = await supabase
          .from('users')
          .select('email')
          .eq('id', id)
          .single();
        if (userData) {
          emailsMap.set(id, userData.email);
        }
      }

      // 4. Récupérer les rattachements (matières, classes)
      const { data: rattachementsData, error: rattachementsError } = await supabase
        .from('enseignant_matieres')
        .select('enseignant_id, matiere_id, classe_id')
        .in('enseignant_id', enseignantIds);

      if (rattachementsError) {
        console.error('Error fetching rattachements:', rattachementsError);
      }

      // 5. Récupérer les noms des matières
      const matiereIds = [...new Set((rattachementsData || []).map(r => r.matiere_id).filter(Boolean))];
      let matieresMap = new Map<string, string>();
      if (matiereIds.length > 0) {
        const { data: matieresData } = await supabase
          .from('matieres')
          .select('id, nom')
          .in('id', matiereIds);
        if (matieresData) {
          matieresData.forEach(m => matieresMap.set(m.id, m.nom));
        }
      }

      // 6. Récupérer les noms des classes
      const classeIds = [...new Set((rattachementsData || []).map(r => r.classe_id).filter(Boolean))];
      let classesMap = new Map<string, string>();
      if (classeIds.length > 0) {
        const { data: classesData } = await supabase
          .from('classes')
          .select('id, nom')
          .in('id', classeIds);
        if (classesData) {
          classesData.forEach(c => classesMap.set(c.id, c.nom));
        }
      }

      // 7. Récupérer les groupes pour chaque enseignant
      const { data: groupesData, error: groupesError } = await supabase
        .from('enseignant_groupes')
        .select('enseignant_id, groupe_id, matiere_id, role')
        .in('enseignant_id', enseignantIds);

      if (groupesError) {
        console.error('Error fetching groupes:', groupesError);
      }

      // 8. Récupérer les noms des groupes
      const groupeIds = [...new Set((groupesData || []).map(g => g.groupe_id).filter(Boolean))];
      let groupesMap = new Map<string, { nom: string; classeId: string }>();
      if (groupeIds.length > 0) {
        const { data: groupesElevesData } = await supabase
          .from('groupes_eleves')
          .select('id, nom, classe_id')
          .in('id', groupeIds);
        if (groupesElevesData) {
          groupesElevesData.forEach(g => groupesMap.set(g.id, { nom: g.nom, classeId: g.classe_id }));
        }
      }

      // 9. Construire la liste des enseignants
      const enseignantsList: Enseignant[] = (profilesData || []).map(profile => {
        // Matières uniques
        const userRattachements = (rattachementsData || []).filter(r => r.enseignant_id === profile.id);
        const matieres = [...new Set(userRattachements.map(r => matieresMap.get(r.matiere_id)).filter(Boolean))] as string[];
        
        // Classes uniques
        const classes = [...new Set(userRattachements.map(r => classesMap.get(r.classe_id)).filter(Boolean))] as string[];
        
        // Groupes
        const userGroupes = (groupesData || []).filter(g => g.enseignant_id === profile.id);
        const groupes = userGroupes.map(g => ({
          nom: groupesMap.get(g.groupe_id)?.nom || 'Groupe inconnu',
          role: g.role || 'professeur',
        }));
        
        return {
          id: profile.id,
          user_id: profile.id,
          nom: profile.nom || '',
          prenom: profile.prenom || '',
          email: emailsMap.get(profile.id) || '',
          telephone: profile.telephone,
          matieres,
          classes,
          groupes,
        };
      });

      setEnseignants(enseignantsList);
    } catch (error) {
      console.error('Error fetching enseignants:', error);
      setError('Impossible de charger la liste des enseignants');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteEnseignant = () => {
    if (!activeEtablissement) return;
    router.push(`/(app)/(sidebar)/enseignants/inviter?id=${activeEtablissement.id}`);
  };

  const handleViewInvitations = () => {
    if (!activeEtablissement) return;
    router.push(`/(app)/(sidebar)/enseignants/invitations?id=${activeEtablissement.id}`);
  };

  if (etablissementLoading || loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchEnseignants}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!activeEtablissement) {
    return (
      <View style={styles.centerContainer}>
        <Building2 size={48} color={theme.colors.neutral[300]} />
        <Text style={styles.emptyTitle}>Aucun établissement</Text>
        <Text style={styles.emptyText}>
          Veuillez sélectionner un établissement pour voir ses enseignants.
        </Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => router.push('/(app)/(sidebar)/mes-etablissements')}
        >
          <Text style={styles.emptyButtonText}>Voir mes établissements</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Enseignants</Text>
          <View style={styles.subtitleContainer}>
            <Building2 size={12} color={theme.colors.neutral[500]} />
            <Text style={styles.subtitle}> {activeEtablissement.nom}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton} onPress={handleViewInvitations}>
            <Mail size={20} color={theme.colors.neutral[600]} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={handleInviteEnseignant}>
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Inviter</Text>
          </TouchableOpacity>
        </View>
      </View>

      {enseignants.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Users size={48} color={theme.colors.neutral[300]} />
          <Text style={styles.emptyTitle}>Aucun enseignant</Text>
          <Text style={styles.emptyText}>
            Aucun enseignant n'est encore rattaché à cet établissement.
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={handleInviteEnseignant}>
            <Text style={styles.emptyButtonText}>Inviter un enseignant</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
          {enseignants.map((enseignant) => (
            <Card key={enseignant.id} style={styles.enseignantCard}>
              <View style={styles.enseignantHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {enseignant.prenom?.charAt(0)}{enseignant.nom?.charAt(0)}
                  </Text>
                </View>
                <View style={styles.enseignantInfo}>
                  <Text style={styles.enseignantName}>
                    {enseignant.prenom} {enseignant.nom}
                  </Text>
                  <Text style={styles.enseignantEmail}>{enseignant.email}</Text>
                </View>
              </View>

              {enseignant.matieres.length > 0 && (
                <View style={styles.section}>
                  <BookOpen size={14} color={theme.colors.neutral[500]} />
                  <Text style={styles.sectionLabel}>Matières:</Text>
                  <View style={styles.tagsContainer}>
                    {enseignant.matieres.map((matiere, idx) => (
                      <View key={idx} style={styles.tag}>
                        <Text style={styles.tagText}>{matiere}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {enseignant.classes.length > 0 && (
                <View style={styles.section}>
                  <GraduationCap size={14} color={theme.colors.neutral[500]} />
                  <Text style={styles.sectionLabel}>Classes:</Text>
                  <View style={styles.tagsContainer}>
                    {enseignant.classes.map((classe, idx) => (
                      <View key={idx} style={[styles.tag, styles.tagSecondary]}>
                        <Text style={[styles.tagText, styles.tagTextSecondary]}>{classe}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {enseignant.groupes.length > 0 && (
                <View style={styles.section}>
                  <Users size={14} color={theme.colors.neutral[500]} />
                  <Text style={styles.sectionLabel}>Groupes:</Text>
                  <View style={styles.tagsContainer}>
                    {enseignant.groupes.map((groupe, idx) => (
                      <View key={idx} style={[styles.tag, styles.tagAccent]}>
                        <Text style={[styles.tagText, styles.tagTextAccent]}>{groupe.nom}</Text>
                        <Text style={styles.tagRole}>({groupe.role === 'professeur_principal' ? 'PP' : 'Prof'})</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <TouchableOpacity
                style={styles.detailButton}
                onPress={() => router.push(`/(app)/(sidebar)/enseignants/${enseignant.id}`)}
              >
                <Text style={styles.detailButtonText}>Voir détails</Text>
              </TouchableOpacity>
            </Card>
          ))}
        </ScrollView>
      )}
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
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  enseignantCard: {
    padding: 16,
  },
  enseignantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  enseignantInfo: {
    flex: 1,
  },
  enseignantName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  enseignantEmail: {
    fontSize: 12,
    color: '#6B7280',
  },
  section: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 2,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  tag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagSecondary: {
    backgroundColor: '#F3F4F6',
  },
  tagAccent: {
    backgroundColor: '#FEF3C7',
  },
  tagText: {
    fontSize: 11,
    color: theme.colors.primary.DEFAULT,
  },
  tagTextSecondary: {
    color: '#6B7280',
  },
  tagTextAccent: {
    color: '#D97706',
  },
  tagRole: {
    fontSize: 10,
    color: '#D97706',
    marginLeft: 4,
  },
  detailButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  detailButtonText: {
    fontSize: 13,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});