import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/Button';
import theme from '@/constants/theme';
import { Search, Filter, Eye, Clock, AlertTriangle, CheckCircle } from 'lucide-react-native';

// Données mockées
const MOCK_SUIVI_COURS = [
  {
    id: '1',
    enseignant: 'KOFFI Mathieu',
    matiere: 'Mathématiques',
    classe: '3e B',
    prevues: 20,
    declarees: 20,
    ecart: 0,
    statut: 'Normal',
    derniereDeclaration: '2026-04-26',
    details: [
      { date: '2026-04-26', horaire: '08h-10h', duree: '2h', contenu: 'Équations du second degré' },
      { date: '2026-04-25', horaire: '10h-12h', duree: '2h', contenu: 'Factorisation' },
    ],
  },
  {
    id: '2',
    enseignant: 'ALIMI Fatou',
    matiere: 'Physique',
    classe: '4e A',
    prevues: 18,
    declarees: 24,
    ecart: 6,
    statut: 'Suspect',
    derniereDeclaration: '2026-04-26',
    details: [
      { date: '2026-04-26', horaire: '10h-12h', duree: '2h', contenu: 'Électricité' },
      { date: '2026-04-25', horaire: '14h-16h', duree: '2h', contenu: 'Magnétisme' },
      { date: '2026-04-24', horaire: '08h-10h', duree: '2h', contenu: 'Circuits' },
    ],
  },
  {
    id: '3',
    enseignant: 'ADJOVI Koffi',
    matiere: 'Français',
    classe: '2nde A',
    prevues: 22,
    declarees: 18,
    ecart: -4,
    statut: 'Attention',
    derniereDeclaration: '2026-04-24',
    details: [
      { date: '2026-04-24', horaire: '08h-10h', duree: '2h', contenu: 'La poésie' },
    ],
  },
];

