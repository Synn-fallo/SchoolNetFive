import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Check, AlertCircle, Users, Phone, Mail } from 'lucide-react-native';
import ParentForm, { ParentFormData } from './ParentForm';
import theme from '@/constants/theme';

export interface ParentData extends ParentFormData {
  is_complete: boolean;
  is_verified_phone: boolean;
  is_verified_email: boolean;
  existing_parent_id?: string;
}

export interface ParentTabsRef {
  validateParents: () => boolean;
  getParentsData: () => {
    type_lien: string;
    telephone: string;
    nom: string;
    prenom: string;
    email_personnel: string | null;
    est_principal: boolean;
  }[];
}

interface ParentTabsProps {
  onParentsChange: (parents: Record<string, ParentData>) => void;
  initialParents?: Record<string, ParentData>;
  onVerifyParentByPhone?: (telephone: string, nomSaisi: string, typeLien: string) => Promise<{ valid: boolean; parentId?: string; nom?: string; prenom?: string; message?: string }>;
  onVerifyParentByEmail?: (email: string, nomSaisi: string, typeLien: string) => Promise<{ valid: boolean; parentId?: string; nom?: string; prenom?: string; message?: string }>;
  disabled?: boolean;
}

const PARENT_TYPES = [
  { key: 'pere', label: 'Père', icon: '👤', color: '#2563EB' },
  { key: 'mere', label: 'Mère', icon: '👩', color: '#EC4899' },
  { key: 'tuteur', label: 'Tuteur', icon: '👨‍🏫', color: '#F59E0B' },
  { key: 'autre', label: 'Autre', icon: '➕', color: '#6B7280' },
];

const defaultParentData: ParentData = {
  telephone: '',
  nom: '',
  prenom: '',
  email_personnel: '',
  type_lien: '',
  est_principal: false,
  is_complete: false,
  is_verified_phone: false,
  is_verified_email: false,
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

const formaterTelephone = (text: string): string => {
  const cleaned = text.replace(/\D/g, '');
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 4) return `${cleaned.slice(0,2)} ${cleaned.slice(2)}`;
  if (cleaned.length <= 6) return `${cleaned.slice(0,2)} ${cleaned.slice(2,4)} ${cleaned.slice(4)}`;
  if (cleaned.length <= 8) return `${cleaned.slice(0,2)} ${cleaned.slice(2,4)} ${cleaned.slice(4,6)} ${cleaned.slice(6)}`;
  return `${cleaned.slice(0,2)} ${cleaned.slice(2,4)} ${cleaned.slice(4,6)} ${cleaned.slice(6,8)} ${cleaned.slice(8,10)}`;
};

