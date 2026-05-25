import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { School, User, Phone, Mail, Calendar, Users, CheckCircle, AlertCircle, ArrowRight, ArrowLeft, Key, Building2, X, ChevronDown, BookOpen, GraduationCap, Wrench } from 'lucide-react-native';
import { Card } from '@/components/Card';
import { useAutoInscription } from '@/hooks/useAutoInscription';
import { saveInscriptionSession, getInscriptionSession, clearInscriptionSession } from '@/utils/sessionStorage';
import { supabase } from '@/lib/supabase';
import theme from '@/constants/theme';

type Step = 1 | 2 | 3 | 4 | 5;

// Interface pour l'établissement depuis l'API
interface EtablissementInfo {
  id: string;
  nom: string;
  ville?: string;
  telephone?: string;
  email?: string;
  type_enseignement?: 'general' | 'technique' | 'mixte';
  cycles_proposes?: ('premier' | 'second')[];
}

// ============================================================
// INTERFACES POUR LE PARCOURS SCOLAIRE DYNAMIQUE
// ============================================================

interface Cycle {
  id: string;
  nom: string;
  ordre: number;
  is_active: boolean;
}

interface Niveau {
  id: string;
  nom: string;
  cycle_id: string;
  code: string;
}

interface Serie {
  id: string;
  nom: string;
}

interface OptionItem {
  id: string;
  nom: string;
}

interface SelectionParcours {
  cycle_id: string | null;
  cycle_ordre: number | null;
  niveau_id: string | null;
  serie_id: string | null;
  option_id: string | null;
}

