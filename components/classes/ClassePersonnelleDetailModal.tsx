import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { X, Users, FileText, UserPlus, BookOpen, Download, Link2, Building2 } from 'lucide-react-native';
import { Card } from '@/components/Card';
import GestionElevesPersonnels from './GestionElevesPersonnels';
import GestionMatieresPersonnelles from './GestionMatieresPersonnelles';
import RattachementAssistant from './RattachementAssistant';
import { exportClassePersonnelleDetail } from '@/utils/exportCSV';
import theme from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface ClassePersonnelleDetailModalProps {
  visible: boolean;
  classeId: string;
  onClose: () => void;
  onRefresh: () => void;
}

type TabType = 'eleves' | 'matieres';

export default function ClassePersonnelleDetailModal({
  visible,
  classeId,
  onClose,
  onRefresh
}: ClassePersonnelleDetailModalProps) {
  const { user, isAffiliated } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('eleves');
  const [classe, setClasse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showRattachement, setShowRattachement] = useState(false);

  // Vérifier si l'enseignant est affilié (a un établissement)
  const peutRattacher = isAffiliated && classe?.rattachee_a === null;

  useEffect(() => {
    if (visible && classeId) {
      loadClasse();
    }
  }, [visible, classeId]);

  const loadClasse = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('classes_personnelles')
        .select('*')
        .eq('id', classeId)
        .single();

      if (error) throw error;
      setClasse(data);
    } catch (error) {
      console.error('Error loading class:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (classe) {
      exportClassePersonnelleDetail(classe, true, true);
      Alert.alert('Succès', 'Export des données lancé');
    }
  };

  const handleRefresh = () => {
    loadClasse();
    onRefresh();
  };

  const handleRattachementSuccess = () => {
    setShowRattachement(false);
    loadClasse();
    onRefresh();
    Alert.alert('Succès', 'La classe a été rattachée avec succès');
  };

  if (!classe) return null;

  const isRattachee = classe.rattachee_a !== null && classe.rattachee_a !== undefined;

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{classe.nom}</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity onPress={handleExport} style={styles.iconButton}>
                <Download size={20} color={theme.colors.primary.DEFAULT} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.iconButton}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          {classe.description && (
            <Text style={styles.description}>{classe.description}</Text>
          )}

          {classe.etablissement_nom && (
            <View style={styles.etablissementContainer}>
              <Building2 size={14} color="#6B7280" />
              <Text style={styles.etablissementText}>{classe.etablissement_nom}</Text>
            </View>
          )}

          {/* Badge de rattachement */}
          {isRattachee && (
            <View style={styles.rattacheBadgeContainer}>
              <View style={styles.rattacheBadge}>
                <Link2 size={12} color="#FFFFFF" />
                <Text style={styles.rattacheBadgeText}>Déjà rattachée</Text>
              </View>
            </View>
          )}

          {/* Bouton Rattacher (uniquement si non rattachée et enseignant affilié) */}
          {peutRattacher && !isRattachee && (
            <TouchableOpacity
              style={styles.rattacherButton}
              onPress={() => setShowRattachement(true)}
            >
              <Link2 size={16} color="#FFFFFF" />
              <Text style={styles.rattacherButtonText}>Rattacher à l'établissement</Text>
            </TouchableOpacity>
          )}

          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'eleves' && styles.tabActive]}
              onPress={() => setActiveTab('eleves')}
            >
              <Users size={16} color={activeTab === 'eleves' ? '#FFFFFF' : '#6B7280'} />
              <Text style={[styles.tabText, activeTab === 'eleves' && styles.tabTextActive]}>
                Élèves ({classe.eleves?.length || 0})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'matieres' && styles.tabActive]}
              onPress={() => setActiveTab('matieres')}
            >
              <BookOpen size={16} color={activeTab === 'matieres' ? '#FFFFFF' : '#6B7280'} />
              <Text style={[styles.tabText, activeTab === 'matieres' && styles.tabTextActive]}>
                Matières ({classe.matieres?.length || 0})
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {loading ? (
              <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
            ) : (
              <>
                {activeTab === 'eleves' && (
                  <GestionElevesPersonnels
                    classeId={classeId}
                    eleves={classe.eleves || []}
                    onRefresh={handleRefresh}
                  />
                )}
                {activeTab === 'matieres' && (
                  <GestionMatieresPersonnelles
                    classeId={classeId}
                    matieres={classe.matieres || []}
                    onRefresh={handleRefresh}
                  />
                )}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Assistant de rattachement */}
      <RattachementAssistant
        visible={showRattachement}
        classePersonnelleId={classeId}
        classePersonnelleNom={classe.nom}
        elevesPersonnels={classe.eleves || []}
        onClose={() => setShowRattachement(false)}
        onSuccess={handleRattachementSuccess}
      />
    </>
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
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  etablissementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  etablissementText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  rattacheBadgeContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  rattacheBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  rattacheBadgeText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  rattacherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary.DEFAULT,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  rattacherButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  tabActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  tabText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
});