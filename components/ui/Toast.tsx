import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react-native';
import theme from '@/constants/theme';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  visible: boolean;
  message: string;
  type: ToastType;
  duration?: number;
  onHide: () => void;
}

// Création d'un conteneur DOM dédié au toast
let toastPortalRoot: HTMLElement | null = null;

const getToastPortalRoot = () => {
  if (typeof document === 'undefined') return null;
  if (!toastPortalRoot) {
    toastPortalRoot = document.getElementById('toast-portal-root');
    if (!toastPortalRoot) {
      toastPortalRoot = document.createElement('div');
      toastPortalRoot.id = 'toast-portal-root';
      toastPortalRoot.style.position = 'fixed';
      toastPortalRoot.style.top = '0';
      toastPortalRoot.style.left = '0';
      toastPortalRoot.style.right = '0';
      toastPortalRoot.style.bottom = '0';
      toastPortalRoot.style.pointerEvents = 'none';
      toastPortalRoot.style.zIndex = '999999';
      document.body.appendChild(toastPortalRoot);
    }
  }
  return toastPortalRoot;
};

const getIcon = (type: ToastType) => {
  switch (type) {
    case 'success':
      return <CheckCircle size={20} color="#10B981" />;
    case 'error':
      return <XCircle size={20} color="#EF4444" />;
    case 'warning':
      return <AlertCircle size={20} color="#F59E0B" />;
    case 'info':
      return <Info size={20} color="#3B82F6" />;
  }
};

const getBackgroundColor = (type: ToastType) => {
  switch (type) {
    case 'success':
      return '#D1FAE5';
    case 'error':
      return '#FEE2E2';
    case 'warning':
      return '#FEF3C7';
    case 'info':
      return '#EFF6FF';
  }
};

const getTextColor = (type: ToastType) => {
  switch (type) {
    case 'success':
      return '#065F46';
    case 'error':
      return '#991B1B';
    case 'warning':
      return '#92400E';
    case 'info':
      return '#1E40AF';
  }
};

export default function Toast({ visible, message, type, duration = 3000, onHide }: ToastProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-50)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        handleHide();
      }, duration);
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -50,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [visible]);

  const handleHide = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
    });
  };

  if (!visible && fadeAnim._value === 0) {
    return null;
  }

  const backgroundColor = getBackgroundColor(type);
  const textColor = getTextColor(type);
  const Icon = getIcon(type);
  const portalRoot = getToastPortalRoot();

  if (!portalRoot) return null;

  const toastContent = (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          backgroundColor,
        },
      ]}
    >
      <View style={styles.content}>
        {Icon}
        <Text style={[styles.message, { color: textColor }]}>{message}</Text>
      </View>
      <TouchableOpacity onPress={handleHide} style={styles.closeButton}>
        <X size={16} color={textColor} />
      </TouchableOpacity>
    </Animated.View>
  );

  return createPortal(toastContent, portalRoot);
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'fixed',
    top: 200, // ← AUGMENTÉ pour passer sous le header
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 9999999,
    zIndex: 9999999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
});