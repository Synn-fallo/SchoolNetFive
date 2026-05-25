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
  Switch,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { StatusBadge } from '@/components/StatusBadge';
import theme from '@/constants/theme';
import { Calendar, BookOpen, Clock, CheckCircle, AlertCircle, Plus, Eye, Edit2, Trash2, Send, X } from 'lucide-react-native';

// Données mockées - Cours à déclarer (à partir de l'emploi du temps)
const MOCK_COURS_A_DECLARER = [
  {
    id: '1',
    date: '2026-05-02',
    horaireDebut: '08:00',
    horaireFin: '10:00',
    classe: '3e B',
    matiere: 'Mathématiques',
    salle: 'Salle 101',
  },
  {
    id: '2',
    date: '2026-05-02',
    horaireDebut: '10:00',
    horaireFin: '12:00',
    classe: '4e A',
    matiere: 'Mathématiques',
    salle: 'Salle 102',
  },
  {
    id: '3',
    date: '2026-05-03',
    horaireDebut: '08:00',
    horaireFin: '10:00',
    classe: '3e B',
    matiere: 'Mathématiques',
    salle: 'Salle 101',
  },
];

// Données mockées - Historique des déclarations
const MOCK_HISTORIQUE = [
  {
    id: 'h1',
    date: '2026-04-28',
    horaireDebut: '08:00',
    horaireFin: '10:00',
    classe: '3e B',
    matiere: 'Mathématiques',
    dureeReelle: '2h',
    contenu: 'Équations du second degré – Introduction',
    exercice: 'Exercices 1 à 5 page 42',
    statut: 'Normal',
    dateSaisie: '2026-04-28',
  },
  {
    id: 'h2',
    date: '2026-04-27',
    horaireDebut: '10:00',
    horaireFin: '12:00',
    classe: '4e A',
    matiere: 'Mathématiques',
    dureeReelle: '2h',
    contenu: 'Fonctions affines – Définition et exemples',
    exercice: 'Exercices 1 à 3 page 28',
    statut: 'Normal',
    dateSaisie: '2026-04-27',
  },
  {
    id: 'h3',
    date: '2026-04-26',
    horaireDebut: '08:00',
    horaireFin: '10:00',
    classe: '3e B',
    matiere: 'Mathématiques',
    dureeReelle: '2h',
    contenu: 'Révision – Polynômes',
    exercice: 'Série d\'exercices',
    statut: 'Tardif',
    dateSaisie: '2026-04-28',
  },
];

