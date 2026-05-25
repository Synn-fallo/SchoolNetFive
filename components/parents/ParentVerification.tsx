import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useCallback } from 'react';
import { Phone, Mail, Check, AlertCircle, Lock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import theme from '@/constants/theme';

// ============================================================
// TYPES
// ============================================================

export interface VerificationResult {
  valid: boolean;
  parentId?: string;
  nom?: string;
  prenom?: string;
  message?: string;
}

export interface PhoneVerificationProps {
  /** Valeur initiale du téléphone */
  initialPhone?: string;
  /** Callback appelé après vérification réussie */
  onVerified?: (data: { parentId: string; nom: string; prenom: string }) => void;
  /** Callback appelé en cas d'erreur */
  onError?: (message: string) => void;
  /** Désactiver le composant (mode lecture seule) */
  disabled?: boolean;
  /** Mode lecture seule (déjà vérifié) */
  readOnly?: boolean;
  /** Label personnalisé */
  label?: string;
}

export interface EmailVerificationProps {
  /** Valeur initiale de l'email */
  initialEmail?: string;
  /** Callback appelé après vérification réussie */
  onVerified?: (data: { parentId: string; nom: string; prenom: string }) => void;
  /** Callback appelé en cas d'erreur */
  onError?: (message: string) => void;
  /** Désactiver le composant (mode lecture seule) */
  disabled?: boolean;
  /** Mode lecture seule (déjà vérifié) */
  readOnly?: boolean;
  /** Label personnalisé */
  label?: string;
}

// ============================================================
// FONCTIONS UTILITAIRES
// ============================================================

const normaliserTelephone = (tel: string): string => {
  return tel.replace(/\D/g, '');
};

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

// ============================================================
// COMPOSANT DE VÉRIFICATION PAR TÉLÉPHONE
// ============================================================

export function PhoneVerification({
  initialPhone = '',
  onVerified,
  onError,
  disabled = false,
  readOnly = false,
  label = 'Vérification par téléphone (obligatoire)',
}: PhoneVerificationProps) {
  const [phone, setPhone] = useState(initialPhone);
  const [confirmNom, setConfirmNom] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(readOnly);
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; message?: string } | null>(null);

  const handleVerify = async () => {
    const phoneClean = normaliserTelephone(phone);
    if (!phoneClean || phoneClean.length !== 10) {
      const message = 'Numéro de téléphone invalide (10 chiffres requis)';
      setVerifyResult({ valid: false, message });
      onError?.(message);
      return;
    }

    if (!confirmNom || confirmNom.trim() === '') {
      const message = 'Veuillez saisir le nom du parent pour confirmation';
      setVerifyResult({ valid: false, message });
      onError?.(message);
      return;
    }

    setIsVerifying(true);
    setVerifyResult(null);

    try {
      const { data: parentData, error } = await supabase
        .from('parents')
        .select('id, nom, prenom, telephone')
        .eq('telephone', phoneClean)
        .maybeSingle();

      if (error || !parentData) {
        const message = 'Aucun parent trouvé avec ce numéro';
        setVerifyResult({ valid: false, message });
        onError?.(message);
        return;
      }

      const nomSaisi = confirmNom.trim().toUpperCase();
      const nomBase = parentData.nom.toUpperCase();

      if (nomSaisi === nomBase) {
        setIsVerified(true);
        setVerifyResult({ valid: true, message: '✅ Téléphone confirmé' });
        onVerified?.({
          parentId: parentData.id,
          nom: parentData.nom,
          prenom: toTitleCase(parentData.prenom),
        });
      } else {
        const message = 'Nom incorrect. Veuillez vérifier et réessayer.';
        setVerifyResult({ valid: false, message });
        onError?.(message);
      }
    } catch (error) {
      console.error('Erreur vérification téléphone:', error);
      const message = 'Erreur lors de la vérification';
      setVerifyResult({ valid: false, message });
      onError?.(message);
    } finally {
      setIsVerifying(false);
    }
  };

  const isLocked = disabled || readOnly || isVerified;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Phone size={16} color={isVerified ? '#10B981' : theme.colors.primary.DEFAULT} />
        <Text style={[styles.title, isVerified && styles.titleSuccess]}>{label}</Text>
        {isVerified && <Check size={14} color="#10B981" />}
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.inputLabel}>Téléphone *</Text>
        <TextInput
          style={[styles.input, isLocked && styles.inputReadOnly]}
          placeholder="01 66 35 00 74"
          value={formaterTelephone(phone)}
          onChangeText={(text) => !isLocked && setPhone(text)}
          keyboardType="phone-pad"
          maxLength={14}
          editable={!isLocked}
        />
      </View>

      {!isVerified && (
        <View style={styles.verifyRow}>
          <TextInput
            style={[styles.verifyInput, styles.halfField]}
            placeholder="Saisir le NOM du parent pour vérification"
            value={confirmNom}
            onChangeText={(text) => setConfirmNom(text.toUpperCase())}
            editable={!disabled && !isVerified}
          />
          <TouchableOpacity
            style={[styles.verifyButton, (!confirmNom || isVerifying || isVerified) && styles.verifyButtonDisabled]}
            onPress={handleVerify}
            disabled={!confirmNom || isVerifying || isVerified || disabled}
          >
            {isVerifying ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.verifyButtonText}>Vérifier</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {verifyResult && (
        <View
          style={[
            styles.resultContainer,
            verifyResult.valid ? styles.resultSuccess : styles.resultError,
          ]}
        >
          {verifyResult.valid ? (
            <Check size={14} color="#065F46" />
          ) : (
            <AlertCircle size={14} color="#991B1B" />
          )}
          <Text style={[styles.resultText, verifyResult.valid ? styles.resultTextSuccess : styles.resultTextError]}>
            {verifyResult.message}
          </Text>
        </View>
      )}

      {isVerified && (
        <View style={styles.verifiedContainer}>
          <Lock size={12} color="#065F46" />
          <Text style={styles.verifiedText}>Téléphone vérifié et verrouillé</Text>
        </View>
      )}
    </View>
  );
}

