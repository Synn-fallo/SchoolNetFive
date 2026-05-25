import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert, TextInput } from 'react-native';
import { useState } from 'react';
import { Phone, Mail, User, Users, Check, AlertCircle, Star, UserPlus, Lock } from 'lucide-react-native';
import { Card } from '@/components/Card';
import { supabase } from '@/lib/supabase';
import { PhoneVerification, EmailVerification } from './ParentVerification';
import theme from '@/constants/theme';

export interface EnfantInfo {
  id: string;
  nom: string;
  prenom: string;
  classe_nom?: string;
  est_deja_lie: boolean;
}

export interface ParentSearchResultProps {
  parent?: {
    id: string;
    nom: string;
    prenom: string;
    telephone: string;
    email_personnel?: string;
  };
  enfantsExistants: EnfantInfo[];
  isAlreadyLinkedToCurrentEleve: boolean;
  onLink: (typeLien: string, estPrincipal: boolean) => void;
  onCreateParent?: (data: {
    nom: string;
    prenom: string;
    telephone: string;
    email_personnel?: string;
    type_lien: string;
    est_principal: boolean;
  }) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  isCreating?: boolean;
  searchType?: 'telephone' | 'email';
  searchValue?: string;
  existingLiens?: string[];
  hasParentPrincipal?: boolean;
}

const LIEN_OPTIONS = [
  { key: 'pere', label: 'Père' },
  { key: 'mere', label: 'Mère' },
  { key: 'tuteur', label: 'Tuteur' },
  { key: 'autre', label: 'Autre' },
];

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

