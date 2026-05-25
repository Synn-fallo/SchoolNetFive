import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, useWindowDimensions } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { StatusBadge } from '@/components/StatusBadge';
import { Picker } from '@react-native-picker/picker';
import { 
  Download, Plus, ChevronRight, FileText, DollarSign, Users, 
  GraduationCap, Building2, Shirt, Bus, PartyPopper, AlertTriangle, Heart,
  BookOpen, FolderOpen, Package, Wrench, Sparkles, Scale, Gift
} from 'lucide-react-native';

// Types pour les catégories
type CategorieType = 'academique' | 'administrative' | 'equipements' | 'services' | 'exceptionnelle' | 'penalites' | 'contributions';

interface Rubrique {
  id: string;
  nom: string;
  montant_total: number;
  montant_paye: number;
  statut: 'paye' | 'impaye' | 'partiel';
}

interface Categorie {
  id: CategorieType;
  titre: string;
  icone: any;
  rubriques: Rubrique[];
  developpe: boolean;
}

export default function ScolariteScreen() {
  const { user, primaryRole } = useAuth();
  const { width } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [activeCategorie, setActiveCategorie] = useState<CategorieType>('academique');
  const [statistiques, setStatistiques] = useState({
    totalEleves: 0,
    montantAttendu: 0,
    montantRecu: 0,
    impayes: 0,
    tauxRecouvrement: 0,
    soldeMoyenParEleve: 0,
  });

  // Déterminer l'affichage des onglets selon la taille d'écran
  const isMobile = width < 640;
  const isTablet = width >= 640 && width < 1024;
  const isDesktop = width >= 1024;

  // Données mockées pour les catégories (à remplacer par des données réelles plus tard)
  const [categories, setCategories] = useState<Categorie[]>([
    {
      id: 'academique',
      titre: 'Académiques',
      icone: GraduationCap,
      developpe: true,
      rubriques: [
        { id: '1', nom: 'Scolarité', montant_total: 5000000, montant_paye: 3800000, statut: 'partiel' },
        { id: '2', nom: 'Inscription', montant_total: 1500000, montant_paye: 1500000, statut: 'paye' },
        { id: '3', nom: 'Réinscription', montant_total: 800000, montant_paye: 600000, statut: 'partiel' },
        { id: '4', nom: 'Examens', montant_total: 600000, montant_paye: 450000, statut: 'partiel' },
        { id: '5', nom: 'TD/Laboratoire', montant_total: 400000, montant_paye: 200000, statut: 'partiel' },
      ],
    },
    {
      id: 'administrative',
      titre: 'Administratives',
      icone: FolderOpen,
      developpe: false,
      rubriques: [
        { id: '6', nom: 'Dossier', montant_total: 100000, montant_paye: 80000, statut: 'partiel' },
        { id: '7', nom: 'Attestation', montant_total: 50000, montant_paye: 30000, statut: 'partiel' },
        { id: '8', nom: 'Carte scolaire', montant_total: 75000, montant_paye: 75000, statut: 'paye' },
        { id: '9', nom: 'Relevé de notes', montant_total: 40000, montant_paye: 20000, statut: 'partiel' },
        { id: '10', nom: 'Duplicata', montant_total: 25000, montant_paye: 0, statut: 'impaye' },
      ],
    },
    {
      id: 'equipements',
      titre: 'Équipements',
      icone: Package,
      developpe: false,
      rubriques: [
        { id: '11', nom: 'Uniformes', montant_total: 300000, montant_paye: 200000, statut: 'partiel' },
        { id: '12', nom: 'Kits scolaires', montant_total: 200000, montant_paye: 150000, statut: 'partiel' },
        { id: '13', nom: 'Badges', montant_total: 50000, montant_paye: 50000, statut: 'paye' },
      ],
    },
    {
      id: 'services',
      titre: 'Services',
      icone: Bus,
      developpe: false,
      rubriques: [
        { id: '14', nom: 'Transport', montant_total: 800000, montant_paye: 500000, statut: 'partiel' },
        { id: '15', nom: 'Cantine', montant_total: 600000, montant_paye: 400000, statut: 'partiel' },
        { id: '16', nom: 'Internat', montant_total: 1200000, montant_paye: 800000, statut: 'partiel' },
        { id: '17', nom: 'Activités parascolaires', montant_total: 300000, montant_paye: 150000, statut: 'partiel' },
      ],
    },
    {
      id: 'exceptionnelle',
      titre: 'Exceptionnelles',
      icone: Sparkles,
      developpe: false,
      rubriques: [
        { id: '18', nom: 'Sorties pédagogiques', montant_total: 200000, montant_paye: 100000, statut: 'partiel' },
        { id: '19', nom: 'Fêtes scolaires', montant_total: 150000, montant_paye: 50000, statut: 'partiel' },
        { id: '20', nom: 'Contributions spéciales', montant_total: 100000, montant_paye: 25000, statut: 'partiel' },
      ],
    },
    {
      id: 'penalites',
      titre: 'Pénalités',
      icone: Scale,
      developpe: false,
      rubriques: [
        { id: '21', nom: 'Retards de paiement', montant_total: 75000, montant_paye: 25000, statut: 'partiel' },
        { id: '22', nom: 'Amendes', montant_total: 50000, montant_paye: 0, statut: 'impaye' },
        { id: '23', nom: 'Régularisation', montant_total: 60000, montant_paye: 60000, statut: 'paye' },
      ],
    },
    {
      id: 'contributions',
      titre: 'Contributions',
      icone: Gift,
      developpe: false,
      rubriques: [
        { id: '24', nom: 'APE', montant_total: 200000, montant_paye: 120000, statut: 'partiel' },
        { id: '25', nom: 'Dons', montant_total: 150000, montant_paye: 150000, statut: 'paye' },
      ],
    },
  ]);

  useEffect(() => {
    if (primaryRole === 'chef_etablissement') {
      loadScolariteData();
    }
  }, [user, primaryRole]);

  // Formater les montants en XOF
  const formatXOF = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Formater les millions
  const formatMillion = (amount: number) => {
    const millions = amount / 1000000;
    if (millions >= 1) {
      return `${millions.toFixed(2)}M`;
    }
    return `${(amount / 1000).toFixed(0)}k`;
  };

  // Calculer le pourcentage
  const calculerPourcentage = (paye: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((paye / total) * 100);
  };

  const loadScolariteData = async () => {
    try {
      setLoading(true);

      const { data: profile } = await supabase
        .from('profiles')
        .select('etablissement_id')
        .eq('id', user?.id)
        .maybeSingle();

      if (profile?.etablissement_id) {
        // Récupérer les inscriptions
        const { data: inscrData } = await supabase
          .from('inscriptions')
          .select('*')
          .eq('etablissement_id', profile.etablissement_id);

        // Récupérer les élèves
        const { data: eleves } = await supabase
          .from('eleves')
          .select('id')
          .eq('etablissement_id', profile.etablissement_id);

        const totalEleves = eleves?.length || 0;
        const montantAttendu = inscrData?.reduce((sum, i) => sum + (i.montant_total || 0), 0) || 0;
        const montantRecu = inscrData?.reduce((sum, i) => sum + (i.montant_paye || 0), 0) || 0;
        const impayes = montantAttendu - montantRecu;
        const tauxRecouvrement = montantAttendu > 0 ? (montantRecu / montantAttendu) * 100 : 0;
        const soldeMoyenParEleve = totalEleves > 0 ? montantAttendu / totalEleves : 0;

        setStatistiques({
          totalEleves,
          montantAttendu,
          montantRecu,
          impayes,
          tauxRecouvrement,
          soldeMoyenParEleve,
        });
      }
    } catch (error) {
      console.error('Error loading scolarite data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'paye': return '#10B981';
      case 'impaye': return '#DC2626';
      case 'partiel': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case 'paye': return 'Payé';
      case 'impaye': return 'Impayé';
      case 'partiel': return 'Partiel';
      default: return 'Inconnu';
    }
  };

  const handleCategoriePress = (categorieId: CategorieType) => {
    setActiveCategorie(categorieId);
  };

  const handleRubriquePress = (categorie: Categorie, rubrique: Rubrique) => {
    if (!categorie.developpe) {
      Alert.alert(
        'Fonctionnalité à venir',
        `La gestion détaillée de la catégorie "${categorie.titre}" sera disponible prochainement.`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        rubrique.nom,
        `Montant total: ${formatXOF(rubrique.montant_total)}\nMontant payé: ${formatXOF(rubrique.montant_paye)}\nReste à payer: ${formatXOF(rubrique.montant_total - rubrique.montant_paye)}\nStatut: ${getStatutLabel(rubrique.statut)}`,
        [{ text: 'Fermer' }]
      );
    }
  };

  const activeCategorieData = categories.find(c => c.id === activeCategorie);

  // Rendu des onglets selon la taille d'écran
  const renderTabs = () => {
    if (isMobile) {
      // Menu déroulant pour mobile
      return (
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={activeCategorie}
            onValueChange={(itemValue) => setActiveCategorie(itemValue as CategorieType)}
            style={styles.picker}
          >
            {categories.map((categorie) => (
              <Picker.Item 
                key={categorie.id} 
                label={`${categorie.titre}${!categorie.developpe ? ' (Bientôt)' : ''}`} 
                value={categorie.id} 
              />
            ))}
          </Picker>
        </View>
      );
    } else {
      // Défilement horizontal pour tablette et desktop
      return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {categories.map((categorie) => {
            const Icon = categorie.icone;
            const isActive = activeCategorie === categorie.id;
            return (
              <TouchableOpacity
                key={categorie.id}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => handleCategoriePress(categorie.id)}
              >
                <Icon size={18} color={isActive ? '#3B82F6' : '#6B7280'} />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {categorie.titre}
                </Text>
                {!categorie.developpe && (
                  <View style={styles.badgeSoon}>
                    <Text style={styles.badgeSoonText}>Bientôt</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      );
    }
  };

  // Rendu de la barre de progression avec texte
  const renderProgressBar = (paye: number, total: number, label?: string) => {
    const pourcentage = calculerPourcentage(paye, total);
    return (
      <View style={styles.progressWrapper}>
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar, 
              { 
                width: `${Math.min(pourcentage, 100)}%`,
                backgroundColor: '#3B82F6'
              }
            ]} 
          />
        </View>
        <View style={styles.progressStats}>
          <Text style={styles.progressText}>
            {formatXOF(paye)} / {formatXOF(total)}
          </Text>
          <Text style={styles.progressPercentage}>{pourcentage}%</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* En-tête */}
      <View style={styles.header}>
        <Text style={styles.title}>Scolarité & Finance</Text>
        <Text style={styles.subtitle}>Système GIPS - Gestion Informatisée des Paiements Scolaires</Text>
      </View>

      {/* Métriques principales - Grille responsive */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Users size={22} color="#3B82F6" />
          <Text style={styles.metricLabel}>Élèves inscrits</Text>
          <Text style={styles.metricValue}>{statistiques.totalEleves}</Text>
        </View>

        <View style={styles.metricCard}>
          <DollarSign size={22} color="#8B5CF6" />
          <Text style={styles.metricLabel}>Montant attendu</Text>
          <Text style={styles.metricValue}>{formatMillion(statistiques.montantAttendu)} FCFA</Text>
        </View>

        <View style={styles.metricCard}>
          <DollarSign size={22} color="#10B981" />
          <Text style={styles.metricLabel}>Montant reçu</Text>
          <Text style={styles.metricValue}>{formatMillion(statistiques.montantRecu)} FCFA</Text>
        </View>

        <View style={styles.metricCard}>
          <DollarSign size={22} color="#DC2626" />
          <Text style={styles.metricLabel}>Impayés</Text>
          <Text style={[styles.metricValue, { color: '#DC2626' }]}>{formatMillion(statistiques.impayes)} FCFA</Text>
        </View>

        <View style={styles.metricCard}>
          <FileText size={22} color="#F59E0B" />
          <Text style={styles.metricLabel}>Taux de recouvrement</Text>
          <Text style={styles.metricValue}>{statistiques.tauxRecouvrement.toFixed(1)}%</Text>
        </View>

        <View style={styles.metricCard}>
          <Users size={22} color="#6366F1" />
          <Text style={styles.metricLabel}>Solde moyen/élève</Text>
          <Text style={styles.metricValue}>{formatXOF(statistiques.soldeMoyenParEleve)}</Text>
        </View>
      </View>

      {/* Onglets des catégories */}
      <View style={styles.tabsContainer}>
        {renderTabs()}
      </View>

      {/* Contenu de l'onglet actif */}
      {activeCategorieData && (
        <View style={styles.categorieContent}>
          <View style={styles.categorieHeader}>
            <View style={styles.categorieTitleContainer}>
              {(() => {
                const Icon = activeCategorieData.icone;
                return <Icon size={24} color="#3B82F6" />;
              })()}
              <Text style={styles.categorieTitle}>{activeCategorieData.titre}</Text>
            </View>
            {!activeCategorieData.developpe && (
              <View style={styles.devWarning}>
                <Text style={styles.devWarningText}>⚙️ En développement</Text>
              </View>
            )}
          </View>

          {/* Résumé de la catégorie avec barre de progression améliorée */}
          {activeCategorieData.rubriques.length > 0 && (
            <Card style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total attendu</Text>
                <Text style={styles.summaryValue}>
                  {formatXOF(activeCategorieData.rubriques.reduce((sum, r) => sum + r.montant_total, 0))}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total reçu</Text>
                <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                  {formatXOF(activeCategorieData.rubriques.reduce((sum, r) => sum + r.montant_paye, 0))}
                </Text>
              </View>
              {renderProgressBar(
                activeCategorieData.rubriques.reduce((sum, r) => sum + r.montant_paye, 0),
                activeCategorieData.rubriques.reduce((sum, r) => sum + r.montant_total, 0)
              )}
            </Card>
          )}

          {/* Liste des rubriques avec barres de progression améliorées */}
          <Card style={styles.rubriquesCard}>
            <Text style={styles.rubriquesTitle}>Rubriques</Text>
            {activeCategorieData.rubriques.map((rubrique, index) => {
              const pourcentage = calculerPourcentage(rubrique.montant_paye, rubrique.montant_total);
              return (
                <TouchableOpacity
                  key={rubrique.id}
                  style={[styles.rubriqueItem, index < activeCategorieData.rubriques.length - 1 && styles.rubriqueBorder]}
                  onPress={() => handleRubriquePress(activeCategorieData, rubrique)}
                >
                  <View style={styles.rubriqueInfo}>
                    <Text style={styles.rubriqueNom}>{rubrique.nom}</Text>
                    <View style={styles.rubriqueMontants}>
                      <Text style={styles.rubriqueMontant}>{formatXOF(rubrique.montant_paye)}</Text>
                      <Text style={styles.rubriqueSeparator}>/</Text>
                      <Text style={styles.rubriqueTotal}>{formatXOF(rubrique.montant_total)}</Text>
                    </View>
                  </View>
                  <View style={styles.rubriqueStatus}>
                    <StatusBadge status={rubrique.statut} />
                    <View style={styles.rubriqueProgressWrapper}>
                      <View style={styles.rubriqueProgress}>
                        <View 
                          style={[
                            styles.rubriqueProgressBar, 
                            { 
                              width: `${pourcentage}%`,
                              backgroundColor: getStatutColor(rubrique.statut)
                            }
                          ]} 
                        />
                      </View>
                      <Text style={styles.rubriqueProgressText}>{pourcentage}%</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </Card>

          {!activeCategorieData.developpe && (
            <TouchableOpacity 
              style={styles.devButton}
              onPress={() => Alert.alert(
                'Fonctionnalité à venir',
                `La catégorie "${activeCategorieData.titre}" sera entièrement disponible prochainement avec toutes ses rubriques et fonctionnalités.`,
                [{ text: 'OK' }]
              )}
            >
              <Text style={styles.devButtonText}>En savoir plus</Text>
              <ChevronRight size={16} color="#3B82F6" />
            </TouchableOpacity>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  content: {
    paddingBottom: 32,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '28%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  metricLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  tabsContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  tabsScroll: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#3B82F6',
  },
  badgeSoon: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 6,
  },
  badgeSoonText: {
    fontSize: 9,
    color: '#F59E0B',
    fontWeight: '600',
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  picker: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  categorieContent: {
    padding: 16,
  },
  categorieHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  categorieTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categorieTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  devWarning: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  devWarningText: {
    fontSize: 10,
    color: '#F59E0B',
    fontWeight: '500',
  },
  summaryCard: {
    marginBottom: 16,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  progressWrapper: {
    marginTop: 12,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressText: {
    fontSize: 11,
    color: '#6B7280',
  },
  progressPercentage: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3B82F6',
  },
  rubriquesCard: {
    padding: 16,
  },
  rubriquesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  rubriqueItem: {
    paddingVertical: 12,
  },
  rubriqueBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  rubriqueInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rubriqueNom: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  rubriqueMontants: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  rubriqueMontant: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  rubriqueSeparator: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  rubriqueTotal: {
    fontSize: 12,
    color: '#6B7280',
  },
  rubriqueStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rubriqueProgressWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rubriqueProgress: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  rubriqueProgressBar: {
    height: '100%',
    borderRadius: 2,
  },
  rubriqueProgressText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6B7280',
    minWidth: 35,
    textAlign: 'right',
  },
  devButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 12,
  },
  devButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
});