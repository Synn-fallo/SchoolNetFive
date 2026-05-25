import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Calendar, Mail, Phone, User, Building2, AlertCircle, Check, ChevronDown, Users, BookOpen } from 'lucide-react-native';
import { Card } from '@/components/Card';
import { useEducMaster } from '@/hooks/useEducMaster';
import { useParents } from '@/hooks/useParents';
import { useAcademicStructure } from '@/hooks/useAcademicStructure';
import { useGroupes } from '@/hooks/useGroupes';
import ParentTabs, { ParentData, ParentTabsRef } from '@/components/parents/ParentTabs';
import ParentConfirmationModal from '@/components/parents/ParentConfirmationModal';
import theme from '@/constants/theme';

interface EleveFormProps {
  etablissementId: string;
  initialData?: {
    id?: string;
    nom?: string;
    prenom?: string;
    educmaster?: string;
    sexe?: string;
    date_naissance?: string;
    email?: string;
    telephone?: string;
    classe_id?: string;
    groupe_id?: string;
    matricule?: string;
    identifiant_connexion?: string;
  };
  classes: { id: string; nom: string }[];
  onSubmit: (data: any, identifiantConnexion: string) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  isEdit?: boolean;
}

const toTitleCase = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .split('-')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('-');
};

const formaterTelephone = (text: string): string => {
  const cleaned = text.replace(/\D/g, '');
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 4) return `${cleaned.slice(0,2)} ${cleaned.slice(2)}`;
  if (cleaned.length <= 6) return `${cleaned.slice(0,2)} ${cleaned.slice(2,4)} ${cleaned.slice(4)}`;
  if (cleaned.length <= 8) return `${cleaned.slice(0,2)} ${cleaned.slice(2,4)} ${cleaned.slice(4,6)} ${cleaned.slice(6)}`;
  return `${cleaned.slice(0,2)} ${cleaned.slice(2,4)} ${cleaned.slice(4,6)} ${cleaned.slice(6,8)} ${cleaned.slice(8,10)}`;
};

const formaterEducMaster = (text: string): string => {
  const cleaned = text.replace(/\D/g, '');
  if (cleaned.length <= 4) return cleaned;
  if (cleaned.length <= 8) return `${cleaned.slice(0,4)} ${cleaned.slice(4)}`;
  return `${cleaned.slice(0,4)} ${cleaned.slice(4,8)} ${cleaned.slice(8,12)}`;
};

const formaterDate = (text: string): string => {
  const cleaned = text.replace(/\D/g, '');
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 4) return `${cleaned.slice(0,2)}/${cleaned.slice(2)}`;
  if (cleaned.length <= 8) return `${cleaned.slice(0,2)}/${cleaned.slice(2,4)}/${cleaned.slice(4,8)}`;
  return `${cleaned.slice(0,2)}/${cleaned.slice(2,4)}/${cleaned.slice(4,8)}`;
};

