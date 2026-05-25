import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Send, Building2, Landmark, Handshake, Upload, FileText, Eye, ChevronLeft } from 'lucide-react-native';
import { useInstitutionalRequest, InstitutionalRole } from '@/hooks/useInstitutionalRequest';
import CertificationCheckbox from './CertificationCheckbox';
import InstitutionalRequestPreview from './InstitutionalRequestPreview';
import Toast from '@/components/ui/Toast';
import theme from '@/constants/theme';

interface InstitutionalRequestFormProps {
  role: InstitutionalRole;
  onSuccess?: () => void;
}

export default function InstitutionalRequestForm({ role, onSuccess }: InstitutionalRequestFormProps) {
  const { user, profile } = useAuth();
  const router = useRouter();
  const { submitRequest, uploading, loading, getRoleLabel, getJustificatifsDescription } = useInstitutionalRequest({ role });
  const [certified, setCertified] = useState(false);
  const [justificatifFile, setJustificatifFile] = useState<File | null>(null);
  const [justificatifName, setJustificatifName] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('success');
  const [formData, setFormData] = useState<any>({});

  const getRoleConfig = () => {
    switch (role) {
      case 'chef_etablissement':
        return {
          title: 'Demande de rôle Chef d\'établissement',
          subtitle: 'Rôle : Chef d\'établissement',
          description: 'Remplissez ce formulaire pour demander le rôle de Chef d\'établissement. Après validation, vous pourrez créer votre établissement.',
          icon: Building2,
          iconColor: '#3B82F6',
          fields: [],
        };
      case 'autorite':
        return {
          title: 'Demande de rôle Autorité',
          subtitle: 'Rôle : Autorité institutionnelle',
          description: 'Remplissez ce formulaire pour demander un compte Autorité (Ministère, Direction, etc.).',
          icon: Landmark,
          iconColor: '#8B5CF6',
          fields: [
            { key: 'institution_nom', label: 'Nom de l\'institution', placeholder: 'Ex: Ministère de l\'Éducation', required: true },
            { key: 'fonction', label: 'Fonction', placeholder: 'Votre fonction au sein de l\'institution', required: true },
          ],
        };
      case 'partenaire':
        return {
          title: 'Demande de rôle Partenaire',
          subtitle: 'Rôle : Partenaire SchoolNet',
          description: 'Remplissez ce formulaire pour devenir partenaire de SchoolNet.',
          icon: Handshake,
          iconColor: '#10B981',
          fields: [
            { key: 'organisation_nom', label: 'Nom de l\'organisation', placeholder: 'Ex: UNICEF, Orange, ...', required: true },
            { key: 'secteur', label: 'Secteur d\'activité', placeholder: 'Ex: Télécommunications, ONG, Édition...', required: true },
          ],
        };
      default:
        return null;
    }
  };

  const config = getRoleConfig();
  if (!config) return null;

  const handleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,.pdf';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setJustificatifFile(file);
        setJustificatifName(file.name);
      }
    };
    input.click();
  };

  const handleSubmit = async () => {
    const missingFields = config.fields.filter(f => f.required && !formData[f.key]);
    if (missingFields.length > 0) {
      Alert.alert('Champs manquants', 'Veuillez remplir tous les champs obligatoires.');
      return;
    }

    if (!certified) {
      Alert.alert('Certification requise', 'Vous devez certifier sur l\'honneur l\'exactitude des informations fournies.');
      return;
    }

    if (!justificatifFile) {
      Alert.alert('Justificatif requis', `Veuillez joindre un justificatif. ${getJustificatifsDescription(role)}`);
      return;
    }

    const success = await submitRequest(formData, justificatifFile);

    if (success) {
      setToastMessage(`Votre demande de rôle ${getRoleLabel(role)} a bien été envoyée. Vous serez notifié de sa validation.`);
      setToastType('success');
      setShowToast(true);
      
      setTimeout(() => {
        router.push('/(app)');
        if (onSuccess) onSuccess();
      }, 2000);
    } else {
      setToastMessage('Une erreur est survenue. Veuillez réessayer.');
      setToastType('error');
      setShowToast(true);
    }
  };

  const updateField = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <>
      <Toast
        visible={showToast}
        message={toastMessage}
        type={toastType}
        onHide={() => setShowToast(false)}
      />
      
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.colors.neutral[600]} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Demande institutionnelle</Text>
          <Text style={styles.headerSubtitle}>{config.title}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📌 Informations du demandeur</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Nom complet</Text>
              <Text style={styles.infoValue}>{profile?.prenom} {profile?.nom}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email}</Text>
            </View>
            {profile?.telephone && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Téléphone</Text>
                <Text style={styles.infoValue}>{profile.telephone}</Text>
              </View>
            )}
          </View>
        </View>

        {config.fields.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📌 Informations complémentaires</Text>
            <Text style={styles.sectionDescription}>{config.description}</Text>
            
            {config.fields.map((field) => (
              <View key={field.key} style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>
                  {field.label}
                  {field.required && <Text style={styles.requiredStar}> *</Text>}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder={field.placeholder}
                  value={formData[field.key] || ''}
                  onChangeText={(value) => updateField(field.key, value)}
                />
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📌 Pièces justificatives</Text>
          <Text style={styles.sectionDescription}>
            {getJustificatifsDescription(role)}
          </Text>
          <TouchableOpacity 
            style={[styles.uploadButton, justificatifFile && styles.uploadButtonSuccess]}
            onPress={handleFileUpload}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : justificatifFile ? (
              <>
                <FileText size={18} color="#FFFFFF" />
                <Text style={styles.uploadButtonText}>{justificatifName}</Text>
              </>
            ) : (
              <>
                <Upload size={18} color="#FFFFFF" />
                <Text style={styles.uploadButtonText}>Télécharger un justificatif</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📌 Message complémentaire (optionnel)</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Ajoutez toute information complémentaire que vous jugez utile..."
            value={formData.message || ''}
            onChangeText={(value) => updateField('message', value)}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.section}>
          <CertificationCheckbox 
            checked={certified}
            onToggle={() => setCertified(!certified)}
          />
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.previewButton} onPress={() => setShowPreview(true)}>
            <Eye size={18} color={theme.colors.primary.DEFAULT} />
            <Text style={styles.previewButtonText}>Prévisualiser</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Send size={18} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Envoyer la demande</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footerNote}>
          Une copie de cette demande vous sera adressée par email. 
          Vous serez notifié de l'avancement de votre dossier.
        </Text>
      </ScrollView>

      <Modal
        visible={showPreview}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPreview(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPreview(false)} style={styles.modalBackButton}>
              <ChevronLeft size={24} color={theme.colors.neutral[800]} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Prévisualisation</Text>
            <View style={{ width: 40 }} />
          </View>
          <InstitutionalRequestPreview
            role={role}
            formData={formData}
            userName={`${profile?.prenom} ${profile?.nom}`}
            userEmail={user?.email || ''}
            userPhone={profile?.telephone}
            justificatifName={justificatifName || undefined}
          />
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowPreview(false)}>
              <Text style={styles.modalCloseButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  backButton: {
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.neutral[800],
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme.colors.neutral[500],
  },
  section: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    ...theme.shadows.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.neutral[800],
    marginBottom: 16,
  },
  sectionDescription: {
    fontSize: 13,
    color: theme.colors.neutral[500],
    marginBottom: 16,
    lineHeight: 18,
  },
  infoGrid: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[100],
  },
  infoLabel: {
    fontSize: 13,
    color: theme.colors.neutral[500],
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.neutral[800],
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.neutral[700],
    marginBottom: 8,
  },
  requiredStar: {
    color: theme.colors.danger.DEFAULT,
  },
  input: {
    backgroundColor: theme.colors.background.primary,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.neutral[800],
  },
  textArea: {
    backgroundColor: theme.colors.background.primary,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.neutral[800],
    minHeight: 100,
    textAlignVertical: 'top',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  uploadButtonSuccess: {
    backgroundColor: theme.colors.success.DEFAULT,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  previewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: theme.colors.primary.DEFAULT,
  },
  previewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary.DEFAULT,
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: 12,
    paddingVertical: 14,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footerNote: {
    fontSize: 11,
    color: theme.colors.neutral[400],
    textAlign: 'center',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.background.primary,
  },
  modalBackButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.neutral[800],
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.background.primary,
  },
  modalCloseButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});