export default function ParentSearchResult({
  parent,
  enfantsExistants,
  isAlreadyLinkedToCurrentEleve,
  onLink,
  onCreateParent,
  onCancel,
  isLoading = false,
  isCreating = false,
  searchType = 'telephone',
  searchValue = '',
  existingLiens = [],
  hasParentPrincipal = false,
}: ParentSearchResultProps) {
  const [selectedLien, setSelectedLien] = useState('pere');
  const [estPrincipal, setEstPrincipal] = useState(false);
  
  // État pour le formulaire de création (aucun parent trouvé)
  const [newParentNom, setNewParentNom] = useState('');
  const [newParentPrenom, setNewParentPrenom] = useState('');
  const [newParentTelephone, setNewParentTelephone] = useState(searchType === 'telephone' ? searchValue : '');
  const [newParentEmail, setNewParentEmail] = useState(searchType === 'email' ? searchValue : '');
  const [newParentLien, setNewParentLien] = useState('pere');
  const [newParentEstPrincipal, setNewParentEstPrincipal] = useState(false);
  
  // États pour les vérifications
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerifiedData, setPhoneVerifiedData] = useState<{ parentId: string; nom: string; prenom: string } | null>(null);
  const [emailVerifiedData, setEmailVerifiedData] = useState<{ parentId: string; nom: string; prenom: string } | null>(null);
  
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  // Vérifier si un lien est déjà utilisé
  const isLienDisabled = (lienKey: string) => {
    return existingLiens.includes(lienKey) && (lienKey === 'pere' || lienKey === 'mere');
  };

  // Vérifier si la case parent principal doit être désactivée
  const isPrincipalDisabled = () => {
    return hasParentPrincipal;
  };

  const handlePhoneVerified = (data: { parentId: string; nom: string; prenom: string }) => {
    setPhoneVerified(true);
    setPhoneVerifiedData(data);
    // Pré-remplir nom et prénom
    setNewParentNom(data.nom);
    setNewParentPrenom(data.prenom);
  };

  const handleEmailVerified = (data: { parentId: string; nom: string; prenom: string }) => {
    setEmailVerified(true);
    setEmailVerifiedData(data);
    // Pré-remplir nom et prénom
    setNewParentNom(data.nom);
    setNewParentPrenom(data.prenom);
  };

  const handleCreateParent = async () => {
    const errors: Record<string, string> = {};
    if (!newParentNom.trim()) errors.nom = 'Le nom est obligatoire';
    if (!newParentPrenom.trim()) errors.prenom = 'Le prénom est obligatoire';
    
    // Validation selon le type de recherche
    if (searchType === 'telephone') {
      if (!newParentTelephone.replace(/\D/g, '') || newParentTelephone.replace(/\D/g, '').length !== 10) {
        errors.telephone = 'Téléphone invalide (10 chiffres requis)';
      }
    } else {
      if (!phoneVerified && !newParentTelephone.replace(/\D/g, '')) {
        errors.telephone = 'Le téléphone est obligatoire';
      } else if (newParentTelephone.replace(/\D/g, '') && newParentTelephone.replace(/\D/g, '').length !== 10) {
        errors.telephone = 'Téléphone invalide (10 chiffres requis)';
      }
    }
    
    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      return;
    }

    setCreateErrors({});
    if (onCreateParent) {
      await onCreateParent({
        nom: newParentNom.toUpperCase(),
        prenom: newParentPrenom,
        telephone: newParentTelephone,
        email_personnel: newParentEmail || undefined,
        type_lien: newParentLien,
        est_principal: newParentEstPrincipal,
      });
    }
  };

  const formatTelephone = (tel: string): string => {
    const cleaned = tel.replace(/\D/g, '');
    if (cleaned.length !== 10) return tel;
    return `${cleaned.slice(0,2)} ${cleaned.slice(2,4)} ${cleaned.slice(4,6)} ${cleaned.slice(6,8)} ${cleaned.slice(8,10)}`;
  };

  // ============================================================
  // CAS 1: Parent trouvé - afficher les informations et formulaire de liaison
  // ============================================================
  if (parent) {
    const enfantsLies = enfantsExistants.filter(e => e.est_deja_lie);
    const enfantsNonLies = enfantsExistants.filter(e => !e.est_deja_lie);

    return (
      <Card style={styles.card}>
        <Text style={styles.title}>📋 Parent trouvé</Text>

        <View style={styles.parentInfo}>
          <View style={styles.parentHeader}>
            <View style={styles.avatar}>
              <User size={24} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.parentName}>{toTitleCase(parent.prenom)} {parent.nom}</Text>
              <View style={styles.contactRow}>
                <Phone size={14} color={theme.colors.neutral[500]} />
                <Text style={styles.contactText}>{formatTelephone(parent.telephone)}</Text>
              </View>
              {parent.email_personnel && (
                <View style={styles.contactRow}>
                  <Mail size={14} color={theme.colors.neutral[500]} />
                  <Text style={styles.contactText}>{parent.email_personnel}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.verifiedInfo}>
          <Lock size={12} color="#10B981" />
          <Text style={styles.verifiedInfoText}>Informations vérifiées et verrouillées</Text>
        </View>

        {enfantsExistants.length > 0 && (
          <View style={styles.enfantsSection}>
            <Text style={styles.enfantsTitle}>
              <Users size={14} color={theme.colors.neutral[500]} /> Enfant(s) déjà lié(s)
            </Text>
            {enfantsLies.map((enfant) => (
              <View key={enfant.id} style={styles.enfantItem}>
                <View style={styles.enfantBadge}>
                  <Text style={styles.enfantBadgeText}>✓ Lié</Text>
                </View>
                <Text style={styles.enfantName}>{toTitleCase(enfant.prenom)} {enfant.nom}</Text>
                {enfant.classe_nom && (
                  <Text style={styles.enfantClasse}>{enfant.classe_nom}</Text>
                )}
              </View>
            ))}
            {enfantsNonLies.map((enfant) => (
              <View key={enfant.id} style={styles.enfantItem}>
                <View style={[styles.enfantBadge, styles.enfantBadgeWarning]}>
                  <Text style={styles.enfantBadgeTextWarning}>⚠️ Non lié</Text>
                </View>
                <Text style={styles.enfantName}>{toTitleCase(enfant.prenom)} {enfant.nom}</Text>
                {enfant.classe_nom && (
                  <Text style={styles.enfantClasse}>{enfant.classe_nom}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {isAlreadyLinkedToCurrentEleve && (
          <View style={styles.warningContainer}>
            <AlertCircle size={16} color="#DC2626" />
            <Text style={styles.warningText}>Ce parent est déjà lié à cet élève.</Text>
          </View>
        )}

        {!isAlreadyLinkedToCurrentEleve && (
          <>
            <Text style={styles.inputLabel}>Lien de parenté</Text>
            <View style={styles.lienContainer}>
              {LIEN_OPTIONS.map((option) => {
                const isDisabled = isLienDisabled(option.key);
                return (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.lienOption,
                      selectedLien === option.key && styles.lienOptionActive,
                      isDisabled && styles.lienOptionDisabled,
                    ]}
                    onPress={() => !isDisabled && setSelectedLien(option.key)}
                    disabled={isDisabled}
                  >
                    <Text style={[
                      styles.lienOptionText,
                      selectedLien === option.key && styles.lienOptionTextActive,
                      isDisabled && styles.lienOptionTextDisabled,
                    ]}>
                      {option.label}
                    </Text>
                    {isDisabled && <Lock size={10} color="#9CA3AF" style={styles.lienLockIcon} />}
                  </TouchableOpacity>
                );
              })}
            </View>
            {existingLiens.includes('pere') && (
              <Text style={styles.lienDisabledHint}>✓ Père déjà attribué</Text>
            )}
            {existingLiens.includes('mere') && (
              <Text style={styles.lienDisabledHint}>✓ Mère déjà attribuée</Text>
            )}

            <TouchableOpacity
              style={[styles.principalOption, isPrincipalDisabled() && styles.principalOptionDisabled]}
              onPress={() => !isPrincipalDisabled() && setEstPrincipal(!estPrincipal)}
              disabled={isPrincipalDisabled()}
            >
              <View style={[styles.checkbox, estPrincipal && styles.checkboxActive]}>
                {estPrincipal && <Check size={12} color="#FFFFFF" />}
              </View>
              <Text style={[styles.principalText, isPrincipalDisabled() && styles.principalTextDisabled]}>
                Définir comme parent principal
              </Text>
              {isPrincipalDisabled() && (
                <Text style={styles.principalWarning}> (un parent principal existe déjà)</Text>
              )}
            </TouchableOpacity>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelButton} onPress={onCancel} disabled={isLoading}>
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.linkButton, isLoading && styles.linkButtonDisabled]}
                onPress={() => onLink(selectedLien, estPrincipal)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={16} color="#FFFFFF" />
                    <Text style={styles.linkButtonText}>Lier ce parent</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {isAlreadyLinkedToCurrentEleve && (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelButtonFull} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        )}
      </Card>
    );
  }

  // ============================================================
  // CAS 2: Aucun parent trouvé - afficher formulaire de création
  // ============================================================
  const isPhoneLocked = searchType === 'telephone';
  const isEmailLocked = searchType === 'email';

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>📝 Nouveau parent</Text>
      
      <View style={styles.infoContainer}>
        <AlertCircle size={20} color="#F59E0B" />
        <Text style={styles.infoText}>
          Aucun parent trouvé avec ce {searchType === 'telephone' ? 'numéro' : 'email'}.
          Veuillez saisir ses informations ci-dessous.
        </Text>
      </View>

      {/* Vérification par téléphone (obligatoire) */}
      {searchType === 'telephone' ? (
        <PhoneVerification
          initialPhone={newParentTelephone}
          onVerified={handlePhoneVerified}
          readOnly={phoneVerified}
        />
      ) : (
        <>
          <View style={styles.fieldContainer}>
            <Text style={styles.inputLabel}>Téléphone *</Text>
            <TextInput
              style={[styles.input, phoneVerified && styles.inputReadOnly]}
              placeholder="01 66 35 00 74"
              value={newParentTelephone}
              onChangeText={(text) => {
                if (!phoneVerified) {
                  const digits = text.replace(/\D/g, '');
                  if (digits.length <= 10) {
                    const formatted = digits.length === 10 
                      ? `${digits.slice(0,2)} ${digits.slice(2,4)} ${digits.slice(4,6)} ${digits.slice(6,8)} ${digits.slice(8,10)}`
                      : digits;
                    setNewParentTelephone(formatted);
                  }
                }
              }}
              keyboardType="phone-pad"
              maxLength={14}
              editable={!phoneVerified}
            />
            {createErrors.telephone && <Text style={styles.errorText}>{createErrors.telephone}</Text>}
          </View>
          
          <PhoneVerification
            initialPhone={newParentTelephone}
            onVerified={handlePhoneVerified}
            readOnly={phoneVerified}
          />
        </>
      )}

      {/* Vérification par email (optionnelle) */}
      {searchType === 'email' ? (
        <EmailVerification
          initialEmail={newParentEmail}
          onVerified={handleEmailVerified}
          readOnly={emailVerified}
        />
      ) : (
        <>
          <View style={styles.fieldContainer}>
            <Text style={styles.inputLabel}>Email (optionnel)</Text>
            <TextInput
              style={[styles.input, emailVerified && styles.inputReadOnly]}
              placeholder="email@exemple.com"
              value={newParentEmail}
              onChangeText={(text) => {
                if (!emailVerified) {
                  setNewParentEmail(text.toLowerCase());
                }
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!emailVerified}
            />
          </View>
          
          {newParentEmail && !emailVerified && (
            <EmailVerification
              initialEmail={newParentEmail}
              onVerified={handleEmailVerified}
              readOnly={emailVerified}
            />
          )}
        </>
      )}

      {/* Nom et Prénom */}
      <View style={styles.rowContainer}>
        <View style={styles.halfField}>
          <Text style={styles.inputLabel}>Nom *</Text>
          <TextInput
            style={[styles.input, createErrors.nom && styles.inputError, (phoneVerified || emailVerified) && styles.inputReadOnly]}
            placeholder="Nom du parent"
            value={newParentNom}
            onChangeText={(text) => setNewParentNom(text.toUpperCase())}
            editable={!(phoneVerified || emailVerified)}
          />
          {createErrors.nom && <Text style={styles.errorText}>{createErrors.nom}</Text>}
        </View>
        <View style={styles.halfField}>
          <Text style={styles.inputLabel}>Prénom *</Text>
          <TextInput
            style={[styles.input, createErrors.prenom && styles.inputError, (phoneVerified || emailVerified) && styles.inputReadOnly]}
            placeholder="Prénom du parent"
            value={newParentPrenom}
            onChangeText={(text) => setNewParentPrenom(toTitleCase(text))}
            editable={!(phoneVerified || emailVerified)}
          />
          {createErrors.prenom && <Text style={styles.errorText}>{createErrors.prenom}</Text>}
        </View>
      </View>

      {/* Lien de parenté */}
      <View style={styles.fieldContainer}>
        <Text style={styles.inputLabel}>Lien de parenté</Text>
        <View style={styles.lienContainer}>
          {LIEN_OPTIONS.map((option) => {
            const isDisabled = isLienDisabled(option.key);
            return (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.lienOption,
                  newParentLien === option.key && styles.lienOptionActive,
                  isDisabled && styles.lienOptionDisabled,
                ]}
                onPress={() => !isDisabled && setNewParentLien(option.key)}
                disabled={isDisabled}
              >
                <Text style={[
                  styles.lienOptionText,
                  newParentLien === option.key && styles.lienOptionTextActive,
                  isDisabled && styles.lienOptionTextDisabled,
                ]}>
                  {option.label}
                </Text>
                {isDisabled && <Lock size={10} color="#9CA3AF" style={styles.lienLockIcon} />}
              </TouchableOpacity>
            );
          })}
        </View>
        {existingLiens.includes('pere') && (
          <Text style={styles.lienDisabledHint}>✓ Père déjà attribué</Text>
        )}
        {existingLiens.includes('mere') && (
          <Text style={styles.lienDisabledHint}>✓ Mère déjà attribuée</Text>
        )}
      </View>

      {/* Parent principal */}
      <TouchableOpacity
        style={[styles.principalOption, isPrincipalDisabled() && styles.principalOptionDisabled]}
        onPress={() => !isPrincipalDisabled() && setNewParentEstPrincipal(!newParentEstPrincipal)}
        disabled={isPrincipalDisabled()}
      >
        <View style={[styles.checkbox, newParentEstPrincipal && styles.checkboxActive]}>
          {newParentEstPrincipal && <Check size={12} color="#FFFFFF" />}
        </View>
        <Text style={[styles.principalText, isPrincipalDisabled() && styles.principalTextDisabled]}>
          Définir comme parent principal
        </Text>
        {isPrincipalDisabled() && (
          <Text style={styles.principalWarning}> (un parent principal existe déjà)</Text>
        )}
      </TouchableOpacity>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel} disabled={isCreating}>
          <Text style={styles.cancelButtonText}>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.createButton, isCreating && styles.createButtonDisabled]}
          onPress={handleCreateParent}
          disabled={isCreating}
        >
          {isCreating ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <UserPlus size={16} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Créer et lier</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  infoText: {
    fontSize: 13,
    color: '#92400E',
    flex: 1,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  inputReadOnly: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
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
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  lienOption: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  lienOptionActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
    borderColor: theme.colors.primary.DEFAULT,
  },
  lienOptionDisabled: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    opacity: 1,
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
  lienLockIcon: {
    marginLeft: 4,
  },
  lienDisabledHint: {
    fontSize: 11,
    color: '#F59E0B',
    marginTop: 2,
    marginBottom: 8,
  },
  principalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  principalOptionDisabled: {
    opacity: 0.6,
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
  principalTextDisabled: {
    color: '#9CA3AF',
  },
  principalWarning: {
    fontSize: 12,
    color: '#F59E0B',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonFull: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  linkButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: 10,
  },
  linkButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  createButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#10B981',
    borderRadius: 10,
  },
  createButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  parentInfo: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  parentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.primary.DEFAULT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  parentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  contactText: {
    fontSize: 13,
    color: '#6B7280',
  },
  verifiedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
  },
  verifiedInfoText: {
    fontSize: 12,
    color: '#065F46',
    flex: 1,
  },
  enfantsSection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  enfantsTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 12,
  },
  enfantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  enfantBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  enfantBadgeWarning: {
    backgroundColor: '#FEF3C7',
  },
  enfantBadgeText: {
    fontSize: 10,
    color: '#065F46',
    fontWeight: '500',
  },
  enfantBadgeTextWarning: {
    fontSize: 10,
    color: '#92400E',
    fontWeight: '500',
  },
  enfantName: {
    fontSize: 13,
    color: '#1F2937',
    flex: 1,
  },
  enfantClasse: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  warningText: {
    fontSize: 13,
    color: '#DC2626',
    flex: 1,
  },
});