export default function EleveForm({
  etablissementId,
  initialData,
  classes: allClasses,
  onSubmit,
  onCancel,
  isLoading = false,
  isEdit = false,
}: EleveFormProps) {
  const { validateFormat, checkExists, getEleveByEducMaster, checkIdentifiantUniquenessSimple, checking: educMasterChecking } = useEducMaster();
  const { verifierParentParTelephoneEtNom, verifierParentParEmailEtNom, toTitleCase: toTitleCaseParent } = useParents();
  // const { cycles, getClassesByCycle, loading: academicLoading } = useAcademicStructure();
  const { cycles, getClassesByCycle, loading: academicLoading } = useAcademicStructure(etablissementId);
  const { groupes, loading: groupesLoading, refresh: refreshGroupes } = useGroupes();
  
  const parentTabsRef = useRef<ParentTabsRef>(null);
  
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    educmaster: initialData?.educmaster || '',
    nom: initialData?.nom || '',
    prenom: initialData?.prenom || '',
    sexe: initialData?.sexe || '',
    date_naissance: initialData?.date_naissance || '',
    email: initialData?.email || '',
    telephone: initialData?.telephone || '',
    classe_id: initialData?.classe_id || '',
    groupe_id: initialData?.groupe_id || '',
    matricule: initialData?.matricule || '',
  });
  
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);
  const [filteredClasses, setFilteredClasses] = useState<{ id: string; nom: string }[]>([]);
  const [showCycleSelector, setShowCycleSelector] = useState(false);
  const [showClasseSelector, setShowClasseSelector] = useState(false);
  const [showGroupeSelector, setShowGroupeSelector] = useState(false);
  
  const [parentsData, setParentsData] = useState<Record<string, ParentData>>({});
  const [showParentConfirmation, setShowParentConfirmation] = useState(false);
  const [pendingParentVerification, setPendingParentVerification] = useState<{
    type: 'telephone' | 'email';
    valeur: string;
    typeLien: string;
    parentInfo?: any;
  } | null>(null);
  
  const [educmasterError, setEducmasterError] = useState<string | null>(null);
  const [educmasterChecking, setEducmasterChecking] = useState(false);
  const [identifiantPreview, setIdentifiantPreview] = useState<string | null>(null);
  const [identifiantCollision, setIdentifiantCollision] = useState(false);

  useEffect(() => {
    if (formData.classe_id) {
      refreshGroupes();
    } else {
      if (formData.groupe_id) {
        setFormData(prev => ({ ...prev, groupe_id: '' }));
      }
    }
  }, [formData.classe_id, refreshGroupes]);

  useEffect(() => {
    const loadFilteredClasses = async () => {
      if (!selectedCycleId || !etablissementId) {
        setFilteredClasses([]);
        return;
      }
      
      const classesByCycle = await getClassesByCycle(etablissementId, selectedCycleId);
      setFilteredClasses(classesByCycle.map(c => ({ id: c.id, nom: c.nom })));
      
      if (formData.classe_id && !classesByCycle.some(c => c.id === formData.classe_id)) {
        setFormData(prev => ({ ...prev, classe_id: '', groupe_id: '' }));
      }
    };
    
    loadFilteredClasses();
  }, [selectedCycleId, etablissementId, getClassesByCycle, formData.classe_id]);

  useEffect(() => {
    const previewIdentifiant = async () => {
      if (isEdit && initialData?.identifiant_connexion) {
        setIdentifiantPreview(initialData.identifiant_connexion);
        setIdentifiantCollision(false);
        return;
      }
      
      if (!formData.nom || !formData.prenom) {
        setIdentifiantPreview(null);
        setIdentifiantCollision(false);
        return;
      }
      
      if (identifiantPreview && identifiantPreview.includes('@snet.bj')) {
        return;
      }
      
      const preview = await checkIdentifiantUniquenessSimple(formData.nom, formData.prenom);
      setIdentifiantPreview(preview.candidate);
      setIdentifiantCollision(preview.isCollision);
    };
    
    const timer = setTimeout(previewIdentifiant, 500);
    return () => clearTimeout(timer);
  }, [formData.nom, formData.prenom, checkIdentifiantUniquenessSimple, identifiantPreview, isEdit, initialData?.identifiant_connexion]);

  useEffect(() => {
    const checkEducMaster = async () => {
      if (!formData.educmaster || formData.educmaster.replace(/\s/g, '').length < 12) {
        setEducmasterError('EducMaster obligatoire (12 chiffres)');
        return;
      }
      
      const cleaned = formData.educmaster.replace(/\s/g, '');
      if (cleaned.length !== 12) {
        setEducmasterError('L\'EducMaster doit contenir exactement 12 chiffres');
        return;
      }
      
      setEducmasterChecking(true);
      
      if (!isEdit) {
        const { exists, data } = await checkExists(cleaned);
        if (exists) {
          setEducmasterError(`Cet EducMaster est déjà utilisé par ${data?.prenom} ${data?.nom}`);
          setEducmasterChecking(false);
          return;
        }
      }
      
      setEducmasterError(null);
      setEducmasterChecking(false);
    };
    
    const timer = setTimeout(checkEducMaster, 500);
    return () => clearTimeout(timer);
  }, [formData.educmaster, isEdit, checkExists]);

  useEffect(() => {
    const autoFillFromEducMaster = async () => {
      if (isEdit) return;
      
      const cleaned = formData.educmaster?.replace(/\s/g, '') || '';
      if (!cleaned || cleaned.length < 10) return;
      
      if (formData.nom && formData.prenom) return;
      
      setEducmasterChecking(true);
      
      try {
        const result = await getEleveByEducMaster(cleaned);
        
        if (result.source !== 'none' && result.nom && result.prenom) {
          setFormData(prev => ({
            ...prev,
            nom: result.nom || prev.nom,
            prenom: result.prenom || prev.prenom,
            sexe: result.sexe || prev.sexe,
            date_naissance: result.date_naissance || prev.date_naissance,
          }));
          
          if (result.identifiant_connexion) {
            setIdentifiantPreview(result.identifiant_connexion);
            setIdentifiantCollision(false);
            console.log('📌 Utilisation de l\'identifiant existant:', result.identifiant_connexion);
          }
          
          let sourceMessage = '';
          if (result.source === 'local') {
            sourceMessage = `Informations pré-remplies depuis SchoolNet (Établissement: ${result.etablissement_nom || 'inconnu'})`;
          } else if (result.source === 'api') {
            sourceMessage = `Informations pré-remplies depuis le système national (Ministère)`;
          } else if (result.source === 'cache') {
            sourceMessage = `Informations pré-remplies depuis le cache`;
          }
          
          if (sourceMessage) {
            Alert.alert('Élève trouvé', sourceMessage);
          }
        }
      } catch (error) {
        console.error('Error auto-filling from EducMaster:', error);
      } finally {
        setEducmasterChecking(false);
      }
    };
    
    const timer = setTimeout(autoFillFromEducMaster, 800);
    return () => clearTimeout(timer);
  }, [formData.educmaster, isEdit, getEleveByEducMaster]);

  const handleVerifyParentByPhone = async (telephone: string, nomSaisi: string, typeLien: string) => {
    if (!telephone || telephone.trim() === '') {
      return { valid: false, message: 'Numéro de téléphone invalide' };
    }
    
    const result = await verifierParentParTelephoneEtNom(telephone, nomSaisi);
    
    if (result.valid && result.parent) {
      setPendingParentVerification({
        type: 'telephone',
        valeur: telephone,
        typeLien,
        parentInfo: result.parent,
      });
      setShowParentConfirmation(true);
      return { valid: true, parentId: result.parent.id, nom: result.parent.nom, prenom: result.parent.prenom };
    }
    
    return { valid: false, message: result.message };
  };

  const handleVerifyParentByEmail = async (email: string, nomSaisi: string, typeLien: string) => {
    if (!email || email.trim() === '') {
      return { valid: false, message: 'Email invalide' };
    }
    
    const result = await verifierParentParEmailEtNom(email, nomSaisi);
    
    if (result.valid && result.parent) {
      setPendingParentVerification({
        type: 'email',
        valeur: email,
        typeLien,
        parentInfo: result.parent,
      });
      setShowParentConfirmation(true);
      return { valid: true, parentId: result.parent.id, nom: result.parent.nom, prenom: result.parent.prenom };
    }
    
    return { valid: false, message: result.message };
  };

  const handleConfirmParent = async (): Promise<boolean> => {
    if (!pendingParentVerification?.parentInfo?.id) return false;
    
    const parentInfo = pendingParentVerification.parentInfo;
    const typeLien = pendingParentVerification.typeLien;
    
    setParentsData(prev => ({
      ...prev,
      [typeLien]: {
        ...prev[typeLien],
        telephone: pendingParentVerification.type === 'telephone' ? pendingParentVerification.valeur : prev[typeLien]?.telephone || '',
        email_personnel: pendingParentVerification.type === 'email' ? pendingParentVerification.valeur : prev[typeLien]?.email_personnel || '',
        nom: parentInfo.nom,
        prenom: parentInfo.prenom,
        type_lien: typeLien,
        is_complete: true,
        is_verified_phone: pendingParentVerification.type === 'telephone' || prev[typeLien]?.is_verified_phone || false,
        is_verified_email: pendingParentVerification.type === 'email' || prev[typeLien]?.is_verified_email || false,
        exists: true,
        existing_parent_id: parentInfo.id,
      },
    }));
    
    setShowParentConfirmation(false);
    setPendingParentVerification(null);
    return true;
  };

  const handleParentsChange = (parents: Record<string, ParentData>) => {
    setParentsData(parents);
  };

  const handleSelectCycle = (cycleId: string) => {
    setSelectedCycleId(cycleId);
    setShowCycleSelector(false);
  };

  const handleSelectClasse = (classeId: string) => {
    setFormData(prev => ({ ...prev, classe_id: classeId, groupe_id: '' }));
    setShowClasseSelector(false);
  };

  const handleSelectGroupe = (groupeId: string) => {
    setFormData(prev => ({ ...prev, groupe_id: groupeId }));
    setShowGroupeSelector(false);
  };

  const getSelectedCycleNom = () => {
    const cycle = cycles.find(c => c.id === selectedCycleId);
    return cycle?.nom || '';
  };

  const getSelectedClasseNom = () => {
    const classe = allClasses.find(c => c.id === formData.classe_id);
    return classe?.nom || '';
  };

  const getSelectedGroupeNom = () => {
    const groupe = groupes.find(g => g.id === formData.groupe_id);
    return groupe?.nom || '';
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    // ✅ CORRECTION : En mode création, l'EducMaster est obligatoire
    // En mode édition, on ne vérifie pas (il peut être null)
    if (!isEdit && (!formData.educmaster || formData.educmaster.replace(/\s/g, '').length < 12)) {
      errors.educmaster = 'L\'EducMaster est obligatoire (12 chiffres)';
    }
    
    if (!formData.nom) errors.nom = 'Le nom est obligatoire';
    if (!formData.prenom) errors.prenom = 'Le prénom est obligatoire';
    if (!formData.sexe) errors.sexe = 'Le sexe est obligatoire';
    if (!formData.classe_id) errors.classe = 'La classe est obligatoire';
    
    // LOG des données du formulaire
    console.log('🔍 FormData complet:', {
      educmaster: formData.educmaster,
      educmaster_clean: formData.educmaster?.replace(/\s/g, ''),
      nom: formData.nom,
      prenom: formData.prenom,
      sexe: formData.sexe,
      classe_id: formData.classe_id,
      email: formData.email,
      telephone: formData.telephone,
    });
    console.log('🔍 Erreurs détectées:', errors);
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    console.log('🚀 handleSubmit called');
    
    const isValid = validateForm();
    console.log('🔍 validateForm result:', isValid);
    console.log('🔍 validationErrors details:', JSON.stringify(validationErrors, null, 2));
    console.log('🔍 educmasterError:', educmasterError);
    
    if (!isValid) {
      const errorMessages = Object.values(validationErrors);
      Alert.alert('Formulaire incomplet', errorMessages.join('\n'));
      return;
    }
    
    if (educmasterError) {
      Alert.alert('Erreur', educmasterError);
      return;
    }
    
    const parentsToSubmit = parentTabsRef.current?.getParentsData() || [];
    console.log('📦 Parents to submit:', JSON.stringify(parentsToSubmit, null, 2));
    
    let finalIdentifiant = identifiantPreview || '';
    if (identifiantCollision && identifiantPreview && !identifiantPreview.includes('.1@')) {
      finalIdentifiant = identifiantPreview.replace('@snet.bj', '.1@snet.bj');
    }
    
    const submitData = {
      ...formData,
      educmaster: formData.educmaster.replace(/\s/g, ''),
      prenom: toTitleCaseParent(formData.prenom),
      groupe_id: formData.groupe_id || null,
      parents: parentsToSubmit,
    };
    
    console.log('📦 Submit data final:', JSON.stringify(submitData, null, 2));
    
    await onSubmit(submitData, finalIdentifiant);
  };

  const cyclesOptions = cycles.filter(c => c.nom === '1er Cycle' || c.nom === '2nd Cycle');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>{isEdit ? 'Modifier l\'élève' : 'Ajouter un élève'}</Text>
        
        <Text style={styles.sectionTitle}>📝 IDENTITÉ DE L'ÉLÈVE</Text>
        
        <Text style={styles.inputLabel}>EducMaster *</Text>
        <View style={[styles.inputContainer, (educmasterError || validationErrors.educmaster) ? styles.inputError : null]}>
          <TextInput
            style={styles.input}
            placeholder="1234 5678 9012"
            value={formData.educmaster}
            onChangeText={(text) => setFormData({ ...formData, educmaster: formaterEducMaster(text) })}
            keyboardType="numeric"
            maxLength={14}
            editable={!isEdit}
          />
          {(educmasterChecking || educMasterChecking) && <ActivityIndicator size="small" color={theme.colors.primary.DEFAULT} />}
        </View>
        {(educmasterError || validationErrors.educmaster) ? (
          <View style={styles.errorContainer}>
            <AlertCircle size={14} color="#EF4444" />
            <Text style={styles.errorText}>{educmasterError || validationErrors.educmaster}</Text>
          </View>
        ) : null}
        
        {identifiantPreview ? (
          <View style={[styles.previewContainer, identifiantCollision ? styles.previewContainerWarning : null]}>
            <Text style={styles.previewLabel}>Identifiant de connexion généré :</Text>
            <Text style={styles.previewValue}>
              {identifiantPreview}{identifiantCollision ? ' (collision détectée, un suffixe sera ajouté)' : ''}
            </Text>
          </View>
        ) : null}
        
        <View style={styles.rowContainerLarge}>
          <View style={styles.halfField}>
            <Text style={styles.inputLabel}>Nom *</Text>
            <TextInput
              style={[styles.input, validationErrors.nom && styles.inputError]}
              placeholder="Nom de famille"
              value={formData.nom}
              onChangeText={(text) => setFormData({ ...formData, nom: text.toUpperCase() })}
            />
            {validationErrors.nom && <Text style={styles.inlineError}>{validationErrors.nom}</Text>}
          </View>
          <View style={styles.halfField}>
            <Text style={styles.inputLabel}>Prénom *</Text>
            <TextInput
              style={[styles.input, validationErrors.prenom && styles.inputError]}
              placeholder="Prénom"
              value={formData.prenom}
              onChangeText={(text) => setFormData({ ...formData, prenom: toTitleCaseParent(text) })}
            />
            {validationErrors.prenom && <Text style={styles.inlineError}>{validationErrors.prenom}</Text>}
          </View>
        </View>
        
        <View style={styles.rowContainerLarge}>
          <View style={styles.halfField}>
            <Text style={styles.inputLabel}>Sexe *</Text>
            <View style={styles.sexeContainer}>
              <TouchableOpacity
                style={[styles.sexeOption, formData.sexe === 'M' && styles.sexeOptionActive]}
                onPress={() => setFormData({ ...formData, sexe: 'M' })}
              >
                <Text style={[styles.sexeOptionText, formData.sexe === 'M' && styles.sexeOptionTextActive]}>Masculin</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.sexeOption, formData.sexe === 'F' && styles.sexeOptionActive]}
                onPress={() => setFormData({ ...formData, sexe: 'F' })}
              >
                <Text style={[styles.sexeOptionText, formData.sexe === 'F' && styles.sexeOptionTextActive]}>Féminin</Text>
              </TouchableOpacity>
            </View>
            {validationErrors.sexe && <Text style={styles.inlineError}>{validationErrors.sexe}</Text>}
          </View>
          <View style={styles.halfField}>
            <Text style={styles.inputLabel}>Date de naissance</Text>
            <TextInput
              style={styles.input}
              placeholder="JJ/MM/AAAA"
              value={formData.date_naissance}
              onChangeText={(text) => setFormData({ ...formData, date_naissance: formaterDate(text) })}
              keyboardType="numeric"
              maxLength={10}
            />
          </View>
        </View>
        
        <View style={styles.rowContainerLarge}>
          <View style={styles.halfField}>
            <Text style={styles.inputLabel}>Email (élève, optionnel)</Text>
            <TextInput
              style={styles.input}
              placeholder="email@exemple.com"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text.toLowerCase() })}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.halfField}>
            <Text style={styles.inputLabel}>Téléphone (élève, optionnel)</Text>
            <TextInput
              style={styles.input}
              placeholder="xx xx xx xx xx"
              value={formData.telephone}
              onChangeText={(text) => setFormData({ ...formData, telephone: formaterTelephone(text) })}
              keyboardType="phone-pad"
              maxLength={14}
            />
          </View>
        </View>
        
        <Text style={styles.sectionTitle}>🎓 PARCOURS SCOLAIRE</Text>
        
        <View style={styles.parcoursRow}>
          <View style={styles.parcoursItem}>
            <Text style={styles.inputLabel}>Cycle *</Text>
            <TouchableOpacity 
              style={styles.selectorButton} 
              onPress={() => setShowCycleSelector(true)}
              disabled={academicLoading}
            >
              <View style={styles.selectorButtonLeft}>
                <BookOpen size={16} color={theme.colors.neutral[500]} />
                <Text style={[
                  styles.selectorButtonText,
                  !selectedCycleId && styles.selectorButtonPlaceholder
                ]}>
                  {selectedCycleId ? getSelectedCycleNom() : 'Sélectionner'}
                </Text>
              </View>
              <ChevronDown size={16} color={theme.colors.neutral[500]} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.parcoursItem}>
            <Text style={styles.inputLabel}>Classe *</Text>
            <TouchableOpacity 
              style={[styles.selectorButton, (!selectedCycleId || validationErrors.classe) && styles.selectorButtonDisabled]} 
              onPress={() => selectedCycleId && setShowClasseSelector(true)}
              disabled={!selectedCycleId || filteredClasses.length === 0}
            >
              <View style={styles.selectorButtonLeft}>
                <Users size={16} color={theme.colors.neutral[500]} />
                <Text style={[
                  styles.selectorButtonText,
                  !formData.classe_id && styles.selectorButtonPlaceholder
                ]}>
                  {formData.classe_id ? getSelectedClasseNom() : 'Sélectionner'}
                </Text>
              </View>
              <ChevronDown size={16} color={theme.colors.neutral[500]} />
            </TouchableOpacity>
            {validationErrors.classe && <Text style={styles.inlineError}>{validationErrors.classe}</Text>}
          </View>
          
          <View style={styles.parcoursItem}>
            <Text style={styles.inputLabel}>Groupe (optionnel)</Text>
            <TouchableOpacity 
              style={[styles.selectorButton, !formData.classe_id && styles.selectorButtonDisabled]} 
              onPress={() => formData.classe_id && groupes.length > 0 && setShowGroupeSelector(true)}
              disabled={!formData.classe_id || groupes.length === 0}
            >
              <View style={styles.selectorButtonLeft}>
                <Users size={16} color={theme.colors.neutral[500]} />
                <Text style={[
                  styles.selectorButtonText,
                  !formData.groupe_id && styles.selectorButtonPlaceholder
                ]}>
                  {formData.groupe_id ? getSelectedGroupeNom() : 'Sélectionner'}
                </Text>
              </View>
              <ChevronDown size={16} color={theme.colors.neutral[500]} />
            </TouchableOpacity>
          </View>
        </View>
        
        <Text style={styles.sectionTitle}>👨‍👩‍👧 PARENTS / TUTEURS</Text>
        
        <ParentTabs
          ref={parentTabsRef}
          onParentsChange={handleParentsChange}
          initialParents={parentsData}
          onVerifyParentByPhone={handleVerifyParentByPhone}
          onVerifyParentByEmail={handleVerifyParentByEmail}
          disabled={isEdit}
        />
        
        {validationErrors.parents && (
          <View style={styles.errorContainer}>
            <AlertCircle size={14} color="#EF4444" />
            <Text style={styles.errorText}>{validationErrors.parents}</Text>
          </View>
        )}
        
        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, (isLoading || educmasterChecking) ? styles.submitButtonDisabled : null]}
            onPress={handleSubmit}
            disabled={isLoading || educmasterChecking}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>{isEdit ? 'Modifier' : 'Créer'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </Card>

      {/* Modal Sélecteur Cycle */}
      {showCycleSelector && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner un cycle</Text>
              <TouchableOpacity onPress={() => setShowCycleSelector(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {cyclesOptions.map((cycle) => (
                <TouchableOpacity
                  key={cycle.id}
                  style={[
                    styles.modalOption,
                    selectedCycleId === cycle.id && styles.modalOptionActive,
                  ]}
                  onPress={() => handleSelectCycle(cycle.id)}
                >
                  <Text style={[
                    styles.modalOptionText,
                    selectedCycleId === cycle.id && styles.modalOptionTextActive,
                  ]}>
                    {cycle.nom}
                  </Text>
                  <Text style={styles.modalOptionSubtext}>
                    {cycle.nom === '1er Cycle' ? '6ème → 3ème' : '2nde → Terminale'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Modal Sélecteur Classe */}
      {showClasseSelector && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner une classe</Text>
              <TouchableOpacity onPress={() => setShowClasseSelector(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              {filteredClasses.length === 0 ? (
                <Text style={styles.modalEmptyText}>Aucune classe disponible</Text>
              ) : (
                filteredClasses.map((classe) => (
                  <TouchableOpacity
                    key={classe.id}
                    style={[
                      styles.modalOption,
                      formData.classe_id === classe.id && styles.modalOptionActive,
                    ]}
                    onPress={() => handleSelectClasse(classe.id)}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      formData.classe_id === classe.id && styles.modalOptionTextActive,
                    ]}>
                      {classe.nom}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Modal Sélecteur Groupe */}
      {showGroupeSelector && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sélectionner un groupe</Text>
              <TouchableOpacity onPress={() => setShowGroupeSelector(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalList}>
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => handleSelectGroupe('')}
              >
                <Text style={styles.modalOptionText}>Aucun groupe</Text>
                <Text style={styles.modalOptionSubtext}>L'élève n'est affecté à aucun groupe spécifique</Text>
              </TouchableOpacity>
              {groupes.map((groupe) => (
                <TouchableOpacity
                  key={groupe.id}
                  style={[
                    styles.modalOption,
                    formData.groupe_id === groupe.id && styles.modalOptionActive,
                  ]}
                  onPress={() => handleSelectGroupe(groupe.id)}
                >
                  <Text style={[
                    styles.modalOptionText,
                    formData.groupe_id === groupe.id && styles.modalOptionTextActive,
                  ]}>
                    {groupe.nom}
                  </Text>
                  {groupe.description && (
                    <Text style={styles.modalOptionSubtext}>{groupe.description}</Text>
                  )}
                  {groupe.eleves_count !== undefined && (
                    <Text style={styles.modalOptionSubtext}>{groupe.eleves_count} élève(s)</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Modal Confirmation Parent */}
      {pendingParentVerification && (
        <ParentConfirmationModal
          visible={showParentConfirmation}
          onClose={() => {
            setShowParentConfirmation(false);
            setPendingParentVerification(null);
          }}
          onConfirm={handleConfirmParent}
          parentNom={pendingParentVerification.parentInfo?.nom || ''}
          parentPrenom={pendingParentVerification.parentInfo?.prenom || ''}
          parentTelephone={pendingParentVerification.type === 'telephone' ? pendingParentVerification.valeur : pendingParentVerification.parentInfo?.telephone}
          parentEmail={pendingParentVerification.type === 'email' ? pendingParentVerification.valeur : pendingParentVerification.parentInfo?.email_personnel}
          type={pendingParentVerification.type}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    padding: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: '#EFF6FF',
    marginBottom: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    backgroundColor: '#EFF6FF',
    marginBottom: 16,
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    flex: 1,
  },
  inlineError: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: -12,
    marginBottom: 8,
  },
  previewContainer: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  previewContainerWarning: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  previewLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  previewValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E40AF',
  },
  rowContainerLarge: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfField: {
    flex: 1,
  },
  sexeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  sexeOption: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sexeOptionActive: {
    backgroundColor: '#EFF6FF',
    borderColor: theme.colors.primary.DEFAULT,
  },
  sexeOptionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  sexeOptionTextActive: {
    color: theme.colors.primary.DEFAULT,
  },
  parcoursRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  parcoursItem: {
    flex: 1,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#EFF6FF',
  },
  selectorButtonDisabled: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  selectorButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectorButtonText: {
    fontSize: 13,
    color: '#1F2937',
  },
  selectorButtonPlaceholder: {
    color: '#9CA3AF',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '85%',
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalClose: {
    fontSize: 18,
    color: '#6B7280',
    padding: 4,
  },
  modalList: {
    padding: 8,
  },
  modalOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalOptionActive: {
    backgroundColor: '#EFF6FF',
  },
  modalOptionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  modalOptionTextActive: {
    color: theme.colors.primary.DEFAULT,
  },
  modalOptionSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  modalEmptyText: {
    textAlign: 'center',
    padding: 20,
    color: '#9CA3AF',
  },
});