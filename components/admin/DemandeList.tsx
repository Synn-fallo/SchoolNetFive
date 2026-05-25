import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Filter, Users, Building2, Landmark, Handshake } from 'lucide-react-native';
import { DemandeRole, FilterType, RoleFilterType } from '@/hooks/useAdminDemandes';
import DemandeCard from './DemandeCard';
import theme from '@/constants/theme';

interface DemandeListProps {
  demandes: DemandeRole[];
  loading: boolean;
  error: string | null;
  statutFilter: FilterType;
  setStatutFilter: (filter: FilterType) => void;
  roleFilter: RoleFilterType;
  setRoleFilter: (filter: RoleFilterType) => void;
  onDemandePress: (demande: DemandeRole) => void;
  onRefresh?: () => void;
}

const STATUT_FILTERS: { value: FilterType; label: string }[] = [
  { value: 'en_attente', label: 'En attente' },
  { value: 'valide', label: 'Validé' },
  { value: 'rejete', label: 'Rejeté' },
  { value: 'toutes', label: 'Toutes' },
];

const ROLE_FILTERS: { value: RoleFilterType; label: string; icon: any }[] = [
  { value: 'tous', label: 'Tous', icon: Users },
  { value: 'chef_etablissement', label: 'Chef', icon: Building2 },
  { value: 'autorite', label: 'Autorité', icon: Landmark },
  { value: 'partenaire', label: 'Partenaire', icon: Handshake },
];

export default function DemandeList({
  demandes,
  loading,
  error,
  statutFilter,
  setStatutFilter,
  roleFilter,
  setRoleFilter,
  onDemandePress,
  onRefresh,
}: DemandeListProps) {
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        {onRefresh && (
          <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filtres par statut */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
        <View style={styles.filterContainer}>
          {STATUT_FILTERS.map((filter) => (
            <TouchableOpacity
              key={filter.value}
              style={[
                styles.filterChip,
                statutFilter === filter.value && styles.filterChipActive,
              ]}
              onPress={() => setStatutFilter(filter.value)}
            >
              <Text style={[
                styles.filterChipText,
                statutFilter === filter.value && styles.filterChipTextActive,
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Filtres par rôle */}
      <View style={styles.roleFilterContainer}>
        {ROLE_FILTERS.map((filter) => {
          const Icon = filter.icon;
          const isActive = roleFilter === filter.value;
          return (
            <TouchableOpacity
              key={filter.value}
              style={[
                styles.roleFilterChip,
                isActive && styles.roleFilterChipActive,
              ]}
              onPress={() => setRoleFilter(filter.value)}
            >
              <Icon size={14} color={isActive ? theme.colors.primary.DEFAULT : theme.colors.neutral[500]} />
              <Text style={[
                styles.roleFilterText,
                isActive && styles.roleFilterTextActive,
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Liste des demandes */}
      <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
        {demandes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Aucune demande trouvée</Text>
          </View>
        ) : (
          demandes.map((demande) => (
            <DemandeCard
              key={demande.id}
              demande={demande}
              onPress={() => onDemandePress(demande)}
            />
          ))
        )}
      </ScrollView>
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
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    color: theme.colors.danger.DEFAULT,
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
  filterScroll: {
    flexGrow: 0,
    backgroundColor: theme.colors.background.primary,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: theme.colors.neutral[100],
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.neutral[600],
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  roleFilterContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  roleFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: theme.colors.neutral[100],
  },
  roleFilterChipActive: {
    backgroundColor: '#EFF6FF',
  },
  roleFilterText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.neutral[600],
  },
  roleFilterTextActive: {
    color: theme.colors.primary.DEFAULT,
  },
  listContainer: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.neutral[400],
  },
});