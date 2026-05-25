import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertTriangle, Users, ArrowRight } from 'lucide-react-native';

interface PlafondAlertProps {
  currentCount: number;
  plafond: number;
  departement: string;
  onContactClick?: () => void;
}

export default function PlafondAlert({ currentCount, plafond, departement, onContactClick }: PlafondAlertProps) {
  const remaining = plafond - currentCount;
  const isAtRisk = remaining <= 2 && remaining > 0;
  const isFull = remaining === 0;

  if (isFull) {
    return (
      <View style={[styles.container, styles.fullContainer]}>
        <AlertTriangle size={20} color="#EF4444" />
        <View style={styles.content}>
          <Text style={styles.title}>Plafond atteint</Text>
          <Text style={styles.message}>
            Le département {departement} a atteint son quota maximum de {plafond} enseignant(s).
          </Text>
          <TouchableOpacity style={styles.contactButton} onPress={onContactClick}>
            <Text style={styles.contactButtonText}>Contacter le Directeur des Études</Text>
            <ArrowRight size={14} color="#3B82F6" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (isAtRisk) {
    return (
      <View style={[styles.container, styles.warningContainer]}>
        <AlertTriangle size={20} color="#F59E0B" />
        <View style={styles.content}>
          <Text style={styles.title}>Plus que {remaining} place(s) restante(s)</Text>
          <Text style={styles.message}>
            Le département {departement} compte actuellement {currentCount} enseignant(s) sur {plafond}.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, styles.infoContainer]}>
      <Users size={20} color="#3B82F6" />
      <View style={styles.content}>
        <Text style={styles.title}>Plafond du département {departement}</Text>
        <Text style={styles.message}>
          {currentCount} enseignant(s) actuellement, capacité maximum : {plafond}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  fullContainer: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  warningContainer: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  infoContainer: {
    backgroundColor: '#EFF6FF',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  message: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  contactButtonText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
});