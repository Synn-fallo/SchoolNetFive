// /home/project/components/notes/EleveDetailModal.tsx
// Modale d'historique des notes d'un élève
// Version avec intégration de l'éligibilité

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Alert, ActivityIndicator } from 'react-native';
import { X, FileText, Download, Share2, Printer, AlertTriangle } from 'lucide-react-native';
import { EleveWithMoyenne } from '@/types/notes.types';
import { useEligibiliteEleve } from '@/hooks/useEligibilite';
import theme from '@/constants/theme';

interface EleveDetailModalProps {
  eleve: EleveWithMoyenne;
  classeNom: string;
  anneeScolaireId: string | null;
  onClose: () => void;
  onGenerateBulletin: (eleveId: string) => Promise<void>;
}

export default function EleveDetailModal({
  eleve,
  classeNom,
  anneeScolaireId,
  onClose,
  onGenerateBulletin,
}: EleveDetailModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  
  const {
    eligible,
    motifs,
    loading: eligibiliteLoading,
    refresh: refreshEligibilite,
  } = useEligibiliteEleve(eleve.id, anneeScolaireId);

  const handleGenerateBulletin = async () => {
    // Vérifier l'éligibilité avant génération
    if (!eligible) {
      const motifsText = motifs.map(m => `• ${m}`).join('\n');
      Alert.alert(
        'Génération impossible',
        `${eleve.prenom} ${eleve.nom} n'est pas éligible à la génération du bulletin.\n\nMotif(s) :\n${motifsText}\n\nVeuillez régulariser sa situation avant de générer le bulletin.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setIsGenerating(true);
    try {
      await onGenerateBulletin(eleve.id);
      Alert.alert('Succès', `Bulletin généré avec succès pour ${eleve.prenom} ${eleve.nom}`);
    } catch (error) {
      console.error('Error generating bulletin:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de la génération du bulletin');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Résultats de ${eleve.prenom} ${eleve.nom} - ${classeNom}\nMoyenne: ${eleve.moyenne.toFixed(2)}/20\nRang: ${eleve.rang}\nAppréciation: ${eleve.appreciation}`,
        title: `Résultats - ${eleve.nom}`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const getAppreciationColor = (appreciation: string): string => {
    switch (appreciation) {
      case 'Excellent':
        return '#10B981';
      case 'Bien':
        return '#3B82F6';
      case 'Assez bien':
        return '#F59E0B';
      case 'Passable':
        return '#F97316';
      default:
        return '#EF4444';
    }
  };

  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Détail de l'élève</Text>
          <Text style={styles.subtitle}>{classeNom}</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <X size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Bandeau d'éligibilité */}
        {!eligibiliteLoading && !eligible && (
          <View style={styles.ineligibilityBanner}>
            <AlertTriangle size={20} color="#D97706" />
            <View style={styles.ineligibilityTextContainer}>
              <Text style={styles.ineligibilityTitle}>Élève non éligible</Text>
              <Text style={styles.ineligibilityText}>
                Ce bulletin ne peut pas être généré pour le moment.
              </Text>
              {motifs.length > 0 && (
                <Text style={styles.ineligibilityMotifs}>
                  {motifs.map(m => `• ${m}`).join('\n')}
                </Text>
              )}
            </View>
          </View>
        )}

        {eligibiliteLoading && (
          <View style={styles.loadingBanner}>
            <ActivityIndicator size="small" color={theme.colors.primary.DEFAULT} />
            <Text style={styles.loadingBannerText}>Vérification de l'éligibilité...</Text>
          </View>
        )}

        {/* Informations élève */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nom complet :</Text>
            <Text style={styles.infoValue}>{eleve.prenom} {eleve.nom}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Matricule :</Text>
            <Text style={styles.infoValue}>{eleve.matricule}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Matricule SNET :</Text>
            <Text style={styles.infoValue}>{eleve.matricule_snet || 'Non renseigné'}</Text>
          </View>
        </View>

        {/* Résultats */}
        <View style={styles.resultsCard}>
          <Text style={styles.resultsTitle}>Résultats</Text>
          <View style={styles.resultsGrid}>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Moyenne générale</Text>
              <Text style={[styles.resultValue, { color: eleve.moyenne >= 10 ? '#10B981' : '#EF4444' }]}>
                {eleve.moyenne.toFixed(2)}/20
              </Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Rang</Text>
              <Text style={styles.resultValue}>{eleve.rang}</Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Appréciation</Text>
              <Text style={[styles.resultValue, { color: getAppreciationColor(eleve.appreciation) }]}>
                {eleve.appreciation}
              </Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Nombre de notes</Text>
              <Text style={styles.resultValue}>{eleve.notesCount}</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsCard}>
          <Text style={styles.actionsTitle}>Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={[
                styles.actionButton, 
                isGenerating && styles.actionButtonDisabled,
                !eligible && !eligibiliteLoading && styles.actionButtonBlocked
              ]} 
              onPress={handleGenerateBulletin}
              disabled={isGenerating || (!eligible && !eligibiliteLoading)}
            >
              {isGenerating ? (
                <>
                  <ActivityIndicator size="small" color={theme.colors.primary.DEFAULT} />
                  <Text style={styles.actionText}>Génération...</Text>
                </>
              ) : (
                <>
                  <FileText size={18} color={!eligible && !eligibiliteLoading ? '#9CA3AF' : '#3B82F6'} />
                  <Text style={[styles.actionText, !eligible && !eligibiliteLoading && styles.actionTextBlocked]}>
                    Générer bulletin
                  </Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Share2 size={18} color="#3B82F6" />
              <Text style={styles.actionText}>Partager</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Note sur le bulletin */}
        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>📄 Bulletin officiel</Text>
          <Text style={styles.noteText}>
            Le bulletin officiel sera généré au format A4V (portrait) avec :
            {'\n'}• Tableau des notes par matière
            {'\n'}• Moyenne générale et rang
            {'\n'}• Décision du conseil de classe
            {'\n'}• Appréciations du professeur principal et du chef
            {'\n'}• Signatures (PP, Chef, Élève, Parents)
            {'\n'}• Code QR de vérification
          </Text>
        </View>
      </ScrollView>

      {/* Pied de page */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={[
            styles.printButton, 
            isGenerating && styles.printButtonDisabled,
            !eligible && !eligibiliteLoading && styles.printButtonBlocked
          ]} 
          onPress={handleGenerateBulletin}
          disabled={isGenerating || (!eligible && !eligibiliteLoading)}
        >
          {isGenerating ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.printButtonText}>Génération en cours...</Text>
            </>
          ) : (
            <>
              <Printer size={18} color="#FFFFFF" />
              <Text style={styles.printButtonText}>Imprimer / PDF</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  ineligibilityBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  ineligibilityTextContainer: {
    flex: 1,
  },
  ineligibilityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D97706',
    marginBottom: 4,
  },
  ineligibilityText: {
    fontSize: 13,
    color: '#92400E',
    marginBottom: 8,
  },
  ineligibilityMotifs: {
    fontSize: 12,
    color: '#92400E',
    fontStyle: 'italic',
  },
  loadingBanner: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingBannerText: {
    fontSize: 13,
    color: theme.colors.primary.DEFAULT,
  },
  infoCard: {
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
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    width: 120,
    fontSize: 13,
    color: '#6B7280',
  },
  infoValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
  },
  resultsCard: {
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
  resultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  resultsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  resultItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  resultValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  actionsCard: {
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
  actionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonBlocked: {
    backgroundColor: '#F3F4F6',
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#3B82F6',
  },
  actionTextBlocked: {
    color: '#9CA3AF',
  },
  noteCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  noteTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D97706',
    marginBottom: 8,
  },
  noteText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  printButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 14,
    borderRadius: 12,
  },
  printButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  printButtonBlocked: {
    backgroundColor: '#D1D5DB',
  },
  printButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});