export default function AutoInscriptionScreen() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const params = useLocalSearchParams();
  const codeFromUrl = params.code as string;
  
  const { verifierCodeEtablissement, verifierEducMaster, soumettreDemande, verifyingCode, verifyingEducMaster, submitting } = useAutoInscription();
  
  // État principal
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  
  // Étape 1 - Code établissement
  const [codeEtablissement, setCodeEtablissement] = useState('');
  const [etablissement, setEtablissement] = useState<EtablissementInfo | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  
  // Étape 2 - Identité élève
  const [eleve, setEleve] = useState({
    educmaster: '',
    nom: '',
    prenom: '',
    sexe: 'M' as 'M' | 'F',
    date_naissance: '',
  });
  const [educmasterError, setEducmasterError] = useState<string | null>(null);
  const [autoFilled, setAutoFilled] = useState(false);
  
  // Étape 3 - Parcours scolaire (DYNAMIQUE)
  const [parcours, setParcours] = useState<SelectionParcours>({
    cycle_id: null,
    cycle_ordre: null,
    niveau_id: null,
    serie_id: null,
    option_id: null,
  });
  
  // Données dynamiques depuis Supabase
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [niveaux, setNiveaux] = useState<Niveau[]>([]);
  const [series, setSeries] = useState<Serie[]>([]);
  const [options, setOptions] = useState<OptionItem[]>([]);
  
  // États des modales
  const [showCycleSelector, setShowCycleSelector] = useState(false);
  const [showNiveauSelector, setShowNiveauSelector] = useState(false);
  const [showSerieSelector, setShowSerieSelector] = useState(false);
  const [showOptionSelector, setShowOptionSelector] = useState(false);
  
  // Étape 4 - Informations parent
  const [parent, setParent] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    email_personnel: '',
    type_lien: 'pere' as 'pere' | 'mere' | 'tuteur' | 'autre',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // Modale confirmation
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [etablissementTemp, setEtablissementTemp] = useState<any>(null);
  
  // Session restoration
  const [sessionRestored, setSessionRestored] = useState(false);

  // ============================================================
  // RECHERCHE DE SESSION AU CHARGEMENT
  // ============================================================

  useEffect(() => {
    const restoreSession = async () => {
      const savedSession = getInscriptionSession();
      if (savedSession && !sessionRestored) {
        if (savedSession.code_etablissement) {
          setCodeEtablissement(savedSession.code_etablissement);
          if (savedSession.etablissement) {
            setEtablissement(savedSession.etablissement);
          }
        }
        if (savedSession.eleve) {
          setEleve(savedSession.eleve);
        }
        if (savedSession.parent) {
          setParent(savedSession.parent);
        }
        if (savedSession.step) {
          setStep(savedSession.step as Step);
        }
        if (savedSession.parcours) {
          setParcours(savedSession.parcours);
        }
        setAutoFilled(savedSession.autoFilled || false);
        setSessionRestored(true);
        clearInscriptionSession();
      }
    };
    
    restoreSession();
  }, []);

  // ============================================================
  // LECTURE CODE DEPUIS URL
  // ============================================================

  useEffect(() => {
    if (codeFromUrl && !etablissement) {
      setCodeEtablissement(codeFromUrl);
      handleVerifierCodeAuto(codeFromUrl);
    }
  }, [codeFromUrl]);

  // ============================================================
  // SAUVEGARDE SESSION (UNIQUEMENT SI NON CONNECTÉ)
  // ============================================================

  useEffect(() => {
    if (!user && sessionRestored && step >= 2) {
      saveInscriptionSession({
        step,
        code_etablissement: codeEtablissement,
        etablissement: etablissement || undefined,
        eleve: eleve,
        parent: parent,
        parcours: parcours,
        autoFilled: autoFilled,
      });
    }
  }, [step, codeEtablissement, etablissement, eleve, parent, parcours, autoFilled, sessionRestored, user]);

  // ============================================================
  // CHARGEMENT DES DONNÉES DYNAMIQUES
  // ============================================================

  // 1. Charger les cycles disponibles
  useEffect(() => {
    const loadCycles = async () => {
      try {
        const { data, error } = await supabase
          .from('cycles')
          .select('id, nom, ordre, is_active')
          .eq('is_active', true)
          .order('ordre', { ascending: true });
        
        if (error) throw error;
        setCycles(data || []);
      } catch (error) {
        console.error('Erreur chargement cycles:', error);
      }
    };
    
    loadCycles();
  }, []);

  // 2. Charger les niveaux en fonction du cycle sélectionné
  useEffect(() => {
    if (!parcours.cycle_id) {
      setNiveaux([]);
      return;
    }
    
    const loadNiveaux = async () => {
      try {
        const { data, error } = await supabase
          .from('niveaux')
          .select('id, nom, cycle_id, code')
          .eq('cycle_id', parcours.cycle_id)
          .eq('is_active', true)
          .order('ordre', { ascending: false });
        
        if (error) throw error;
        setNiveaux(data || []);
      } catch (error) {
        console.error('Erreur chargement niveaux:', error);
      }
    };
    
    loadNiveaux();
  }, [parcours.cycle_id]);

  // 3. Charger les séries disponibles (générique, pas lié à l'établissement)
  useEffect(() => {
    const loadSeries = async () => {
      try {
        const { data, error } = await supabase
          .from('series')
          .select('id, nom')
          .eq('is_active', true)
          .order('nom', { ascending: true });
        
        if (error) throw error;
        setSeries(data || []);
      } catch (error) {
        console.error('Erreur chargement séries:', error);
      }
    };
    
    loadSeries();
  }, []);

  // 4. Charger les options en fonction de la série sélectionnée
  useEffect(() => {
    if (!parcours.serie_id) {
      setOptions([]);
      return;
    }
    
    const loadOptions = async () => {
      try {
        const { data, error } = await supabase
          .from('options_serie')
          .select('id, nom')
          .eq('serie_id', parcours.serie_id)
          .eq('is_active', true)
          .order('nom', { ascending: true });
        
        if (error) throw error;
        setOptions(data || []);
      } catch (error) {
        console.error('Erreur chargement options:', error);
      }
    };
    
    loadOptions();
  }, [parcours.serie_id]);

  // ============================================================
  // FONCTIONS DE SÉLECTION AVEC RÉINITIALISATION HIÉRARCHIQUE
  // ============================================================

  const handleCycleSelect = (cycle: Cycle) => {
    setParcours({
      cycle_id: cycle.id,
      cycle_ordre: cycle.ordre,
      niveau_id: null,
      serie_id: null,
      option_id: null,
    });
    setShowCycleSelector(false);
  };

  const handleNiveauSelect = (niveau: Niveau) => {
    setParcours(prev => ({
      ...prev,
      niveau_id: niveau.id,
      serie_id: null,
      option_id: null,
    }));
    setShowNiveauSelector(false);
  };

  const handleSerieSelect = (serie: Serie) => {
    setParcours(prev => ({
      ...prev,
      serie_id: serie.id,
      option_id: null,
    }));
    setShowSerieSelector(false);
  };

  const handleOptionSelect = (option: OptionItem | null) => {
    setParcours(prev => ({
      ...prev,
      option_id: option?.id || null,
    }));
    setShowOptionSelector(false);
  };

  // ============================================================
  // FONCTIONS DE VÉRIFICATION
  // ============================================================

  const handleVerifierCodeAuto = async (code?: string) => {
    const codeToVerify = code || codeEtablissement;
    
    if (!codeToVerify.trim()) {
      setCodeError('Veuillez saisir un code établissement');
      return;
    }
  
    setCodeError(null);
    setLoading(true);
    
    const result = await verifierCodeEtablissement(codeToVerify);
  
    if (result.valid && result.etablissement_id) {
      setEtablissementTemp({
        id: result.etablissement_id,
        nom: result.etablissement_nom || '',
        ville: result.ville,
        telephone: result.telephone,
        email: result.email,
      });
      setShowConfirmModal(true);
    } else {
      setCodeError(result.message || 'Code établissement invalide');
    }
    
    setLoading(false);
  };

  const handleConfirmEtablissement = () => {
    if (etablissementTemp) {
      setEtablissement({
        id: etablissementTemp.id,
        nom: etablissementTemp.nom,
        ville: etablissementTemp.ville,
        telephone: etablissementTemp.telephone,
        email: etablissementTemp.email,
      });
      setCodeEtablissement(codeEtablissement);
      setShowConfirmModal(false);
      setStep(2);
      setCodeError(null);
    }
  };

  // ============================================================
  // FORMATAGE EDUC MASTER
  // ============================================================

  const formaterEducMaster = (text: string): string => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 4) return cleaned;
    if (cleaned.length <= 8) return `${cleaned.slice(0,4)} ${cleaned.slice(4)}`;
    if (cleaned.length <= 12) return `${cleaned.slice(0,4)} ${cleaned.slice(4,8)} ${cleaned.slice(8,12)}`;
    if (cleaned.length <= 13) return `${cleaned.slice(0,4)} ${cleaned.slice(4,8)} ${cleaned.slice(8,12)} ${cleaned.slice(12,13)}`;
    return cleaned;
  };

  // ============================================================
  // VÉRIFICATION EDUC MASTER (AUTO-REMPLISSAGE)
  // ============================================================

  const handleEducMasterBlur = async () => {
    const educmasterLength = eleve.educmaster.replace(/\s/g, '').length;
    
    if (!eleve.educmaster || (educmasterLength !== 12 && educmasterLength !== 13)) {
      setEducmasterError('L\'EducMaster doit contenir 12 ou 13 chiffres');
      return;
    }

    if (!user) {
      return;
    }

    const result = await verifierEducMaster(eleve.educmaster);
    if (!result.valid) {
      setEducmasterError(result.message || 'EducMaster invalide');
    } else {
      setEducmasterError(null);
      if (result.auto_filled && result.existing_data) {
        setEleve(prev => ({
          ...prev,
          nom: result.existing_data.nom || prev.nom,
          prenom: result.existing_data.prenom || prev.prenom,
          sexe: result.existing_data.sexe || prev.sexe,
          date_naissance: result.existing_data.date_naissance || prev.date_naissance,
        }));
        setAutoFilled(true);
        Alert.alert('Informations pré-remplies', 'Les informations de l\'élève ont été automatiquement remplies à partir de son EducMaster.');
      }
    }
  };

  // ============================================================
  // VALIDATION FORMULAIRE
  // ============================================================

  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {};
    const educmasterLength = eleve.educmaster.replace(/\s/g, '').length;
    
    if (!eleve.educmaster || (educmasterLength !== 12 && educmasterLength !== 13)) {
      errors.educmaster = 'EducMaster requis (12 ou 13 chiffres)';
    }
    if (!eleve.nom) errors.nom = 'Nom de l\'élève requis';
    if (!eleve.prenom) errors.prenom = 'Prénom de l\'élève requis';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0 && !educmasterError;
  };

  const validateStep3 = (): boolean => {
    if (!parcours.niveau_id) {
      Alert.alert('Niveau requis', 'Veuillez sélectionner un niveau');
      return false;
    }
    if (!parcours.serie_id) {
      Alert.alert('Série requise', 'Veuillez sélectionner une série');
      return false;
    }
    return true;
  };

  const validateStep4 = (): boolean => {
    const errors: Record<string, string> = {};
    if (!parent.nom) errors.parent_nom = 'Nom du parent requis';
    if (!parent.prenom) errors.parent_prenom = 'Prénom du parent requis';
    if (!parent.telephone || parent.telephone.replace(/\D/g, '').length < 8) {
      errors.parent_telephone = 'Téléphone parent requis (8-10 chiffres)';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ============================================================
  // NAVIGATION ENTRE ÉTAPES
  // ============================================================

  const handleNextToStep2 = () => {
    if (!validateStep2()) {
      Alert.alert('Formulaire incomplet', 'Veuillez remplir tous les champs obligatoires');
      return;
    }
    
    if (!user) {
      saveInscriptionSession({
        step: 2,
        code_etablissement: codeEtablissement,
        etablissement: etablissement || undefined,
        eleve: eleve,
        parent: parent,
        parcours: parcours,
        autoFilled: autoFilled,
      });
      const redirectUrl = encodeURIComponent('/auto-inscription');
      router.push(`/auth/login?redirect=${redirectUrl}`);
      Alert.alert('Connexion requise', 'Veuillez vous connecter ou créer un compte pour vérifier l\'EducMaster et continuer votre inscription.');
      return;
    }
    
    setStep(3);
  };

  const handleNextToStep3 = () => {
    if (validateStep3()) {
      setStep(4);
    }
  };

  const handleSoumettre = async () => {
    if (!validateStep4()) {
      Alert.alert('Formulaire incomplet', 'Veuillez remplir toutes les informations parentales');
      return;
    }

    if (!etablissement) return;

    // Construire le libellé complet de la classe souhaitée (Niveau + Série + Option)
    const niveau = niveaux.find(n => n.id === parcours.niveau_id);
    const serie = series.find(s => s.id === parcours.serie_id);
    const option = options.find(o => o.id === parcours.option_id);
    
    const classeLabel = [
      niveau?.nom,
      serie?.nom,
      option?.nom,
    ].filter(Boolean).join(' - ');

    const result = await soumettreDemande({
      code_etablissement: codeEtablissement,
      eleve: {
        educmaster: eleve.educmaster.replace(/\s/g, ''),
        nom: eleve.nom,
        prenom: eleve.prenom,
        sexe: eleve.sexe,
        date_naissance: eleve.date_naissance || undefined,
        classe_souhaitee: classeLabel,
      },
      parent: {
        nom: parent.nom,
        prenom: parent.prenom,
        telephone: parent.telephone,
        email_personnel: parent.email_personnel,
        type_lien: parent.type_lien,
      },
    });

    if (result.success) {
      clearInscriptionSession();
      setStep(5);
    } else {
      Alert.alert('Erreur', result.message || 'Une erreur est survenue');
    }
  };

  const handleRetour = () => {
    if (step > 1) {
      setStep((step - 1) as Step);
    } else {
      router.back();
    }
  };

  // ============================================================
  // FORMATAGE DES CHAMPS
  // ============================================================

  const formaterTelephone = (text: string): string => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 4) return `${cleaned.slice(0,2)} ${cleaned.slice(2)}`;
    if (cleaned.length <= 6) return `${cleaned.slice(0,2)} ${cleaned.slice(2,4)} ${cleaned.slice(4)}`;
    if (cleaned.length <= 8) return `${cleaned.slice(0,2)} ${cleaned.slice(2,4)} ${cleaned.slice(4,6)} ${cleaned.slice(6)}`;
    return `${cleaned.slice(0,2)} ${cleaned.slice(2,4)} ${cleaned.slice(4,6)} ${cleaned.slice(6,8)} ${cleaned.slice(8,10)}`;
  };

  const formaterDate = (text: string): string => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length <= 2) return cleaned;
    if (cleaned.length <= 4) return `${cleaned.slice(0,2)}/${cleaned.slice(2)}`;
    return `${cleaned.slice(0,2)}/${cleaned.slice(2,4)}/${cleaned.slice(4,8)}`;
  };

  const toTitleCase = (str: string): string => {
    if (!str) return '';
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getCycleLabel = (cycle: Cycle): string => {
    return cycle.ordre === 1 ? `1er Cycle (${cycle.nom})` : `2nd Cycle (${cycle.nom})`;
  };

  const getNiveauLabel = (niveau: Niveau): string => {
    return niveau.nom;
  };

  return (
    <>
      {/* Étape 1: Code établissement */}
      {step === 1 && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <Card style={styles.card}>
              <View style={styles.header}>
                <School size={48} color={theme.colors.primary.DEFAULT} />
                <Text style={styles.title}>Inscription en ligne</Text>
                <Text style={styles.subtitle}>
                  Inscrivez votre enfant dans un établissement scolaire
                </Text>
              </View>

              <View style={styles.stepIndicator}>
                <View style={[styles.stepDot, styles.stepDotActive]} />
                <View style={styles.stepLine} />
                <View style={styles.stepDot} />
                <View style={styles.stepLine} />
                <View style={styles.stepDot} />
                <View style={styles.stepLine} />
                <View style={styles.stepDot} />
              </View>
              <Text style={styles.stepText}>Étape 1/4 - Code établissement</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Code établissement *</Text>
                <TextInput
                  style={[styles.input, codeError && styles.inputError]}
                  placeholder="Ex: SCH260001"
                  value={codeEtablissement}
                  onChangeText={setCodeEtablissement}
                  autoCapitalize="characters"
                  editable={!verifyingCode && !loading}
                />
                {codeError && (
                  <View style={styles.errorContainer}>
                    <AlertCircle size={14} color="#EF4444" />
                    <Text style={styles.errorText}>{codeError}</Text>
                  </View>
                )}
                <Text style={styles.helpText}>
                  Ce code vous a été fourni par l'établissement scolaire
                </Text>
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
                  <Text style={styles.cancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, (verifyingCode || loading) && styles.primaryButtonDisabled]}
                  onPress={() => handleVerifierCodeAuto()}
                  disabled={verifyingCode || loading}
                >
                  {verifyingCode || loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>Vérifier</Text>
                      <ArrowRight size={18} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Étape 2: Identité élève */}
      {step === 2 && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <Card style={styles.card}>
              <View style={styles.stepIndicator}>
                <View style={[styles.stepDot, styles.stepDotCompleted]} />
                <View style={styles.stepLine} />
                <View style={[styles.stepDot, styles.stepDotActive]} />
                <View style={styles.stepLine} />
                <View style={styles.stepDot} />
                <View style={styles.stepLine} />
                <View style={styles.stepDot} />
              </View>
              <Text style={styles.stepText}>Étape 2/4 - Identité de l'élève</Text>

              <View style={styles.formGroup}>
                <Text style={styles.label}>EducMaster *</Text>
                <TextInput
                  style={[styles.input, educmasterError && styles.inputError]}
                  placeholder="1234 5678 9012 ou 1234 5678 9012 3"
                  value={eleve.educmaster}
                  onChangeText={(text) => setEleve({ ...eleve, educmaster: formaterEducMaster(text) })}
                  onBlur={handleEducMasterBlur}
                  keyboardType="numeric"
                  maxLength={16}
                />
                {educmasterError && (
                  <View style={styles.errorContainer}>
                    <AlertCircle size={14} color="#EF4444" />
                    <Text style={styles.errorText}>{educmasterError}</Text>
                  </View>
                )}
                {autoFilled && (
                  <View style={styles.infoContainer}>
                    <CheckCircle size={14} color="#10B981" />
                    <Text style={styles.infoText}>Informations pré-remplies automatiquement</Text>
                  </View>
                )}
              </View>

              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={styles.label}>Nom *</Text>
                  <TextInput
                    style={[styles.input, formErrors.nom && styles.inputError, autoFilled && styles.inputReadonly]}
                    placeholder="Nom de famille"
                    value={eleve.nom}
                    onChangeText={(text) => setEleve({ ...eleve, nom: text.toUpperCase() })}
                    editable={!autoFilled}
                  />
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.label}>Prénom *</Text>
                  <TextInput
                    style={[styles.input, formErrors.prenom && styles.inputError, autoFilled && styles.inputReadonly]}
                    placeholder="Prénom"
                    value={eleve.prenom}
                    onChangeText={(text) => setEleve({ ...eleve, prenom: toTitleCase(text) })}
                    editable={!autoFilled}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={styles.label}>Sexe *</Text>
                  <View style={styles.sexeContainer}>
                    <TouchableOpacity
                      style={[styles.sexeOption, eleve.sexe === 'M' && styles.sexeOptionActive]}
                      onPress={() => setEleve({ ...eleve, sexe: 'M' })}
                    >
                      <Text style={[styles.sexeOptionText, eleve.sexe === 'M' && styles.sexeOptionTextActive]}>Masculin</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sexeOption, eleve.sexe === 'F' && styles.sexeOptionActive]}
                      onPress={() => setEleve({ ...eleve, sexe: 'F' })}
                    >
                      <Text style={[styles.sexeOptionText, eleve.sexe === 'F' && styles.sexeOptionTextActive]}>Féminin</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.label}>Date de naissance</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="JJ/MM/AAAA"
                    value={eleve.date_naissance}
                    onChangeText={(text) => setEleve({ ...eleve, date_naissance: formaterDate(text) })}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.secondaryButton} onPress={handleRetour}>
                  <ArrowLeft size={18} color={theme.colors.primary.DEFAULT} />
                  <Text style={styles.secondaryButtonText}>Retour</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={handleNextToStep2}
                >
                  <Text style={styles.primaryButtonText}>Continuer</Text>
                  <ArrowRight size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Étape 3: Parcours scolaire (DYNAMIQUE) */}
      {step === 3 && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <Card style={styles.card}>
              <View style={styles.stepIndicator}>
                <View style={[styles.stepDot, styles.stepDotCompleted]} />
                <View style={styles.stepLine} />
                <View style={[styles.stepDot, styles.stepDotCompleted]} />
                <View style={styles.stepLine} />
                <View style={[styles.stepDot, styles.stepDotActive]} />
                <View style={styles.stepLine} />
                <View style={styles.stepDot} />
              </View>
              <Text style={styles.stepText}>Étape 3/4 - Parcours scolaire</Text>

              <Text style={styles.sectionTitle}>📚 Sélectionnez le parcours souhaité</Text>

              {/* Sélecteur Cycle */}
              <View style={styles.selectorGroup}>
                <Text style={styles.label}>Cycle *</Text>
                <TouchableOpacity
                  style={styles.selectorButton}
                  onPress={() => setShowCycleSelector(true)}
                >
                  <View style={styles.selectorButtonLeft}>
                    <Users size={16} color={theme.colors.neutral[500]} />
                    <Text style={[styles.selectorButtonText, !parcours.cycle_id && styles.selectorButtonPlaceholder]}>
                      {parcours.cycle_id 
                        ? getCycleLabel(cycles.find(c => c.id === parcours.cycle_id)!)
                        : 'Sélectionner un cycle'}
                    </Text>
                  </View>
                  <ChevronDown size={16} color={theme.colors.neutral[500]} />
                </TouchableOpacity>
              </View>

              {/* Sélecteur Niveau */}
              {parcours.cycle_id && niveaux.length > 0 && (
                <View style={styles.selectorGroup}>
                  <Text style={styles.label}>Niveau *</Text>
                  <TouchableOpacity
                    style={styles.selectorButton}
                    onPress={() => setShowNiveauSelector(true)}
                  >
                    <View style={styles.selectorButtonLeft}>
                      <BookOpen size={16} color={theme.colors.neutral[500]} />
                      <Text style={[styles.selectorButtonText, !parcours.niveau_id && styles.selectorButtonPlaceholder]}>
                        {parcours.niveau_id 
                          ? getNiveauLabel(niveaux.find(n => n.id === parcours.niveau_id)!)
                          : 'Sélectionner un niveau'}
                      </Text>
                    </View>
                    <ChevronDown size={16} color={theme.colors.neutral[500]} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Sélecteur Série */}
              {parcours.niveau_id && series.length > 0 && (
                <View style={styles.selectorGroup}>
                  <Text style={styles.label}>Série *</Text>
                  <TouchableOpacity
                    style={styles.selectorButton}
                    onPress={() => setShowSerieSelector(true)}
                  >
                    <View style={styles.selectorButtonLeft}>
                      <GraduationCap size={16} color={theme.colors.neutral[500]} />
                      <Text style={[styles.selectorButtonText, !parcours.serie_id && styles.selectorButtonPlaceholder]}>
                        {parcours.serie_id 
                          ? series.find(s => s.id === parcours.serie_id)?.nom
                          : 'Sélectionner une série'}
                      </Text>
                    </View>
                    <ChevronDown size={16} color={theme.colors.neutral[500]} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Sélecteur Option */}
              {parcours.serie_id && options.length > 0 && (
                <View style={styles.selectorGroup}>
                  <Text style={styles.label}>Option</Text>
                  <TouchableOpacity
                    style={styles.selectorButton}
                    onPress={() => setShowOptionSelector(true)}
                  >
                    <View style={styles.selectorButtonLeft}>
                      <Wrench size={16} color={theme.colors.neutral[500]} />
                      <Text style={[styles.selectorButtonText, !parcours.option_id && styles.selectorButtonPlaceholder]}>
                        {parcours.option_id 
                          ? options.find(o => o.id === parcours.option_id)?.nom
                          : 'Sélectionner une option (optionnel)'}
                      </Text>
                    </View>
                    <ChevronDown size={16} color={theme.colors.neutral[500]} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Résumé */}
              {(() => {
                const cycle = cycles.find(c => c.id === parcours.cycle_id);
                const niveau = niveaux.find(n => n.id === parcours.niveau_id);
                const serie = series.find(s => s.id === parcours.serie_id);
                const option = options.find(o => o.id === parcours.option_id);
                
                const fullLabel = [
                  cycle?.nom,
                  niveau?.nom,
                  serie?.nom,
                  option?.nom,
                ].filter(Boolean).join(' - ');
                
                return fullLabel ? (
                  <View style={styles.resumeContainer}>
                    <Text style={styles.resumeLabel}>Récapitulatif</Text>
                    <Text style={styles.resumeValue}>{fullLabel}</Text>
                  </View>
                ) : null;
              })()}

              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.secondaryButton} onPress={handleRetour}>
                  <ArrowLeft size={18} color={theme.colors.primary.DEFAULT} />
                  <Text style={styles.secondaryButtonText}>Retour</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, (!parcours.niveau_id || !parcours.serie_id) && styles.primaryButtonDisabled]}
                  onPress={handleNextToStep3}
                  disabled={!parcours.niveau_id || !parcours.serie_id}
                >
                  <Text style={styles.primaryButtonText}>Continuer</Text>
                  <ArrowRight size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </Card>
          </ScrollView>

          {/* Modal Cycle */}
          <Modal visible={showCycleSelector} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Sélectionner un cycle</Text>
                  <TouchableOpacity onPress={() => setShowCycleSelector(false)}>
                    <X size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalList}>
                  {cycles.map((cycle) => (
                    <TouchableOpacity
                      key={cycle.id}
                      style={[styles.modalOption, parcours.cycle_id === cycle.id && styles.modalOptionActive]}
                      onPress={() => handleCycleSelect(cycle)}
                    >
                      <Text style={[styles.modalOptionText, parcours.cycle_id === cycle.id && styles.modalOptionTextActive]}>
                        {getCycleLabel(cycle)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Modal Niveau */}
          <Modal visible={showNiveauSelector} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Sélectionner un niveau</Text>
                  <TouchableOpacity onPress={() => setShowNiveauSelector(false)}>
                    <X size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalList}>
                  {niveaux.map((niveau) => (
                    <TouchableOpacity
                      key={niveau.id}
                      style={[styles.modalOption, parcours.niveau_id === niveau.id && styles.modalOptionActive]}
                      onPress={() => handleNiveauSelect(niveau)}
                    >
                      <Text style={[styles.modalOptionText, parcours.niveau_id === niveau.id && styles.modalOptionTextActive]}>
                        {getNiveauLabel(niveau)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Modal Série */}
          <Modal visible={showSerieSelector} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Sélectionner une série</Text>
                  <TouchableOpacity onPress={() => setShowSerieSelector(false)}>
                    <X size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalList}>
                  {series.map((serie) => (
                    <TouchableOpacity
                      key={serie.id}
                      style={[styles.modalOption, parcours.serie_id === serie.id && styles.modalOptionActive]}
                      onPress={() => handleSerieSelect(serie)}
                    >
                      <Text style={[styles.modalOptionText, parcours.serie_id === serie.id && styles.modalOptionTextActive]}>
                        {serie.nom}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Modal Option */}
          <Modal visible={showOptionSelector} transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Sélectionner une option</Text>
                  <TouchableOpacity onPress={() => setShowOptionSelector(false)}>
                    <X size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalList}>
                  <TouchableOpacity
                    style={[styles.modalOption, !parcours.option_id && styles.modalOptionActive]}
                    onPress={() => handleOptionSelect(null)}
                  >
                    <Text style={[styles.modalOptionText, !parcours.option_id && styles.modalOptionTextActive]}>
                      Aucune option
                    </Text>
                  </TouchableOpacity>
                  {options.map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[styles.modalOption, parcours.option_id === option.id && styles.modalOptionActive]}
                      onPress={() => handleOptionSelect(option)}
                    >
                      <Text style={[styles.modalOptionText, parcours.option_id === option.id && styles.modalOptionTextActive]}>
                        {option.nom}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      )}

      {/* Étape 4: Informations parent */}
      {step === 4 && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
          <ScrollView contentContainerStyle={styles.content}>
            <Card style={styles.card}>
              <View style={styles.stepIndicator}>
                <View style={[styles.stepDot, styles.stepDotCompleted]} />
                <View style={styles.stepLine} />
                <View style={[styles.stepDot, styles.stepDotCompleted]} />
                <View style={styles.stepLine} />
                <View style={[styles.stepDot, styles.stepDotCompleted]} />
                <View style={styles.stepLine} />
                <View style={[styles.stepDot, styles.stepDotActive]} />
              </View>
              <Text style={styles.stepText}>Étape 4/4 - Informations parent</Text>

              <Text style={styles.sectionTitle}>👨‍👩‍👧 Informations du parent/tuteur</Text>

              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={styles.label}>Nom *</Text>
                  <TextInput
                    style={[styles.input, formErrors.parent_nom && styles.inputError]}
                    placeholder="Nom"
                    value={parent.nom}
                    onChangeText={(text) => setParent({ ...parent, nom: text.toUpperCase() })}
                  />
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.label}>Prénom *</Text>
                  <TextInput
                    style={[styles.input, formErrors.parent_prenom && styles.inputError]}
                    placeholder="Prénom"
                    value={parent.prenom}
                    onChangeText={(text) => setParent({ ...parent, prenom: toTitleCase(text) })}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={styles.label}>Téléphone *</Text>
                  <TextInput
                    style={[styles.input, formErrors.parent_telephone && styles.inputError]}
                    placeholder="90 12 34 56"
                    value={parent.telephone}
                    onChangeText={(text) => setParent({ ...parent, telephone: formaterTelephone(text) })}
                    keyboardType="phone-pad"
                    maxLength={14}
                  />
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.label}>Email (optionnel)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="parent@email.com"
                    value={parent.email_personnel}
                    onChangeText={(text) => setParent({ ...parent, email_personnel: text.toLowerCase() })}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Lien de parenté *</Text>
                <View style={styles.lienContainer}>
                  {['pere', 'mere', 'tuteur', 'autre'].map((lien) => (
                    <TouchableOpacity
                      key={lien}
                      style={[styles.lienOption, parent.type_lien === lien && styles.lienOptionActive]}
                      onPress={() => setParent({ ...parent, type_lien: lien as any })}
                    >
                      <Text style={[styles.lienOptionText, parent.type_lien === lien && styles.lienOptionTextActive]}>
                        {lien === 'pere' ? 'Père' : lien === 'mere' ? 'Mère' : lien === 'tuteur' ? 'Tuteur' : 'Autre'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.buttonContainer}>
                <TouchableOpacity style={styles.secondaryButton} onPress={handleRetour}>
                  <ArrowLeft size={18} color={theme.colors.primary.DEFAULT} />
                  <Text style={styles.secondaryButtonText}>Retour</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
                  onPress={handleSoumettre}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>Soumettre ma demande</Text>
                      <ArrowRight size={18} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Étape 5: Succès */}
      {step === 5 && (
        <ScrollView contentContainerStyle={styles.content}>
          <Card style={styles.card}>
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <CheckCircle size={64} color="#10B981" />
              </View>
              <Text style={styles.successTitle}>Demande envoyée avec succès !</Text>
              <Text style={styles.successMessage}>
                Votre demande d'inscription a bien été enregistrée.
              </Text>
              <Text style={styles.successMessage}>
                Un administrateur de l'établissement va la traiter dans les plus brefs délais.
              </Text>
              <Text style={styles.successNote}>
                Vous recevrez une notification dès que votre demande sera validée.
              </Text>
              <TouchableOpacity
                style={styles.homeButton}
                onPress={() => router.replace('/')}
              >
                <Text style={styles.homeButtonText}>Retour à l'accueil</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </ScrollView>
      )}

      {/* Modale de confirmation établissement */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.modalCloseButton} 
              onPress={() => setShowConfirmModal(false)}
            >
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
            
            <View style={styles.modalIconContainer}>
              <Building2 size={48} color={theme.colors.primary.DEFAULT} />
            </View>
            
            <Text style={styles.modalTitle}>{etablissementTemp?.nom}</Text>
            
            {etablissementTemp?.ville && (
              <View style={styles.modalRow}>
                <Text style={styles.modalRowIcon}>📍</Text>
                <Text style={styles.modalRowText}>{etablissementTemp.ville}</Text>
              </View>
            )}
            
            {etablissementTemp?.telephone && (
              <View style={styles.modalRow}>
                <Text style={styles.modalRowIcon}>📞</Text>
                <Text style={styles.modalRowText}>{etablissementTemp.telephone}</Text>
              </View>
            )}
            
            {etablissementTemp?.email && (
              <View style={styles.modalRow}>
                <Text style={styles.modalRowIcon}>📧</Text>
                <Text style={styles.modalRowText}>{etablissementTemp.email}</Text>
              </View>
            )}
            
            <View style={styles.modalDivider} />
            
            <View style={styles.modalCodeContainer}>
              <Text style={styles.modalCodeLabel}>Code saisi :</Text>
              <Text style={styles.modalCodeValue}>{codeEtablissement}</Text>
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.modalCancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalConfirmButton}
                onPress={handleConfirmEtablissement}
              >
                <Text style={styles.modalConfirmButtonText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    borderWidth: 2,
    borderColor: '#D1D5DB',
  },
  stepDotActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
    borderColor: theme.colors.primary.DEFAULT,
  },
  stepDotCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#E5E7EB',
  },
  stepText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
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
  inputReadonly: {
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
    marginTop: 6,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#065F46',
  },
  helpText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 6,
  },
  row: {
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
  lienContainer: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  lienOption: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  lienOptionActive: {
    backgroundColor: '#EFF6FF',
    borderColor: theme.colors.primary.DEFAULT,
  },
  lienOptionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  lienOptionTextActive: {
    color: theme.colors.primary.DEFAULT,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  selectorGroup: {
    marginBottom: 16,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  selectorButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectorButtonText: {
    fontSize: 14,
    color: '#1F2937',
  },
  selectorButtonPlaceholder: {
    color: '#9CA3AF',
  },
  resumeContainer: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  resumeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 4,
  },
  resumeValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary.DEFAULT,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
  modalCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 8,
    zIndex: 1,
  },
  modalIconContainer: {
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 16,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
    paddingHorizontal: 16,
  },
  modalRowIcon: {
    fontSize: 16,
    width: 32,
  },
  modalRowText: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    width: '100%',
    marginVertical: 16,
  },
  modalCodeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  modalCodeLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  modalCodeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.primary.DEFAULT,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: theme.colors.primary.DEFAULT,
    alignItems: 'center',
  },
  modalConfirmButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  successIcon: {
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  successNote: {
    fontSize: 13,
    color: '#10B981',
    textAlign: 'center',
    marginTop: 16,
  },
  homeButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
    marginTop: 24,
  },
  homeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});