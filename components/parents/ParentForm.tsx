import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { Phone, Mail, User, Check, AlertCircle, Lock } from 'lucide-react-native';
import theme from '@/constants/theme';

export interface ParentFormData {
  telephone: string;
  email_personnel: string;
  nom: string;
  prenom: string;
  type_lien: string;
  est_principal: boolean;
  existing_parent_id?: string;
  is_verified?: boolean;
}

interface ParentFormProps {
  initialData?: Partial<ParentFormData>;
  onSubmit: (data: ParentFormData) => Promise<void>;
  onCancel?: () => void;
  isLoading?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  showLienSelector?: boolean;
  showPrincipalCheckbox?: boolean;
  readOnly?: boolean;
}

const formaterTelephone = (text: string): string => {
  const cleaned = text.replace(/\D/g, '');
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 4) return `${cleaned.slice(0,2)} ${cleaned.slice(2)}`;
  if (cleaned.length <= 6) return `${cleaned.slice(0,2)} ${cleaned.slice(2,4)} ${cleaned.slice(4)}`;
  if (cleaned.length <= 8) return `${cleaned.slice(0,2)} ${cleaned.slice(2,4)} ${cleaned.slice(4,6)} ${cleaned.slice(6)}`;
  return `${cleaned.slice(0,2)} ${cleaned.slice(2,4)} ${cleaned.slice(4,6)} ${cleaned.slice(6,8)} ${cleaned.slice(8,10)}`;
};

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

