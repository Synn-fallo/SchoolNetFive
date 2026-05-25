import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveEtablissement } from '@/hooks/useActiveEtablissement';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import theme from '@/constants/theme';
import { Megaphone, Send, Users, UserCheck, School, Edit2, Trash2, X, MessageCircle, Eye, Calendar } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Annonce {
  id: string;
  titre: string;
  contenu: string;
  type: string;
  visibilite: string;
  etablissement_id: string;
  classe_id?: string;
  publie_par_id: string;
  est_publiee: boolean;
  est_epingle: boolean;
  date_debut?: string;
  date_fin?: string;
  created_at: string;
  publie_par_nom?: string;
  publie_par_prenom?: string;
  // Nouveaux champs
  commentaires_actifs?: boolean;
  visibilite_commentaires?: string;
  afficher_accuse_lecture?: boolean;
}

const CIBLES = [
  { id: 'eleves', label: 'Élèves', icon: Users },
  { id: 'parents', label: 'Parents', icon: UserCheck },
  { id: 'enseignants', label: 'Enseignants', icon: School },
];

export default function CommunicationOfficielleScreen() {
  const { user } = useAuth();
  const { activeEtablissement, loading: etablissementLoading } = useActiveEtablissement();
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    titre: '',
    contenu: '',
    cibles: [] as string[],
    commentaires_actifs: false,
    visibilite_commentaires: 'masques',
    afficher_accuse_lecture: false,
    date_desactivation: null as string | null,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const chargerAnnonces = useCallback(async () => {
    if (!activeEtablissement) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('annonces_institutionnelles')
        .select('*')
        .eq('etablissement_id', activeEtablissement.id)
        .order('est_epingle', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const publieurIds = [...new Set((data || []).map(a => a.publie_par_id))];
      let profilesMap: Record<string, { nom: string; prenom: string }> = {};

      if (publieurIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, nom, prenom')
          .in('id', publieurIds);

        if (profiles) {
          profilesMap = profiles.reduce((acc, p) => {
            acc[p.id] = { nom: p.nom || '', prenom: p.prenom || '' };
            return acc;
          }, {});
        }
      }

      const formatted = (data || []).map((item: any) => ({
        ...item,
        publie_par_nom: profilesMap[item.publie_par_id]?.nom,
        publie_par_prenom: profilesMap[item.publie_par_id]?.prenom,
        commentaires_actifs: item.commentaires_actifs ?? false,
        visibilite_commentaires: item.visibilite_commentaires ?? 'masques',
        afficher_accuse_lecture: item.afficher_accuse_lecture ?? false,
      }));

      setAnnonces(formatted);
    } catch (error) {
      console.error('Erreur chargement:', error);
      Alert.alert('Erreur', 'Impossible de charger les annonces');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeEtablissement]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    chargerAnnonces();
  }, [chargerAnnonces]);

  useEffect(() => {
    if (activeEtablissement) {
      chargerAnnonces();
    } else if (!etablissementLoading && !activeEtablissement) {
      setLoading(false);
    }
  }, [activeEtablissement, etablissementLoading, chargerAnnonces]);

  // ✅ Sélection multiple : on ajoute ou retire la cible du tableau
  const handleToggleCible = (cibleId: string) => {
    setFormData(prev => {
      const isSelected = prev.cibles.includes(cibleId);
      if (isSelected) {
        return { ...prev, cibles: prev.cibles.filter(c => c !== cibleId) };
      } else {
        return { ...prev, cibles: [...prev.cibles, cibleId] };
      }
    });
  };

  const handleSubmit = async () => {
    if (!formData.titre.trim() || !formData.contenu.trim() || formData.cibles.length === 0) {
      Alert.alert('Information', 'Veuillez remplir tous les champs et sélectionner au moins un public cible.');
      return;
    }

    if (!activeEtablissement || !user) {
      Alert.alert('Erreur', 'Établissement ou utilisateur non trouvé');
      return;
    }

    setSubmitting(true);

    try {
      const { data: profil, error: profilError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (profilError || !profil) {
        Alert.alert('Erreur', 'Profil utilisateur non trouvé');
        setSubmitting(false);
        return;
      }

      const visibilite = formData.cibles.length === 1 ? formData.cibles[0] : 'tous';

      const annonceData = {
        titre: formData.titre.trim(),
        contenu: formData.contenu.trim(),
        type: 'etablissement',
        visibilite: visibilite,
        etablissement_id: activeEtablissement.id,
        publie_par_id: profil.id,
        est_publiee: false,
        est_epingle: false,
        commentaires_actifs: formData.commentaires_actifs,
        visibilite_commentaires: formData.visibilite_commentaires,
        afficher_accuse_lecture: formData.afficher_accuse_lecture,
        date_desactivation: formData.date_desactivation,
      };

      if (editingId) {
        const { error } = await supabase
          .from('annonces_institutionnelles')
          .update(annonceData)
          .eq('id', editingId);

        if (error) throw error;
        Alert.alert('Succès', 'L\'annonce a été mise à jour.');
      } else {
        const { error } = await supabase
          .from('annonces_institutionnelles')
          .insert(annonceData);

        if (error) throw error;
        Alert.alert('Succès', 'L\'annonce a été enregistrée comme brouillon.');
      }

      resetForm();
      chargerAnnonces();
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder l\'annonce');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      titre: '',
      contenu: '',
      cibles: [],
      commentaires_actifs: false,
      visibilite_commentaires: 'masques',
      afficher_accuse_lecture: false,
      date_desactivation: null,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (annonce: Annonce) => {
    let cibles: string[] = [];
    if (annonce.visibilite === 'tous') {
      cibles = ['eleves', 'parents', 'enseignants'];
    } else {
      cibles = [annonce.visibilite];
    }
    
    setFormData({
      titre: annonce.titre,
      contenu: annonce.contenu,
      cibles: cibles,
      commentaires_actifs: annonce.commentaires_actifs ?? false,
      visibilite_commentaires: annonce.visibilite_commentaires ?? 'masques',
      afficher_accuse_lecture: annonce.afficher_accuse_lecture ?? false,
      date_desactivation: annonce.date_fin || null,
    });
    setEditingId(annonce.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Confirmation',
      'Voulez-vous vraiment supprimer cette annonce ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('annonces_institutionnelles')
                .delete()
                .eq('id', id);

              if (error) throw error;
              chargerAnnonces();
              Alert.alert('Succès', 'Annonce supprimée');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer');
            }
          },
        },
      ]
    );
  };

  const handlePublish = async (id: string) => {
    try {
      const { data: annonce, error: fetchError } = await supabase
        .from('annonces_institutionnelles')
        .select('titre, contenu, visibilite, etablissement_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { error: updateError } = await supabase
        .from('annonces_institutionnelles')
        .update({ est_publiee: true })
        .eq('id', id);

      if (updateError) throw updateError;

      try {
        await supabase.functions.invoke('notifications-parent', {
          body: {
            type: 'NOUVELLE_ANNONCE',
            data: {
              titre: annonce.titre,
              contenu: annonce.contenu,
              visibilite: annonce.visibilite,
              etablissement_id: annonce.etablissement_id,
            },
            canal: 'BOTH',
          },
        });
      } catch (notifError) {
        console.warn('Erreur envoi notification:', notifError);
      }

      chargerAnnonces();
      Alert.alert('Succès', 'L\'annonce a été publiée et les notifications ont été envoyées.');
    } catch (error) {
      console.error('Erreur publication:', error);
      Alert.alert('Erreur', 'Impossible de publier l\'annonce');
    }
  };

  const getCiblesLabels = (visibilite: string) => {
    if (visibilite === 'tous') return 'Élèves, Parents, Enseignants';
    switch(visibilite) {
      case 'eleves': return 'Élèves';
      case 'parents': return 'Parents';
      case 'enseignants': return 'Enseignants';
      default: return visibilite;
    }
  };

  const getStatutStyle = (est_publiee: boolean) => {
    return est_publiee
      ? { backgroundColor: theme.colors.success.DEFAULT + '20', color: theme.colors.success.DEFAULT }
      : { backgroundColor: theme.colors.neutral[200], color: theme.colors.neutral[600] };
  };

  // Écran de chargement initial
  if (etablissementLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement de l'établissement...</Text>
      </View>
    );
  }

  if (!activeEtablissement) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Aucun établissement actif</Text>
        <Text style={styles.errorSubtext}>Veuillez sélectionner un établissement dans le sélecteur.</Text>
      </View>
    );
  }

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Chargement des annonces...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Megaphone size={28} color={theme.colors.primary.DEFAULT} />
          <View>
            <Text style={styles.title}>Communication officielle</Text>
            <Text style={styles.subtitle}>
              {activeEtablissement?.nom || 'Établissement'} – Annonces institutionnelles
            </Text>
          </View>
        </View>
        <Button
          title="Nouvelle annonce"
          onPress={() => setShowForm(true)}
          variant="primary"
          size="small"
        />
      </View>

      {/* Modal du formulaire avec KeyboardAvoidingView et ScrollView */}
      {showForm && (
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalKeyboardView}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingId ? 'Modifier l\'annonce' : 'Nouvelle annonce'}
                </Text>
                <TouchableOpacity onPress={resetForm} style={styles.modalCloseButton}>
                  <X size={24} color={theme.colors.neutral[600]} />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.modalScrollView}
                contentContainerStyle={styles.modalScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Card style={styles.formCard}>
                  <TextInput
                    style={styles.input}
                    placeholder="Titre de l'annonce"
                    placeholderTextColor={theme.colors.neutral[400]}
                    value={formData.titre}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, titre: text }))}
                  />

                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Contenu de l'annonce"
                    placeholderTextColor={theme.colors.neutral[400]}
                    multiline
                    numberOfLines={6}
                    textAlignVertical="top"
                    value={formData.contenu}
                    onChangeText={(text) => setFormData(prev => ({ ...prev, contenu: text }))}
                  />

                  <Text style={styles.ciblesLabel}>Public cible * :</Text>
                  <View style={styles.ciblesContainer}>
                    {CIBLES.map((cible) => {
                      const Icon = cible.icon;
                      const isSelected = formData.cibles.includes(cible.id);
                      return (
                        <TouchableOpacity
                          key={cible.id}
                          style={[styles.cibleChip, isSelected && styles.cibleChipSelected]}
                          onPress={() => handleToggleCible(cible.id)}
                        >
                          <Icon size={16} color={isSelected ? '#FFFFFF' : theme.colors.neutral[600]} />
                          <Text style={[styles.cibleChipText, isSelected && styles.cibleChipTextSelected]}>
                            {cible.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {formData.cibles.length === 0 && (
                    <Text style={styles.errorCibleText}>Veuillez sélectionner au moins un public cible</Text>
                  )}

                  {/* Section Interactions */}
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>⚙️ Interactions</Text>
                    
                    {/* Commentaires */}
                    <View style={styles.switchRow}>
                      <View style={styles.switchLabel}>
                        <MessageCircle size={18} color={theme.colors.primary.DEFAULT} />
                        <Text style={styles.switchText}>Activer les commentaires</Text>
                      </View>
                      <Switch
                        value={formData.commentaires_actifs}
                        onValueChange={(val) => setFormData(prev => ({ ...prev, commentaires_actifs: val }))}
                        trackColor={{ false: '#E5E7EB', true: theme.colors.primary.DEFAULT }}
                      />
                    </View>

                    {formData.commentaires_actifs && (
                      <View style={styles.switchRow}>
                        <View style={styles.switchLabel}>
                          <Eye size={18} color={theme.colors.primary.DEFAULT} />
                          <Text style={styles.switchText}>Visibilité des commentaires</Text>
                        </View>
                        <View style={styles.radioGroup}>
                          <TouchableOpacity
                            style={[styles.radioButton, formData.visibilite_commentaires === 'masques' && styles.radioButtonActive]}
                            onPress={() => setFormData(prev => ({ ...prev, visibilite_commentaires: 'masques' }))}
                          >
                            <Text style={[styles.radioText, formData.visibilite_commentaires === 'masques' && styles.radioTextActive]}>
                              Masqués
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.radioButton, formData.visibilite_commentaires === 'visibles' && styles.radioButtonActive]}
                            onPress={() => setFormData(prev => ({ ...prev, visibilite_commentaires: 'visibles' }))}
                          >
                            <Text style={[styles.radioText, formData.visibilite_commentaires === 'visibles' && styles.radioTextActive]}>
                              Visibles
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* Accusé de lecture */}
                    <View style={styles.switchRow}>
                      <View style={styles.switchLabel}>
                        <Eye size={18} color={theme.colors.primary.DEFAULT} />
                        <Text style={styles.switchText}>Demander un accusé de lecture</Text>
                      </View>
                      <Switch
                        value={formData.afficher_accuse_lecture}
                        onValueChange={(val) => setFormData(prev => ({ ...prev, afficher_accuse_lecture: val }))}
                        trackColor={{ false: '#E5E7EB', true: theme.colors.primary.DEFAULT }}
                      />
                    </View>

                    {/* Date de désactivation */}
                    <View style={styles.switchRow}>
                      <View style={styles.switchLabel}>
                        <Calendar size={18} color={theme.colors.primary.DEFAULT} />
                        <Text style={styles.switchText}>Date de désactivation automatique</Text>
                      </View>
                      <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                        <Text style={styles.dateButtonText}>
                          {formData.date_desactivation ? new Date(formData.date_desactivation).toLocaleDateString('fr-FR') : 'Aucune'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {showDatePicker && (
                      <DateTimePicker
                        value={formData.date_desactivation ? new Date(formData.date_desactivation) : new Date()}
                        mode="date"
                        display="default"
                        onChange={(event, selectedDate) => {
                          setShowDatePicker(false);
                          if (selectedDate) {
                            setFormData(prev => ({ ...prev, date_desactivation: selectedDate.toISOString() }));
                          }
                        }}
                        minimumDate={new Date()}
                      />
                    )}
                  </View>

                  <View style={styles.formActions}>
                    <Button 
                      title="Annuler" 
                      onPress={resetForm} 
                      variant="secondary" 
                      style={styles.formButton} 
                    />
                    <Button 
                      title={editingId ? 'Mettre à jour' : 'Enregistrer'} 
                      onPress={handleSubmit} 
                      variant="primary" 
                      style={styles.formButton}
                      isLoading={submitting}
                    />
                  </View>
                </Card>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      )}

      <ScrollView
        style={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        <Text style={styles.sectionTitle}>Annonces</Text>
        {annonces.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Aucune annonce</Text>
            <Text style={styles.emptyText}>
              Aucune annonce n'a encore été créée pour cet établissement.
            </Text>
            <Button
              title="Créer la première annonce"
              onPress={() => setShowForm(true)}
              variant="primary"
              style={styles.emptyButton}
            />
          </Card>
        ) : (
          annonces.map((annonce) => (
            <Card key={annonce.id} style={styles.annonceCard}>
              <View style={styles.annonceHeader}>
                <View style={styles.annonceTitleContainer}>
                  <Text style={styles.annonceTitre}>{annonce.titre}</Text>
                  <View style={[styles.statutBadge, { backgroundColor: getStatutStyle(annonce.est_publiee).backgroundColor }]}>
                    <Text style={[styles.statutText, { color: getStatutStyle(annonce.est_publiee).color }]}>
                      {annonce.est_publiee ? 'Publiée' : 'Brouillon'}
                    </Text>
                  </View>
                </View>
                <View style={styles.annonceActions}>
                  <TouchableOpacity onPress={() => handleEdit(annonce)} style={styles.actionButton}>
                    <Edit2 size={18} color={theme.colors.neutral[500]} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(annonce.id)} style={styles.actionButton}>
                    <Trash2 size={18} color={theme.colors.danger.DEFAULT} />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.annonceContenu}>{annonce.contenu}</Text>

              <View style={styles.annonceFooter}>
                <View style={styles.ciblesList}>
                  <View style={styles.cibleTag}>
                    <Text style={styles.cibleTagText}>{getCiblesLabels(annonce.visibilite)}</Text>
                  </View>
                </View>
                <View style={styles.annonceMeta}>
                  <Text style={styles.annonceDate}>
                    📅 {new Date(annonce.created_at).toLocaleDateString('fr-FR')}
                  </Text>
                  <Text style={styles.annonceAuteur}>
                    👤 {annonce.publie_par_prenom || ''} {annonce.publie_par_nom || 'Direction'}
                  </Text>
                </View>
              </View>

              {!annonce.est_publiee && (
                <TouchableOpacity style={styles.publishButton} onPress={() => handlePublish(annonce.id)}>
                  <Send size={16} color="#FFFFFF" />
                  <Text style={styles.publishButtonText}>Publier</Text>
                </TouchableOpacity>
              )}
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[6],
    paddingTop: theme.spacing[6],
    paddingBottom: theme.spacing[4],
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[3],
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.neutral[800],
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.neutral[500],
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme.colors.neutral[500],
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.danger.DEFAULT,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: theme.colors.neutral[500],
    textAlign: 'center',
  },
  // Styles pour le modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000,
  },
  modalKeyboardView: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
    marginTop: 60,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    backgroundColor: theme.colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.neutral[800],
  },
  modalCloseButton: {
    padding: theme.spacing[1],
  },
  modalScrollView: {
    flex: 1,
  },
  modalScrollContent: {
    padding: theme.spacing[4],
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  formCard: {
    padding: theme.spacing[4],
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
  ciblesLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.neutral[700],
    marginBottom: theme.spacing[2],
  },
  ciblesContainer: {
    flexDirection: 'row',
    gap: theme.spacing[2],
    marginBottom: theme.spacing[2],
    flexWrap: 'wrap',
  },
  cibleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: theme.colors.neutral[100],
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  cibleChipSelected: {
    backgroundColor: theme.colors.primary.DEFAULT,
    borderColor: theme.colors.primary.DEFAULT,
  },
  cibleChipText: {
    fontSize: 13,
    color: theme.colors.neutral[600],
  },
  cibleChipTextSelected: {
    color: '#FFFFFF',
  },
  errorCibleText: {
    fontSize: 12,
    color: theme.colors.danger.DEFAULT,
    marginBottom: theme.spacing[3],
  },
  // Styles pour la section Interactions
  section: {
    marginTop: theme.spacing[4],
    marginBottom: theme.spacing[4],
    paddingTop: theme.spacing[2],
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.neutral[800],
    marginBottom: theme.spacing[3],
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing[3],
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchText: {
    fontSize: 14,
    color: theme.colors.neutral[700],
  },
  radioGroup: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  },
  radioButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: theme.colors.neutral[100],
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  radioButtonActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
    borderColor: theme.colors.primary.DEFAULT,
  },
  radioText: {
    fontSize: 12,
    color: theme.colors.neutral[600],
  },
  radioTextActive: {
    color: '#FFFFFF',
  },
  dateButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.colors.neutral[100],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  dateButtonText: {
    fontSize: 13,
    color: theme.colors.neutral[700],
  },
  formActions: {
    flexDirection: 'row',
    gap: theme.spacing[3],
    marginTop: theme.spacing[2],
  },
  formButton: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: theme.spacing[4],
    paddingBottom: theme.spacing[6],
  },
  annonceCard: {
    marginBottom: theme.spacing[3],
    padding: theme.spacing[4],
  },
  annonceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing[3],
  },
  annonceTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[2],
    flexWrap: 'wrap',
  },
  annonceTitre: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.neutral[800],
  },
  statutBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statutText: {
    fontSize: 10,
    fontWeight: '600',
  },
  annonceActions: {
    flexDirection: 'row',
    gap: theme.spacing[2],
  },
  actionButton: {
    padding: 6,
  },
  annonceContenu: {
    fontSize: 14,
    color: theme.colors.neutral[600],
    lineHeight: 20,
    marginBottom: theme.spacing[3],
  },
  annonceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing[2],
  },
  ciblesList: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  cibleTag: {
    backgroundColor: theme.colors.neutral[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cibleTagText: {
    fontSize: 11,
    color: theme.colors.neutral[600],
  },
  annonceMeta: {
    flexDirection: 'row',
    gap: theme.spacing[3],
  },
  annonceDate: {
    fontSize: 11,
    color: theme.colors.neutral[400],
  },
  annonceAuteur: {
    fontSize: 11,
    color: theme.colors.neutral[400],
  },
  publishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.success.DEFAULT,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: theme.spacing[3],
  },
  publishButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  emptyCard: {
    marginTop: 30,
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    marginTop: 10,
    minWidth: 200,
  },
});