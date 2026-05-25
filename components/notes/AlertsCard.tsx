// /home/project/components/notes/AlertsCard.tsx
// Carte des alertes (notes basses, notes manquantes, classes sans notes)

import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertCircle, AlertTriangle, Info, Bell, Send } from 'lucide-react-native';
import { Alert as AlertType } from '@/types/notes.types';

interface AlertsCardProps {
  alerts: AlertType[];
  isSubscribed: boolean;
  onSendAlert?: (alertId: string) => void;
}

const getAlertIcon = (type: AlertType['type']) => {
  switch (type) {
    case 'error':
      return <AlertCircle size={18} color="#EF4444" />;
    case 'warning':
      return <AlertTriangle size={18} color="#F59E0B" />;
    default:
      return <Info size={18} color="#3B82F6" />;
  }
};

const getAlertBackground = (type: AlertType['type']) => {
  switch (type) {
    case 'error':
      return '#FEE2E2';
    case 'warning':
      return '#FEF3C7';
    default:
      return '#EFF6FF';
  }
};

const getAlertBorder = (type: AlertType['type']) => {
  switch (type) {
    case 'error':
      return '#FECACA';
    case 'warning':
      return '#FDE68A';
    default:
      return '#BFDBFE';
  }
};

export default function AlertsCard({ alerts, isSubscribed, onSendAlert }: AlertsCardProps) {
  if (!isSubscribed) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>⚠️ Alertes</Text>
        <Text style={styles.disabledText}>🔒 Abonnement requis pour voir les alertes</Text>
      </View>
    );
  }

  if (alerts.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>⚠️ Alertes</Text>
        <View style={styles.emptyContainer}>
          <Bell size={24} color="#9CA3AF" />
          <Text style={styles.emptyText}>Aucune alerte</Text>
          <Text style={styles.emptySubtext}>Toutes les notes sont conformes</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⚠️ Alertes</Text>
      {alerts.map((alert) => (
        <View
          key={alert.id}
          style={[
            styles.alertItem,
            { backgroundColor: getAlertBackground(alert.type), borderLeftColor: getAlertBorder(alert.type) },
          ]}
        >
          <View style={styles.alertIcon}>{getAlertIcon(alert.type)}</View>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>{alert.title}</Text>
            <Text style={styles.alertMessage}>{alert.message}</Text>
          </View>
          {onSendAlert && (
            <TouchableOpacity style={styles.sendButton} onPress={() => onSendAlert(alert.id)}>
              <Send size={14} color="#3B82F6" />
              <Text style={styles.sendText}>Notifier</Text>
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  alertIcon: {
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  alertMessage: {
    fontSize: 12,
    color: '#4B5563',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sendText: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#D1D5DB',
    marginTop: 4,
  },
  disabledText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 20,
  },
});