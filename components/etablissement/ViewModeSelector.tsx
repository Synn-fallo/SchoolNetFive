import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LayoutGrid, List, Table } from 'lucide-react-native';
import { ViewMode } from '@/hooks/useEtablissementsViewMode';
import theme from '@/constants/theme';

interface ViewModeSelectorProps {
  viewMode: ViewMode;
  onSelect: (mode: ViewMode) => void;
}

const MODES: { id: ViewMode; label: string; icon: any }[] = [
  { id: 'cards', label: 'Cartes', icon: List },
  { id: 'grid', label: 'Grille', icon: LayoutGrid },
  { id: 'table', label: 'Tableau', icon: Table },
];

export default function ViewModeSelector({ viewMode, onSelect }: ViewModeSelectorProps) {
  return (
    <View style={styles.container}>
      {MODES.map((mode) => {
        const Icon = mode.icon;
        const isActive = viewMode === mode.id;
        return (
          <TouchableOpacity
            key={mode.id}
            style={[styles.button, isActive && styles.buttonActive]}
            onPress={() => onSelect(mode.id)}
            activeOpacity={0.7}
          >
            <Icon size={16} color={isActive ? '#FFFFFF' : theme.colors.neutral[600]} />
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {mode.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background.primary,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    alignSelf: 'flex-start',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  buttonActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.neutral[600],
  },
  labelActive: {
    color: '#FFFFFF',
  },
});