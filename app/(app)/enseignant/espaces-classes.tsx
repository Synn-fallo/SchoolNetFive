import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { MessageCircle, ChevronRight, Building2, Crown } from 'lucide-react-native';
import theme from '@/constants/theme';

interface ClasseCanal {
  id: string;
  classe_id: string;
  classe_nom: string;
  etablissement_id: string;
  etablissement_nom: string;
  est_animateur: boolean;
  canal_id: string | null;
  canal_mode: string | null;
  canal_nom: string | null;
}

export default function EnseignantEspacesClassesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [classes, setClasses] = useState<ClasseCanal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chargerClasses = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Récupérer les classes où l'enseignant intervient
      const { data: enseignements, error: enseignementError } = await supabase
        .from('enseignant_classes')
        .select('classe_id')
        .eq('enseignant_id', user.id);

      if (enseignementError) throw enseignementError;

      if (!enseignements || enseignements.length === 0) {
        setClasses([]);
        setLoading(false);
        return;
      }

      const classeIds = [...new Set(enseignements.map(e => e.classe_id))];

      // 2. Récupérer les détails des classes
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select(`
          id,
          nom,
          enseignant_principal_id,
          etablissement_id,
          etablissement:etablissement_id (nom),
          canal:canaux_classe (
            id,
            mode,
            nom,
            animateur_id
          )
        `)
        .in('id', classeIds);

      if (classesError) throw classesError;

      const formatted: ClasseCanal[] = [];

      for (const classe of classesData || []) {
        const etablissement = classe.etablissement as any;
        const canal = classe.canal as any;
        const estAnimateur = classe.enseignant_principal_id === user.id;

        if (etablissement) {
          formatted.push({
            id: classe.id,
            classe_id: classe.id,
            classe_nom: classe.nom,
            etablissement_id: classe.etablissement_id,
            etablissement_nom: etablissement.nom,
            est_animateur: estAnimateur,
            canal_id: canal?.id || null,
            canal_mode: canal?.mode || null,
            canal_nom: canal?.nom || null,
          });
        }
      }

      // Trier par établissement puis par classe
      formatted.sort((a, b) => {
        if (a.etablissement_nom !== b.etablissement_nom) {
          return a.etablissement_nom.localeCompare(b.etablissement_nom);
        }
        return a.classe_nom.localeCompare(b.classe_nom);
      });

      setClasses(formatted);
    } catch (err) {
      console.error('Erreur chargement classes:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    chargerClasses();
  }, [chargerClasses]);

  useEffect(() => {
    chargerClasses();
  }, [chargerClasses]);

  const handleOpenCanal = (classe: ClasseCanal) => {
    if (!classe.canal_id) {
      return;
    }
    router.push({
      pathname: '/(app)/enseignant/canal-classe',
      params: {
        canalId: classe.canal_id,
        classeId: classe.classe_id,
        classeNom: classe.classe_nom,
        estAnimateur: classe.est_animateur ? 'true' : 'false'
      }
    });
  };

  const getModeIcon = (mode: string | null) => {
    switch (mode) {
      case 'libre': return { icon: '💬', color: '#10B981', label: 'Libre' };
      case 'moderation': return { icon: '🛡️', color: '#F59E0B', label: 'Modération' };
      case 'ferme': return { icon: '🔒', color: '#EF4444', label: 'Fermé' };
      default: return { icon: '❓', color: '#9CA3AF', label: 'Indisponible' };
    }
  };

  // Regrouper par établissement
  const etablissements = classes.reduce((acc, classe) => {
    if (!acc[classe.etablissement_id]) {
      acc[classe.etablissement_id] = {
        nom: classe.etablissement_nom,
        classes: []
      };
    }
    acc[classe.etablissement_id].classes.push(classe);
    return acc;
  }, {} as Record<string, { nom: string; classes: ClasseCanal[] }>);

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement de vos espaces...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Une erreur est survenue</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={chargerClasses}>
          <Text style={styles.retryButtonText}>Réessayer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (classes.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={styles.emptyContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <MessageCircle size={64} color={theme.colors.neutral[300]} />
        <Text style={styles.emptyTitle}>Aucun espace classe</Text>
        <Text style={styles.emptyText}>
          Vous n'êtes pas encore assigné à une classe.
        </Text>
        <Text style={styles.emptySubtext}>
          Les espaces de communication apparaîtront ici une fois que vous serez rattaché à des classes.
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Espace classes</Text>
        <Text style={styles.subtitle}>Communication avec les parents</Text>
      </View>

      {Object.entries(etablissements).map(([etabId, etab]) => (
        <View key={etabId} style={styles.etablissementSection}>
          <View style={styles.etablissementHeader}>
            <Building2 size={18} color={theme.colors.primary.DEFAULT} />
            <Text style={styles.etablissementNom}>{etab.nom}</Text>
          </View>

          {etab.classes.map((classe) => {
            const mode = getModeIcon(classe.canal_mode);
            const isActive = classe.canal_id !== null && classe.canal_mode !== 'ferme';
            const isPP = classe.est_animateur;
            
            return (
              <TouchableOpacity
                key={classe.id}
                style={[styles.classeCard, !isActive && styles.classeCardInactive]}
                onPress={() => handleOpenCanal(classe)}
                disabled={!isActive}
                activeOpacity={0.7}
              >
                <View style={styles.classeHeader}>
                  <View style={styles.classeInfo}>
                    <View style={styles.classeRow}>
                      <Text style={styles.classeNom}>{classe.classe_nom}</Text>
                      {isPP && (
                        <View style={styles.ppBadge}>
                          <Crown size={12} color="#F59E0B" />
                          <Text style={styles.ppBadgeText}>PP</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={[styles.modeBadge, { backgroundColor: mode.color + '20' }]}>
                    <Text style={styles.modeIcon}>{mode.icon}</Text>
                    <Text style={[styles.modeLabel, { color: mode.color }]}>{mode.label}</Text>
                  </View>
                </View>

                <View style={styles.classeFooter}>
                  {isActive ? (
                    <>
                      <View style={styles.footerLeft}>
                        <Text style={styles.roleText}>
                          {isPP ? 'Professeur Principal 🛡️' : 'Enseignant'}
                        </Text>
                        <Text style={styles.canalNom}>{classe.canal_nom || 'Canal de la classe'}</Text>
                      </View>
                      <ChevronRight size={18} color={theme.colors.primary.DEFAULT} />
                    </>
                  ) : (
                    <Text style={styles.disabledText}>
                      {!classe.canal_id ? 'Aucun canal actif' : 'Canal fermé'}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 16,
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
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444',
  },
  errorSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  etablissementSection: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  etablissementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  etablissementNom: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary.DEFAULT,
  },
  classeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  classeCardInactive: {
    backgroundColor: '#F9FAFB',
    opacity: 0.7,
  },
  classeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  classeInfo: {
    flex: 1,
  },
  classeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  classeNom: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  ppBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  ppBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#F59E0B',
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  modeIcon: {
    fontSize: 12,
  },
  modeLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  classeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerLeft: {
    flex: 1,
  },
  roleText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  canalNom: {
    fontSize: 13,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  disabledText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
});