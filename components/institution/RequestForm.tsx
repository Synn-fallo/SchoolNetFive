import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator, Modal, TouchableOpacity, TextInput } from 'react-native';
import { useState, useEffect } from 'react';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { ChevronDown, CheckCircle, XCircle, Globe } from 'lucide-react-native';
import { useRegions } from '@/hooks/useRegions';
import { useDepartements } from '@/hooks/useDepartements';

export type RequestType = 'etablissement' | 'partenariat';

interface RequestFormProps {
  type: RequestType;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
  isSubmitting?: boolean;
  currentUserId?: string;
  currentRequestId?: string;
}

const TYPE_ETABLISSEMENT_OPTIONS = [
  { label: 'Public', value: 'public' },
  { label: 'Privé', value: 'prive' },
  { label: 'Mixte', value: 'mixte' },
];

const PLAN_ABONNEMENT_OPTIONS = [
  { label: 'Gratuit', value: 'gratuit' },
  { label: 'Basique', value: 'basique' },
  { label: 'Premium', value: 'premium' },
  { label: 'Entreprise', value: 'entreprise' },
];

const TYPE_PARTENAIRE_OPTIONS = [
  { label: 'ONG', value: 'ong' },
  { label: 'Opérateur télécom', value: 'operateur_telecom' },
  { label: 'Éditeur', value: 'editeur' },
  { label: 'Sponsor', value: 'sponsor' },
  { label: 'Autre', value: 'autre' },
];

const TYPE_COLLABORATION_OPTIONS = [
  { label: 'Sponsoring', value: 'sponsoring' },
  { label: 'Contenu', value: 'contenu' },
  { label: 'Technique', value: 'technique' },
  { label: 'Formation', value: 'formation' },
  { label: 'Autre', value: 'autre' },
];

const MODE_VERIFICATION_OPTIONS = [
  { label: 'Numéro d\'agrément officiel', value: 'auto' },
  { label: 'Upload du cachet humide + signature', value: 'manuel_cachet' },
  { label: 'Lien vers site/Facebook officiel', value: 'manuel_site' },
];

const STORAGE_KEY = 'schoolnet_draft_etablissement';