// ============================================================
// COMPOSANT DE VÉRIFICATION PAR EMAIL
// ============================================================

export function EmailVerification({
  initialEmail = '',
  onVerified,
  onError,
  disabled = false,
  readOnly = false,
  label = 'Vérification par email (optionnel)',
}: EmailVerificationProps) {
  const [email, setEmail] = useState(initialEmail);
  const [confirmNom, setConfirmNom] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(readOnly);
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; message?: string } | null>(null);

  const handleVerify = async () => {
    const emailClean = email.trim().toLowerCase();
    if (!emailClean || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(emailClean)) {
      const message = 'Email invalide';
      setVerifyResult({ valid: false, message });
      onError?.(message);
      return;
    }

    if (!confirmNom || confirmNom.trim() === '') {
      const message = 'Veuillez saisir le nom du parent pour confirmation';
      setVerifyResult({ valid: false, message });
      onError?.(message);
      return;
    }

    setIsVerifying(true);
    setVerifyResult(null);

    try {
      const { data: parentData, error } = await supabase
        .from('parents')
        .select('id, nom, prenom, email_personnel')
        .ilike('email_personnel', emailClean)
        .maybeSingle();

      if (error || !parentData) {
        const message = 'Aucun parent trouvé avec cet email';
        setVerifyResult({ valid: false, message });
        onError?.(message);
        return;
      }

      const nomSaisi = confirmNom.trim().toUpperCase();
      const nomBase = parentData.nom.toUpperCase();

      if (nomSaisi === nomBase) {
        setIsVerified(true);
        setVerifyResult({ valid: true, message: '✅ Email confirmé' });
        onVerified?.({
          parentId: parentData.id,
          nom: parentData.nom,
          prenom: toTitleCase(parentData.prenom),
        });
      } else {
        const message = 'Nom incorrect. Veuillez vérifier et réessayer.';
        setVerifyResult({ valid: false, message });
        onError?.(message);
      }
    } catch (error) {
      console.error('Erreur vérification email:', error);
      const message = 'Erreur lors de la vérification';
      setVerifyResult({ valid: false, message });
      onError?.(message);
    } finally {
      setIsVerifying(false);
    }
  };

  const isLocked = disabled || readOnly || isVerified;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Mail size={16} color={isVerified ? '#10B981' : theme.colors.neutral[500]} />
        <Text style={[styles.title, styles.emailTitle, isVerified && styles.titleSuccess]}>{label}</Text>
        {isVerified && <Check size={14} color="#10B981" />}
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.inputLabel}>Email</Text>
        <TextInput
          style={[styles.input, isLocked && styles.inputReadOnly]}
          placeholder="email@exemple.com"
          value={email}
          onChangeText={(text) => !isLocked && setEmail(text.toLowerCase())}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!isLocked}
        />
      </View>

      {email && !isVerified && (
        <>
          <View style={styles.verifyRow}>
            <TextInput
              style={[styles.verifyInput, styles.halfField]}
              placeholder="Saisir le NOM du parent pour vérification"
              value={confirmNom}
              onChangeText={(text) => setConfirmNom(text.toUpperCase())}
              editable={!disabled && !isVerified}
            />
            <TouchableOpacity
              style={[styles.verifyButton, (!confirmNom || isVerifying || isVerified) && styles.verifyButtonDisabled]}
              onPress={handleVerify}
              disabled={!confirmNom || isVerifying || isVerified || disabled}
            >
              {isVerifying ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.verifyButtonText}>Vérifier</Text>
              )}
            </TouchableOpacity>
          </View>

          {verifyResult && (
            <View
              style={[
                styles.resultContainer,
                verifyResult.valid ? styles.resultSuccess : styles.resultError,
              ]}
            >
              {verifyResult.valid ? (
                <Check size={14} color="#065F46" />
              ) : (
                <AlertCircle size={14} color="#991B1B" />
              )}
              <Text style={[styles.resultText, verifyResult.valid ? styles.resultTextSuccess : styles.resultTextError]}>
                {verifyResult.message}
              </Text>
            </View>
          )}
        </>
      )}

      {isVerified && (
        <View style={styles.verifiedContainer}>
          <Lock size={12} color="#065F46" />
          <Text style={styles.verifiedText}>Email vérifié et verrouillé</Text>
        </View>
      )}
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  emailTitle: {
    color: '#6B7280',
  },
  titleSuccess: {
    color: '#065F46',
  },
  fieldContainer: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  inputReadOnly: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  verifyRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  verifyInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  verifyButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: 'center',
  },
  verifyButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  halfField: {
    flex: 1,
  },
  resultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  resultSuccess: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  resultError: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  resultText: {
    fontSize: 12,
    flex: 1,
  },
  resultTextSuccess: {
    color: '#065F46',
  },
  resultTextError: {
    color: '#991B1B',
  },
  verifiedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  verifiedText: {
    fontSize: 12,
    color: '#065F46',
    flex: 1,
  },
});