export default function CahierTexteScreen() {
  const { user, profile, activeEtablissement, isAffiliated } = useAuth();
  const [activeTab, setActiveTab] = useState<'a-declarer' | 'historique'>('a-declarer');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCours, setSelectedCours] = useState<any>(null);
  const [formData, setFormData] = useState({
    dureeReelle: '',
    contenu: '',
    exercice: '',
  });
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedHistorique, setSelectedHistorique] = useState<any>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editData, setEditData] = useState({
    contenu: '',
    exercice: '',
  });

  const userName = profile?.prenom && profile?.nom 
    ? `${profile.prenom} ${profile.nom}` 
    : user?.email?.split('@')[0] || 'Enseignant';

  const handleDeclarer = (cours: any) => {
    setSelectedCours(cours);
    setFormData({ dureeReelle: '', contenu: '', exercice: '' });
    setModalVisible(true);
  };

  const handleSubmitDeclaration = () => {
    if (!formData.dureeReelle || !formData.contenu) {
      Alert.alert('Information', 'Veuillez renseigner la durée réelle et le contenu du cours.');
      return;
    }

    // Simulation d'enregistrement
    Alert.alert(
      'Succès',
      'Votre déclaration a été enregistrée avec succès.',
      [{ text: 'OK', onPress: () => setModalVisible(false) }]
    );
  };

  const handleViewDetail = (item: any) => {
    setSelectedHistorique(item);
    setDetailModalVisible(true);
  };

  const handleEdit = (item: any) => {
    setSelectedHistorique(item);
    setEditData({
      contenu: item.contenu,
      exercice: item.exercice || '',
    });
    setEditModalVisible(true);
  };

  const handleUpdateDeclaration = () => {
    Alert.alert('Succès', 'Votre déclaration a été mise à jour.');
    setEditModalVisible(false);
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'Normal': return theme.colors.success.DEFAULT;
      case 'Tardif': return theme.colors.secondary.DEFAULT;
      case 'Suspect': return theme.colors.danger.DEFAULT;
      default: return theme.colors.neutral[500];
    }
  };

  const getStatutIcon = (statut: string) => {
    switch (statut) {
      case 'Normal': return <CheckCircle size={14} color={theme.colors.success.DEFAULT} />;
      case 'Tardif': return <Clock size={14} color={theme.colors.secondary.DEFAULT} />;
      case 'Suspect': return <AlertCircle size={14} color={theme.colors.danger.DEFAULT} />;
      default: return null;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <View style={styles.container}>
      {/* En-tête */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Mon cahier de texte</Text>
          <Text style={styles.subtitle}>
            {userName} • {activeEtablissement?.nom || 'Établissement'}
          </Text>
          {isAffiliated && (
            <View style={styles.affiliatedBadge}>
              <Text style={styles.affiliatedText}>✅ Enseignant affilié</Text>
            </View>
          )}
        </View>
      </View>

      {/* Onglets */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'a-declarer' && styles.tabActive]}
          onPress={() => setActiveTab('a-declarer')}
        >
          <Text style={[styles.tabText, activeTab === 'a-declarer' && styles.tabTextActive]}>
            À déclarer ({MOCK_COURS_A_DECLARER.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'historique' && styles.tabActive]}
          onPress={() => setActiveTab('historique')}
        >
          <Text style={[styles.tabText, activeTab === 'historique' && styles.tabTextActive]}>
            Historique
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.listContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'a-declarer' ? (
          // Section : À déclarer
          MOCK_COURS_A_DECLARER.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>✅</Text>
              <Text style={styles.emptyTitle}>Tous les cours sont déclarés</Text>
              <Text style={styles.emptyText}>Bravo ! Vous êtes à jour dans vos déclarations.</Text>
            </Card>
          ) : (
            MOCK_COURS_A_DECLARER.map((cours) => (
              <Card key={cours.id} style={styles.coursCard}>
                <View style={styles.coursHeader}>
                  <View style={styles.dateBadge}>
                    <Calendar size={14} color={theme.colors.primary.DEFAULT} />
                    <Text style={styles.dateText}>{formatDate(cours.date)}</Text>
                  </View>
                  <Text style={styles.horaireText}>
                    {cours.horaireDebut} – {cours.horaireFin}
                  </Text>
                </View>
                <View style={styles.coursBody}>
                  <Text style={styles.classeMatiere}>
                    {cours.classe} • {cours.matiere}
                  </Text>
                  <Text style={styles.salleText}>📍 {cours.salle}</Text>
                </View>
                <TouchableOpacity
                  style={styles.declarerButton}
                  onPress={() => handleDeclarer(cours)}
                >
                  <Send size={16} color="#FFFFFF" />
                  <Text style={styles.declarerButtonText}>Déclarer ce cours</Text>
                </TouchableOpacity>
              </Card>
            ))
          )
        ) : (
          // Section : Historique
          MOCK_HISTORIQUE.map((item) => (
            <Card key={item.id} style={styles.historiqueCard}>
              <View style={styles.historiqueHeader}>
                <View style={styles.dateBadge}>
                  <Calendar size={14} color={theme.colors.primary.DEFAULT} />
                  <Text style={styles.dateText}>{formatDate(item.date)}</Text>
                </View>
                <View style={[styles.statutBadge, { backgroundColor: getStatutColor(item.statut) + '20' }]}>
                  {getStatutIcon(item.statut)}
                  <Text style={[styles.statutText, { color: getStatutColor(item.statut) }]}>
                    {item.statut}
                  </Text>
                </View>
              </View>
              <Text style={styles.historiqueClasse}>
                {item.classe} • {item.matiere}
              </Text>
              <Text style={styles.historiqueHoraire}>
                {item.horaireDebut} – {item.horaireFin} (durée réelle : {item.dureeReelle})
              </Text>
              <Text style={styles.historiqueContenu} numberOfLines={2}>
                {item.contenu}
              </Text>
              {item.exercice && (
                <Text style={styles.historiqueExercice} numberOfLines={1}>
                  📝 Devoir : {item.exercice}
                </Text>
              )}
              <View style={styles.historiqueActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleViewDetail(item)}
                >
                  <Eye size={16} color={theme.colors.neutral[500]} />
                  <Text style={styles.actionButtonText}>Voir</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEdit(item)}
                >
                  <Edit2 size={16} color={theme.colors.primary.DEFAULT} />
                  <Text style={[styles.actionButtonText, { color: theme.colors.primary.DEFAULT }]}>
                    Modifier
                  </Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      {/* Modal de déclaration */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Déclarer le cours</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color={theme.colors.neutral[500]} />
              </TouchableOpacity>
            </View>

            {selectedCours && (
              <View style={styles.modalInfo}>
                <Text style={styles.modalInfoText}>
                  {formatDate(selectedCours.date)} • {selectedCours.horaireDebut} – {selectedCours.horaireFin}
                </Text>
                <Text style={styles.modalInfoText}>
                  {selectedCours.classe} • {selectedCours.matiere}
                </Text>
                <Text style={styles.modalInfoSubtext}>📍 {selectedCours.salle}</Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Durée réelle du cours *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 2h, 1h30, etc."
              placeholderTextColor={theme.colors.neutral[400]}
              value={formData.dureeReelle}
              onChangeText={(text) => setFormData(prev => ({ ...prev, dureeReelle: text }))}
            />

            <Text style={styles.inputLabel}>Contenu du cours *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Décrivez le contenu du cours..."
              placeholderTextColor={theme.colors.neutral[400]}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={formData.contenu}
              onChangeText={(text) => setFormData(prev => ({ ...prev, contenu: text }))}
            />

            <Text style={styles.inputLabel}>Devoir / Exercice (optionnel)</Text>
            <TextInput
              style={[styles.input, styles.textAreaSmall]}
              placeholder="Description du devoir ou des exercices..."
              placeholderTextColor={theme.colors.neutral[400]}
              multiline
              numberOfLines={2}
              value={formData.exercice}
              onChangeText={(text) => setFormData(prev => ({ ...prev, exercice: text }))}
            />

            <View style={styles.modalActions}>
              <Button
                title="Annuler"
                onPress={() => setModalVisible(false)}
                variant="secondary"
                style={styles.modalButton}
              />
              <Button
                title="Enregistrer"
                onPress={handleSubmitDeclaration}
                variant="primary"
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de détail historique */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Détail du cours</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <X size={24} color={theme.colors.neutral[500]} />
              </TouchableOpacity>
            </View>

            {selectedHistorique && (
              <ScrollView>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Date et horaire</Text>
                  <Text style={styles.detailValue}>
                    {formatDate(selectedHistorique.date)} • {selectedHistorique.horaireDebut} – {selectedHistorique.horaireFin}
                  </Text>
                </View>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Classe / Matière</Text>
                  <Text style={styles.detailValue}>
                    {selectedHistorique.classe} • {selectedHistorique.matiere}
                  </Text>
                </View>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Durée réelle</Text>
                  <Text style={styles.detailValue}>{selectedHistorique.dureeReelle}</Text>
                </View>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Contenu</Text>
                  <Text style={styles.detailValue}>{selectedHistorique.contenu}</Text>
                </View>
                {selectedHistorique.exercice && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Devoir / Exercice</Text>
                    <Text style={styles.detailValue}>{selectedHistorique.exercice}</Text>
                  </View>
                )}
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Statut</Text>
                  <View style={[styles.statutBadge, { backgroundColor: getStatutColor(selectedHistorique.statut) + '20', alignSelf: 'flex-start' }]}>
                    {getStatutIcon(selectedHistorique.statut)}
                    <Text style={[styles.statutText, { color: getStatutColor(selectedHistorique.statut) }]}>
                      {selectedHistorique.statut}
                    </Text>
                  </View>
                </View>
                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Date de saisie</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedHistorique.dateSaisie)}</Text>
                </View>
              </ScrollView>
            )}

            <Button
              title="Fermer"
              onPress={() => setDetailModalVisible(false)}
              variant="primary"
              style={styles.modalButton}
            />
          </View>
        </View>
      </Modal>

      {/* Modal de modification */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier la déclaration</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <X size={24} color={theme.colors.neutral[500]} />
              </TouchableOpacity>
            </View>

            {selectedHistorique && (
              <View style={styles.modalInfo}>
                <Text style={styles.modalInfoText}>
                  {formatDate(selectedHistorique.date)} • {selectedHistorique.classe} • {selectedHistorique.matiere}
                </Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Contenu du cours *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Décrivez le contenu du cours..."
              placeholderTextColor={theme.colors.neutral[400]}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={editData.contenu}
              onChangeText={(text) => setEditData(prev => ({ ...prev, contenu: text }))}
            />

            <Text style={styles.inputLabel}>Devoir / Exercice (optionnel)</Text>
            <TextInput
              style={[styles.input, styles.textAreaSmall]}
              placeholder="Description du devoir ou des exercices..."
              placeholderTextColor={theme.colors.neutral[400]}
              multiline
              numberOfLines={2}
              value={editData.exercice}
              onChangeText={(text) => setEditData(prev => ({ ...prev, exercice: text }))}
            />

            <View style={styles.modalActions}>
              <Button
                title="Annuler"
                onPress={() => setEditModalVisible(false)}
                variant="secondary"
                style={styles.modalButton}
              />
              <Button
                title="Mettre à jour"
                onPress={handleUpdateDeclaration}
                variant="primary"
                style={styles.modalButton}
              />
            </View>
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
  affiliatedBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  affiliatedText: {
    fontSize: 12,
    color: theme.colors.success.DEFAULT,
    fontWeight: '500',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.background.primary,
    paddingHorizontal: theme.spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing[3],
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.primary.DEFAULT,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.colors.neutral[500],
  },
  tabTextActive: {
    color: theme.colors.primary.DEFAULT,
  },
  listContent: {
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[6],
  },
  coursCard: {
    marginBottom: theme.spacing[3],
    padding: theme.spacing[4],
  },
  coursHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary.light + '20',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.primary.DEFAULT,
  },
  horaireText: {
    fontSize: 13,
    color: theme.colors.neutral[500],
  },
  coursBody: {
    marginBottom: theme.spacing[3],
  },
  classeMatiere: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.neutral[800],
    marginBottom: 4,
  },
  salleText: {
    fontSize: 13,
    color: theme.colors.neutral[500],
  },
  declarerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 10,
    borderRadius: 10,
  },
  declarerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  historiqueCard: {
    marginBottom: theme.spacing[3],
    padding: theme.spacing[4],
  },
  historiqueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  statutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statutText: {
    fontSize: 11,
    fontWeight: '500',
  },
  historiqueClasse: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.neutral[800],
    marginBottom: 4,
  },
  historiqueHoraire: {
    fontSize: 12,
    color: theme.colors.neutral[500],
    marginBottom: 8,
  },
  historiqueContenu: {
    fontSize: 13,
    color: theme.colors.neutral[600],
    lineHeight: 18,
    marginBottom: 8,
  },
  historiqueExercice: {
    fontSize: 12,
    color: theme.colors.neutral[500],
    fontStyle: 'italic',
    marginBottom: 12,
  },
  historiqueActions: {
    flexDirection: 'row',
    gap: theme.spacing[3],
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButtonText: {
    fontSize: 13,
    color: theme.colors.neutral[500],
  },
  emptyCard: {
    padding: theme.spacing[6],
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: theme.spacing[3],
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.neutral[700],
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: theme.colors.neutral[500],
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.neutral[800],
  },
  modalInfo: {
    backgroundColor: theme.colors.neutral[100],
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  modalInfoText: {
    fontSize: 14,
    color: theme.colors.neutral[700],
    marginBottom: 4,
  },
  modalInfoSubtext: {
    fontSize: 12,
    color: theme.colors.neutral[500],
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.neutral[700],
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    borderRadius: 10,
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[3],
    fontSize: 14,
    color: theme.colors.neutral[800],
    marginBottom: theme.spacing[3],
  },
  textArea: {
    minHeight: 100,
  },
  textAreaSmall: {
    minHeight: 60,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing[3],
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.neutral[500],
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    color: theme.colors.neutral[800],
  },
});