const ParentTabs = forwardRef<ParentTabsRef, ParentTabsProps>(({
  onParentsChange,
  initialParents = {},
  onVerifyParentByPhone,
  onVerifyParentByEmail,
  disabled = false,
}, ref) => {
  const [activeTab, setActiveTab] = useState<string>('pere');
  const [parents, setParents] = useState<Record<string, ParentData>>(() => {
    const initial: Record<string, ParentData> = {};
    for (const type of PARENT_TYPES) {
      initial[type.key] = initialParents[type.key] || { ...defaultParentData, type_lien: type.key };
    }
    return initial;
  });
  const [verifyingPhone, setVerifyingPhone] = useState<Record<string, boolean>>({});
  const [verifyingEmail, setVerifyingEmail] = useState<Record<string, boolean>>({});
  const [confirmNomPhone, setConfirmNomPhone] = useState<Record<string, string>>({});
  const [confirmNomEmail, setConfirmNomEmail] = useState<Record<string, string>>({});
  const [verifyResults, setVerifyResults] = useState<Record<string, { phone?: { valid: boolean; message?: string }; email?: { valid: boolean; message?: string } }>>({});
  const [showEmailVerification, setShowEmailVerification] = useState<Record<string, boolean>>({});
  
  const [searchPerformed, setSearchPerformed] = useState<Record<string, boolean>>({});
  const [parentFound, setParentFound] = useState<Record<string, boolean>>({});

  useEffect(() => {
    onParentsChange(parents);
  }, [parents, onParentsChange]);

  const updateParentField = (type: string, field: keyof ParentData, value: any) => {
    setParents(prev => {
      const updated = {
        ...prev,
        [type]: {
          ...prev[type],
          [field]: value,
        },
      };
      
      // Vérifier si le parent est complet
      const parent = updated[type];
      const isComplete = !!(parent.telephone && parent.nom && parent.prenom);
      
      return {
        ...updated,
        [type]: {
          ...updated[type],
          is_complete: isComplete,
        },
      };
    });
  };

  const handleVerifyPhone = async (type: string) => {
    const parent = parents[type];
    const telephoneClean = parent.telephone.replace(/\s/g, '');
    const nomSaisi = confirmNomPhone[type];
    
    if (!telephoneClean || telephoneClean.length < 10) {
      setVerifyResults(prev => ({
        ...prev,
        [type]: { ...prev[type], phone: { valid: false, message: 'Numéro de téléphone invalide (10 chiffres requis)' } },
      }));
      return;
    }

    if (!nomSaisi || nomSaisi.trim() === '') {
      setVerifyResults(prev => ({
        ...prev,
        [type]: { ...prev[type], phone: { valid: false, message: 'Veuillez saisir le nom du parent pour confirmation' } },
      }));
      return;
    }

    if (!onVerifyParentByPhone) return;

    setVerifyingPhone(prev => ({ ...prev, [type]: true }));
    setSearchPerformed(prev => ({ ...prev, [type]: true }));
    
    try {
      const result = await onVerifyParentByPhone(telephoneClean, nomSaisi, type);
      setVerifyResults(prev => ({
        ...prev,
        [type]: { ...prev[type], phone: { valid: result.valid, message: result.valid ? '✅ Téléphone confirmé' : result.message } },
      }));
      
      if (result.valid && result.parentId) {
        setParentFound(prev => ({ ...prev, [type]: true }));
        updateParentField(type, 'existing_parent_id', result.parentId);
        updateParentField(type, 'is_verified_phone', true);
        updateParentField(type, 'is_complete', true);
        updateParentField(type, 'nom', result.nom || '');
        updateParentField(type, 'prenom', result.prenom ? toTitleCase(result.prenom) : '');
        
        const currentEmail = parents[type].email_personnel;
        if (currentEmail && currentEmail.trim()) {
          setShowEmailVerification(prev => ({ ...prev, [type]: true }));
        }
      } else {
        setParentFound(prev => ({ ...prev, [type]: false }));
        updateParentField(type, 'telephone', parent.telephone);
        updateParentField(type, 'email_personnel', parent.email_personnel);
        updateParentField(type, 'nom', nomSaisi);
        updateParentField(type, 'is_complete', true);
      }
    } catch (error) {
      setVerifyResults(prev => ({
        ...prev,
        [type]: { ...prev[type], phone: { valid: false, message: 'Erreur lors de la vérification' } },
      }));
      setParentFound(prev => ({ ...prev, [type]: false }));
    } finally {
      setVerifyingPhone(prev => ({ ...prev, [type]: false }));
    }
  };

  const handleVerifyEmail = async (type: string) => {
    const parent = parents[type];
    const emailClean = parent.email_personnel.trim().toLowerCase();
    const nomSaisi = confirmNomEmail[type];
    
    if (!emailClean) {
      setVerifyResults(prev => ({
        ...prev,
        [type]: { ...prev[type], email: { valid: false, message: 'Email invalide' } },
      }));
      return;
    }

    if (!nomSaisi || nomSaisi.trim() === '') {
      setVerifyResults(prev => ({
        ...prev,
        [type]: { ...prev[type], email: { valid: false, message: 'Veuillez saisir le nom du parent pour confirmation' } },
      }));
      return;
    }

    if (!onVerifyParentByEmail) return;

    setVerifyingEmail(prev => ({ ...prev, [type]: true }));
    setSearchPerformed(prev => ({ ...prev, [type]: true }));
    
    try {
      const result = await onVerifyParentByEmail(emailClean, nomSaisi, type);
      setVerifyResults(prev => ({
        ...prev,
        [type]: { ...prev[type], email: { valid: result.valid, message: result.valid ? '✅ Email confirmé' : result.message } },
      }));
      
      if (result.valid && result.parentId) {
        setParentFound(prev => ({ ...prev, [type]: true }));
        updateParentField(type, 'existing_parent_id', result.parentId);
        updateParentField(type, 'is_verified_email', true);
        updateParentField(type, 'is_complete', true);
        if (result.nom) updateParentField(type, 'nom', result.nom);
        if (result.prenom) updateParentField(type, 'prenom', toTitleCase(result.prenom));
      } else {
        setParentFound(prev => ({ ...prev, [type]: false }));
        updateParentField(type, 'is_complete', true);
      }
    } catch (error) {
      setVerifyResults(prev => ({
        ...prev,
        [type]: { ...prev[type], email: { valid: false, message: 'Erreur lors de la vérification' } },
      }));
      setParentFound(prev => ({ ...prev, [type]: false }));
    } finally {
      setVerifyingEmail(prev => ({ ...prev, [type]: false }));
    }
  };

  const getTabStatusIcon = (type: string) => {
    const parent = parents[type];
    if (parent.is_verified_phone) {
      return <Check size={14} color="#10B981" />;
    }
    if (parent.is_complete) {
      return <Check size={14} color="#F59E0B" />;
    }
    if (parent.telephone || parent.nom || parent.prenom) {
      return <AlertCircle size={14} color="#F59E0B" />;
    }
    return null;
  };

  useImperativeHandle(ref, () => ({
    validateParents: () => {
      for (const type of PARENT_TYPES) {
        const parent = parents[type.key];
        if (parent.telephone && parent.telephone.trim() !== '') {
          if (!parent.nom || !parent.prenom) {
            setActiveTab(type.key);
            return false;
          }
        }
      }
      return true;
    },
    getParentsData: () => {
      console.log('🔍 getParentsData - parents state:', JSON.stringify(parents, null, 2));
      return PARENT_TYPES
        .map(type => parents[type.key])
        .filter(p => p.telephone && p.telephone.trim() !== '' && p.nom && p.prenom)
        .map(p => ({
          type_lien: p.type_lien,
          telephone: p.telephone,
          nom: p.nom,
          prenom: p.prenom,
          email_personnel: p.email_personnel || null,
          est_principal: p.est_principal,
        }));
    },
  }));

  const activeParent = parents[activeTab];
  const verifyResult = verifyResults[activeTab];
  const isVerifyingPhone = verifyingPhone[activeTab];
  const isVerifyingEmail = verifyingEmail[activeTab];
  const isPhoneVerified = activeParent.is_verified_phone;
  const hasSearchPerformed = searchPerformed[activeTab] || false;
  const wasParentFound = parentFound[activeTab] || false;
  const showEmailBlock = showEmailVerification[activeTab] || activeParent.email_personnel;

  const shouldShowCreateForm = hasSearchPerformed && !wasParentFound && !isPhoneVerified;
  const shouldShowVerifiedForm = isPhoneVerified && wasParentFound;
  const shouldShowWaiting = !hasSearchPerformed;

  return (
    <View style={styles.container}>
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {PARENT_TYPES.map((type) => (
            <TouchableOpacity
              key={type.key}
              style={[
                styles.tab,
                activeTab === type.key && styles.tabActive,
              ]}
              onPress={() => setActiveTab(type.key)}
            >
              <Text style={styles.tabIcon}>{type.icon}</Text>
              <Text style={[styles.tabLabel, activeTab === type.key && styles.tabLabelActive]}>
                {type.label}
              </Text>
              {getTabStatusIcon(type.key)}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.tabContent}>
        {shouldShowWaiting && (
          <View style={styles.contactRow}>
            <View style={styles.contactField}>
              <Text style={styles.inputLabel}>Téléphone *</Text>
              <TextInput
                style={styles.contactInput}
                placeholder="xx xx xx xx xx"
                value={formaterTelephone(activeParent.telephone)}
                onChangeText={(text) => updateParentField(activeTab, 'telephone', text)}
                keyboardType="phone-pad"
                maxLength={14}
                editable={!disabled}
              />
            </View>
            <View style={styles.contactField}>
              <Text style={styles.inputLabel}>Email (optionnel)</Text>
              <TextInput
                style={styles.contactInput}
                placeholder="email@exemple.com"
                value={activeParent.email_personnel}
                onChangeText={(text) => updateParentField(activeTab, 'email_personnel', text.toLowerCase())}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!disabled}
              />
            </View>
          </View>
        )}

        {!shouldShowVerifiedForm && shouldShowWaiting && (
          <View style={styles.verifySection}>
            <View style={styles.verifySectionHeader}>
              <Phone size={16} color={theme.colors.primary.DEFAULT} />
              <Text style={styles.verifyTitle}>Vérification par téléphone (obligatoire)</Text>
            </View>

            <View style={styles.verifyRow}>
              <TextInput
                style={[styles.verifyInput, styles.halfField]}
                placeholder="Saisir le NOM du parent pour vérification"
                value={confirmNomPhone[activeTab] || ''}
                onChangeText={(text) => setConfirmNomPhone(prev => ({ ...prev, [activeTab]: text.toUpperCase() }))}
                editable={!disabled && !isPhoneVerified}
              />
              <TouchableOpacity
                style={[styles.verifyButton, (!confirmNomPhone[activeTab] || isVerifyingPhone || isPhoneVerified) && styles.verifyButtonDisabled]}
                onPress={() => handleVerifyPhone(activeTab)}
                disabled={!confirmNomPhone[activeTab] || isVerifyingPhone || isPhoneVerified || disabled}
              >
                {isVerifyingPhone ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.verifyButtonText}>
                    {isPhoneVerified ? '✓ Vérifié' : 'Vérifier'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
            
            {verifyResult?.phone && (
              <View style={[
                styles.verifyResultContainer,
                verifyResult.phone.valid ? styles.verifyResultSuccess : styles.verifyResultWarning,
              ]}>
                {verifyResult.phone.valid ? (
                  <Check size={14} color="#065F46" />
                ) : (
                  <AlertCircle size={14} color="#92400E" />
                )}
                <Text style={[
                  styles.verifyResultText,
                  verifyResult.phone.valid ? styles.verifyResultTextSuccess : styles.verifyResultTextWarning,
                ]}>
                  {verifyResult.phone.message}
                </Text>
              </View>
            )}
          </View>
        )}

        {shouldShowVerifiedForm && (
          <>
            <ParentForm
              initialData={{
                telephone: activeParent.telephone,
                email_personnel: activeParent.email_personnel,
                nom: activeParent.nom,
                prenom: activeParent.prenom,
                type_lien: activeParent.type_lien,
                est_principal: activeParent.est_principal,
                is_verified: true,
              }}
              onSubmit={() => {}}
              showLienSelector={false}
              showPrincipalCheckbox={true}
              submitLabel=""
              readOnly={true}
            />
            <View style={styles.existsNote}>
              <Check size={14} color={theme.colors.primary.DEFAULT} />
              <Text style={styles.existsNoteText}>
                Parent vérifié. Ses informations sont verrouillées.
              </Text>
            </View>
          </>
        )}

        {shouldShowCreateForm && (
          <>
            <ParentForm
              initialData={{
                telephone: activeParent.telephone,
                email_personnel: activeParent.email_personnel,
                nom: activeParent.nom,
                prenom: activeParent.prenom,
                type_lien: activeParent.type_lien || 'pere',
                est_principal: activeParent.est_principal,
                is_verified: false,
              }}
              onSubmit={async (data) => {
                console.log('📝 ParentForm onSubmit - mode création, data reçue:', JSON.stringify(data, null, 2));
                updateParentField(activeTab, 'nom', data.nom);
                updateParentField(activeTab, 'prenom', data.prenom);
                updateParentField(activeTab, 'type_lien', data.type_lien);
                updateParentField(activeTab, 'est_principal', data.est_principal);
                updateParentField(activeTab, 'telephone', data.telephone);
                updateParentField(activeTab, 'email_personnel', data.email_personnel);
                updateParentField(activeTab, 'is_complete', true);
              }}
              showLienSelector={true}
              showPrincipalCheckbox={true}
              submitLabel=""
              readOnly={false}
            />
            <View style={styles.createNote}>
              <AlertCircle size={14} color={theme.colors.primary.DEFAULT} />
              <Text style={styles.createNoteText}>
                Aucun parent trouvé. Veuillez saisir ses informations ci-dessus.
              </Text>
            </View>
          </>
        )}

        {shouldShowWaiting && !shouldShowCreateForm && !shouldShowVerifiedForm && (
          <View style={styles.waitingNote}>
            <AlertCircle size={14} color="#F59E0B" />
            <Text style={styles.waitingNoteText}>
              Veuillez d'abord vérifier le numéro de téléphone pour continuer.
            </Text>
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  tabsContainer: {
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: theme.colors.primary.DEFAULT,
    backgroundColor: '#EFF6FF',
  },
  tabIcon: {
    fontSize: 16,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  tabLabelActive: {
    color: theme.colors.primary.DEFAULT,
  },
  tabContent: {
    padding: 16,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  contactField: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  contactInput: {
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
  verifySection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  verifySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  verifyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  emailTitle: {
    color: '#6B7280',
  },
  emailVerifySection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
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
  verifyResultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  verifyResultSuccess: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  verifyResultWarning: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  verifyResultText: {
    fontSize: 12,
    flex: 1,
  },
  verifyResultTextSuccess: {
    color: '#065F46',
  },
  verifyResultTextWarning: {
    color: '#92400E',
  },
  halfField: {
    flex: 1,
  },
  emailEmptyText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginVertical: 8,
  },
  existsNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  existsNoteText: {
    fontSize: 12,
    color: '#065F46',
    flex: 1,
  },
  createNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  createNoteText: {
    fontSize: 12,
    color: theme.colors.primary.DEFAULT,
    flex: 1,
  },
  waitingNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  waitingNoteText: {
    fontSize: 12,
    color: '#92400E',
    flex: 1,
  },
});

export default ParentTabs;