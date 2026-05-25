import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { User, Phone, MapPin, Globe, Building2, Shield, AlertCircle, Check } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import theme from '@/constants/theme';

interface ProfileFormProps {
  onSave?: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
}

export default function ProfileForm({ onSave, onCancel, showCancel = true }: ProfileFormProps) {
  const { user, profile, refreshProfile, activeRole, perimetre, organisation, organisationType } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    telephone: '',
    adresse: '',
    // Champs Autorité
    perimetre: '',
    zone_id: '',
    // Champs Partenaire
    organisation: '',
    organisation_type: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (profile) {
      setFormData({
        prenom: profile.prenom || '',
        nom: profile.nom || '',
        telephone: profile.telephone || '',
        adresse: profile.adresse || '',
        perimetre: perimetre || '',
        zone_id: profile?.zone_id || '',
        organisation: organisation || '',
        organisation_type: organisationType || '',
      });
    }
  }, [profile, perimetre, organisation, organisationType]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.prenom.trim()) newErrors.prenom = 'Le prénom est obligatoire';
    if (!formData.nom.trim()) newErrors.nom = 'Le nom est obligatoire';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    if (!user) return;

    setLoading(true);
    try {
      const updateData: any = {
        prenom: formData.prenom,
        nom: formData.nom,
        telephone: formData.telephone || null,
        adresse: formData.adresse || null,
      };

      // Champs spécifiques Autorité
      if (activeRole === 'autorite') {
        updateData.perimetre = formData.perimetre || null;
        updateData.zone_id = formData.zone_id || null;
      }

      // Champs spécifiques Partenaire
      if (activeRole === 'partenaire') {
        updateData.organisation = formData.organisation || null;
        updateData.organisation_type = formData.organisation_type || null;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();
      setEditing(false);
      if (onSave) onSave();
    } catch (error) {
      console.error('Error saving profile:', error);
      setErrors({ submit: 'Erreur lors de la sauvegarde' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    // Réinitialiser les données
    if (profile) {
      setFormData({
        prenom: profile.prenom || '',
        nom: profile.nom || '',
        telephone: profile.telephone || '',
        adresse: profile.adresse || '',
        perimetre: perimetre || '',
        zone_id: profile?.zone_id || '',
        organisation: organisation || '',
        organisation_type: organisationType || '',
      });
    }
    setErrors({});
    if (onCancel) onCancel();
  };

  const isAutorite = activeRole === 'autorite';
  const isPartenaire = activeRole === 'partenaire';

  if (!editing) {
    return (
      <View style={styles.container}>
        <View style={styles.infoRow}>
          <User size={18} color={theme.colors.neutral[500]} />
          <Text style={styles.label}>Prénom :</Text>
          <Text style={styles.value}>{profile?.prenom || 'Non renseigné'}</Text>
        </View>
        <View style={styles.infoRow}>
          <User size={18} color={theme.colors.neutral[500]} />
          <Text style={styles.label}>Nom :</Text>
          <Text style={styles.value}>{profile?.nom || 'Non renseigné'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Phone size={18} color={theme.colors.neutral[500]} />
          <Text style={styles.label}>Téléphone :</Text>
          <Text style={styles.value}>{profile?.telephone || 'Non renseigné'}</Text>
        </View>
        <View style={styles.infoRow}>
          <MapPin size={18} color={theme.colors.neutral[500]} />
          <Text style={styles.label}>Adresse :</Text>
          <Text style={styles.value}>{profile?.adresse || 'Non renseigné'}</Text>
        </View>

        {isAutorite && perimetre && (
          <>
            <View style={styles.divider} />
            <View style={styles.specificiteHeader}>
              <Globe size={18} color={theme.colors.primary.DEFAULT} />
              <Text style={styles.specificiteTitle}>Informations Autorité</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Périmètre :</Text>
              <Text style={styles.value}>
                {perimetre === 'national' ? 'National' :
                 perimetre === 'regional' ? 'Régional' :
                 perimetre === 'departemental' ? 'Départemental' : 'Local'}
              </Text>
            </View>
            {profile?.zone_id && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Zone ID :</Text>
                <Text style={styles.value}>{profile.zone_id}</Text>
              </View>
            )}
          </>
        )}

        {isPartenaire && organisation && (
          <>
            <View style={styles.divider} />
            <View style={styles.specificiteHeader}>
              <Building2 size={18} color={theme.colors.primary.DEFAULT} />
              <Text style={styles.specificiteTitle}>Informations Partenaire</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Organisation :</Text>
              <Text style={styles.value}>{organisation}</Text>
            </View>
            {organisationType && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Type :</Text>
                <Text style={styles.value}>
                  {organisationType === 'ong' ? 'ONG' :
                   organisationType === 'entreprise' ? 'Entreprise' :
                   organisationType === 'ministere' ? 'Ministère' :
                   organisationType === 'delegation' ? 'Délégation' :
                   organisationType === 'association' ? 'Association' : organisationType}
                </Text>
              </View>
            )}
          </>
        )}

        <TouchableOpacity style={styles.editButton} onPress={() => setEditing(true)}>
          <Text style={styles.editButtonText}>Modifier le profil</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.fieldContainer}>
        <Text style={styles.inputLabel}>Prénom *</Text>
        <TextInput
          style={[styles.input, errors.prenom && styles.inputError]}
          placeholder="Votre prénom"
          value={formData.prenom}
          onChangeText={(text) => setFormData({ ...formData, prenom: text })}
        />
        {errors.prenom && <Text style={styles.errorText}>{errors.prenom}</Text>}
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.inputLabel}>Nom *</Text>
        <TextInput
          style={[styles.input, errors.nom && styles.inputError]}
          placeholder="Votre nom"
          value={formData.nom}
          onChangeText={(text) => setFormData({ ...formData, nom: text.toUpperCase() })}
        />
        {errors.nom && <Text style={styles.errorText}>{errors.nom}</Text>}
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.inputLabel}>Téléphone</Text>
        <TextInput
          style={styles.input}
          placeholder="xx xx xx xx xx"
          value={formData.telephone}
          onChangeText={(text) => setFormData({ ...formData, telephone: text })}
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.fieldContainer}>
        <Text style={styles.inputLabel}>Adresse</Text>
        <TextInput
          style={styles.input}
          placeholder="Votre adresse"
          value={formData.adresse}
          onChangeText={(text) => setFormData({ ...formData, adresse: text })}
        />
      </View>

      {isAutorite && (
        <>
          <View style={styles.divider} />
          <View style={styles.specificiteHeader}>
            <Globe size={18} color={theme.colors.primary.DEFAULT} />
            <Text style={styles.specificiteTitle}>Informations Autorité</Text>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.inputLabel}>Périmètre</Text>
            <View style={styles.perimetreContainer}>
              {['national', 'regional', 'departemental', 'local'].map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.perimetreOption,
                    formData.perimetre === p && styles.perimetreOptionActive,
                  ]}
                  onPress={() => setFormData({ ...formData, perimetre: p })}
                >
                  <Text style={[
                    styles.perimetreOptionText,
                    formData.perimetre === p && styles.perimetreOptionTextActive,
                  ]}>
                    {p === 'national' ? 'National' :
                     p === 'regional' ? 'Régional' :
                     p === 'departemental' ? 'Départemental' : 'Local'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.inputLabel}>Zone ID (optionnel)</Text>
            <TextInput
              style={styles.input}
              placeholder="ID de la zone (région, département, commune)"
              value={formData.zone_id}
              onChangeText={(text) => setFormData({ ...formData, zone_id: text })}
            />
            <Text style={styles.helperText}>
              {formData.perimetre === 'departemental' ? 'Ex: 01 (Département de l\'Atlantique)' :
               formData.perimetre === 'regional' ? 'Ex: REGION-SUD' :
               'Laissez vide pour le périmètre national'}
            </Text>
          </View>
        </>
      )}

      {isPartenaire && (
        <>
          <View style={styles.divider} />
          <View style={styles.specificiteHeader}>
            <Building2 size={18} color={theme.colors.primary.DEFAULT} />
            <Text style={styles.specificiteTitle}>Informations Partenaire</Text>
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.inputLabel}>Nom de l'organisation *</Text>
            <TextInput
              style={styles.input}
              placeholder="Nom de votre organisation"
              value={formData.organisation}
              onChangeText={(text) => setFormData({ ...formData, organisation: text })}
            />
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.inputLabel}>Type d'organisation</Text>
            <View style={styles.perimetreContainer}>
              {['ong', 'entreprise', 'ministere', 'delegation', 'association', 'autre'].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.perimetreOption,
                    formData.organisation_type === t && styles.perimetreOptionActive,
                  ]}
                  onPress={() => setFormData({ ...formData, organisation_type: t })}
                >
                  <Text style={[
                    styles.perimetreOptionText,
                    formData.organisation_type === t && styles.perimetreOptionTextActive,
                  ]}>
                    {t === 'ong' ? 'ONG' :
                     t === 'entreprise' ? 'Entreprise' :
                     t === 'ministere' ? 'Ministère' :
                     t === 'delegation' ? 'Délégation' :
                     t === 'association' ? 'Association' : 'Autre'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </>
      )}

      {errors.submit && (
        <View style={styles.errorContainer}>
          <AlertCircle size={16} color="#EF4444" />
          <Text style={styles.submitErrorText}>{errors.submit}</Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        {showCancel && (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel} disabled={loading}>
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Check size={16} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Sauvegarder</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 12,
    width: 80,
  },
  value: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  specificiteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  specificiteTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  editButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  fieldContainer: {
    marginBottom: 16,
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#EFF6FF',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
  },
  perimetreContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  perimetreOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  perimetreOptionActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  perimetreOptionText: {
    fontSize: 13,
    color: '#6B7280',
  },
  perimetreOptionTextActive: {
    color: '#3B82F6',
    fontWeight: '500',
  },
  helperText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 6,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 30,
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 10,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 12,
  },
  submitErrorText: {
    fontSize: 12,
    color: '#EF4444',
    flex: 1,
  },
});