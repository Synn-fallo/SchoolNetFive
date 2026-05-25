// constants/theme.ts
// Centralisation des constantes de thème pour l'application SchoolNet

export const colors = {
  // Primaires
  primary: {
    DEFAULT: '#3B82F6',
    dark: '#1E40AF',
    light: '#60A5FA',
    hover: '#2563EB',
  },
  // Secondaires
  secondary: {
    DEFAULT: '#F59E0B',
    dark: '#D97706',
    light: '#FBBF24',
    hover: '#F59E0B',
  },
  // États
  success: {
    DEFAULT: '#10B981',
    dark: '#059669',
    light: '#34D399',
  },
  danger: {
    DEFAULT: '#EF4444',
    dark: '#DC2626',
    light: '#F87171',
  },
  warning: {
    DEFAULT: '#F59E0B',
    dark: '#D97706',
    light: '#FBBF24',
  },
  info: {
    DEFAULT: '#3B82F6',
    dark: '#2563EB',
    light: '#60A5FA',
  },
  // Neutres
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  // Fond et surfaces
  background: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB',
    tertiary: '#F3F4F6',
  },
  // Dégradés
  gradients: {
    primary: ['#3B82F6', '#60A5FA'],
    secondary: ['#F59E0B', '#FBBF24'],
    hero: ['#3B82F6', '#1E40AF'],
    title: ['#3B82F6', '#10B981'],
  },
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  DEFAULT: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  hover: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
};

export const transitions = {
  DEFAULT: 'all 0.2s ease-in-out',
  fast: 'all 0.15s ease-in-out',
  slow: 'all 0.3s ease-in-out',
  scale: 'transform 0.2s ease-in-out',
  opacity: 'opacity 0.2s ease-in-out',
};

export const borderRadius = {
  none: 0,
  sm: 4,
  DEFAULT: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const typography = {
  h1: {
    fontSize: 48,
    fontWeight: '700',
    lineHeight: 56,
  },
  h2: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
  },
  h3: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
  },
  h4: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  },
  button: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
};

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
};

export const theme = {
  colors,
  shadows,
  transitions,
  borderRadius,
  typography,
  spacing,
};

export default theme;