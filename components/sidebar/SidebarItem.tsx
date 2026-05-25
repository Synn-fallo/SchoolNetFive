import { TouchableOpacity, Text, StyleSheet, View, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import * as LucideIcons from 'lucide-react-native';
import theme from '@/constants/theme';

interface SidebarItemProps {
  icon: string;
  label: string;
  badge?: number;
  active: boolean;
  isOpen: boolean;
  onClick: () => void;
}

export default function SidebarItem({
  icon,
  label,
  badge,
  active,
  isOpen,
  onClick,
}: SidebarItemProps) {
  const opacityAnim = useRef(new Animated.Value(isOpen ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(opacityAnim, {
      toValue: isOpen ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [isOpen]);

  const IconComponent = (LucideIcons as any)[icon] || LucideIcons.HelpCircle;

  const showBadge = badge && badge > 0;
  const badgeStyle = showBadge ? styles.badgeOrange : styles.badge;

  return (
    <TouchableOpacity
      style={[styles.item, active && styles.itemActive]}
      onPress={onClick}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <IconComponent size={20} color={active ? theme.colors.primary.DEFAULT : theme.colors.neutral[500]} />
        {showBadge && (
          <View style={badgeStyle}>
            <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>
      {isOpen && (
        <Animated.Text style={[styles.label, active && styles.labelActive, { opacity: opacityAnim }]}>
          {label}
        </Animated.Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    marginHorizontal: theme.spacing[2],
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing[3],
  },
  itemActive: {
    backgroundColor: theme.colors.primary.light + '20', // #60A5FA avec 20% d'opacité
  },
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  label: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.neutral[600],
    flex: 1,
  },
  labelActive: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: theme.colors.neutral[400],
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeOrange: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: theme.colors.secondary.DEFAULT,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});