export default function ParentForm({
  initialData = {},
  onSubmit,
  onCancel,
  isLoading = false,
  submitLabel = 'Enregistrer',
  cancelLabel = 'Annuler',
  showLienSelector = true,
  showPrincipalCheckbox = true,
  readOnly = false,
}: ParentFormProps) {
  const [formData, setFormData] = useState<ParentFormData>({
    telephone: initialData.telephone || '',
    email_personnel: initialData.email_personnel || '',
    nom: initialData.nom || '',
    prenom: initialData.prenom || '',
    type_lien: initialData.type_lien || 'pere',
    est_principal: initialData.est_principal || false,
    existing_parent_id: initialData.existing_parent_id,
    is_verified: initialData.is_verified || false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    
    setFormData(prev => ({
      telephone: initialData.telephone !== undefined && !prev.telephone ? initialData.telephone : prev.telephone,
      email_personnel: initialData.email_personnel !== undefined && !prev.email_personnel ? initialData.email_personnel : prev.email_personnel,
      nom: initialData.nom !== undefined && !prev.nom ? initialData.nom : prev.nom,
      prenom: initialData.prenom !== undefined && !prev.prenom ? initialData.prenom : prev.prenom,
      type_lien: initialData.type_lien !== undefined && !prev.type_lien ? initialData.type_lien : prev.type_lien,
      est_principal: initialData.est_principal !== undefined ? initialData.est_principal : prev.est_principal,
      existing_parent_id: initialData.existing_parent_id !== undefined ? initialData.existing_parent_id : prev.existing_parent_id,
      is_verified: initialData.is_verified !== undefined ? initialData.is_verified : prev.is_verified,
    }));
  }, [initialData]);

  const updateField = (field: keyof ParentFormData, value: any) => {
    if (readOnly || formData.is_verified) return;
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.telephone || formData.telephone.replace(/\s/g, '').length < 10) {
      newErrors.telephone = 'Le téléphone est obligatoire (10 chiffres)';
    }
    
    if (!formData.nom) newErrors.nom = 'Le nom est obligatoire';
    if (!formData.prenom) newErrors.prenom = 'Le prénom est obligatoire';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (readOnly || formData.is_verified) return;
    if (!validateForm()) return;
    await onSubmit(formData);
  };

  const getLienLabel = (lien: string): string => {
    switch (lien) {
      case 'pere': return 'Père';
      case 'mere': return 'Mère';
      case 'tuteur': return 'Tuteur';
      default: return 'Autre';
    }
  };

  const isReadOnly = readOnly || formData.is_verified;
  
  // Afficher les boutons uniquement si ce n'est pas en mode lecture seule
  const showButtons = !isReadOnly;

  return (
    <View style={styles.container}>
      <View style={styles.fieldContainer}>
        <View style={styles.labelContainer}>
          <Phone size={16} color={theme.colors.neutral[500]} />
          <Text style={styles.label}>Téléphone *</Text>
          {isReadOnly && <Lock size={12} color="#9CA3AF" />}
        </View>
        <TextInput
          style={[
            styles.input, 
            errors.telephone && styles.inputError,
            isReadOnly && styles.inputReadOnly,
          ]}
          placeholder="xx xx xx xx xx"
          value={formaterTelephone(formData.telephone)}
          onChangeText={(text) => updateField('telephone', text)}
          keyboardType="phone-pad"
          maxLength={14}
          editable={!isReadOnly}
        />
        {errors.telephone && (
          <View style={styles.errorContainer}>
            <AlertCircle size={12} color="#EF4444" />
            <Text style={styles.errorText}>{errors.telephone}</Text>
          </View>
        )}
      </View>

      <View style={styles.fieldContainer}>
        <View style={styles.labelContainer}>
          <Mail size={16} color={theme.colors.neutral[500]} />
          <Text style={styles.label}>Email (optionnel)</Text>
          {isReadOnly && <Lock size={12} color="#9CA3AF" />}
        </View>
        <TextInput
          style={[styles.input, isReadOnly && styles.inputReadOnly]}
          placeholder="email@exemple.com"
          value={formData.email_personnel}
          onChangeText={(text) => updateField('email_personnel', text.toLowerCase())}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isReadOnly}
        />
      </View>

      <View style={styles.rowContainer}>
        <View style={styles.halfField}>
          <View style={styles.labelContainer}>
            <User size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.label}>Nom *</Text>
            {isReadOnly && <Lock size={12} color="#9CA3AF" />}
          </View>
          <TextInput
            style={[
              styles.input, 
              errors.nom && styles.inputError,
              isReadOnly && styles.inputReadOnly,
            ]}
            placeholder="Nom du parent"
            value={formData.nom}
            onChangeText={(text) => updateField('nom', text.toUpperCase())}
            editable={!isReadOnly}
          />
          {errors.nom && <Text style={styles.inlineError}>{errors.nom}</Text>}
        </View>
        <View style={styles.halfField}>
          <View style={styles.labelContainer}>
            <User size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.label}>Prénom *</Text>
            {isReadOnly && <Lock size={12} color="#9CA3AF" />}
          </View>
          <TextInput
            style={[
              styles.input, 
              errors.prenom && styles.inputError,
              isReadOnly && styles.inputReadOnly,
            ]}
            placeholder="Prénom du parent"
            value={formData.prenom}
            onChangeText={(text) => updateField('prenom', toTitleCase(text))}
            editable={!isReadOnly}
          />
          {errors.prenom && <Text style={styles.inlineError}>{errors.prenom}</Text>}
        </View>
      </View>

      {showLienSelector && (
        <View style={styles.fieldContainer}>
          <Text style={styles.label}>Lien de parenté</Text>
          <View style={styles.lienContainer}>
            {['pere', 'mere', 'tuteur', 'autre'].map((lien) => (
              <TouchableOpacity
                key={lien}
                style={[
                  styles.lienOption, 
                  formData.type_lien === lien && styles.lienOptionActive,
                  isReadOnly && styles.lienOptionDisabled,
                ]}
                onPress={() => updateField('type_lien', lien)}
                disabled={isReadOnly}
              >
                <Text style={[
                  styles.lienOptionText, 
                  formData.type_lien === lien && styles.lienOptionTextActive,
                  isReadOnly && styles.lienOptionTextDisabled,
                ]}>
                  {getLienLabel(lien)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {showPrincipalCheckbox && (
        <TouchableOpacity
          style={styles.principalOption}
          onPress={() => updateField('est_principal', !formData.est_principal)}
          disabled={isReadOnly}
        >
          <View style={[styles.checkbox, formData.est_principal && styles.checkboxActive]}>
            {formData.est_principal && <Check size={12} color="#FFFFFF" />}
          </View>
          <Text style={styles.principalText}>Définir comme parent principal</Text>
        </TouchableOpacity>
      )}

      {formData.is_verified && (
        <View style={styles.verifiedContainer}>
          <Check size={14} color="#10B981" />
          <Text style={styles.verifiedText}>Parent vérifié - informations verrouillées</Text>
        </View>
      )}

      {/* ✅ AJOUT : Boutons de validation */}
      {showButtons && (
        <View style={styles.buttonContainer}>
          {onCancel && (
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={onCancel}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>{cancelLabel}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <Text style={styles.submitButtonText}>Chargement...</Text>
            ) : (
              <Text style={styles.submitButtonText}>{submitLabel}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#EFF6FF',
  },
  inputReadOnly: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
  },
  inlineError: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: -12,
    marginBottom: 8,
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfField: {
    flex: 1,
  },
  lienContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  lienOption: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  lienOptionActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
    borderColor: theme.colors.primary.DEFAULT,
  },
  lienOptionDisabled: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  lienOptionText: {
    fontSize: 13,
    color: '#6B7280',
  },
  lienOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  lienOptionTextDisabled: {
    color: '#9CA3AF',
  },
  principalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
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
  checkboxActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
    borderColor: theme.colors.primary.DEFAULT,
  },
  principalText: {
    fontSize: 14,
    color: '#374151',
  },
  verifiedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  verifiedText: {
    fontSize: 13,
    color: '#065F46',
  },
  // ✅ Nouveaux styles pour les boutons
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  submitButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
});