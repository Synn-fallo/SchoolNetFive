import { View, StyleSheet, ViewProps } from 'react-native';
import theme from '@/constants/theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'bordered';
  borderedTop?: boolean;
  borderedTopColor?: string;
  hoverable?: boolean;
}

export function Card({ 
  children, 
  style, 
  variant = 'default',
  borderedTop = false,
  borderedTopColor,
  hoverable = false,
  ...props 
}: CardProps) {
  const getVariantStyle = () => {
    switch (variant) {
      case 'elevated':
        return styles.elevated;
      case 'bordered':
        return styles.bordered;
      default:
        return styles.default;
    }
  };

  const getBorderTopStyle = () => {
    if (!borderedTop) return {};
    return {
      borderTopWidth: 4,
      borderTopColor: borderedTopColor || theme.colors.primary.DEFAULT,
    };
  };

  return (
    <View 
      style={[
        styles.card,
        getVariantStyle(),
        getBorderTopStyle(),
        hoverable && styles.hoverable,
        style,
      ]} 
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing[4],
    ...theme.shadows.sm,
  },
  default: {
    ...theme.shadows.sm,
  },
  elevated: {
    ...theme.shadows.md,
  },
  bordered: {
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    ...theme.shadows.sm,
  },
  hoverable: {
    transition: theme.transitions.DEFAULT,
  },
});