// /home/project/app/(app)/(sidebar)/delegations/nouvelle.tsx
// Version avec DateRangePicker et ConfirmDialog

import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Switch, Modal, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';
import { ArrowLeft, Building2, X, Clock } from 'lucide-react-native';
import { Card } from '@/components/Card';
import UserSearchInput from '@/components/common/UserSearchInput';
import { UserSearchResult } from '@/utils/userSearch';
import { useDelegations } from '@/hooks/useDelegations';
import DateRangePicker from '@/components/common/DateRangePicker';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import theme from '@/constants/theme';

const DELEGATION_TYPES = [
  { value: 'financiere', label: 'Financière', description: 'Gestion des encaissements, reçus, clôture' },
  { value: 'pedagogique', label: 'Pédagogique', description: 'Gestion des classes, notes, enseignants' },
  { value: 'administrative', label: 'Administrative', description: 'Inscriptions, documents, vie scolaire' },
];

const ROLES_BY_TYPE: Record<string, Array<{ value: string; label: string; description: string }>> = {
  financiere: [
    { value: 'caissier', label: 'Caissier', description: 'Encaissements, reçus, clôture caisse, bordereaux' },
    { value: 'assistant_comptable', label: 'Assistant comptable', description: 'Saisie factures, rapprochement, fiscalité' },
  ],
  pedagogique: [
    { value: 'ae', label: 'Animateur d\'Établissement (AE)', description: 'Gestion d\'un département (avec plafond)' },
    { value: 'de', label: 'Directeur des Études (DE)', description: 'Supervision pédagogique globale' },
  ],
  administrative: [
    { value: 'personnel_administratif', label: 'Personnel Administratif', description: 'Inscriptions, paiements, documents' },
    { value: 'personnel_vie_scolaire', label: 'Personnel Vie Scolaire', description: 'Absences, incidents, discipline' },
  ],
};

