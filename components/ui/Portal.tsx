import { ReactNode, useRef } from 'react';
import { createPortal } from 'react-dom';
import { View, StyleSheet } from 'react-native';

interface PortalProps {
  children: ReactNode;
  isVisible: boolean;
}

// Création synchrone du conteneur (une seule fois)
let portalRoot: HTMLElement | null = null;

if (typeof document !== 'undefined' && !portalRoot) {
  const root = document.createElement('div');
  root.id = 'toast-portal-root';
  root.style.position = 'fixed';
  root.style.top = '0';
  root.style.left = '0';
  root.style.right = '0';
  root.style.bottom = '0';
  root.style.pointerEvents = 'none';
  root.style.zIndex = '999999';
  document.body.appendChild(root);
  portalRoot = root;
}

export default function Portal({ children, isVisible }: PortalProps) {
  const ref = useRef(portalRoot);

  if (!isVisible || typeof document === 'undefined' || !ref.current) {
    return null;
  }

  return createPortal(
    <View style={styles.portalContainer} pointerEvents="box-none">
      {children}
    </View>,
    ref.current
  );
}

const styles = StyleSheet.create({
  portalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
  },
});