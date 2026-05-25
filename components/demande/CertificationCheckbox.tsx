import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Check } from 'lucide-react-native';
import theme from '@/constants/theme';

interface CertificationCheckboxProps {
  checked: boolean;
  onToggle: () => void;
  label?: string;
}

export default function CertificationCheckbox({ 
  checked, 
  onToggle, 
  label = "Je certifie sur l'honneur l'exactitude des informations fournies et je m'engage à respecter les conditions générales d'utilisation." 
}: CertificationCheckboxProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onToggle} activeOpacity={0.7}>
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Check size={14} color="#FFFFFF" />}
      </View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: theme.colors.neutral[400],
    backgroundColor: theme.colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary.DEFAULT,
    borderColor: theme.colors.primary.DEFAULT,
  },
  label: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.neutral[700],
    lineHeight: 20,
  },
});