export default function NouvelleDelegationScreen() {
  const router = useRouter();
  const { id: etablissementId } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { createDelegation } = useDelegations();
  
  const [foundUser, setFoundUser] = useState<UserSearchResult | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [etablissementNom, setEtablissementNom] = useState('');
  const [selectedType, setSelectedType] = useState<string>('financiere');
  const [selectedRole, setSelectedRole] = useState<string>('caissier');
  const [departement, setDepartement] = useState('');
  const [plafond, setPlafond] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [isTemporaire, setIsTemporaire] = useState(false);
  const [justification, setJustification] = useState('');

  useEffect(() => {
    if (etablissementId) {
      fetchEtablissementNom();
    }
  }, [etablissementId]);

  const fetchEtablissementNom = async () => {
    if (!etablissementId) return;
    try {
      const { data, error } = await supabase
        .from('etablissements')
        .select('nom')
        .eq('id', etablissementId)
        .single();
      if (error) throw error;
      setEtablissementNom(data?.nom || '');
    } catch (error) {
      console.error('Error fetching etablissement nom:', error);
    }
  };

  const handleConfirmDelegation = () => {
    setShowConfirmModal(true);
  };

  const handleCreateDelegation = async () => {
    if (!foundUser) return;
    
    setSubmitting(true);
    
    try {
      // Mapping entre role_delegue et type (conforme à la base)
      const getTypeFromRole = (role: string): string => {
        switch (role) {
          // Pédagogique
          case 'de': return 'directeur_etudes';
          case 'ae': return 'animateur_etablissement';
          // Financier
          case 'comptable': return 'comptable';
          case 'caissier': return 'caissier';
          case 'assistant_comptable': return 'assistant_comptable';
          // Administratif
          case 'personnel_administratif': return 'personnel_administratif';
          case 'personnel_vie_scolaire': return 'personnel_vie_scolaire';
          // Fallback
          default: return role;
        }
      };
  
      const typeValue = getTypeFromRole(selectedRole);
  
      await createDelegation(
        foundUser.id,
        selectedRole,
        typeValue,
        departement || undefined,
        plafond ? parseInt(plafond) : undefined,
        isTemporaire && dateFin ? dateFin : undefined,
        justification || undefined
      );
  
      Alert.alert('Succès', `Délégation créée. ${foundUser.prenom} ${foundUser.nom} a été notifié(e).`, [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error creating delegation:', error);
      Alert.alert('Erreur', 'Impossible de créer la délégation');
    } finally {
      setSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  const getRoleLabel = () => ROLES_BY_TYPE[selectedType]?.find(r => r.value === selectedRole)?.label || selectedRole;
  const showPlafondInput = selectedRole === 'ae';
  const showDepartementInput = selectedRole === 'ae';

  const confirmData = foundUser ? {
    title: "Confirmer la délégation",
    message: `Vous êtes sur le point de déléguer les droits suivants :`,
    details: [
      { label: "Délégué", value: `${foundUser.prenom} ${foundUser.nom}` },
      { label: "Type", value: DELEGATION_TYPES.find(t => t.value === selectedType)?.label || '' },
      { label: "Rôle", value: getRoleLabel() },
      { label: "Durée", value: isTemporaire && dateFin ? `Jusqu'au ${new Date(dateFin).toLocaleDateString('fr-FR')}` : "Permanente" },
      ...(justification ? [{ label: "Justification", value: justification }] : [])
    ]
  } : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.neutral[600]} />
        </TouchableOpacity>
        <Text style={styles.title}>Nouvelle délégation</Text>
        <View style={{ width: 40 }} />
      </View>

      {etablissementNom && (
        <View style={styles.etablissementInfo}>
          <Building2 size={16} color={theme.colors.neutral[500]} />
          <Text style={styles.etablissementNom}>{etablissementNom}</Text>
        </View>
      )}

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>1. Rechercher l'utilisateur</Text>
        <UserSearchInput
          onUserSelected={setFoundUser}
          onUserCleared={() => setFoundUser(null)}
          placeholder="Email de l'utilisateur"
        />
      </Card>

      {foundUser && (
        <>
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>2. Type de délégation</Text>
            {DELEGATION_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[styles.typeOption, selectedType === type.value && styles.typeOptionActive]}
                onPress={() => {
                  setSelectedType(type.value);
                  setSelectedRole(ROLES_BY_TYPE[type.value][0]?.value || 'caissier');
                  setDepartement('');
                  setPlafond('');
                }}
              >
                <Text style={[styles.typeLabel, selectedType === type.value && styles.typeLabelActive]}>
                  {type.label}
                </Text>
                <Text style={styles.typeDescription}>{type.description}</Text>
              </TouchableOpacity>
            ))}
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>3. Rôle à déléguer</Text>
            {ROLES_BY_TYPE[selectedType]?.map((role) => (
              <TouchableOpacity
                key={role.value}
                style={[styles.roleOption, selectedRole === role.value && styles.roleOptionActive]}
                onPress={() => {
                  setSelectedRole(role.value);
                  setDepartement('');
                  setPlafond('');
                }}
              >
                <Text style={[styles.roleLabel, selectedRole === role.value && styles.roleLabelActive]}>
                  {role.label}
                </Text>
                <Text style={styles.roleDescription}>{role.description}</Text>
              </TouchableOpacity>
            ))}
          </Card>

          {(showDepartementInput || showPlafondInput) && (
            <Card style={styles.section}>
              <Text style={styles.sectionTitle}>4. Informations complémentaires</Text>
              {showDepartementInput && (
                <>
                  <Text style={styles.inputLabel}>Département (optionnel)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Ex: Sciences, Lettres"
                    value={departement}
                    onChangeText={setDepartement}
                  />
                </>
              )}
              {showPlafondInput && (
                <>
                  <Text style={styles.inputLabel}>Plafond d'enseignants (optionnel)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Nombre maximum"
                    value={plafond}
                    onChangeText={setPlafond}
                    keyboardType="numeric"
                  />
                  <Text style={styles.hintText}>Laissez vide pour un plafond par défaut</Text>
                </>
              )}
            </Card>
          )}

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>5. Durée de la délégation</Text>
            
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Délégation temporaire</Text>
              <Switch
                value={isTemporaire}
                onValueChange={setIsTemporaire}
                trackColor={{ false: '#E5E7EB', true: theme.colors.primary.DEFAULT }}
                thumbColor="#FFFFFF"
              />
            </View>

            {isTemporaire && (
              <DateRangePicker
                startDate=""
                endDate={dateFin}
                onStartDateChange={() => {}}
                onEndDateChange={setDateFin}
                showEndDate={true}
                placeholderEnd="Date de fin"
              />
            )}

            {!isTemporaire && (
              <View style={styles.permanentContainer}>
                <Clock size={14} color="#10B981" />
                <Text style={styles.permanentHint}>Délégation permanente (jusqu'à révocation explicite)</Text>
              </View>
            )}
          </Card>

          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>6. Justification (optionnelle)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Motif de la délégation..."
              multiline
              numberOfLines={3}
              value={justification}
              onChangeText={setJustification}
            />
          </Card>

          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmDelegation} disabled={submitting}>
            <Text style={styles.confirmButtonText}>Continuer →</Text>
          </TouchableOpacity>
        </>
      )}

      <ConfirmDialog
        visible={showConfirmModal}
        title={confirmData?.title || "Confirmer la délégation"}
        message={confirmData?.message || ""}
        confirmText="Confirmer"
        cancelText="Annuler"
        onConfirm={handleCreateDelegation}
        onCancel={() => setShowConfirmModal(false)}
        loading={submitting}
        details={confirmData?.details}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backButton: { padding: 8 },
  title: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  etablissementInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginBottom: 16, alignSelf: 'flex-start' },
  etablissementNom: { fontSize: 13, color: '#6B7280' },
  section: { marginBottom: 20, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 12 },
  typeOption: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 8 },
  typeOptionActive: { backgroundColor: '#EFF6FF', borderColor: theme.colors.primary.DEFAULT },
  typeLabel: { fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  typeLabelActive: { color: theme.colors.primary.DEFAULT },
  typeDescription: { fontSize: 12, color: '#6B7280' },
  roleOption: { paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 8 },
  roleOptionActive: { backgroundColor: '#EFF6FF', borderColor: theme.colors.primary.DEFAULT },
  roleLabel: { fontSize: 15, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  roleLabelActive: { color: theme.colors.primary.DEFAULT },
  roleDescription: { fontSize: 12, color: '#6B7280' },
  inputLabel: { fontSize: 13, fontWeight: '500', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 12, backgroundColor: '#FFFFFF' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  hintText: { fontSize: 12, color: '#6B7280', marginTop: 4, marginBottom: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  switchLabel: { fontSize: 14, color: '#1F2937' },
  permanentContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  permanentHint: { fontSize: 13, color: '#10B981' },
  confirmButton: { backgroundColor: theme.colors.primary.DEFAULT, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8, marginBottom: 20 },
  confirmButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});
