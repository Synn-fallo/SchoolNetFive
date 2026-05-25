// /home/project/components/notes/SyntheseTab.tsx
// Onglet Synthèse – Statistiques générales, alertes, moyennes par classe
// PHASE 2 : Migration des données existantes

import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import StatsGeneralesCard from './StatsGeneralesCard';
import AlertsCard from './AlertsCard';
import MoyennesClasseTable from './MoyennesClasseTable';
import { ClasseStats, Alert as AlertType } from '@/types/notes.types';

interface SyntheseTabProps {
  classesStats: ClasseStats[];
  statsGenerales: {
    moyenneEtablissement: number;
    tauxReussite: number;
    meilleureClasse: { nom: string; moyenne: number };
    plusFaibleClasse: { nom: string; moyenne: number };
  };
  alertes: AlertType[];
  selectedClasseId: string | null;
  onSelectClasse: (classeId: string, classeNom: string) => void;
  isSubscribed: boolean;
  loading: boolean;
}

export default function SyntheseTab({
  classesStats,
  statsGenerales,
  alertes,
  selectedClasseId,
  onSelectClasse,
  isSubscribed,
  loading,
}: SyntheseTabProps) {
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Chargement des données...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Statistiques générales */}
      <StatsGeneralesCard
        moyenneEtablissement={statsGenerales.moyenneEtablissement}
        tauxReussite={statsGenerales.tauxReussite}
        meilleureClasse={statsGenerales.meilleureClasse}
        plusFaibleClasse={statsGenerales.plusFaibleClasse}
        isSubscribed={isSubscribed}
      />

      {/* Alertes */}
      <AlertsCard alerts={alertes} isSubscribed={isSubscribed} />

      {/* Tableau des moyennes par classe */}
      <MoyennesClasseTable
        data={classesStats}
        onSelectClasse={onSelectClasse}
        isSubscribed={isSubscribed}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
});