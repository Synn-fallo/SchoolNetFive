// /home/project/components/enseignant/RapportMigration.tsx
// Sous-composant pour afficher le rapport final de migration

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity
} from 'react-native';
import { Card } from '@/components/Card';
import { CheckCircle, XCircle, AlertCircle, FileText } from 'lucide-react-native';
import theme from '@/constants/theme';

interface RapportMigrationProps {
  rapport: {
    success: boolean;
    evaluations_transferees: number;
    notes_transferees: number;
    notes_ecrasees: number;
    notes_ignorees: number;
    details: Array<{
      evaluation: string;
      statut: string;
      message?: string;
    }>;
  };
  onClose: () => void;
}

export default function RapportMigration({ rapport, onClose }: RapportMigrationProps) {
  const getStatutIcon = (statut: string) => {
    switch (statut) {
      case 'success':
        return <CheckCircle size={16} color="#10B981" />;
      case 'partial':
        return <AlertCircle size={16} color="#F59E0B" />;
      case 'failed':
        return <XCircle size={16} color="#EF4444" />;
      default:
        return <AlertCircle size={16} color="#6B7280" />;
    }
  };

  const getStatutText = (statut: string) => {
    switch (statut) {
      case 'success':
        return 'Succès';
      case 'partial':
        return 'Partiel';
      case 'failed':
        return 'Échec';
      default:
        return 'Inconnu';
    }
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'success':
        return '#10B981';
      case 'partial':
        return '#F59E0B';
      case 'failed':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <FileText size={32} color={rapport.success ? '#10B981' : '#EF4444'} />
        <Text style={styles.title}>
          {rapport.success ? 'Transfert réussi' : 'Transfert partiel'}
        </Text>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{rapport.evaluations_transferees}</Text>
          <Text style={styles.statLabel}>Évaluations transférées</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{rapport.notes_transferees}</Text>
          <Text style={styles.statLabel}>Notes transférées</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, styles.statWarning]}>{rapport.notes_ecrasees}</Text>
          <Text style={styles.statLabel}>Notes écrasées</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, styles.statDanger]}>{rapport.notes_ignorees}</Text>
          <Text style={styles.statLabel}>Notes ignorées</Text>
        </View>
      </View>
      
      <Text style={styles.detailsTitle}>Détails par évaluation :</Text>
      <ScrollView style={styles.detailsList}>
        {rapport.details.map((detail, index) => (
          <View key={index} style={styles.detailRow}>
            {getStatutIcon(detail.statut)}
            <View style={styles.detailInfo}>
              <Text style={styles.detailEvaluation}>{detail.evaluation}</Text>
              {detail.message && (
                <Text style={styles.detailMessage}>{detail.message}</Text>
              )}
            </View>
            <Text style={[styles.detailStatut, { color: getStatutColor(detail.statut) }]}>
              {getStatutText(detail.statut)}
            </Text>
          </View>
        ))}
      </ScrollView>
      
      <TouchableOpacity style={styles.closeButton} onPress={onClose}>
        <Text style={styles.closeButtonText}>Fermer</Text>
      </TouchableOpacity>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    marginBottom: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statItem: {
    alignItems: 'center',
    minWidth: 80,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#10B981',
  },
  statWarning: {
    color: '#F59E0B',
  },
  statDanger: {
    color: '#EF4444',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  detailsList: {
    maxHeight: 300,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailInfo: {
    flex: 1,
  },
  detailEvaluation: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
  },
  detailMessage: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  detailStatut: {
    fontSize: 12,
    fontWeight: '500',
  },
  closeButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});