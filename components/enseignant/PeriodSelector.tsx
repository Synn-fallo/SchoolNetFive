import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import theme from '@/constants/theme';

export type PeriodeType = 'S1' | 'S2' | 'annuel';

interface PeriodSelectorProps {
  selectedPeriode: PeriodeType;
  onPeriodeChange: (periode: PeriodeType) => void;
  disabledPeriodes?: PeriodeType[];
}

const PERIODES: { label: string; value: PeriodeType }[] = [
  { label: 'Semestre 1', value: 'S1' },
  { label: 'Semestre 2', value: 'S2' },
  { label: 'Annuel', value: 'annuel' },
];

export default function PeriodSelector({ 
  selectedPeriode, 
  onPeriodeChange, 
  disabledPeriodes = [] 
}: PeriodSelectorProps) {
  return (
    <View style={styles.container}>
      {PERIODES.map((periode) => {
        const isActive = selectedPeriode === periode.value;
        const isDisabled = disabledPeriodes.includes(periode.value);
        
        return (
          <TouchableOpacity
            key={periode.value}
            style={[
              styles.button,
              isActive && styles.buttonActive,
              isDisabled && styles.buttonDisabled,
            ]}
            onPress={() => !isDisabled && onPeriodeChange(periode.value)}
            disabled={isDisabled}
          >
            <Text
              style={[
                styles.buttonText,
                isActive && styles.buttonTextActive,
                isDisabled && styles.buttonTextDisabled,
              ]}
            >
              {periode.label}
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
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  buttonActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  buttonDisabled: {
    backgroundColor: '#E5E7EB',
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  buttonTextActive: {
    color: '#FFFFFF',
  },
  buttonTextDisabled: {
    color: '#9CA3AF',
  },
});