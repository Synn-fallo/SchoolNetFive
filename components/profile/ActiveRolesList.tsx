import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CheckCircle2, Circle } from 'lucide-react-native';
import theme from '@/constants/theme';

interface RoleItem {
  role: string;
  label: string;
  etablissementId?: string;
  etablissementNom?: string;
}

interface ActiveRolesListProps {
  roles: RoleItem[];
  activeRole: string | null;
  onSelectRole?: (role: string, etablissementId?: string) => void;
  disabled?: boolean;
}

const getRoleIcon = (role: string): string => {
  switch (role) {
    case 'eleve':
      return '👨‍🎓';
    case 'parent':
      return '👨‍👩‍👧';
    case 'enseignant':
      return '👨‍🏫';
    case 'chef_etablissement':
      return '🏫';
    case 'admin':
      return '👑';
    case 'autorite':
      return '📜';
    case 'partenaire':
      return '🤝';
    case 'visiteur':
      return '👤';
    default:
      return '📋';
  }
};

const getRoleColor = (role: string, isActive: boolean): string => {
  if (isActive) return theme.colors.primary.DEFAULT;
  
  switch (role) {
    case 'eleve':
      return '#3B82F6';
    case 'parent':
      return '#10B981';
    case 'enseignant':
      return '#F59E0B';
    case 'chef_etablissement':
      return '#8B5CF6';
    case 'admin':
      return '#EF4444';
    default:
      return theme.colors.neutral[600];
  }
};

export default function ActiveRolesList({ 
  roles, 
  activeRole, 
  onSelectRole,
  disabled = false 
}: ActiveRolesListProps) {
  if (roles.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Aucun rôle actif</Text>
      </View>
    );
  }

  const handlePress = (item: RoleItem) => {
    if (disabled) return;
    if (onSelectRole) {
      onSelectRole(item.role, item.etablissementId);
    }
  };

  return (
    <View style={styles.container}>
      {roles.map((item, index) => {
        const isActive = activeRole === item.role;
        const roleColor = getRoleColor(item.role, isActive);
        const icon = getRoleIcon(item.role);
        
        return (
          <TouchableOpacity
            key={index}
            style={[
              styles.roleItem,
              isActive && styles.roleItemActive,
              disabled && styles.roleItemDisabled
            ]}
            onPress={() => handlePress(item)}
            activeOpacity={disabled ? 1 : 0.7}
            disabled={disabled || isActive}
          >
            <View style={[styles.roleIcon, { backgroundColor: `${roleColor}15` }]}>
              <Text style={styles.roleIconText}>{icon}</Text>
            </View>
            <View style={styles.roleContent}>
              <Text style={[styles.roleLabel, isActive && styles.roleLabelActive]}>
                {item.label}
              </Text>
              {item.etablissementNom && (
                <Text style={styles.roleEtablissement}>
                  {item.etablissementNom}
                </Text>
              )}
            </View>
            {isActive ? (
              <CheckCircle2 size={18} color={theme.colors.success.DEFAULT} />
            ) : (
              <Circle size={18} color={theme.colors.neutral[300]} />
            )}
          </TouchableOpacity>
        );
      })}
      
      {/* Message d'aide si plusieurs rôles */}
      {roles.length > 1 && onSelectRole && (
        <Text style={styles.hintText}>
          💡 Cliquez sur un rôle pour l'activer
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  roleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.neutral[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  roleItemActive: {
    backgroundColor: '#EFF6FF',
    borderColor: theme.colors.primary.DEFAULT,
  },
  roleItemDisabled: {
    opacity: 0.6,
  },
  roleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleIconText: {
    fontSize: 20,
  },
  roleContent: {
    flex: 1,
  },
  roleLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.neutral[700],
  },
  roleLabelActive: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '600',
  },
  roleEtablissement: {
    fontSize: 11,
    color: theme.colors.neutral[400],
    marginTop: 2,
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.neutral[400],
  },
  hintText: {
    fontSize: 12,
    color: theme.colors.neutral[400],
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});