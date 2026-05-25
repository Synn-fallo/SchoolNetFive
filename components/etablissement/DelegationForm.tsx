import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Picker } from '@react-native-picker/picker';
import theme from '@/constants/theme';

interface DelegationFormProps {
  etablissementId: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const TYPE_OPTIONS = [
  { label: 'Directeur des Études (DE)', value: 'directeur_etudes' },
  { label: 'Animateur d\'Établissement (AE)', value: 'animateur_etablissement' },
  { label: 'Personnel Administratif', value: 'personnel_administratif' },
  { label: 'Personnel Vie Scolaire', value: 'personnel_vie_scolaire' },
];

export default function DelegationForm({ etablissementId, onSuccess, onCancel }: DelegationFormProps) {
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [email, setEmail] = useState('');
  const [selectedType, setSelectedType] = useState('directeur_etudes');
  const [departement, setDepartement] = useState('');
  const [plafond, setPlafond] = useState('');
  const [selectedUser, setSelectedUser] = useState<{ id: string; nom: string; prenom: string; email: string } | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearchUser = async () => {
    if (!email.trim()) {
      setSearchError('Veuillez saisir un email');
      return;
    }

    setSearching(true);
    setSearchError(null);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nom, prenom, email')
        .eq('email', email.trim())
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setSearchError('Aucun utilisateur trouvé avec cet email');
        setSelectedUser(null);
      } else {
        setSelectedUser({
          id: data.id,
          nom: data.nom,
          prenom: data.prenom,
          email: data.email,
        });
        setSearchError(null);
      }
    } catch (error) {
      console.error('Error searching user:', error);
      setSearchError('Erreur lors de la recherche');
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedUser) {
      Alert.alert('Erreur', 'Veuillez d\'abord rechercher un utilisateur');
      return;
    }

    if (!etablissementId) {
      Alert.alert('Erreur', 'Établissement non identifié');
      return;
    }

    setLoading(true);

    try {
      // Vérifier si l'utilisateur a déjà le rôle membre_administratif
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', selectedUser.id)
        .eq('etablissement_id', etablissementId)
        .eq('role', 'membre_administratif')
        .maybeSingle();

      if (!existingRole) {
        // Créer le rôle membre_administratif
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: selectedUser.id,
            etablissement_id: etablissementId,
            role: 'membre_administratif',
            is_active: true,
            metadata: {
              type_admin: selectedType === 'directeur_etudes' ? 'de' :
                           selectedType === 'animateur_etablissement' ? 'ae' :
                           selectedType === 'personnel_administratif' ? 'administratif' : 'vie_scolaire',
              departement: departement || null,
              plafond: plafond ? parseInt(plafond) : null,
            },
          });

        if (roleError) throw roleError;
      }

      // Créer la délégation
      const { error: delegationError } = await supabase
        .from('delegations')
        .insert({
          delegant_id: (await supabase.auth.getUser()).data.user?.id,
          delegue_id: selectedUser.id,
          etablissement_id: etablissementId,
          type: selectedType,
          departement: departement || null,
          plafond: plafond ? parseInt(plafond) : null,
          droits: { lecture: true, ecriture: true },
          is_active: true,
        });

      if (delegationError) throw delegationError;

      Alert.alert('Succès', 'Le collaborateur a été nommé avec succès.');
      onSuccess();
    } catch (error) {
      console.error('Error creating delegation:', error);
      Alert.alert('Erreur', 'Impossible de nommer le collaborateur');
    } finally {
      setLoading(false);
    }
  };

  const getTypeHint = () => {
    switch (selectedType) {
      case 'directeur_etudes':
        return 'Supervise la pédagogie, les enseignants, les emplois du temps.';
      case 'animateur_etablissement':
        return 'Gère un département spécifique. Optionnel: département et plafond d\'enseignants.';
      case 'personnel_administratif':
        return 'Gère les inscriptions, paiements, documents administratifs.';
      case 'personnel_vie_scolaire':
        return 'Gère les absences, incidents, discipline.';
      default:
        return '';
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Email de l'utilisateur *</Text>
      <View style={styles.searchRow}>
        <Input
          placeholder="ex: jean.dupont@email.com"
          value={email}
          onChangeText={setEmail}
          style={styles.searchInput}
          autoCapitalize="none"
        />
        <Button
          title={searching ? "..." : "Rechercher"}
          onPress={handleSearchUser}
          disabled={searching}
          variant="secondary"
          fullWidth={false}
        />
      </View>

      {searchError && <Text style={styles.errorText}>{searchError}</Text>}

      {selectedUser && (
        <View style={styles.userCard}>
          <Text style={styles.userName}>{selectedUser.prenom} {selectedUser.nom}</Text>
          <Text style={styles.userEmail}>{selectedUser.email}</Text>
        </View>
      )}

      <Text style={styles.label}>Rôle *</Text>
      <View style={styles.pickerWrapper}>
        <Picker
          selectedValue={selectedType}
          onValueChange={setSelectedType}
        >
          {TYPE_OPTIONS.map(opt => (
            <Picker.Item key={opt.value} label={opt.label} value={opt.value} />
          ))}
        </Picker>
      </View>
      <Text style={styles.hintText}>{getTypeHint()}</Text>

      {selectedType === 'animateur_etablissement' && (
        <>
          <Text style={styles.label}>Département (optionnel)</Text>
          <Input
            placeholder="Ex: Sciences, Lettres, Techniques"
            value={departement}
            onChangeText={setDepartement}
          />
          <Text style={styles.label}>Plafond d'enseignants (optionnel)</Text>
          <Input
            placeholder="Nombre maximum d'enseignants sous supervision"
            value={plafond}
            onChangeText={setPlafond}
            keyboardType="numeric"
          />
        </>
      )}

      <View style={styles.buttonContainer}>
        <Button
          title="Annuler"
          onPress={onCancel}
          variant="secondary"
          fullWidth={false}
        />
        <Button
          title={loading ? "Enregistrement..." : "Nommer"}
          onPress={handleSubmit}
          loading={loading}
          disabled={loading || !selectedUser}
          variant="primary"
          fullWidth={false}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  userCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  userEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  hintText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
});