function CustomPicker({ label, value, options, onSelect, error, disabled = false }: any) {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedLabel = options.find((opt: any) => opt.value === value)?.label || 'Sélectionner';

  return (
    <View style={styles.pickerContainer}>
      <Text style={styles.pickerLabel}>{label} *</Text>
      <TouchableOpacity
        style={[styles.pickerButton, error && styles.pickerButtonError, disabled && styles.pickerButtonDisabled]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
      >
        <Text style={[styles.pickerButtonText, disabled && styles.pickerButtonTextDisabled]}>{selectedLabel}</Text>
        <ChevronDown size={20} color={disabled ? '#9CA3AF' : '#6B7280'} />
      </TouchableOpacity>
      {error && <Text style={styles.pickerError}>{error}</Text>}

      <Modal visible={modalVisible} transparent={true} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{label}</Text>
            {options.map((opt: any) => (
              <TouchableOpacity
                key={opt.value}
                style={styles.modalOption}
                onPress={() => {
                  onSelect(opt.value);
                  setModalVisible(false);
                }}
              >
                <Text style={styles.modalOptionText}>{opt.label}</Text>
                {value === opt.value && <Text style={styles.modalCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalClose} onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ValidatedInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  validationType,
  onValidationChange,
  required = true,
  currentUserId,
  currentRequestId,
  multiline = false,
  numberOfLines = 1,
}: any) {
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState(false);

  const validateEmail = async (email: string): Promise<{ valid: boolean; error: string | null }> => {
    if (!email && !required) return { valid: true, error: null };
    if (!email && required) return { valid: false, error: 'Email requis' };

    const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, error: "Format d'email invalide" };
    }

    try {
      const { data: existingEtab } = await supabase
        .from('etablissements')
        .select('id')
        .eq('email', email)
        .eq('statut', 'ACTIF')
        .maybeSingle();

      if (existingEtab) {
        return { valid: false, error: 'Cet email est déjà utilisé par un établissement actif' };
      }

      let query = supabase
        .from('demandes_etablissement')
        .select('id, demandeur_id')
        .eq('email_contact', email)
        .in('statut', ['en_attente', 'en_cours']);

      if (currentRequestId) {
        query = query.neq('id', currentRequestId);
      }

      const { data: pendingRequests } = await query;

      if (pendingRequests && pendingRequests.length > 0) {
        return { valid: false, error: 'Cet email est déjà utilisé dans une demande en attente' };
      }

      return { valid: true, error: null };
    } catch {
      return { valid: true, error: null };
    }
  };

  const validateUrl = (url: string): { valid: boolean; error: string | null } => {
    if (!url && !required) return { valid: true, error: null };
    if (!url && required) return { valid: false, error: 'Ce champ est requis' };

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return { valid: false, error: `Format URL - suggestion: https://${url}` };
    }

    const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
    if (!urlRegex.test(url)) {
      return { valid: false, error: 'Format URL invalide (ex: https://www.exemple.com)' };
    }

    return { valid: true, error: null };
  };

  useEffect(() => {
    const validate = async () => {
      setValidating(true);
      let result: { valid: boolean; error: string | null } = { valid: false, error: null };

      if (validationType === 'email') {
        result = await validateEmail(value);
      } else if (validationType === 'url') {
        result = validateUrl(value);
      } else {
        const valid = required ? !!value : true;
        result = { valid, error: !value && required ? 'Ce champ est requis' : null };
      }

      setIsValid(result.valid);
      setError(result.error);
      setValidating(false);
      if (onValidationChange) onValidationChange(result.valid);
    };

    const timer = setTimeout(validate, 500);
    return () => clearTimeout(timer);
  }, [value, validationType, required, currentUserId, currentRequestId]);

  const showValidIcon = isValid && value && !error;
  const showErrorIcon = !isValid && error && value;

  return (
    <View style={styles.inputWrapper}>
      <Text style={styles.inputLabel}>
        {label} {required ? '*' : '(optionnel)'}
      </Text>
      <View style={[styles.inputContainer, error && styles.inputContainerError, showValidIcon && styles.inputContainerValid]}>
        {validationType === 'url' && <Globe size={18} color="#9CA3AF" style={styles.inputIcon} />}
        <TextInput
          style={[styles.input, validationType === 'url' && styles.inputWithIcon]}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          multiline={multiline}
          numberOfLines={numberOfLines}
          textAlignVertical={multiline ? 'top' : 'auto'}
        />
        {validating && <ActivityIndicator size="small" color="#3B82F6" style={styles.inputRightIcon} />}
        {!validating && showValidIcon && <CheckCircle size={18} color="#10B981" style={styles.inputRightIcon} />}
        {!validating && showErrorIcon && <XCircle size={18} color="#EF4444" style={styles.inputRightIcon} />}
      </View>
      {error && <Text style={styles.inputError}>{error}</Text>}
    </View>
  );
}

export default function RequestForm({ type, onSubmit, initialData, isSubmitting = false, currentUserId, currentRequestId }: RequestFormProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(initialData || {
    nom_etablissement: '',
    type_etablissement: 'prive',
    adresse: '',
    ville: '',
    telephone: '',
    email_contact: '',
    site_web: '',
    plan_souhaite: 'basique',
    message_demandeur: '',
    mode_verification: 'auto',
    numero_agrement: '',
    justificatif_url: '',
    region_id: '',
    departement_id: '',
    type_partenaire: 'autre',
    organisation_nom: '',
    organisation_site: '',
    organisation_siege: '',
    contact_nom: '',
    contact_email: '',
    contact_telephone: '',
    type_collaboration: 'autre',
    proposition: '',
    montant_propose: '',
  });

  const [fieldValidity, setFieldValidity] = useState({ email_contact: false, site_web: true });
  const { regions, loading: loadingRegions } = useRegions();
  const { departements, loading: loadingDepartements } = useDepartements(formData.region_id || undefined);

  const isEtablissement = type === 'etablissement';
  const totalSteps = isEtablissement ? 4 : 2;

  useEffect(() => {
    if (isEtablissement && Object.values(formData).some((v) => v)) {
      const timer = setTimeout(() => {
        try {
          const draft = { data: formData, step, savedAt: new Date().toISOString() };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
        } catch (error) {
          console.error('Error saving draft:', error);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [formData, step, isEtablissement]);

  useEffect(() => {
    if (isEtablissement && !initialData) {
      try {
        const savedDraft = localStorage.getItem(STORAGE_KEY);
        if (savedDraft) {
          const draft = JSON.parse(savedDraft);
          const savedDate = new Date(draft.savedAt);
          const now = new Date();
          const hoursSinceSave = (now.getTime() - savedDate.getTime()) / (1000 * 60 * 60);

          if (hoursSinceSave < 24) {
            Alert.alert('Brouillon trouvé', 'Vous avez un brouillon non finalisé.', [
              { text: 'Ignorer', style: 'cancel', onPress: () => localStorage.removeItem(STORAGE_KEY) },
              { text: 'Restaurer', onPress: () => {
                setFormData(draft.data);
                setStep(draft.step);
              } },
            ]);
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    }
  }, [isEtablissement, initialData]);

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === 'email_contact') {
      setFieldValidity((prev) => ({ ...prev, email_contact: false }));
    }
  };

  const handleValidationChange = (field: string, isValid: boolean) => {
    setFieldValidity((prev) => ({ ...prev, [field]: isValid }));
  };

  const isStepValid = () => {
    if (isEtablissement) {
      if (step === 1) {
        const requiredFields = ['nom_etablissement', 'adresse', 'ville', 'telephone', 'email_contact', 'region_id', 'departement_id'];
        const allRequiredFilled = requiredFields.every((field) => formData[field as keyof typeof formData]);
        return allRequiredFilled && fieldValidity.email_contact;
      }
      if (step === 2) {
        if (formData.mode_verification === 'auto') return !!formData.numero_agrement;
        if (formData.mode_verification === 'manuel_cachet') return !!formData.justificatif_url;
        if (formData.mode_verification === 'manuel_site') return !!formData.site_web;
        return false;
      }
      if (step === 4) return !!formData.plan_souhaite;
    } else {
      if (step === 1) {
        const requiredFields = ['organisation_nom', 'contact_nom', 'contact_email', 'contact_telephone'];
        return requiredFields.every((field) => formData[field as keyof typeof formData]);
      }
      if (step === 2) return !!formData.proposition;
    }
    return true;
  };

  const handleNext = () => {
    if (!isStepValid()) {
      Alert.alert('Champ manquant', 'Veuillez remplir tous les champs obligatoires correctement');
      return;
    }
    setStep(step + 1);
  };

  const handlePrevious = () => setStep(step - 1);

  const handleSubmit = async () => {
    if (!isStepValid()) {
      Alert.alert('Champ manquant', 'Veuillez remplir tous les champs obligatoires correctement');
      return;
    }
    try {
      await onSubmit(formData);
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Erreur lors de la soumission');
    }
  };

  const renderStep1 = () => {
    if (isEtablissement) {
      return (
        <>
          <ValidatedInput
            label="Nom de l'établissement"
            value={formData.nom_etablissement}
            onChangeText={(v: string) => updateField('nom_etablissement', v)}
            placeholder="Ex: Lycée Moderne de Cotonou"
            required
          />
          <CustomPicker
            label="Type d'établissement"
            value={formData.type_etablissement}
            options={TYPE_ETABLISSEMENT_OPTIONS}
            onSelect={(v: string) => updateField('type_etablissement', v)}
          />

          {/* Région */}
          <CustomPicker
            label="Région"
            value={formData.region_id}
            options={regions.map((r) => ({ label: r.nom, value: r.id }))}
            onSelect={(v: string) => {
              updateField('region_id', v);
              updateField('departement_id', '');
            }}
            error={!formData.region_id ? 'La région est obligatoire' : undefined}
            disabled={loadingRegions}
          />

          {/* Département */}
          <View>
            <CustomPicker
              label="Département"
              value={formData.departement_id}
              options={departements.map((d) => ({ label: d.nom, value: d.id }))}
              onSelect={(v: string) => updateField('departement_id', v)}
              disabled={!formData.region_id || loadingDepartements}
              error={!formData.departement_id && formData.region_id ? 'Le département est obligatoire' : undefined}
            />
            {loadingDepartements && formData.region_id && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#3B82F6" />
                <Text style={styles.loadingText}>Chargement des départements...</Text>
              </View>
            )}
          </View>

          <ValidatedInput
            label="Ville"
            value={formData.ville}
            onChangeText={(v: string) => updateField('ville', v)}
            placeholder="Cotonou"
            required
          />
          <ValidatedInput
            label="Adresse"
            value={formData.adresse}
            onChangeText={(v: string) => updateField('adresse', v)}
            placeholder="Adresse complète"
            required
          />
          <View style={styles.row}>
            <View style={styles.half}>
              <ValidatedInput
                label="Téléphone"
                value={formData.telephone}
                onChangeText={(v: string) => updateField('telephone', v)}
                placeholder="+229 99 00 00 00"
                keyboardType="phone-pad"
                required
              />
            </View>
            <View style={styles.half}>
              <ValidatedInput
                label="Email"
                value={formData.email_contact}
                onChangeText={(v: string) => updateField('email_contact', v)}
                placeholder="contact@ecole.com"
                keyboardType="email-address"
                validationType="email"
                onValidationChange={(isValid: boolean) => handleValidationChange('email_contact', isValid)}
                required
                currentUserId={currentUserId}
                currentRequestId={currentRequestId}
              />
            </View>
          </View>
          <ValidatedInput
            label="Site web (optionnel)"
            value={formData.site_web}
            onChangeText={(v: string) => updateField('site_web', v)}
            placeholder="https://www.ecole.com"
            keyboardType="url"
            validationType="url"
            onValidationChange={(isValid: boolean) => handleValidationChange('site_web', isValid)}
            required={false}
          />
        </>
      );
    } else {
      return (
        <>
          <CustomPicker
            label="Type de partenaire"
            value={formData.type_partenaire}
            options={TYPE_PARTENAIRE_OPTIONS}
            onSelect={(v: string) => updateField('type_partenaire', v)}
          />
          <ValidatedInput
            label="Nom de l'organisation"
            value={formData.organisation_nom}
            onChangeText={(v: string) => updateField('organisation_nom', v)}
            placeholder="Nom complet"
            required
          />
          <ValidatedInput
            label="Site web"
            value={formData.organisation_site}
            onChangeText={(v: string) => updateField('organisation_site', v)}
            placeholder="https://www.organisation.com"
            keyboardType="url"
            validationType="url"
            required={false}
          />
          <ValidatedInput
            label="Siège social"
            value={formData.organisation_siege}
            onChangeText={(v: string) => updateField('organisation_siege', v)}
            placeholder="Cotonou, Bénin"
            required={false}
          />
          <ValidatedInput
            label="Nom du contact"
            value={formData.contact_nom}
            onChangeText={(v: string) => updateField('contact_nom', v)}
            placeholder="Prénom et nom"
            required
          />
          <View style={styles.row}>
            <View style={styles.half}>
              <ValidatedInput
                label="Email contact"
                value={formData.contact_email}
                onChangeText={(v: string) => updateField('contact_email', v)}
                placeholder="contact@organisation.com"
                keyboardType="email-address"
                validationType="email"
                required
                currentUserId={currentUserId}
                currentRequestId={currentRequestId}
              />
            </View>
            <View style={styles.half}>
              <ValidatedInput
                label="Téléphone"
                value={formData.contact_telephone}
                onChangeText={(v: string) => updateField('contact_telephone', v)}
                placeholder="+229 99 00 00 00"
                keyboardType="phone-pad"
                required
              />
            </View>
          </View>
          <CustomPicker
            label="Type de collaboration"
            value={formData.type_collaboration}
            options={TYPE_COLLABORATION_OPTIONS}
            onSelect={(v: string) => updateField('type_collaboration', v)}
          />
        </>
      );
    }
  };

  const renderStep2 = () => {
    if (isEtablissement) {
      return (
        <>
          <Text style={styles.stepTitle}>Vérification d'identité</Text>
          <Text style={styles.stepDescription}>Choisissez un mode de vérification pour établir votre légitimité.</Text>
          <CustomPicker
            label="Mode de vérification"
            value={formData.mode_verification}
            options={MODE_VERIFICATION_OPTIONS}
            onSelect={(v: string) => updateField('mode_verification', v)}
          />
          {formData.mode_verification === 'auto' && (
            <ValidatedInput
              label="Numéro d'agrément officiel"
              value={formData.numero_agrement}
              onChangeText={(v: string) => updateField('numero_agrement', v)}
              placeholder="Ex: 2024-0012/AGRE"
              required
            />
          )}
          {formData.mode_verification === 'manuel_cachet' && (
            <View>
              <ValidatedInput
                label="URL du justificatif (cachet + signature)"
                value={formData.justificatif_url}
                onChangeText={(v: string) => updateField('justificatif_url', v)}
                placeholder="https://... (image du document scanné)"
                keyboardType="url"
                validationType="url"
                required
              />
              <Text style={styles.hintText}>Uploader le cachet humide + signature scanné. Validation manuelle sous 48h.</Text>
            </View>
          )}
          {formData.mode_verification === 'manuel_site' && (
            <View>
              <ValidatedInput
                label="Site web ou page Facebook officielle"
                value={formData.site_web}
                onChangeText={(v: string) => updateField('site_web', v)}
                placeholder="https://www.ecole.com"
                keyboardType="url"
                validationType="url"
                required
              />
              <Text style={styles.hintText}>Lien vers un site officiel existant. Validation manuelle sous 48h.</Text>
            </View>
          )}
        </>
      );
    } else {
      return (
        <>
          <Text style={styles.stepTitle}>Proposition de partenariat</Text>
          <Text style={styles.stepDescription}>Décrivez votre proposition.</Text>
          <ValidatedInput
            label="Proposition"
            value={formData.proposition}
            onChangeText={(v: string) => updateField('proposition', v)}
            placeholder="Décrivez votre proposition de partenariat"
            multiline
            numberOfLines={5}
            required
          />
          <ValidatedInput
            label="Montant proposé (optionnel)"
            value={formData.montant_propose}
            onChangeText={(v: string) => updateField('montant_propose', v)}
            placeholder="En FCFA"
            keyboardType="numeric"
            required={false}
          />
        </>
      );
    }
  };

  const renderStep3 = () => {
    if (isEtablissement) {
      return (
        <>
          <Text style={styles.stepTitle}>Message (optionnel)</Text>
          <Text style={styles.stepDescription}>Vous pouvez ajouter un message pour accompagner votre demande.</Text>
          <Input
            label="Votre message"
            placeholder="Informations complémentaires..."
            value={formData.message_demandeur}
            onChangeText={(v) => updateField('message_demandeur', v)}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </>
      );
    }
    return null;
  };

  const renderStep4 = () => {
    return (
      <>
        <Text style={styles.stepTitle}>Plan d'abonnement souhaité</Text>
        <Text style={styles.stepDescription}>Choisissez le plan qui correspond le mieux à vos besoins.</Text>
        <CustomPicker
          label="Plan d'abonnement"
          value={formData.plan_souhaite}
          options={PLAN_ABONNEMENT_OPTIONS}
          onSelect={(v: string) => updateField('plan_souhaite', v)}
        />
        <Input
          label="Message (optionnel)"
          placeholder="Informations complémentaires..."
          value={formData.message_demandeur}
          onChangeText={(v) => updateField('message_demandeur', v)}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Créer un établissement</Text>
        <Text style={styles.subtitle}>
          Remplissez ce formulaire pour soumettre une demande de création d'établissement sur SchoolNet. Un administrateur examinera votre demande.
        </Text>
      </View>

      <View style={styles.stepIndicator}>
        <Text style={styles.stepIndicatorText}>Étape {step} / {totalSteps}</Text>
      </View>

      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}

      <View style={styles.buttonContainer}>
        {step > 1 && <Button title="Précédent" onPress={handlePrevious} variant="secondary" fullWidth={false} />}
        {step < totalSteps ? (
          <Button title="Suivant" onPress={handleNext} variant="primary" fullWidth={false} disabled={!isStepValid()} />
        ) : (
          <Button
            title={isSubmitting ? 'Envoi en cours...' : 'Soumettre la demande'}
            onPress={handleSubmit}
            variant="success"
            loading={isSubmitting}
            disabled={isSubmitting || !isStepValid()}
            fullWidth
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, paddingBottom: 32 },
  header: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  stepIndicator: { backgroundColor: '#EFF6FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 20 },
  stepIndicatorText: { fontSize: 14, fontWeight: '600', color: '#3B82F6' },
  stepTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 12 },
  stepDescription: { fontSize: 14, color: '#6B7280', marginBottom: 20, lineHeight: 20 },
  hintText: { fontSize: 12, color: '#9CA3AF', marginTop: 4, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  buttonContainer: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 24 },
  pickerContainer: { marginBottom: 16 },
  pickerLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  pickerButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', minHeight: 48 },
  pickerButtonError: { borderColor: '#EF4444' },
  pickerButtonDisabled: { backgroundColor: '#F3F4F6', opacity: 0.6 },
  pickerButtonText: { fontSize: 16, color: '#1F2937' },
  pickerButtonTextDisabled: { color: '#9CA3AF' },
  pickerError: { fontSize: 12, color: '#EF4444', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginBottom: 16, textAlign: 'center' },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalOptionText: { fontSize: 16, color: '#1F2937' },
  modalCheck: { fontSize: 18, color: '#3B82F6', fontWeight: '600' },
  modalClose: { marginTop: 16, paddingVertical: 12, alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  modalCloseText: { fontSize: 16, color: '#6B7280', fontWeight: '500' },
  inputWrapper: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, backgroundColor: '#FFFFFF', minHeight: 48, paddingHorizontal: 12 },
  inputContainerError: { borderColor: '#EF4444' },
  inputContainerValid: { borderColor: '#10B981' },
  input: { flex: 1, fontSize: 16, color: '#1F2937', paddingVertical: 12 },
  inputWithIcon: { marginLeft: 8 },
  inputIcon: { marginRight: 4 },
  inputRightIcon: { marginLeft: 8 },
  inputError: { fontSize: 12, color: '#EF4444', marginTop: 4 },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, marginBottom: 8 },
  loadingText: { fontSize: 12, color: '#6B7280' },
});