import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { useRef } from 'react';
import theme from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'secondary-outline';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!isDisabled) {
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        useNativeDriver: true,
        speed: 50,
      }).start();
    }
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
    }).start();
  };

  const getVariantStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primary;
      case 'secondary':
        return styles.secondary;
      case 'outline':
        return styles.outline;
      case 'danger':
        return styles.danger;
      case 'success':
        return styles.success;
      case 'secondary-outline':
        return styles.secondaryOutline;
      default:
        return styles.primary;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'outline':
        return styles.outlineText;
      case 'secondary-outline':
        return styles.secondaryOutlineText;
      default:
        return styles.text;
    }
  };

  const getSpinnerColor = () => {
    switch (variant) {
      case 'outline':
      case 'secondary-outline':
        return theme.colors.primary.DEFAULT;
      default:
        return '#FFFFFF';
    }
  };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.button,
          getVariantStyle(),
          fullWidth && styles.fullWidth,
          isDisabled && styles.disabled,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={isDisabled}
        activeOpacity={0.9}
      >
        {loading ? (
          <ActivityIndicator color={getSpinnerColor()} />
        ) : (
          <>
            {icon && <View style={styles.iconContainer}>{icon}</View>}
            <Text style={getTextStyle()}>{title}</Text>
          </>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing[6],
    paddingVertical: theme.spacing[3.5],
    borderRadius: theme.borderRadius.DEFAULT,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    gap: theme.spacing[2],
  },
  fullWidth: {
    width: '100%',
  },
  primary: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  secondary: {
    backgroundColor: theme.colors.neutral[500],
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.primary.DEFAULT,
  },
  danger: {
    backgroundColor: theme.colors.danger.DEFAULT,
  },
  success: {
    backgroundColor: theme.colors.success.DEFAULT,
  },
  secondaryOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: theme.colors.secondary.DEFAULT,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: '#FFFFFF',
    fontSize: theme.typography.button.fontSize,
    fontWeight: theme.typography.button.fontWeight as any,
    lineHeight: theme.typography.button.lineHeight,
  },
  outlineText: {
    color: theme.colors.primary.DEFAULT,
    fontSize: theme.typography.button.fontSize,
    fontWeight: theme.typography.button.fontWeight as any,
    lineHeight: theme.typography.button.lineHeight,
  },
  secondaryOutlineText: {
    color: theme.colors.secondary.DEFAULT,
    fontSize: theme.typography.button.fontSize,
    fontWeight: theme.typography.button.fontWeight as any,
    lineHeight: theme.typography.button.lineHeight,
  },
  iconContainer: {
    marginRight: theme.spacing[2],
  },
});