import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { UserPlus, Mail, Phone, Building2, BookOpen, Users, AlertCircle } from 'lucide-react-native';

interface InvitationFormProps {
  etablissementId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface Matiere {
  id: string;
  nom: string;
  code: string;
}

interface Classe {
  id: string;
  nom: string;
  niveau: string;
}

export default function InvitationForm({ etablissementId, onSuccess, onCancel }: InvitationFormProps) {
  const { user, isDirecteurEtudes, isAnimateurEtablissement, getAdminMetadata } = useAuth();
  const [loading, setLoading] = useState(false);
  const [checkingPlafond, setCheckingPlafond] = useState(false);
  const [plafondInfo, setPlafondInfo] = useState<{ allowed: boolean; remaining: number; plafond: number } | null>(null);
  
  const [formData, setFormData] = useState({
    email: '',
    nom: '',
    prenom: '',
    telephone: '',
    departement: '',
    matieres: [] as string[],
    classes: [] as string[],
  });

  const [matieresList, setMatieresList] = useState<Matiere[]>([]);
  const [classesList, setClassesList] = useState<Classe[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const isAE = isAnimateurEtablissement;
  const aeMetadata = isAE ? getAdminMetadata() : null;
  const defaultDepartement = aeMetadata?.departement || '';

  useEffect(() => {
    loadOptions();
    if (isAE && defaultDepartement) {
      setFormData(prev => ({ ...prev, departement: defaultDepartement }));
      checkPlafond();
    }
  }, []);

  const loadOptions = async () => {
    try {
      setLoadingOptions(true);
      
      // Charger les matières de l'établissement
      const { data: matieres } = await supabase
        .from('matieres')
        .select('id, nom, code')
        .eq('etablissement_id', etablissementId)
        .order('nom');
      
      setMatieresList(matieres || []);
      
      // Charger les classes de l'établissement
      const { data: classes } = await supabase
        .from('classes')
        .select('id, nom, niveau')
        .eq('etablissement_id', etablissementId)
        .eq('is_active', true)
        .order('nom');
      
      setClassesList(classes || []);
    } catch (error) {
      console.error('Error loading options:', error);
    } finally {
      setLoadingOptions(false);
    }
  };

  const checkPlafond = async () => {
    if (!isAE || !formData.departement) return;
    
    setCheckingPlafond(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/check-plafond-ae`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          ae_id: user?.id,
          departement: formData.departement,
          etablissement_id: etablissementId,
        }),
      });
      
      const result = await response.json();
      if (result.success) {
        setPlafondInfo({
          allowed: result.allowed,
          remaining: result.remaining,
          plafond: result.plafond,
        });
      }
    } catch (error) {
      console.error('Error checking plafond:', error);
    } finally {
      setCheckingPlafond(false);
    }
  };

  const toggleMatiere = (matiereId: string) => {
    setFormData(prev => ({
      ...prev,
      matieres: prev.matieres.includes(matiereId)
        ? prev.matieres.filter(id => id !== matiereId)
        : [...prev.matieres, matiereId],
    }));
  };

  const toggleClasse = (classeId: string) => {
    setFormData(prev => ({
      ...prev,
      classes: prev.classes.includes(classeId)
        ? prev.classes.filter(id => id !== classeId)
        : [...prev.classes, classeId],
    }));
  };

  const handleSubmit = async () => {
    if (!formData.email || !formData.nom || !formData.prenom) {
      Alert.alert('Champs manquants', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Vérifier le plafond pour AE
    if (isAE && plafondInfo && !plafondInfo.allowed) {
      Alert.alert('Plafond atteint', plafondInfo.remaining === 0 
        ? 'Vous ne pouvez plus inviter d\'enseignants. Contactez le Directeur des Études.'
        : 'Limite d\'invitations atteinte');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-enseignant-invitation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          email: formData.email,
          nom: formData.nom,
          prenom: formData.prenom,
          telephone: formData.telephone || null,
          etablissement_id: etablissementId,
          departement: formData.departement || null,
          matieres: formData.matieres,
          classes: formData.classes,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        Alert.alert('Succès', 'Invitation envoyée avec succès');
        if (onSuccess) onSuccess();
      } else {
        Alert.alert('Erreur', result.error || 'Impossible d\'envoyer l\'invitation');
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer l\'invitation');
    } finally {
      setLoading(false);
    }
  };

  if (loadingOptions) {
    return (
      <Card style={styles.loadingCard}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Chargement des options...</Text>
      </Card>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <UserPlus size={32} color="#3B82F6" />
        <Text style={styles.title}>Inviter un enseignant</Text>
        <Text style={styles.subtitle}>
          {isAE ? 'Invitation limitée à votre département' : 'Invitation valable pour tout l\'établissement'}
        </Text>
      </View>

      {/* Alerte de plafond pour AE */}
      {isAE && plafondInfo && (
        <View style={[styles.alertCard, !plafondInfo.allowed && styles.alertCardWarning]}>
          <AlertCircle size={20} color={plafondInfo.allowed ? '#10B981' : '#F59E0B'} />
          <Text style={[styles.alertText, !plafondInfo.allowed && styles.alertTextWarning]}>
            {plafondInfo.allowed 
              ? `Vous pouvez encore inviter ${plafondInfo.remaining} enseignant(s) (limite: ${plafondInfo.plafond})`
              : `Plafond atteint (${plafondInfo.plafond}/${plafondInfo.plafond}). Contactez le Directeur des Études.`}
          </Text>
        </View>
      )}

      <Card style={styles.formCard}>
        <Text style={styles.sectionTitle}>Informations personnelles</Text>
        
        <Input
          label="Email *"
          value={formData.email}
          onChangeText={(v) => setFormData(prev => ({ ...prev, email: v }))}
          placeholder="enseignant@ecole.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <View style={styles.row}>
          <View style={styles.half}>
            <Input
              label="Nom *"
              value={formData.nom}
              onChangeText={(v) => setFormData(prev => ({ ...prev, nom: v }))}
              placeholder="Nom"
            />
          </View>
          <View style={styles.half}>
            <Input
              label="Prénom *"
              value={formData.prenom}
              onChangeText={(v) => setFormData(prev => ({ ...prev, prenom: v }))}
              placeholder="Prénom"
            />
          </View>
        </View>
        
        <Input
          label="Téléphone"
          value={formData.telephone}
          onChangeText={(v) => setFormData(prev => ({ ...prev, telephone: v }))}
          placeholder="+229 99 00 00 00"
          keyboardType="phone-pad"
        />

        {!isAE && (
          <Input
            label="Département (optionnel)"
            value={formData.departement}
            onChangeText={(v) => setFormData(prev => ({ ...prev, departement: v }))}
            placeholder="Mathématiques, Sciences, Lettres..."
          />
        )}
      </Card>

      <Card style={styles.formCard}>
        <Text style={styles.sectionTitle}>
          <BookOpen size={16} color="#6B7280" /> Matières
        </Text>
        <Text style={styles.sectionDescription}>Sélectionnez les matières que l'enseignant pourra enseigner</Text>
        
        <View style={styles.optionsGrid}>
          {matieresList.map((matiere) => (
            <TouchableOpacity
              key={matiere.id}
              style={[
                styles.optionChip,
                formData.matieres.includes(matiere.id) && styles.optionChipActive,
              ]}
              onPress={() => toggleMatiere(matiere.id)}
            >
              <Text style={[
                styles.optionChipText,
                formData.matieres.includes(matiere.id) && styles.optionChipTextActive,
              ]}>
                {matiere.nom}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <Card style={styles.formCard}>
        <Text style={styles.sectionTitle}>
          <Users size={16} color="#6B7280" /> Classes
        </Text>
        <Text style={styles.sectionDescription}>Sélectionnez les classes auxquelles l'enseignant pourra être affecté</Text>
        
        <View style={styles.optionsGrid}>
          {classesList.map((classe) => (
            <TouchableOpacity
              key={classe.id}
              style={[
                styles.optionChip,
                formData.classes.includes(classe.id) && styles.optionChipActive,
              ]}
              onPress={() => toggleClasse(classe.id)}
            >
              <Text style={[
                styles.optionChipText,
                formData.classes.includes(classe.id) && styles.optionChipTextActive,
              ]}>
                {classe.nom}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <View style={styles.buttonContainer}>
        {onCancel && (
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Annuler</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading || (isAE && plafondInfo && !plafondInfo.allowed)}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Mail size={18} color="#FFFFFF" />
              <Text style={styles.submitButtonText}>Envoyer l'invitation</Text>
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
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 12,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  alertCardWarning: {
    backgroundColor: '#FEF3C7',
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    color: '#3B82F6',
  },
  alertTextWarning: {
    color: '#F59E0B',
  },
  formCard: {
    marginBottom: 16,
    padding: 16,
  },
  loadingCard: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  optionChipActive: {
    backgroundColor: '#3B82F6',
  },
  optionChipText: {
    fontSize: 13,
    color: '#4B5563',
  },
  optionChipTextActive: {
    color: '#FFFFFF',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 8,
  },
  submitButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
});