// /home/project/components/notes/PilotageTab.tsx
// Onglet Pilotage – Gestion des périodes (ouverture/fermeture), exports, rapports
// Version alignée avec la table periodes_validation (periode_id)

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { PeriodStatus } from '@/types/notes.types';
import { ExportOptions } from '@/types/export.types';
import ValidationPeriodesCard from './ValidationPeriodesCard';
import ExportsCard from './ExportsCard';
import RapportPeriodeModal from './RapportPeriodeModal';
import TableauHonneurModal from './TableauHonneurModal';
import ExportOptionsModal from './ExportOptionsModal';

interface PilotageTabProps {
  selectedPeriodeId: string;
  selectedPeriodeLabel: string;
  periodStatus: PeriodStatus;
  onOpen: (periodeId: string, periodeLibelle: string) => Promise<boolean>;
  onClose: (periodeId: string, periodeLibelle: string) => Promise<boolean>;
  onExport: (periodeId: string, periodeLabel: string, format: 'pdf' | 'excel', options?: Partial<ExportOptions>) => Promise<void>;
  onExportClasse: (classeId: string, format: 'pdf' | 'excel', options?: Partial<ExportOptions>) => Promise<void>;
  onExportMatiere: (matiereId: string, format: 'pdf' | 'excel', options?: Partial<ExportOptions>) => Promise<void>;
  onGenerateRapport: (params: any) => Promise<void>;
  onGenerateTableauHonneur: (params: any) => Promise<void>;
  onSendAlerte: (message: string, type: string) => Promise<void>;
  isSubscribed: boolean;
  etablissementId: string;
  anneeScolaireId: string;
  anneeScolaireLibelle: string;
  etablissementNom: string;
  classes: { id: string; nom: string }[];
  matieres: { id: string; nom: string }[];
  plan?: string | null;
  getPreviewData: (params: any) => Promise<any>;
  onPreview?: (options: ExportOptions) => Promise<string | null>;
}

