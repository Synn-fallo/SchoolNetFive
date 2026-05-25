// /home/project/components/notes/AlertsPanel.tsx
// Panneau d'alertes (notes manquantes, notes basses, période non validée)

import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { AlertCircle, AlertTriangle, Info, CheckCircle, X } from 'lucide-react-native';
import { Alert } from '@/types/notes.types';
import theme from '@/constants/theme';
import { useState } from 'react';

interface AlertsPanelProps {
  alerts: Alert[];
  isSubscribed: boolean;
  onAlertPress?: (alert: Alert) => void;
  onDismiss?: (alertId: string) => void;
}

const getAlertIcon = (type: Alert['type']) => {
  switch (type) {
    case 'error':
      return <AlertCircle size={16} color="#EF4444" />;
    case 'warning':
      return <AlertTriangle size={16} color="#F59E0B" />;
    case 'success':
      return <CheckCircle size={16} color="#10B981" />;
    default:
      return <Info size={16} color="#3B82F6" />;
  }
};

const getAlertBackground = (type: Alert['type']) => {
  switch (type) {
    case 'error':
      return '#FEE2E2';
    case 'warning':
      return '#FEF3C7';
    case 'success':
      return '#D1FAE5';
    default:
      return '#EFF6FF';
  }
};

const getAlertBorder = (type: Alert['type']) => {
  switch (type) {
    case 'error':
      return '#FEE2E2';
    case 'warning':
      return '#FEF3C7';
    case 'success':
      return '#D1FAE5';
    default:
      return '#EFF6FF';
  }
};

export default function AlertsPanel({
  alerts,
  isSubscribed,
  onAlertPress,
  onDismiss,
}: AlertsPanelProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const handleDismiss = (alertId: string) => {
    setDismissedIds(prev => new Set([...prev, alertId]));
    onDismiss?.(alertId);
  };

  const visibleAlerts = alerts.filter(alert => !dismissedIds.has(alert.id));

  // Si pas d'abonnement, afficher une alerte spécifique
  if (!isSubscribed) {
    return (
      <View style={[styles.container, styles.subscriptionAlert]}>
        <View style={styles.alertIconContainer}>
          <AlertCircle size={16} color="#D97706" />
        </View>
        <View style={styles.alertContent}>
          <Text style={styles.alertTitle}>Abonnement requis</Text>
          <Text style={styles.alertMessage}>
            Souscrivez à un abonnement pour accéder aux fonctionnalités complètes de gestion des notes.
          </Text>
        </View>
        <TouchableOpacity style={styles.dismissButton} onPress={() => {}}>
          <X size={16} color="#D97706" />
        </TouchableOpacity>
      </View>
    );
  }

  if (visibleAlerts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Info size={20} color="#9CA3AF" />
        <Text style={styles.emptyText}>Aucune alerte</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {visibleAlerts.map((alert) => (
        <TouchableOpacity
          key={alert.id}
          style={[
            styles.alertCard,
            { backgroundColor: getAlertBackground(alert.type), borderLeftColor: getAlertBorder(alert.type) },
          ]}
          onPress={() => onAlertPress?.(alert)}
          activeOpacity={0.8}
        >
          <View style={styles.alertIconContainer}>
            {getAlertIcon(alert.type)}
          </View>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>{alert.title}</Text>
            <Text style={styles.alertMessage}>{alert.message}</Text>
            {alert.lien && (
              <Text style={styles.alertLink}>Voir détails →</Text>
            )}
          </View>
          <TouchableOpacity style={styles.dismissButton} onPress={() => handleDismiss(alert.id)}>
            <X size={14} color="#6B7280" />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  emptyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 13,
    color: '#6B7280',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
  },
  alertIconContainer: {
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
  alertLink: {
    fontSize: 11,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
    marginTop: 4,
  },
  dismissButton: {
    padding: 4,
  },
  subscriptionAlert: {
    backgroundColor: '#FEF3C7',
    borderLeftColor: '#F59E0B',
  },
});