export default function SuiviCoursScreen() {
  const { user, profile, activeEtablissement } = useAuth();
  const [selectedEnseignant, setSelectedEnseignant] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterStatut, setFilterStatut] = useState<string | null>(null);

  const filteredData = MOCK_SUIVI_COURS.filter(item => {
    const matchSearch = searchText === '' || 
      item.enseignant.toLowerCase().includes(searchText.toLowerCase()) ||
      item.matiere.toLowerCase().includes(searchText.toLowerCase()) ||
      item.classe.toLowerCase().includes(searchText.toLowerCase());
    const matchStatut = !filterStatut || item.statut === filterStatut;
    return matchSearch && matchStatut;
  });

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'Normal': return theme.colors.success.DEFAULT;
      case 'Suspect': return theme.colors.danger.DEFAULT;
      case 'Attention': return theme.colors.secondary.DEFAULT;
      default: return theme.colors.neutral[500];
    }
  };

  const getStatutIcon = (statut: string) => {
    switch (statut) {
      case 'Normal': return <CheckCircle size={16} color={theme.colors.success.DEFAULT} />;
      case 'Suspect': return <AlertTriangle size={16} color={theme.colors.danger.DEFAULT} />;
      case 'Attention': return <Clock size={16} color={theme.colors.secondary.DEFAULT} />;
      default: return null;
    }
  };

  const handleViewDetails = (item: any) => {
    setSelectedEnseignant(item);
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Suivi des cours</Text>
          <Text style={styles.subtitle}>
            {activeEtablissement?.nom || 'Établissement'} – Supervision pédagogique
          </Text>
        </View>
      </View>

      {/* Filtres */}
      <Card style={styles.filtersCard}>
        <View style={styles.searchBar}>
          <Search size={20} color={theme.colors.neutral[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un enseignant, une matière, une classe..."
            placeholderTextColor={theme.colors.neutral[400]}
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity
            style={[styles.filterChip, !filterStatut && styles.filterChipActive]}
            onPress={() => setFilterStatut(null)}
          >
            <Text style={[styles.filterChipText, !filterStatut && styles.filterChipTextActive]}>
              Tous
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterStatut === 'Normal' && styles.filterChipActive]}
            onPress={() => setFilterStatut('Normal')}
          >
            <Text style={[styles.filterChipText, filterStatut === 'Normal' && styles.filterChipTextActive]}>
              ✅ Normal
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterStatut === 'Attention' && styles.filterChipActive]}
            onPress={() => setFilterStatut('Attention')}
          >
            <Text style={[styles.filterChipText, filterStatut === 'Attention' && styles.filterChipTextActive]}>
              ⚠️ Attention
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filterStatut === 'Suspect' && styles.filterChipActive]}
            onPress={() => setFilterStatut('Suspect')}
          >
            <Text style={[styles.filterChipText, filterStatut === 'Suspect' && styles.filterChipTextActive]}>
              🔴 Suspect
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </Card>

      {/* Liste des enseignants */}
      <ScrollView style={styles.listContent} showsVerticalScrollIndicator={false}>
        {filteredData.map((item) => (
          <Card key={item.id} style={styles.teacherCard}>
            <View style={styles.cardHeader}>
              <View style={styles.teacherInfo}>
                <Text style={styles.teacherName}>{item.enseignant}</Text>
                <Text style={styles.teacherMeta}>
                  {item.matiere} • {item.classe}
                </Text>
              </View>
              <View style={[styles.statutBadge, { backgroundColor: getStatutColor(item.statut) + '20' }]}>
                {getStatutIcon(item.statut)}
                <Text style={[styles.statutText, { color: getStatutColor(item.statut) }]}>
                  {item.statut}
                </Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Heures prévues</Text>
                <Text style={styles.statValue}>{item.prevues}h</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Heures déclarées</Text>
                <Text style={styles.statValue}>{item.declarees}h</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Écart</Text>
                <Text style={[styles.statValue, item.ecart !== 0 && styles.statValueWarning]}>
                  {item.ecart > 0 ? `+${item.ecart}h` : `${item.ecart}h`}
                </Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.lastDeclaration}>
                Dernière déclaration : {item.derniereDeclaration}
              </Text>
              <TouchableOpacity
                style={styles.detailsButton}
                onPress={() => handleViewDetails(item)}
              >
                <Eye size={16} color={theme.colors.primary.DEFAULT} />
                <Text style={styles.detailsButtonText}>Voir détails</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}
      </ScrollView>

      {/* Modal détails */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedEnseignant?.enseignant}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              {selectedEnseignant?.matiere} • {selectedEnseignant?.classe}
            </Text>

            <View style={styles.modalStats}>
              <View style={styles.modalStatItem}>
                <Text style={styles.modalStatLabel}>Prévues</Text>
                <Text style={styles.modalStatValue}>{selectedEnseignant?.prevues}h</Text>
              </View>
              <View style={styles.modalStatItem}>
                <Text style={styles.modalStatLabel}>Déclarées</Text>
                <Text style={styles.modalStatValue}>{selectedEnseignant?.declarees}h</Text>
              </View>
              <View style={styles.modalStatItem}>
                <Text style={styles.modalStatLabel}>Écart</Text>
                <Text style={styles.modalStatValue}>{selectedEnseignant?.ecart > 0 ? `+${selectedEnseignant?.ecart}h` : `${selectedEnseignant?.ecart}h`}</Text>
              </View>
            </View>

            <Text style={styles.detailsTitle}>Détail des cours déclarés</Text>
            <ScrollView style={styles.detailsList}>
              {selectedEnseignant?.details.map((detail: any, idx: number) => (
                <View key={idx} style={styles.detailItem}>
                  <Text style={styles.detailDate}>{detail.date}</Text>
                  <Text style={styles.detailHoraire}>{detail.horaire}</Text>
                  <Text style={styles.detailDuree}>{detail.duree}</Text>
                  <Text style={styles.detailContenu}>{detail.contenu}</Text>
                </View>
              ))}
            </ScrollView>

            <Button
              title="Fermer"
              onPress={() => setModalVisible(false)}
              variant="primary"
              style={styles.modalButton}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  header: {
    paddingHorizontal: theme.spacing[6],
    paddingTop: theme.spacing[6],
    paddingBottom: theme.spacing[4],
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.neutral[800],
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.neutral[500],
  },
  filtersCard: {
    margin: theme.spacing[4],
    padding: theme.spacing[4],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.neutral[100],
    borderRadius: 10,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    marginBottom: theme.spacing[3],
  },
  searchInput: {
    flex: 1,
    marginLeft: theme.spacing[2],
    fontSize: 14,
    color: theme.colors.neutral[800],
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: theme.colors.neutral[100],
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  filterChipText: {
    fontSize: 13,
    color: theme.colors.neutral[600],
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[6],
  },
  teacherCard: {
    marginBottom: theme.spacing[3],
    padding: theme.spacing[4],
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[3],
  },
  teacherInfo: {
    flex: 1,
  },
  teacherName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.neutral[800],
    marginBottom: 4,
  },
  teacherMeta: {
    fontSize: 13,
    color: theme.colors.neutral[500],
  },
  statutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  statutText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing[3],
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.neutral[200],
    marginBottom: theme.spacing[3],
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.neutral[500],
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.neutral[800],
  },
  statValueWarning: {
    color: theme.colors.danger.DEFAULT,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastDeclaration: {
    fontSize: 12,
    color: theme.colors.neutral[400],
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailsButtonText: {
    fontSize: 13,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.neutral[800],
  },
  modalClose: {
    fontSize: 20,
    color: theme.colors.neutral[500],
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: theme.colors.neutral[500],
    marginBottom: 16,
  },
  modalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.neutral[100],
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  modalStatItem: {
    alignItems: 'center',
  },
  modalStatLabel: {
    fontSize: 12,
    color: theme.colors.neutral[500],
  },
  modalStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.neutral[800],
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.neutral[700],
    marginBottom: 12,
  },
  detailsList: {
    maxHeight: 300,
  },
  detailItem: {
    backgroundColor: theme.colors.neutral[100],
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  detailDate: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary.DEFAULT,
    marginBottom: 4,
  },
  detailHoraire: {
    fontSize: 12,
    color: theme.colors.neutral[600],
    fontWeight: '500',
    marginBottom: 4,
  },
  detailDuree: {
    fontSize: 12,
    color: theme.colors.neutral[500],
    marginBottom: 6,
  },
  detailContenu: {
    fontSize: 13,
    color: theme.colors.neutral[700],
  },
  modalButton: {
    marginTop: 16,
  },
});