export default function PilotageTab({
  selectedPeriodeId,
  selectedPeriodeLabel,
  periodStatus,
  onOpen,
  onClose,
  onExport,
  onExportClasse,
  onExportMatiere,
  onGenerateRapport,
  onGenerateTableauHonneur,
  onSendAlerte,
  isSubscribed,
  etablissementId,
  anneeScolaireId,
  anneeScolaireLibelle,
  etablissementNom,
  classes,
  matieres,
  plan,
  getPreviewData,
  onPreview,
}: PilotageTabProps) {
  const [rapportModalVisible, setRapportModalVisible] = useState(false);
  const [tableauModalVisible, setTableauModalVisible] = useState(false);
  const [exportOptionsVisible, setExportOptionsVisible] = useState(false);
  const [exportOptionsType, setExportOptionsType] = useState<'classe' | 'matiere' | 'periode'>('periode');
  const [exportOptionsId, setExportOptionsId] = useState<string | undefined>();
  const [exportOptionsNom, setExportOptionsNom] = useState<string | undefined>();

  // DEBUG: Vérifier les props reçues à chaque changement
  useEffect(() => {
    console.log('🔍 [PilotageTab] selectedPeriodeId reçu:', selectedPeriodeId);
    console.log('🔍 [PilotageTab] selectedPeriodeLabel reçu:', selectedPeriodeLabel);
  }, [selectedPeriodeId, selectedPeriodeLabel]);

  const handleOpenRapportModal = () => {
    if (!isSubscribed) {
      Alert.alert('Abonnement requis', 'La génération de rapport nécessite un abonnement actif.');
      return;
    }
    setRapportModalVisible(true);
  };

  const handleOpenTableauModal = () => {
    if (!isSubscribed) {
      Alert.alert('Abonnement requis', 'La génération du tableau d\'honneur nécessite un abonnement actif.');
      return;
    }
    setTableauModalVisible(true);
  };

  const handleOpenExportOptions = (type: 'classe' | 'matiere' | 'periode', id?: string, nom?: string) => {
    setExportOptionsType(type);
    setExportOptionsId(id);
    setExportOptionsNom(nom);
    setExportOptionsVisible(true);
  };

  const handleExportWithOptions = (options: ExportOptions) => {
    if (exportOptionsType === 'classe' && exportOptionsId) {
      onExportClasse(exportOptionsId, options.format === 'excel' ? 'excel' : 'pdf', options);
    } else if (exportOptionsType === 'matiere' && exportOptionsId) {
      onExportMatiere(exportOptionsId, options.format === 'excel' ? 'excel' : 'pdf', options);
    } else if (exportOptionsType === 'periode') {
      onExport(selectedPeriodeId, selectedPeriodeLabel, options.format === 'excel' ? 'excel' : 'pdf', options);
    }
    setExportOptionsVisible(false);
  };

  // DEBUG: Afficher les props reçues avant le rendu
  console.log('🔍 [PilotageTab] selectedPeriodeId:', selectedPeriodeId);
  console.log('🔍 [PilotageTab] selectedPeriodeLabel:', selectedPeriodeLabel);
  console.log('🔍 [PilotageTab] periodStatus:', periodStatus);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Validation des périodes – avec les nouvelles props */}
      <ValidationPeriodesCard
        etablissementId={etablissementId}
        anneeScolaireId={anneeScolaireId}
        selectedPeriodeId={selectedPeriodeId}
        selectedPeriodeLabel={selectedPeriodeLabel}
        periodStatus={periodStatus}
        onOpen={onOpen}
        onClose={onClose}
        onExport={onExport}
        isSubscribed={isSubscribed}
      />

      {/* Exports avec options */}
      <ExportsCard
        onExportClasse={onExportClasse}
        onExportMatiere={onExportMatiere}
        onExportPeriode={onExport}
        onOpenOptions={handleOpenExportOptions}
        classes={classes}
        matieres={matieres}
        selectedPeriodeId={selectedPeriodeId}
        selectedPeriodeLabel={selectedPeriodeLabel}
        isSubscribed={isSubscribed}
        etablissementId={etablissementId}
        anneeScolaireId={anneeScolaireId}
        getPreviewData={getPreviewData}
      />

      {/* Actions principales */}
      <View style={styles.actionsContainer}>
        <Text style={styles.sectionTitle}>📋 Rapports et documents</Text>

        <TouchableOpacity
          style={[styles.actionButton, !isSubscribed && styles.actionButtonDisabled]}
          onPress={handleOpenRapportModal}
          disabled={!isSubscribed}
        >
          <Text style={styles.actionButtonText}>📊 Rapport de fin de période</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.secondaryButton, !isSubscribed && styles.actionButtonDisabled]}
          onPress={handleOpenTableauModal}
          disabled={!isSubscribed}
        >
          <Text style={styles.actionButtonText}>🏆 Tableau d'honneur</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.alertButton, !isSubscribed && styles.actionButtonDisabled]}
          onPress={() => onSendAlerte('', '')}
          disabled={!isSubscribed}
        >
          <Text style={styles.actionButtonText}>📧 Envoyer une alerte aux enseignants</Text>
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <RapportPeriodeModal
        visible={rapportModalVisible}
        onClose={() => setRapportModalVisible(false)}
        onGenerate={onGenerateRapport}
        etablissementId={etablissementId}
        anneeScolaireId={anneeScolaireId}
        periodeLabel={selectedPeriodeLabel}
        classes={classes}
        isSubscribed={isSubscribed}
      />

      <TableauHonneurModal
        visible={tableauModalVisible}
        onClose={() => setTableauModalVisible(false)}
        onGenerate={onGenerateTableauHonneur}
        etablissementId={etablissementId}
        anneeScolaireId={anneeScolaireId}
        periodeLabel={selectedPeriodeLabel}
        classes={classes}
        isSubscribed={isSubscribed}
      />

      <ExportOptionsModal
        visible={exportOptionsVisible}
        onClose={() => setExportOptionsVisible(false)}
        onExport={handleExportWithOptions}
        onPreview={onPreview}
        etablissementId={etablissementId}
        periodeLabel={selectedPeriodeLabel}
        anneeScolaireLibelle={anneeScolaireLibelle}
        etablissementNom={etablissementNom}
        isSubscribed={isSubscribed}
        plan={plan}
        defaultClasseId={exportOptionsType === 'classe' ? exportOptionsId : undefined}
        defaultClasseNom={exportOptionsType === 'classe' ? exportOptionsNom : undefined}
        defaultMatiereId={exportOptionsType === 'matiere' ? exportOptionsId : undefined}
        defaultMatiereNom={exportOptionsType === 'matiere' ? exportOptionsNom : undefined}
        type={exportOptionsType}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  actionsContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  actionButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  secondaryButton: {
    backgroundColor: '#8B5CF6',
  },
  alertButton: {
    backgroundColor: '#F59E0B',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});