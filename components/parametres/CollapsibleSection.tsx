import React, { useState, useEffect, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import theme from '@/constants/theme';

// Active les animations Layout pour Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CollapsibleSectionProps {
  /** Titre de la section */
  title: string;
  /** Icône (composant Lucide) */
  icon: React.ReactNode;
  /** Badge optionnel (nombre, statut) */
  badge?: number | string;
  /** En-tête supplémentaire (bouton d'action à droite) */
  headerRight?: React.ReactNode;
  /** Contenu de la section */
  children: ReactNode;
  /** La section est-elle ouverte par défaut ? */
  defaultExpanded?: boolean;
  /** Callback quand l'état d'expansion change */
  onExpandChange?: (expanded: boolean) => void;
  /** Est-ce que cette section doit être forcée à se replier ? (pour accordéon) */
  shouldCollapse?: boolean;
}

export default function CollapsibleSection({
  title,
  icon,
  badge,
  headerRight,
  children,
  defaultExpanded = false,
  onExpandChange,
  shouldCollapse = false,
}: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  // Effet pour gérer l'accordéon : quand shouldCollapse devient true, on replie
  useEffect(() => {
    if (shouldCollapse && expanded) {
      setExpanded(false);
      onExpandChange?.(false);
    }
  }, [shouldCollapse]);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const newState = !expanded;
    setExpanded(newState);
    onExpandChange?.(newState);
  };

  return (
    <View style={styles.container}>
      {/* En-tête cliquable */}
      <TouchableOpacity
        style={styles.header}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          {icon}
          <Text style={styles.title}>{title}</Text>
          {badge !== undefined && badge !== null && badge !== 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {typeof badge === 'number' ? (badge > 99 ? '99+' : badge) : badge}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerRight}>
          {headerRight && (
            <View style={styles.headerRightContent}>
              {headerRight}
            </View>
          )}
          {expanded ? (
            <ChevronUp size={20} color={theme.colors.neutral[500]} />
          ) : (
            <ChevronDown size={20} color={theme.colors.neutral[500]} />
          )}
        </View>
      </TouchableOpacity>

      {/* Contenu repliable */}
      {expanded && (
        <View style={styles.content}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  badge: {
    backgroundColor: theme.colors.primary.light + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.primary.DEFAULT,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRightContent: {
    marginRight: 4,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
});
