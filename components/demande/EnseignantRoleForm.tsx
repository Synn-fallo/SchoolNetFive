import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, Linking } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Send, CheckCircle, XCircle, FileText, Upload, ChevronLeft, ChevronRight } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import theme from '@/constants/theme';

interface FormData {
  // Diplômes
  diplomes: string;
  specialites: string;
  etablissementFormation: string;
  anneeObtention: string;
  // Expérience
  anneesExperience: string;
  dernierEtablissement: string;
  cyclesEnseignes: string[];
  matieresEnseignees: string[];
  // Document
  cvUrl: string | null;
  cvName: string | null;
  // Engagement
  declarationHonneur: boolean;
  acceptationCharte: boolean;
}

const CYCLES_OPTIONS = ['1er Cycle', '2nd Cycle'];
const MATIERES_OPTIONS = [
  'Mathématiques', 'Français', 'Anglais', 'Physique', 'Chimie',
  'SVT', 'Histoire-Géographie', 'Philosophie', 'Génie Mécanique',
  'Génie Civil', 'Dessin Technique', 'Électronique', 'Informatique'
];

export default function EnseignantRoleForm() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    diplomes: '',
    specialites: '',
    etablissementFormation: '',
    anneeObtention: '',
    anneesExperience: '',
    dernierEtablissement: '',
    cyclesEnseignes: [],
    matieresEnseignees: [],
    cvUrl: null,
    cvName: null,
    declarationHonneur: false,
    acceptationCharte: false,
  });

  const totalSteps = 4;
  const userName = profile?.prenom && profile?.nom 
    ? `${profile.prenom} ${profile.nom}` 
    : user?.email?.split('@')[0] || 'Utilisateur';

  const updateField = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleCycle = (cycle: string) => {
    const current = formData.cyclesEnseignes;
    if (current.includes(cycle)) {
      updateField('cyclesEnseignes', current.filter(c => c !== cycle));
    } else {
      updateField('cyclesEnseignes', [...current, cycle]);
    }
  };

  const toggleMatiere = (matiere: string) => {
    const current = formData.matieresEnseignees;
    if (current.includes(matiere)) {
      updateField('matieresEnseignees', current.filter(m => m !== matiere));
    } else {
      updateField('matieresEnseignees', [...current, matiere]);
    }
  };

  const handleUploadCV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true
      });
      
      if (result.assets && result.assets[0]) {
        const file = result.assets[0];
        updateField('cvName', file.name);
        
        // Upload vers Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${user?.id}/cv_${Date.now()}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('documents')
          .upload(fileName, file.uri as any, {
            contentType: file.mimeType,
          });
        
        if (error) throw error;
        
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(fileName);
        
        updateField('cvUrl', urlData.publicUrl);
        Alert.alert('Succès', 'CV téléchargé avec succès');
      }
    } catch (error) {
      console.error('Error uploading CV:', error);
      Alert.alert('Erreur', 'Impossible de télécharger le CV');
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return formData.diplomes.trim() && formData.specialites.trim() && 
               formData.etablissementFormation.trim() && formData.anneeObtention.trim();
      case 2:
        return formData.anneesExperience.trim() && formData.cyclesEnseignes.length > 0;
      case 3:
        return true; // CV optionnel
      case 4:
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
      Alert.alert('Champs manquants', 'Veuillez accepter les conditions');
      return;
    }

    setLoading(true);
    try {
      const requestData = {
        user_id: user?.id,
        role_souhaite: 'enseignant',
        statut: 'valide',
        metadata: {
          diplomes: formData.diplomes,
          specialites: formData.specialites,
          etablissementFormation: formData.etablissementFormation,
          anneeObtention: formData.anneeObtention,
          anneesExperience: formData.anneesExperience,
          dernierEtablissement: formData.dernierEtablissement,
          cyclesEnseignes: formData.cyclesEnseignes,
          matieresEnseignees: formData.matieresEnseignees,
          cv_url: formData.cvUrl,
          cv_name: formData.cvName,
          declaration_honneur: true,
          charte_acceptee: true
        }
      };

      const { error } = await supabase.from('demandes_role').insert(requestData);
      if (error) throw error;

      await supabase.from('user_roles').insert({
        user_id: user?.id,
        role: 'enseignant',
        is_active: true,
        metadata: { source: 'formulaire_enseignant' }
      });

      await supabase.from('profiles').update({ active_role: 'enseignant' }).eq('id', user?.id);

      Alert.alert(
        'Demande acceptée',
        'Votre compte enseignant a été activé. Vous allez être redirigé vers votre tableau de bord.',
        [{ text: 'OK', onPress: () => router.replace('/(app)/enseignant') }]
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
      {[1, 2, 3, 4].map((s) => (
        <View key={s} style={styles.stepWrapper}>
          <View style={[styles.stepCircle, step >= s && styles.stepCircleActive]}>
            <Text style={[styles.stepNumber, step >= s && styles.stepNumberActive]}>{s}</Text>
          </View>
          {s < 4 && <View style={[styles.stepLine, step > s && styles.stepLineActive]} />}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>🎓 Diplômes et formations</Text>
      <Text style={styles.stepDescription}>
        Renseignez votre plus haut diplôme et vos spécialités.
      </Text>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Diplômes obtenus *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Master en Mathématiques, CAPET, Licence..."
          value={formData.diplomes}
          onChangeText={(v) => updateField('diplomes', v)}
        />
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Spécialités *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Mathématiques, Génie Mécanique, Anglais..."
          value={formData.specialites}
          onChangeText={(v) => updateField('specialites', v)}
        />
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Établissement de formation (diplôme le plus élevé) *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Université d'Abomey-Calavi, ENS..."
          value={formData.etablissementFormation}
          onChangeText={(v) => updateField('etablissementFormation', v)}
        />
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Année d’obtention *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: 2020"
          keyboardType="numeric"
          value={formData.anneeObtention}
          onChangeText={(v) => updateField('anneeObtention', v)}
        />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>👨‍🏫 Expérience professionnelle</Text>
      <Text style={styles.stepDescription}>
        Votre parcours professionnel dans l’enseignement.
      </Text>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Années d’expérience dans l’enseignement *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: 5"
          keyboardType="numeric"
          value={formData.anneesExperience}
          onChangeText={(v) => updateField('anneesExperience', v)}
        />
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Dernier établissement d’exercice (optionnel)</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Lycée Technique de Kpondéhou"
          value={formData.dernierEtablissement}
          onChangeText={(v) => updateField('dernierEtablissement', v)}
        />
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Cycles actuellement enseignés *</Text>
        <View style={styles.optionsContainer}>
          {CYCLES_OPTIONS.map((cycle) => (
            <TouchableOpacity
              key={cycle}
              style={[styles.optionChip, formData.cyclesEnseignes.includes(cycle) && styles.optionChipActive]}
              onPress={() => toggleCycle(cycle)}
            >
              <Text style={[styles.optionChipText, formData.cyclesEnseignes.includes(cycle) && styles.optionChipTextActive]}>
                {cycle}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Matières enseignées (optionnel, pour opportunités de recrutement)</Text>
        <View style={styles.matieresContainer}>
          {MATIERES_OPTIONS.map((matiere) => (
            <TouchableOpacity
              key={matiere}
              style={[styles.matiereChip, formData.matieresEnseignees.includes(matiere) && styles.matiereChipActive]}
              onPress={() => toggleMatiere(matiere)}
            >
              <Text style={[styles.matiereChipText, formData.matieresEnseignees.includes(matiere) && styles.matiereChipTextActive]}>
                {matiere}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.hintText}>
          Ces informations seront visibles par les établissements et les parents pour d’éventuelles opportunités (soutien scolaire, répétitions).
        </Text>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>📎 Documents justificatifs</Text>
      <Text style={styles.stepDescription}>
        Un CV permet de valoriser votre profil auprès des établissements et des parents.
      </Text>

      <TouchableOpacity style={styles.uploadButton} onPress={handleUploadCV}>
        <Upload size={18} color="#FFFFFF" />
        <Text style={styles.uploadButtonText}>
          {formData.cvName ? 'Modifier le CV' : 'Télécharger votre CV (optionnel)'}
        </Text>
      </TouchableOpacity>

      {formData.cvName && (
        <View style={styles.fileInfo}>
          <FileText size={16} color="#10B981" />
          <Text style={styles.fileName}>{formData.cvName}</Text>
        </View>
      )}

      <Text style={styles.hintText}>
        Formats acceptés : PDF, image, DOC. Un CV bien renseigné augmente vos chances d’être contacté.
      </Text>
    </View>
  );

  const renderStep4 = () => (
    <View>
      <Text style={styles.stepTitle}>🧑‍⚖️ Engagement & certification</Text>
      
      <View style={styles.engagementCard}>
        <Text style={styles.engagementText}>
          Je soussigné(e) <Text style={styles.userName}>{userName}</Text>, déclare sur l’honneur que l’ensemble des informations fournies dans ce formulaire est exact et conforme à la réalité. Je m’engage à respecter les valeurs éducatives portées par SchoolNet, à faire preuve de bienveillance envers les élèves, et à ne pas utiliser la plateforme à des fins contraires à l’éthique ou à la loi. Je reconnais que toute information inexacte ou tout comportement inapproprié pourra entraîner la suspension ou la suppression de mon compte enseignant.
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
        <Text style={styles.charteTitle}>📜 Charte de bonne conduite SchoolNet</Text>
        <Text style={styles.charteText}>
          En tant qu’enseignant sur SchoolNet, je m’engage à :{'\n\n'}
          • Respecter la confidentialité des données des élèves et des parents{'\n'}
          • Maintenir une communication professionnelle et bienveillante{'\n'}
          • Ne pas partager de contenus inappropriés ou illicites{'\n'}
          • Signaler tout comportement suspect ou abusif à l’équipe SchoolNet{'\n'}
          • Contribuer à un environnement éducatif sain et respectueux{'\n\n'}
          <Text style={styles.charteLink} 
            // onPress={() => Linking.openURL('https://schoolnet.bj/charte-enseignant')}
            onPress={() => router.push('/(public)/charte-enseignant')}
          >
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
        <Text style={styles.headerTitle}>Demande de rôle Enseignant</Text>
      </View>

      {renderStepIndicator()}

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}        
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
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Send size={18} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>Envoyer la demande</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  stepWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stepCircleActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
    borderColor: theme.colors.primary.DEFAULT,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  stepNumberActive: {
    color: '#FFFFFF',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 32,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  optionChipActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  optionChipText: {
    fontSize: 13,
    color: '#6B7280',
  },
  optionChipTextActive: {
    color: '#FFFFFF',
  },
  matieresContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  matiereChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
  },
  matiereChipActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  matiereChipText: {
    fontSize: 12,
    color: '#6B7280',
  },
  matiereChipTextActive: {
    color: '#FFFFFF',
  },
  hintText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 8,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  fileName: {
    fontSize: 13,
    color: '#1F2937',
    flex: 1,
  },
  engagementCard: {
    backgroundColor: '#FEFCE8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FEF08A',
  },
  engagementText: {
    fontSize: 13,
    color: '#1F2937',
    lineHeight: 20,
    marginBottom: 16,
  },
  userName: {
    fontWeight: '700',
    color: theme.colors.primary.DEFAULT,
  },
  charteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 20,
  },
  charteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  charteText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 16,
  },
  charteLink: {
    color: theme.colors.primary.DEFAULT,
    textDecorationLine: 'underline',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  checkboxRowActive: {
    opacity: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary.DEFAULT,
    borderColor: theme.colors.primary.DEFAULT,
  },
  checkboxLabel: {
    fontSize: 13,
    color: '#374151',
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  previousButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  previousButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary.DEFAULT,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  nextButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  submitButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
});