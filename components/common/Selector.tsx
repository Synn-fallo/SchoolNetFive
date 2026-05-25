// /home/project/components/common/Selector.tsx
// Composant bouton sélecteur réutilisable

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import theme from '@/constants/theme';

interface SelectorProps {
  label: string;
  value: string;
  onPress: () => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function Selector({
  label,
  value,
  onPress,
  placeholder = 'Sélectionner une option',
  required = false,
  disabled = false,
}: SelectorProps) {
  return (
    <View style={styles.selectorContainer}>
      <Text style={styles.selectorLabel}>
        {label} {required && <Text style={styles.required}>*</Text>}
      </Text>
      <TouchableOpacity
        style={[styles.selector, disabled && styles.selectorDisabled]}
        onPress={onPress}
        disabled={disabled}
      >
        <Text style={[styles.selectorText, !value && styles.selectorPlaceholder]}>
          {value || placeholder}
        </Text>
        <ChevronDown size={18} color={disabled ? '#9CA3AF' : '#6B7280'} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  selectorContainer: {
    marginBottom: 16,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  required: {
    color: '#EF4444',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  selectorDisabled: {
    backgroundColor: '#F3F4F6',
    opacity: 0.7,
  },
  selectorText: {
    fontSize: 14,
    color: '#1F2937',
  },
  selectorPlaceholder: {
    color: '#9CA3AF',
  },
});