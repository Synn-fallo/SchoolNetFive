import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, ScrollView } from 'react-native';
import { Check, Copy, User, Key, Users } from 'lucide-react-native';
import { useState } from 'react';
import theme from '@/constants/theme';

interface ParentSummary {
  type_lien: string;
  nom: string;
  prenom: string;
  identifiant_connexion?: string;
  mot_de_passe_temp?: string;
  success: boolean;
}

interface EleveCreationSummaryProps {
  visible: boolean;
  onClose: () => void;
  eleve: {
    nom: string;
    prenom: string;
    identifiant_connexion: string;
    motDePasseTemp: string;
    classe_nom?: string;
    parents?: ParentSummary[];
  } | null;
}

export default function EleveCreationSummary({
  visible,
  onClose,
  eleve,
}: EleveCreationSummaryProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      Alert.alert('Erreur', 'Impossible de copier le texte');
    }
  };

  const getTypeLienLabel = (type: string): string => {
    const labels: Record<string, string> = {
      pere: '👨 Père',
      mere: '👩 Mère',
      tuteur: '👨‍🏫 Tuteur',
      autre: '👤 Autre',
    };
    return labels[type] || type;
  };

  // ✅ Vérification de sécurité : si eleve est null, on ne rend rien
  if (!visible || !eleve) {
    return null;
  }

  const hasParents = eleve.parents && eleve.parents.length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
          <View style={styles.modal}>
            {/* En-tête avec icône succès */}
            <View style={styles.header}>
              <View style={styles.successIcon}>
                <Check size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.title}>Élève créé avec succès</Text>
              <Text style={styles.subtitle}>
                Voici les informations de connexion à communiquer
              </Text>
            </View>

            {/* Informations de l'élève */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>📚 Élève</Text>
              <View style={styles.infoContainer}>
                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <User size={18} color={theme.colors.primary.DEFAULT} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Nom complet</Text>
                    <Text style={styles.infoValue}>{eleve.prenom} {eleve.nom}</Text>
                  </View>
                </View>

                {eleve.classe_nom && (
                  <View style={styles.infoRow}>
                    <View style={[styles.infoIcon, styles.infoIconSecondary]}>
                      <Users size={18} color={theme.colors.secondary.DEFAULT} />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Classe</Text>
                      <Text style={styles.infoValue}>{eleve.classe_nom}</Text>
                    </View>
                  </View>
                )}

                <View style={styles.divider} />

                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <User size={18} color={theme.colors.primary.DEFAULT} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Identifiant de connexion</Text>
                    <Text style={styles.infoValue}>{eleve.identifiant_connexion}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => copyToClipboard(eleve.identifiant_connexion, 'identifiant')}
                    style={styles.copyButton}
                  >
                    {copiedField === 'identifiant' ? (
                      <Check size={18} color="#10B981" />
                    ) : (
                      <Copy size={18} color={theme.colors.neutral[400]} />
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoIcon}>
                    <Key size={18} color={theme.colors.secondary.DEFAULT} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Mot de passe temporaire</Text>
                    <Text style={styles.infoValue}>{eleve.motDePasseTemp}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => copyToClipboard(eleve.motDePasseTemp, 'password')}
                    style={styles.copyButton}
                  >
                    {copiedField === 'password' ? (
                      <Check size={18} color="#10B981" />
                    ) : (
                      <Copy size={18} color={theme.colors.neutral[400]} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Informations des parents */}
            {hasParents && (
              <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>👨‍👩‍👧 Parents / Tuteurs</Text>
                {eleve.parents!.map((parent, index) => (
                  <View key={index} style={styles.parentContainer}>
                    <Text style={styles.parentTitle}>{getTypeLienLabel(parent.type_lien)}</Text>
                    <View style={styles.infoContainer}>
                      <View style={styles.infoRow}>
                        <View style={styles.infoIconSmall}>
                          <User size={14} color={theme.colors.neutral[500]} />
                        </View>
                        <View style={styles.infoContent}>
                          <Text style={styles.infoLabelSmall}>Nom complet</Text>
                          <Text style={styles.infoValueSmall}>{parent.prenom} {parent.nom}</Text>
                        </View>
                      </View>

                      {parent.mot_de_passe_temp && (
                        <View style={styles.infoRow}>
                          <View style={styles.infoIconSmall}>
                            <Key size={14} color={theme.colors.neutral[500]} />
                          </View>
                          <View style={styles.infoContent}>
                            <Text style={styles.infoLabelSmall}>Mot de passe temporaire</Text>
                            <Text style={styles.infoValueSmall}>{parent.mot_de_passe_temp}</Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => copyToClipboard(parent.mot_de_passe_temp!, `parent_${index}_password`)}
                            style={styles.copyButtonSmall}
                          >
                            {copiedField === `parent_${index}_password` ? (
                              <Check size={14} color="#10B981" />
                            ) : (
                              <Copy size={14} color={theme.colors.neutral[400]} />
                            )}
                          </TouchableOpacity>
                        </View>
                      )}

                      {parent.identifiant_connexion && (
                        <View style={styles.infoRow}>
                          <View style={styles.infoIconSmall}>
                            <User size={14} color={theme.colors.neutral[500]} />
                          </View>
                          <View style={styles.infoContent}>
                            <Text style={styles.infoLabelSmall}>Identifiant SNET</Text>
                            <Text style={styles.infoValueSmall}>{parent.identifiant_connexion}</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Note importante */}
            <View style={styles.noteContainer}>
              <Text style={styles.noteTitle}>⚠️ À communiquer</Text>
              <Text style={styles.noteText}>
                • Le titulaire du compte devra changer son mot de passe lors de sa première connexion.
              </Text>
              {hasParents && (
                <Text style={styles.noteText}>
                  • Les parents devront également changer leur mot de passe à la première connexion.
                </Text>
              )}
              <Text style={styles.noteText}>
                • En cas de perte avant première connexion, vous pouvez réinitialiser depuis leur profil.
              </Text>
            </View>

            {/* Bouton fermer */}
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
    padding: 20,
  },
  modalScroll: {
    width: '100%',
    maxHeight: '90%',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 450,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    alignSelf: 'center',
  },
  header: {
    backgroundColor: theme.colors.primary.DEFAULT,
    padding: 24,
    alignItems: 'center',
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#BFDBFE',
    textAlign: 'center',
  },
  sectionContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  infoContainer: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIconSecondary: {
    backgroundColor: '#FEF3C7',
  },
  infoIconSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  infoLabelSmall: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 1,
  },
  infoValueSmall: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
  },
  copyButton: {
    padding: 8,
  },
  copyButtonSmall: {
    padding: 6,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 10,
  },
  parentContainer: {
    marginBottom: 16,
  },
  parentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary.DEFAULT,
    marginBottom: 8,
  },
  noteContainer: {
    backgroundColor: '#FEF3C7',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 20,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  noteTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 6,
  },
  noteText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  closeButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});