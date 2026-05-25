// /home/project/components/enseignant/ClasseDetailModal.tsx
// Modal d'affichage des détails d'une classe officielle
// Avec affichage des matières

import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { Building2, Users, GraduationCap, X, Eye, BookOpen } from 'lucide-react-native';
import { Card } from '@/components/Card';
import theme from '@/constants/theme';

interface ClasseDetailModalProps {
  visible: boolean;
  classe: {
    id: string;
    nom: string;
    niveau: string;
    effectif: number;
    etablissement_nom: string;
    enseignant_principal_nom?: string;
    matieres?: Array<{ id: string; nom: string; coefficient: number }>;
  } | null;
  onClose: () => void;
  onVoirEleves: () => void;
}

export default function ClasseDetailModal({ visible, classe, onClose, onVoirEleves }: ClasseDetailModalProps) {
  if (!classe) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Détails de la classe</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            <Card style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Building2 size={20} color={theme.colors.primary.DEFAULT} />
                <Text style={styles.infoLabel}>Classe</Text>
                <Text style={styles.infoValue}>{classe.nom}</Text>
              </View>
              
              {classe.niveau && classe.niveau !== 'Non spécifié' && (
                <View style={styles.infoRow}>
                  <GraduationCap size={20} color={theme.colors.primary.DEFAULT} />
                  <Text style={styles.infoLabel}>Niveau</Text>
                  <Text style={styles.infoValue}>{classe.niveau}</Text>
                </View>
              )}
              
              <View style={styles.infoRow}>
                <Users size={20} color={theme.colors.primary.DEFAULT} />
                <Text style={styles.infoLabel}>Effectif</Text>
                <Text style={styles.infoValue}>{classe.effectif} élèves</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Building2 size={20} color={theme.colors.primary.DEFAULT} />
                <Text style={styles.infoLabel}>Établissement</Text>
                <Text style={styles.infoValue}>{classe.etablissement_nom}</Text>
              </View>
              
              {classe.enseignant_principal_nom && (
                <View style={styles.infoRow}>
                  <GraduationCap size={20} color={theme.colors.primary.DEFAULT} />
                  <Text style={styles.infoLabel}>Professeur principal</Text>
                  <Text style={styles.infoValue}>{classe.enseignant_principal_nom}</Text>
                </View>
              )}
            </Card>

            {/* Section Matières */}
            <Card style={styles.matieresCard}>
              <View style={styles.matieresHeader}>
                <BookOpen size={18} color={theme.colors.primary.DEFAULT} />
                <Text style={styles.matieresTitle}>Matières enseignées</Text>
              </View>
              
              {classe.matieres && classe.matieres.length > 0 ? (
                classe.matieres.map((matiere) => (
                  <View key={matiere.id} style={styles.matiereRow}>
                    <Text style={styles.matiereNom}>{matiere.nom}</Text>
                    <View style={styles.matiereCoefBadge}>
                      <Text style={styles.matiereCoefText}>Coef {matiere.coefficient}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyMatieresText}>Aucune matière définie pour cet établissement</Text>
              )}
            </Card>

            <TouchableOpacity style={styles.actionButton} onPress={onVoirEleves}>
              <Users size={18} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Voir la liste des élèves</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  infoCard: {
    padding: 16,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    flex: 2,
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  matieresCard: {
    padding: 16,
    marginBottom: 20,
  },
  matieresHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  matieresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  matiereRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  matiereNom: {
    fontSize: 14,
    color: '#1F2937',
  },
  matiereCoefBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  matiereCoefText: {
    fontSize: 11,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  emptyMatieresText: {
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingVertical: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 14,
    borderRadius: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});