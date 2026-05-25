import { View, Text, StyleSheet } from 'react-native';
import theme from '@/constants/theme';

interface SidebarSectionProps {
  title: string;
  isOpen: boolean;
  children: React.ReactNode;
}

export default function SidebarSection({ title, isOpen, children }: SidebarSectionProps) {
  if (!isOpen) {
    return <View style={styles.container}>{children}</View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.childrenContainer}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing[2],
  },
  title: {
    fontSize: theme.typography.caption.fontSize,
    fontWeight: '600',
    color: theme.colors.neutral[400],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[2],
  },
  childrenContainer: {
    marginTop: theme.spacing[1],
  },
});