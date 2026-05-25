import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Linking } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Send, CheckCircle, XCircle, FileText, Upload, ChevronLeft, ChevronRight, Search } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { generateIdentifiantConnexion } from '@/utils/identifiantUtils';
import theme from '@/constants/theme';

interface FormData {
  // Étape 1 - Identité élève
  codeEtablissement: string;
  educmaster: string;
  nom: string;
  prenom: string;
  dateNaissance: string;
  lieuNaissance: string;
  // Étape 2 - Parents
  parentNom: string;
  parentPrenom: string;
  parentEmail: string;
  parentTelephone: string;
  lienParente: 'pere' | 'mere' | 'tuteur';
  justificatifUrl: string | null;
  justificatifName: string | null;
  // Étape 3 - Engagement
  declarationHonneur: boolean;
  acceptationCharte: boolean;
}

export default function EleveRoleForm() {
  const { user } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [codeValide, setCodeValide] = useState(false);
  const [educmasterValide, setEducmasterValide] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    codeEtablissement: '',
    educmaster: '',
    nom: '',
    prenom: '',
    dateNaissance: '',
    lieuNaissance: '',
    parentNom: '',
    parentPrenom: '',
    parentEmail: '',
    parentTelephone: '',
    lienParente: 'pere',
    justificatifUrl: null,
    justificatifName: null,
    declarationHonneur: false,
    acceptationCharte: false,
  });

  const totalSteps = 3;

  const updateField = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const verifierCodeEtablissement = async () => {
    if (!formData.codeEtablissement.trim()) {
      Alert.alert('Erreur', 'Veuillez saisir un code établissement');
      return;
    }

    setVerifying(true);
    try {
      const { data, error } = await supabase
        .from('invitation_codes')
        .select('id, etablissement_id, code, role')
        .eq('code', formData.codeEtablissement)
        .eq('role', 'eleve')
        .eq('is_active', true)
        .single();

      if (error || !data) {
        Alert.alert('Code invalide', 'Ce code établissement n\'existe pas ou n\'est plus actif.');
        setCodeValide(false);
      } else {
        setCodeValide(true);
        Alert.alert('Succès', 'Code établissement valide !');
      }
    } catch (error) {
      console.error('Error verifying code:', error);
      Alert.alert('Erreur', 'Impossible de vérifier le code');
    } finally {
      setVerifying(false);
    }
  };

  const verifierEducmaster = async () => {
    if (!formData.educmaster || formData.educmaster.length !== 13) {
      Alert.alert('Erreur', 'L\'EducMaster doit contenir 13 chiffres');
      return;
    }

    setVerifying(true);
    try {
      const { data, error } = await supabase
        .from('eleves')
        .select('id')
        .eq('educmaster', formData.educmaster)
        .maybeSingle();

      if (data) {
        Alert.alert('Compte existant', 'Cet EducMaster est déjà associé à un compte élève.');
        setEducmasterValide(false);
      } else {
        setEducmasterValide(true);
        Alert.alert('Succès', 'EducMaster valide !');
      }
    } catch (error) {
      console.error('Error verifying educmaster:', error);
      Alert.alert('Erreur', 'Impossible de vérifier l\'EducMaster');
    } finally {
      setVerifying(false);
    }
  };

  const handleUploadJustificatif = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true
      });
      
      if (result.assets && result.assets[0]) {
        const file = result.assets[0];
        updateField('justificatifName', file.name);
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${user?.id}/justificatif_eleve_${Date.now()}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('documents')
          .upload(fileName, file.uri as any, {
            contentType: file.mimeType,
          });
        
        if (error) throw error;
        
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(fileName);
        
        updateField('justificatifUrl', urlData.publicUrl);
        Alert.alert('Succès', 'Justificatif téléchargé');
      }
    } catch (error) {
      console.error('Error uploading justificatif:', error);
      Alert.alert('Erreur', 'Impossible de télécharger le justificatif');
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return codeValide && educmasterValide && formData.nom.trim() && formData.prenom.trim() &&
               formData.dateNaissance.trim() && formData.lieuNaissance.trim();
      case 2:
        return formData.parentNom.trim() && formData.parentPrenom.trim() &&
               formData.parentEmail.trim() && formData.lienParente !== null;
      case 3:
        return formData.declarationHonneur && formData.acceptationCharte;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (isStepValid()) {
      setStep(step + 1);
    } else {
      Alert.alert('Champs manquants', 'Veuillez remplir tous les champs obligatoires');
    }
  };

  const handlePrevious = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!isStepValid()) {
      Alert.alert('Validation', 'Veuillez accepter les conditions');
      return;
    }

    setLoading(true);
    try {
      // Générer l'identifiant de connexion
      const identifiant = await generateIdentifiantConnexion(formData.nom, formData.prenom);

      // 1. Créer le compte élève (en attente de validation)
      const { data: eleve, error: eleveError } = await supabase
        .from('eleves')
        .insert({
          educmaster: formData.educmaster,
          nom: formData.nom,
          prenom: formData.prenom,
          date_naissance: formData.dateNaissance,
          lieu_naissance: formData.lieuNaissance,
          identifiant_connexion: identifiant,
          statut: 'en_attente_validation'
        })
        .select()
        .single();

      if (eleveError) throw eleveError;

      // 2. Créer ou récupérer le compte parent
      let parentId = null;
      const { data: existingParent } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', formData.parentEmail)
        .single();

      if (existingParent) {
        parentId = existingParent.id;
      } else {
        const { data: newParent, error: parentError } = await supabase
          .from('profiles')
          .insert({
            email: formData.parentEmail,
            nom: formData.parentNom,
            prenom: formData.parentPrenom,
            telephone: formData.parentTelephone || null,
            active_role: 'parent'
          })
          .select()
          .single();
        
        if (parentError) throw parentError;
        parentId = newParent.id;
        
        // Ajouter le rôle parent
        await supabase.from('user_roles').insert({
          user_id: parentId,
          role: 'parent',
          is_active: true
        });
      }

      // 3. Créer le lien parent-élève
      await supabase.from('parent_eleve').insert({
        parent_id: parentId,
        eleve_id: eleve.id,
        lien_parente: formData.lienParente,
        justificatif_url: formData.justificatifUrl,
        statut: 'en_attente'
      });

      // 4. Créer la demande d'inscription (pour validation admin)
      await supabase.from('demandes_inscription').insert({
        eleve_id: eleve.id,
        educmaster: formData.educmaster,
        code_etablissement: formData.codeEtablissement,
        statut: 'en_attente'
      });

      Alert.alert(
        'Demande envoyée',
        'Votre demande d\'inscription a été envoyée à l\'établissement. Vous serez notifié de sa validation.',
        [{ text: 'OK', onPress: () => router.replace('/(app)') }]
      );
    } catch (error) {
      console.error('Error submitting request:', error);
      Alert.alert('Erreur', 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((s) => (
        <View key={s} style={styles.stepWrapper}>
          <View style={[styles.stepCircle, step >= s && styles.stepCircleActive]}>
            <Text style={[styles.stepNumber, step >= s && styles.stepNumberActive]}>{s}</Text>
          </View>
          {s < 3 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>👶 Identité de l’élève</Text>
      <Text style={styles.stepDescription}>
        Renseignez le code établissement, l’EducMaster et l’identité de l’élève.
      </Text>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Code établissement *</Text>
        <View style={styles.rowWithButton}>
          <TextInput
            style={[styles.input, styles.inputFlex]}
            placeholder="Ex: SCH-2026-001"
            value={formData.codeEtablissement}
            onChangeText={(v) => updateField('codeEtablissement', v)}
          />
          <TouchableOpacity style={styles.searchButton} onPress={verifierCodeEtablissement} disabled={verifying}>
            {verifying ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Search size={16} color="#FFFFFF" />}
            <Text style={styles.searchButtonText}>Vérifier</Text>
          </TouchableOpacity>
        </View>
        {codeValide && (
          <View style={styles.successCard}>
            <CheckCircle size={16} color="#10B981" />
            <Text style={styles.successText}>Code valide</Text>
          </View>
        )}
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>EducMaster (13 chiffres) *</Text>
        <View style={styles.rowWithButton}>
          <TextInput
            style={[styles.input, styles.inputFlex]}
            placeholder="Ex: 2024123456789"
            keyboardType="numeric"
            maxLength={13}
            value={formData.educmaster}
            onChangeText={(v) => updateField('educmaster', v)}
          />
          <TouchableOpacity style={styles.searchButton} onPress={verifierEducmaster} disabled={verifying}>
            {verifying ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Search size={16} color="#FFFFFF" />}
            <Text style={styles.searchButtonText}>Vérifier</Text>
          </TouchableOpacity>
        </View>
        {educmasterValide && (
          <View style={styles.successCard}>
            <CheckCircle size={16} color="#10B981" />
            <Text style={styles.successText}>EducMaster valide</Text>
          </View>
        )}
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Nom *</Text>
        <TextInput style={styles.input} value={formData.nom} onChangeText={(v) => updateField('nom', v)} />
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Prénom *</Text>
        <TextInput style={styles.input} value={formData.prenom} onChangeText={(v) => updateField('prenom', v)} />
      </View>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={styles.label}>Date de naissance *</Text>
          <TextInput style={styles.input} placeholder="JJ/MM/AAAA" value={formData.dateNaissance} onChangeText={(v) => updateField('dateNaissance', v)} />
        </View>
        <View style={styles.halfField}>
          <Text style={styles.label}>Lieu de naissance *</Text>
          <TextInput style={styles.input} value={formData.lieuNaissance} onChangeText={(v) => updateField('lieuNaissance', v)} />
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>👨‍👩‍👧 Lien avec les parents</Text>
      <Text style={styles.stepDescription}>
        Renseignez les informations du parent ou tuteur légal.
      </Text>

      <View style={styles.row}>
        <View style={styles.halfField}>
          <Text style={styles.label}>Nom du parent *</Text>
          <TextInput style={styles.input} value={formData.parentNom} onChangeText={(v) => updateField('parentNom', v)} />
        </View>
        <View style={styles.halfField}>
          <Text style={styles.label}>Prénom du parent *</Text>
          <TextInput style={styles.input} value={formData.parentPrenom} onChangeText={(v) => updateField('parentPrenom', v)} />
        </View>
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Email du parent *</Text>
        <TextInput style={styles.input} keyboardType="email-address" autoCapitalize="none" value={formData.parentEmail} onChangeText={(v) => updateField('parentEmail', v)} />
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Téléphone du parent (optionnel)</Text>
        <TextInput style={styles.input} keyboardType="phone-pad" value={formData.parentTelephone} onChangeText={(v) => updateField('parentTelephone', v)} />
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Lien de parenté *</Text>
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[styles.optionChip, formData.lienParente === 'pere' && styles.optionChipActive]}
            onPress={() => updateField('lienParente', 'pere')}
          >
            <Text style={[styles.optionChipText, formData.lienParente === 'pere' && styles.optionChipTextActive]}>Père</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.optionChip, formData.lienParente === 'mere' && styles.optionChipActive]}
            onPress={() => updateField('lienParente', 'mere')}
          >
            <Text style={[styles.optionChipText, formData.lienParente === 'mere' && styles.optionChipTextActive]}>Mère</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.optionChip, formData.lienParente === 'tuteur' && styles.optionChipActive]}
            onPress={() => updateField('lienParente', 'tuteur')}
          >
            <Text style={[styles.optionChipText, formData.lienParente === 'tuteur' && styles.optionChipTextActive]}>Tuteur</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Justificatif (optionnel mais recommandé)</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={handleUploadJustificatif}>
          <Upload size={16} color="#FFFFFF" />
          <Text style={styles.uploadButtonText}>
            {formData.justificatifName ? 'Modifier le justificatif' : 'Télécharger un justificatif'}
          </Text>
        </TouchableOpacity>
        {formData.justificatifName && (
          <View style={styles.fileInfo}>
            <FileText size={14} color="#10B981" />
            <Text style={styles.fileName}>{formData.justificatifName}</Text>
          </View>
        )}
        <Text style={styles.hintText}>Extrait d’acte de naissance, carnet de famille (PDF, image)</Text>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>🧑‍⚖️ Engagement & certification</Text>

      <View style={styles.engagementCard}>
        <Text style={styles.engagementText}>
          Je soussigné(e) parent/tuteur de l’élève, déclare sur l’honneur que les informations fournies sont exactes. Je m’engage à accompagner mon enfant dans l’utilisation responsable de SchoolNet.
        </Text>

        <TouchableOpacity
          style={[styles.checkboxRow, formData.declarationHonneur && styles.checkboxRowActive]}
          onPress={() => updateField('declarationHonneur', !formData.declarationHonneur)}
        >
          <View style={[styles.checkbox, formData.declarationHonneur && styles.checkboxChecked]}>
            {formData.declarationHonneur && <CheckCircle size={14} color="#FFFFFF" />}
          </View>
          <Text style={styles.checkboxLabel}>Je déclare sur l’honneur l’exactitude des informations fournies</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.charteCard}>
        <Text style={styles.charteTitle}>📜 Charte élève SchoolNet</Text>
        <Text style={styles.charteText}>
          En tant qu’élève sur SchoolNet, je m’engage à :{'\n\n'}
          • Utiliser la plateforme dans un cadre éducatif et respectueux{'\n'}
          • Respecter mes camarades et mes enseignants{'\n'}
          • Ne pas partager de contenus inappropriés{'\n'}
          • Signaler tout comportement suspect à mes parents ou à l’équipe SchoolNet{'\n\n'}
          <Text style={styles.charteLink} onPress={() => router.push('/(public)/charte-eleve')}>
            Lire la charte complète
          </Text>
        </Text>

        <TouchableOpacity
          style={[styles.checkboxRow, formData.acceptationCharte && styles.checkboxRowActive]}
          onPress={() => updateField('acceptationCharte', !formData.acceptationCharte)}
        >
          <View style={[styles.checkbox, formData.acceptationCharte && styles.checkboxChecked]}>
            {formData.acceptationCharte && <CheckCircle size={14} color="#FFFFFF" />}
          </View>
          <Text style={styles.checkboxLabel}>J’accepte la charte de bonne conduite SchoolNet</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.neutral[600]} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Demande d’inscription Élève</Text>
      </View>

      {renderStepIndicator()}

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>

      <View style={styles.footer}>
        {step > 1 && (
          <TouchableOpacity style={styles.previousButton} onPress={handlePrevious}>
            <ChevronLeft size={18} color={theme.colors.primary.DEFAULT} />
            <Text style={styles.previousButtonText}>Précédent</Text>
          </TouchableOpacity>
        )}
        {step < totalSteps ? (
          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Suivant</Text>
            <ChevronRight size={18} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFFFFF" /> : <Send size={18} color="#FFFFFF" />}
            <Text style={styles.submitButtonText}>Envoyer la demande</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { marginRight: 16 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  stepIndicator: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  stepWrapper: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  stepCircleActive: { backgroundColor: theme.colors.primary.DEFAULT, borderColor: theme.colors.primary.DEFAULT },
  stepNumber: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  stepNumberActive: { color: '#FFFFFF' },
  stepLine: { width: 40, height: 2, backgroundColor: '#E5E7EB', marginHorizontal: 8 },
  stepLineActive: { backgroundColor: theme.colors.primary.DEFAULT },
  content: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 40 },
  stepTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  stepDescription: { fontSize: 14, color: '#6B7280', marginBottom: 24 },
  fieldContainer: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  inputFlex: { flex: 1 },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },
  rowWithButton: { flexDirection: 'row', gap: 12 },
  searchButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.primary.DEFAULT, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  searchButtonText: { fontSize: 13, color: '#FFFFFF', fontWeight: '500' },
  successCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#D1FAE5', padding: 12, borderRadius: 8, marginTop: 12 },
  successText: { fontSize: 13, color: '#065F46' },
  optionsContainer: { flexDirection: 'row', gap: 12 },
  optionChip: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#F3F4F6', borderRadius: 20 },
  optionChipActive: { backgroundColor: theme.colors.primary.DEFAULT },
  optionChipText: { fontSize: 14, color: '#6B7280' },
  optionChipTextActive: { color: '#FFFFFF' },
  uploadButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: theme.colors.primary.DEFAULT, borderRadius: 8, paddingVertical: 12 },
  uploadButtonText: { fontSize: 14, fontWeight: '500', color: '#FFFFFF' },
  fileInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 10, backgroundColor: '#F3F4F6', borderRadius: 8 },
  fileName: { fontSize: 13, color: '#1F2937', flex: 1 },
  hintText: { fontSize: 11, color: '#9CA3AF', marginTop: 8 },
  engagementCard: { backgroundColor: '#FEFCE8', borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#FEF08A' },
  engagementText: { fontSize: 13, color: '#1F2937', lineHeight: 20, marginBottom: 16 },
  charteCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20 },
  charteTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  charteText: { fontSize: 13, color: '#4B5563', lineHeight: 20, marginBottom: 16 },
  charteLink: { color: theme.colors.primary.DEFAULT, textDecorationLine: 'underline' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  checkboxRowActive: { opacity: 1 },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: '#D1D5DB', justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: theme.colors.primary.DEFAULT, borderColor: theme.colors.primary.DEFAULT },
  checkboxLabel: { fontSize: 13, color: '#374151', flex: 1 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  previousButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#F3F4F6' },
  previousButtonText: { fontSize: 14, fontWeight: '500', color: theme.colors.primary.DEFAULT },
  nextButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, backgroundColor: theme.colors.primary.DEFAULT },
  nextButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  submitButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 8, backgroundColor: theme.colors.primary.DEFAULT },
  submitButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
});