// /home/project/components/enseignant/CorrespondanceEleves.tsx
// Sous-composant pour la correspondance des élèves (auto + manuel)

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { CheckCircle, XCircle, AlertCircle, Search, UserCheck } from 'lucide-react-native';
import theme from '@/constants/theme';

interface CorrespondanceElevesProps {
  classePersonnelleId: string;
  classeOfficielleId: string;
  onComplete: () => void;
}

interface ElevePersonnel {
  index: number;
  nom: string;
  prenom: string;
  matricule?: string;
}

interface EleveOfficiel {
  id: string;
  nom: string;
  prenom: string;
  matricule?: string;
  date_naissance?: string;
}

interface Correspondance {
  elevePersonnel: ElevePersonnel;
  eleveOfficielId: string | null;
  eleveOfficielNom: string | null;
  statut: 'auto' | 'manuel' | 'ignore' | 'pending';
}

export default function CorrespondanceEleves({
  classePersonnelleId,
  classeOfficielleId,
  onComplete
}: CorrespondanceElevesProps) {
  const [loading, setLoading] = useState(true);
  const [elevesPersonnels, setElevesPersonnels] = useState<ElevePersonnel[]>([]);
  const [elevesOfficiels, setElevesOfficiels] = useState<EleveOfficiel[]>([]);
  const [correspondances, setCorrespondances] = useState<Correspondance[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEleve, setSelectedEleve] = useState<Correspondance | null>(null);
  const [recherche, setRecherche] = useState('');

  // Chargement des élèves
  useEffect(() => {
    loadEleves();
  }, []);

  const loadEleves = async () => {
    setLoading(true);
    try {
      // 1. Récupérer les élèves personnels depuis classes_personnelles
      const { data: classePerso, error: err1 } = await supabase
        .from('classes_personnelles')
        .select('eleves')
        .eq('id', classePersonnelleId)
        .single();
      
      if (err1) throw err1;
      
      const personnels: ElevePersonnel[] = (classePerso.eleves || []).map((e: any, idx: number) => ({
        index: idx,
        nom: e.nom || '',
        prenom: e.prenom || '',
        matricule: e.matricule || ''
      }));
      setElevesPersonnels(personnels);
      
      // 2. Récupérer les élèves officiels de la classe
      const { data: officiels, error: err2 } = await supabase
        .from('eleves')
        .select('id, nom, prenom, matricule, date_naissance')
        .eq('classe_id', classeOfficielleId);
      
      if (err2) throw err2;
      setElevesOfficiels(officiels || []);
      
      // 3. Vérifier les correspondances existantes
      const { data: existantes, error: err3 } = await supabase
        .from('correspondance_eleves')
        .select('*')
        .eq('classe_personnelle_id', classePersonnelleId);
      
      if (err3) throw err3;
      
      // 4. Initialiser les correspondances
      const initialCorrespondances: Correspondance[] = personnels.map((eleve, idx) => {
        const existante = existantes?.find(e => 
          e.eleve_personnel_nom === eleve.nom && 
          e.eleve_personnel_prenom === eleve.prenom
        );
        
        if (existante && existante.eleve_officiel_id) {
          const officiel = officiels?.find(o => o.id === existante.eleve_officiel_id);
          return {
            elevePersonnel: eleve,
            eleveOfficielId: existante.eleve_officiel_id,
            eleveOfficielNom: officiel ? `${officiel.prenom} ${officiel.nom}` : null,
            statut: 'auto'
          };
        }
        
        return {
          elevePersonnel: eleve,
          eleveOfficielId: null,
          eleveOfficielNom: null,
          statut: 'pending'
        };
      });
      
      setCorrespondances(initialCorrespondances);
    } catch (error) {
      console.error('Error loading students:', error);
      Alert.alert('Erreur', 'Impossible de charger les élèves');
    } finally {
      setLoading(false);
    }
  };

  const rechercherCorrespondanceAuto = (eleve: ElevePersonnel): EleveOfficiel | null => {
    // Priorité 1 : Matricule exact
    if (eleve.matricule) {
      const match = elevesOfficiels.find(o => o.matricule === eleve.matricule);
      if (match) return match;
    }
    
    // Priorité 2 : Nom + Prénom exacts (insensible à la casse)
    const matchExact = elevesOfficiels.find(o => 
      o.nom.toLowerCase() === eleve.nom.toLowerCase() && 
      o.prenom.toLowerCase() === eleve.prenom.toLowerCase()
    );
    if (matchExact) return matchExact;
    
    // Priorité 3 : Recherche floue (une seule correspondance possible)
    const matches = elevesOfficiels.filter(o => 
      o.nom.toLowerCase().includes(eleve.nom.toLowerCase()) ||
      eleve.nom.toLowerCase().includes(o.nom.toLowerCase())
    );
    if (matches.length === 1) return matches[0];
    
    return null;
  };

  const handleAutoCorrespondance = () => {
    const nouvellesCorrespondances = correspondances.map(c => {
      if (c.statut !== 'pending') return c;
      
      const match = rechercherCorrespondanceAuto(c.elevePersonnel);
      if (match) {
        return {
          ...c,
          eleveOfficielId: match.id,
          eleveOfficielNom: `${match.prenom} ${match.nom}`,
          statut: 'auto'
        };
      }
      return c;
    });
    
    setCorrespondances(nouvellesCorrespondances);
    Alert.alert('Succès', 'Recherche automatique terminée');
  };

  const handleCorrespondanceManuelle = (correspondance: Correspondance, eleveOfficielId: string) => {
    const officiel = elevesOfficiels.find(o => o.id === eleveOfficielId);
    const nouvellesCorrespondances = correspondances.map(c => {
      if (c.elevePersonnel.index === correspondance.elevePersonnel.index) {
        return {
          ...c,
          eleveOfficielId,
          eleveOfficielNom: officiel ? `${officiel.prenom} ${officiel.nom}` : null,
          statut: 'manuel'
        };
      }
      return c;
    });
    setCorrespondances(nouvellesCorrespondances);
    setModalVisible(false);
    setSelectedEleve(null);
  };

  const handleIgnorer = (correspondance: Correspondance) => {
    const nouvellesCorrespondances = correspondances.map(c => {
      if (c.elevePersonnel.index === correspondance.elevePersonnel.index) {
        return { ...c, statut: 'ignore' };
      }
      return c;
    });
    setCorrespondances(nouvellesCorrespondances);
  };

  const handleValider = async () => {
    const nonCorrespondus = correspondances.filter(c => c.statut === 'pending');
    if (nonCorrespondus.length > 0) {
      Alert.alert(
        'Correspondance incomplète',
        `${nonCorrespondus.length} élève(s) sans correspondance. Voulez-vous continuer ? Ils seront ignorés.`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Continuer', onPress: () => sauvegarderCorrespondances() }
        ]
      );
    } else {
      sauvegarderCorrespondances();
    }
  };

  const sauvegarderCorrespondances = async () => {
    try {
      for (const c of correspondances) {
        if (c.statut === 'auto' || c.statut === 'manuel') {
          // Vérifier si une correspondance existe déjà
          const { data: existante } = await supabase
            .from('correspondance_eleves')
            .select('id')
            .eq('classe_personnelle_id', classePersonnelleId)
            .eq('eleve_personnel_nom', c.elevePersonnel.nom)
            .eq('eleve_personnel_prenom', c.elevePersonnel.prenom)
            .maybeSingle();
          
          if (existante) {
            await supabase
              .from('correspondance_eleves')
              .update({
                eleve_officiel_id: c.eleveOfficielId,
                statut: 'active',
                updated_at: new Date().toISOString()
              })
              .eq('id', existante.id);
          } else {
            await supabase
              .from('correspondance_eleves')
              .insert({
                classe_personnelle_id: classePersonnelleId,
                eleve_personnel_nom: c.elevePersonnel.nom,
                eleve_personnel_prenom: c.elevePersonnel.prenom,
                eleve_personnel_matricule: c.elevePersonnel.matricule,
                eleve_officiel_id: c.eleveOfficielId,
                enseignant_id: (await supabase.auth.getUser()).data.user?.id,
                statut: 'active'
              });
          }
        }
      }
      
      Alert.alert('Succès', 'Correspondances enregistrées');
      onComplete();
    } catch (error) {
      console.error('Error saving correspondences:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer les correspondances');
    }
  };

  if (loading) {
    return (
      <Card style={styles.card}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement des élèves...</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>👥 Étape 2 : Correspondance des élèves</Text>
      <Text style={styles.subtitle}>
        Associez chaque élève personnel à un élève officiel de la classe
      </Text>
      
      <TouchableOpacity style={styles.autoButton} onPress={handleAutoCorrespondance}>
        <Search size={16} color="#FFFFFF" />
        <Text style={styles.autoButtonText}>Recherche automatique</Text>
      </TouchableOpacity>
      
      <ScrollView style={styles.listContainer}>
        {correspondances.map((correspondance) => (
          <View key={correspondance.elevePersonnel.index} style={styles.eleveRow}>
            <View style={styles.eleveInfo}>
              <Text style={styles.eleveNom}>
                {correspondance.elevePersonnel.prenom} {correspondance.elevePersonnel.nom}
              </Text>
              {correspondance.elevePersonnel.matricule && (
                <Text style={styles.eleveMatricule}>Matricule: {correspondance.elevePersonnel.matricule}</Text>
              )}
            </View>
            
            <View style={styles.eleveStatus}>
              {correspondance.statut === 'auto' && (
                <View style={styles.statusAuto}>
                  <CheckCircle size={14} color="#10B981" />
                  <Text style={styles.statusAutoText}>Auto: {correspondance.eleveOfficielNom}</Text>
                </View>
              )}
              {correspondance.statut === 'manuel' && (
                <View style={styles.statusManuel}>
                  <UserCheck size={14} color="#3B82F6" />
                  <Text style={styles.statusManuelText}>Manuel: {correspondance.eleveOfficielNom}</Text>
                </View>
              )}
              {correspondance.statut === 'ignore' && (
                <View style={styles.statusIgnore}>
                  <XCircle size={14} color="#EF4444" />
                  <Text style={styles.statusIgnoreText}>Ignoré</Text>
                </View>
              )}
              {correspondance.statut === 'pending' && (
                <View style={styles.statusPending}>
                  <AlertCircle size={14} color="#F59E0B" />
                  <Text style={styles.statusPendingText}>En attente</Text>
                </View>
              )}
            </View>
            
            {correspondance.statut !== 'ignore' && correspondance.statut !== 'auto' && (
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => {
                  setSelectedEleve(correspondance);
                  setModalVisible(true);
                }}
              >
                <Text style={styles.editButtonText}>Modifier</Text>
              </TouchableOpacity>
            )}
            
            {correspondance.statut !== 'ignore' && correspondance.statut !== 'auto' && (
              <TouchableOpacity
                style={styles.ignoreButton}
                onPress={() => handleIgnorer(correspondance)}
              >
                <Text style={styles.ignoreButtonText}>Ignorer</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
      
      <TouchableOpacity style={styles.validateButton} onPress={handleValider}>
        <CheckCircle size={18} color="#FFFFFF" />
        <Text style={styles.validateButtonText}>Valider les correspondances</Text>
      </TouchableOpacity>
      
      {/* Modal de sélection manuelle */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choisir un élève officiel</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher..."
              value={recherche}
              onChangeText={setRecherche}
            />
            <ScrollView style={styles.modalList}>
              {elevesOfficiels
                .filter(o => 
                  `${o.prenom} ${o.nom}`.toLowerCase().includes(recherche.toLowerCase())
                )
                .map(o => (
                  <TouchableOpacity
                    key={o.id}
                    style={styles.modalItem}
                    onPress={() => handleCorrespondanceManuelle(selectedEleve!, o.id)}
                  >
                    <Text>{o.prenom} {o.nom}</Text>
                    {o.matricule && <Text style={styles.modalItemMatricule}>Matricule: {o.matricule}</Text>}
                  </TouchableOpacity>
                ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalClose} onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  autoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8B5CF6',
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  autoButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  listContainer: {
    maxHeight: 400,
  },
  eleveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  eleveInfo: {
    flex: 2,
  },
  eleveNom: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  eleveMatricule: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  eleveStatus: {
    flex: 2,
    marginLeft: 8,
  },
  statusAuto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusAutoText: {
    fontSize: 12,
    color: '#10B981',
  },
  statusManuel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusManuelText: {
    fontSize: 12,
    color: '#3B82F6',
  },
  statusIgnore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusIgnoreText: {
    fontSize: 12,
    color: '#EF4444',
  },
  statusPending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusPendingText: {
    fontSize: 12,
    color: '#F59E0B',
  },
  editButton: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  editButtonText: {
    fontSize: 12,
    color: '#3B82F6',
  },
  ignoreButton: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  ignoreButtonText: {
    fontSize: 12,
    color: '#EF4444',
  },
  validateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 16,
  },
  validateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  modalList: {
    maxHeight: 300,
  },
  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalItemMatricule: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  modalClose: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  modalCloseText: {
    fontSize: 14,
    color: '#6B7280',
  },
});