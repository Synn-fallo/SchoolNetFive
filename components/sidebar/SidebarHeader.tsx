import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Menu, Building2, User } from 'lucide-react-native';
import theme from '@/constants/theme';

interface SidebarHeaderProps {
  isOpen: boolean;
  onToggle: () => void;
  userName?: string;
  userRole?: string;
  etablissementNom?: string;
  isChef?: boolean;
}

export default function SidebarHeader({
  isOpen,
  onToggle,
  userName,
  userRole,
  etablissementNom,
  isChef = false,
}: SidebarHeaderProps) {
  const displayName = userName || 'Utilisateur';
  const displayRole = userRole || 'Visiteur';

  if (!isOpen) {
    return (
      <View style={styles.collapsedContainer}>
        <TouchableOpacity style={styles.collapsedToggle} onPress={onToggle}>
          <Menu size={20} color={theme.colors.neutral[600]} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerTop}>
        <TouchableOpacity style={styles.toggleButton} onPress={onToggle}>
          <Menu size={20} color={theme.colors.neutral[600]} />
        </TouchableOpacity>
      </View>

      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          <User size={20} color="#FFFFFF" />
        </View>
        <View style={styles.userTextContainer}>
          <Text style={styles.userName} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.userRole} numberOfLines={1}>
            {displayRole}
          </Text>
        </View>
      </View>

      {isChef && etablissementNom && (
        <>
          <View style={styles.divider} />
          <View style={styles.etablissementInfo}>
            <Building2 size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.etablissementName} numberOfLines={1}>
              {etablissementNom}
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[6],
    paddingBottom: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  collapsedContainer: {
    alignItems: 'center',
    paddingVertical: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  collapsedToggle: {
    padding: theme.spacing[2],
  },
  headerTop: {
    alignItems: 'flex-end',
    marginBottom: theme.spacing[4],
  },
  toggleButton: {
    padding: theme.spacing[1],
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
    marginBottom: theme.spacing[2],
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userTextContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.neutral[800],
    marginBottom: 2,
  },
  userRole: {
    fontSize: 12,
    color: theme.colors.neutral[500],
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.neutral[200],
    marginVertical: theme.spacing[3],
  },
  etablissementInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
  },
  etablissementName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.neutral[700],
  },
});