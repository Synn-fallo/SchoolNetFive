import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, Linking, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Check, Crown, Star, CreditCard, AlertCircle, X, ChevronRight, Shield, Zap, Building2, Award, Smartphone, Wallet, Lock } from 'lucide-react-native';
import theme from '@/constants/theme';

interface PlanAbonnement {
  id: string;
  nom: string;
  prix_mensuel: number;
  prix_annuel: number;
  description: string;
  features: string[];
  recommended?: boolean;
  icon?: any;
  color?: string;
}

const PLANS: PlanAbonnement[] = [
  {
    id: 'essentiel',
    nom: 'Essentiel',
    prix_mensuel: 45000,
    prix_annuel: 297000,
    description: 'Pour une présence professionnelle',
    icon: Building2,
    color: '#3B82F6',
    features: [
      'Page d\'établissement complète',
      'Annuaire public avec mise en avant',
      'Actualités illimitées',
      'Événements illimités',
      '50 téléchargements de documents',
      '50 photos en galerie',
      'Formulaire de contact',
      'Support email',
    ],
    recommended: true,
  },
  {
    id: 'premium',
    nom: 'Premium',
    prix_mensuel: 54000,
    prix_annuel: 356400,
    description: 'Pour une visibilité maximale',
    icon: Crown,
    color: '#8B5CF6',
    features: [
      'Toutes les fonctionnalités Essentiel',
      'Galerie vidéo',
      'Inscriptions en ligne',
      'Pages personnalisées (3)',
      'Statistiques de visite',
      'Support prioritaire',
    ],
  },
  {
    id: 'prestige',
    nom: 'Prestige',
    prix_mensuel: 75000,
    prix_annuel: 495000,
    description: 'La solution complète',
    icon: Award,
    color: '#F59E0B',
    features: [
      'Toutes les fonctionnalités Premium',
      'Pages personnalisées illimitées',
      'Domaine personnalisé',
      'Statistiques avancées',
      'Formation équipe',
      'Support dédié',
      'API d\'intégration',
    ],
  },
];

const DOMAIN = 'schoolnet.bj';

// Types d'opérateurs
type Operator = 'mtn' | 'moov' | 'celtis';

// Configuration des opérateurs
const OPERATORS: { id: Operator; name: string; color: string; icon: any }[] = [
  { id: 'mtn', name: 'MTN', color: '#FFCC00', icon: Smartphone },
  { id: 'moov', name: 'Moov', color: '#00A651', icon: Smartphone },
  { id: 'celtis', name: 'Celtis', color: '#E30613', icon: Smartphone },
];

// Validation du numéro de téléphone (uniquement 10 chiffres, sans contrôle de préfixe)
const validatePhoneNumber = (phone: string): boolean => {
  const cleanPhone = phone.replace(/[\s\-]/g, '');
  // Vérifier qu'il fait exactement 10 chiffres et ne contient que des chiffres
  return /^\d{10}$/.test(cleanPhone);
};

// Nettoyer le numéro de téléphone
const cleanPhoneNumber = (phone: string): string => {
  return phone.replace(/[\s\-]/g, '');
};

// Formater l'affichage du numéro (01 23 45 67 89)
const formatPhoneDisplay = (phone: string): string => {
  const clean = phone.replace(/[\s\-]/g, '');
  if (clean.length === 10) {
    return `${clean.substring(0, 2)} ${clean.substring(2, 4)} ${clean.substring(4, 6)} ${clean.substring(6, 8)} ${clean.substring(8, 10)}`;
  }
  return phone;
};

export default function AbonnementEtablissementScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [loading, setLoading] = useState(false);
  const [etablissementId, setEtablissementId] = useState<string | null>(null);
  const [etablissementSlug, setEtablissementSlug] = useState<string | null>(null);
  const [etablissementNom, setEtablissementNom] = useState<string>('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'form' | 'processing' | 'success' | 'error'>('form');
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentAttempts, setPaymentAttempts] = useState(0);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [operator, setOperator] = useState<Operator | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  useEffect(() => {
    fetchEtablissement();
    fetchPaymentAttempts();
    checkExistingSubscription();
  }, [user]);

  useEffect(() => {
    if (retryCountdown > 0) {
      const timer = setTimeout(() => setRetryCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [retryCountdown]);

  // Validation en temps réel du numéro
  useEffect(() => {
    if (phoneNumber) {
      const cleanPhone = cleanPhoneNumber(phoneNumber);
      if (cleanPhone.length === 10) {
        if (!validatePhoneNumber(cleanPhone)) {
          setPhoneError('Le numéro doit contenir exactement 10 chiffres');
        } else {
          setPhoneError(null);
        }
      } else if (cleanPhone.length > 0 && cleanPhone.length < 10) {
        setPhoneError(`Le numéro doit contenir 10 chiffres (actuellement: ${cleanPhone.length})`);
      } else if (cleanPhone.length > 10) {
        setPhoneError('Numéro trop long (maximum 10 chiffres)');
      } else {
        setPhoneError(null);
      }
    } else {
      setPhoneError(null);
    }
  }, [phoneNumber]);

  const fetchEtablissement = async () => {
    if (!user) return;

    try {
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('etablissement_id')
        .eq('user_id', user.id)
        .eq('role', 'chef_etablissement')
        .eq('is_active', true)
        .not('etablissement_id', 'is', null)
        .maybeSingle();

      if (roleError) throw roleError;
      if (roleData?.etablissement_id) {
        setEtablissementId(roleData.etablissement_id);
        
        const { data: etabData, error: etabError } = await supabase
          .from('etablissements')
          .select('slug, nom')
          .eq('id', roleData.etablissement_id)
          .single();
        
        if (etabError) throw etabError;
        if (etabData?.slug) {
          setEtablissementSlug(etabData.slug);
          setEtablissementNom(etabData.nom);
        }
      }
    } catch (error) {
      console.error('Error fetching etablissement:', error);
    }
  };

  const fetchPaymentAttempts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('relances')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'paiement_echoue')
        .eq('statut', 'echoue')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching payment attempts (non critique):', error);
        // Ne pas bloquer l'application si cette table n'existe pas
        return;
      }
      setPaymentAttempts(data?.length || 0);
    } catch (error) {
      console.error('Error fetching payment attempts:', error);
    }
  };

  const checkExistingSubscription = async () => {
    if (!user) return;

    try {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('etablissement_id')
        .eq('user_id', user.id)
        .eq('role', 'chef_etablissement')
        .eq('is_active', true)
        .not('etablissement_id', 'is', null)
        .maybeSingle();

      if (!roleData?.etablissement_id) {
        setCheckingSubscription(false);
        return;
      }

      const { data: subscriptionData, error } = await supabase
        .from('abonnements')
        .select('id, plan, is_active, date_debut')
        .eq('etablissement_id', roleData.etablissement_id)
        .eq('is_active', true)
        .maybeSingle();

      if (error) {
        console.error('Error checking subscription (non critique):', error);
        setHasActiveSubscription(false);
        setCheckingSubscription(false);
        return;
      }

      if (subscriptionData) {
        setHasActiveSubscription(true);
        console.log('✅ Abonnement actif existant:', subscriptionData);
      } else {
        setHasActiveSubscription(false);
      }
    } catch (error) {
      console.error('Error checking existing subscription:', error);
      setHasActiveSubscription(false);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const selectedPlanData = PLANS.find(p => p.id === selectedPlan);
  const PlanIcon = selectedPlanData?.icon || Building2;

  const getMontant = (): number => {
    if (!selectedPlanData) return 0;
    return billingCycle === 'monthly' ? selectedPlanData.prix_mensuel : selectedPlanData.prix_annuel;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price);
  };

  const simulatePayment = (): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        const isSuccess = Math.random() > 0.2;
        if (isSuccess) {
          resolve({ success: true });
        } else {
          resolve({ 
            success: false, 
            error: 'Transaction échouée. Vérifiez vos informations ou réessayez.' 
          });
        }
      }, 2500);
    });
  };

  const saveFailedPaymentAttempt = async (plan: string, montant: number, errorMessage: string) => {
    if (!etablissementId) return;
    
    try {
      const { error } = await supabase
        .from('relances')
        .insert({
          user_id: user?.id,
          etablissement_id: etablissementId,
          type: 'paiement_echoue',
          statut: 'echoue',
          metadata: {
            plan,
            montant,
            error: errorMessage,
            tentative_numero: paymentAttempts + 1,
            date_tentative: new Date().toISOString(),
          },
        });
      
      if (error) {
        console.error('Error saving failed payment (non critique):', error);
        // Ne pas propager l'erreur - ce n'est pas critique
        return;
      }
      setPaymentAttempts(prev => prev + 1);
      
      await supabase
        .from('notifications')
        .insert({
          user_id: user?.id,
          titre: '⚠️ Paiement échoué',
          contenu: `Le paiement pour l'abonnement ${plan} a échoué. Tentative n°${paymentAttempts + 1}.`,
          type: 'paiement',
        });
    } catch (error) {
      console.error('Error saving failed payment:', error);
    }
  };

  const handleOpenPayment = () => {
    console.log('🔵 handleOpenPayment appelé');
    console.log('selectedPlan:', selectedPlan);
    console.log('etablissementId:', etablissementId);
    
    if (!selectedPlan || !etablissementId) {
      Alert.alert('Erreur', 'Veuillez sélectionner un plan');
      return;
    }

    if (hasActiveSubscription) {
      Alert.alert(
        'Abonnement existant',
        'Vous avez déjà un abonnement actif pour cet établissement. Contactez le support pour toute modification.',
        [{ text: 'OK' }]
      );
      return;
    }

    console.log('🔵 Ouverture du modal');
    setPaymentStep('form');
    setPaymentError(null);
    setPhoneNumber('');
    setOperator(null);
    setPhoneError(null);
    setShowPaymentModal(true);
  };

  const handleProcessPayment = async () => {
    console.log('🔵 handleProcessPayment appelé');
    console.log('operator:', operator);
    console.log('phoneNumber:', phoneNumber);
    
    if (!operator || !phoneNumber) {
      Alert.alert('Champs manquants', 'Veuillez renseigner votre numéro de téléphone et sélectionner un opérateur');
      return;
    }

    // Nettoyer et valider le numéro
    const cleanPhone = cleanPhoneNumber(phoneNumber);
    
    if (cleanPhone.length !== 10) {
      Alert.alert('Numéro invalide', 'Le numéro doit contenir exactement 10 chiffres (exemple: 01 23 45 67 89)');
      return;
    }

    if (!validatePhoneNumber(cleanPhone)) {
      Alert.alert('Numéro invalide', 'Veuillez entrer un numéro de téléphone valide (10 chiffres)');
      return;
    }

    if (hasActiveSubscription) {
      Alert.alert(
        'Abonnement existant',
        'Vous avez déjà un abonnement actif. Impossible de souscrire un nouvel abonnement.'
      );
      setShowPaymentModal(false);
      return;
    }

    setPaymentStep('processing');
    setPaymentError(null);

    try {
      const montant = getMontant();
      const paymentResult = await simulatePayment();
      
      if (!paymentResult.success) {
        setPaymentStep('error');
        setPaymentError(paymentResult.error || 'Transaction échouée');
        await saveFailedPaymentAttempt(selectedPlan!, montant, paymentResult.error || 'Transaction échouée');
        
        if (paymentAttempts + 1 >= 3) {
          setTimeout(() => {
            Alert.alert(
              'Plusieurs échecs détectés',
              'Nous avons détecté plusieurs échecs de paiement. Contactez notre support pour obtenir de l\'aide.',
              [
                { text: 'Contacter le support', onPress: () => Linking.openURL('mailto:support@schoolnet.bj?subject=Problème de paiement abonnement') },
                { text: 'Fermer' },
              ]
            );
          }, 500);
        }
        return;
      }

      // Insertion dans abonnements
      const { error: aboError } = await supabase
        .from('abonnements')
        .insert({
          etablissement_id: etablissementId,
          plan: selectedPlan,
          is_active: true,
          date_debut: new Date().toISOString(),
          telephone: cleanPhone,
          operateur: operator,
          montant: montant,
          cycle: billingCycle,
        });

      if (aboError) {
        console.error('❌ Erreur insertion abonnement:', aboError);
        throw new Error(`Erreur base de données: ${aboError.message}`);
      }

      const updateData: any = {
        statut: 'ACTIF',
        is_active: true,
      };
      
      if (etablissementSlug) {
        updateData.sous_domaine = `${etablissementSlug}.${DOMAIN}`;
      }
      
      const { error: etabError } = await supabase
        .from('etablissements')
        .update(updateData)
        .eq('id', etablissementId);

      if (etabError) {
        console.error('❌ Erreur mise à jour établissement:', etabError);
        // Ne pas bloquer, l'abonnement est déjà créé
      }

      // Mise à jour des relances (optionnelle)
      try {
        await supabase
          .from('relances')
          .update({ statut: 'envoye' })
          .eq('user_id', user?.id)
          .eq('type', 'paiement_echoue')
          .eq('statut', 'echoue');
      } catch (relanceError) {
        console.log('⚠️ Could not update relances (non critique)');
      }

      setPaymentAttempts(0);
      setHasActiveSubscription(true);
      setPaymentStep('success');
      
      // Notification (optionnelle)
      try {
        await supabase
          .from('notifications')
          .insert({
            user_id: user?.id,
            titre: '🎉 Abonnement activé !',
            contenu: `Votre abonnement ${selectedPlanData?.nom} est actif. Votre établissement est maintenant visible publiquement.`,
            type: 'abonnement',
          });
      } catch (notifError) {
        console.log('⚠️ Could not create notification (non critique)');
      }
        
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStep('error');
      const errorMessage = error instanceof Error ? error.message : 'Une erreur est survenue. Veuillez réessayer.';
      setPaymentError(errorMessage);
    }
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setPaymentStep('form');
    setPaymentError(null);
    setPhoneError(null);
    if (paymentStep === 'success') {
      router.push('/(app)/(sidebar)/etablissement/preview');
    }
  };

  const handlePhoneChange = (text: string) => {
    // Ne garder que les chiffres
    const numbersOnly = text.replace(/[^\d]/g, '');
    // Limiter à 10 chiffres
    const limited = numbersOnly.slice(0, 10);
    setPhoneNumber(limited);
  };

  const selectedPlanDataFull = PLANS.find(p => p.id === selectedPlan);

  if (checkingSubscription) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Vérification de votre abonnement...</Text>
      </View>
    );
  }

  if (hasActiveSubscription) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.activeSubscriptionContainer}>
          <View style={styles.activeSubscriptionIcon}>
            <Crown size={48} color={theme.colors.primary.DEFAULT} />
          </View>
          <Text style={styles.activeSubscriptionTitle}>Abonnement actif</Text>
          <Text style={styles.activeSubscriptionText}>
            Votre établissement dispose déjà d'un abonnement actif.
            Vous pouvez gérer votre abonnement ou contacter le support pour toute modification.
          </Text>
          <TouchableOpacity
            style={styles.viewSiteButton}
            onPress={() => router.push('/(app)/(sidebar)/etablissement/preview')}
          >
            <Text style={styles.viewSiteButtonText}>Voir mon site</Text>
            <ChevronRight size={18} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.contactSupportButton}
            onPress={() => Linking.openURL('mailto:support@schoolnet.bj?subject=Modification abonnement')}
          >
            <Text style={styles.contactSupportButtonText}>Contacter le support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.testModeBanner}>
          <Shield size={18} color="#D97706" />
          <Text style={styles.testModeText}>
            🔧 MODE TEST – Paiement simulé. Aucun débit réel ne sera effectué.
          </Text>
        </View>

        {paymentAttempts > 0 && (
          <View style={styles.warningBanner}>
            <AlertCircle size={16} color="#D97706" />
            <Text style={styles.warningText}>
              {paymentAttempts} tentative(s) de paiement échouée(s). Si le problème persiste, contactez le support.
            </Text>
          </View>
        )}

        <View style={styles.header}>
          <Text style={styles.title}>Choisissez votre offre</Text>
          <Text style={styles.subtitle}>
            Activez votre site officiel et bénéficiez de toutes les fonctionnalités
          </Text>
        </View>

        <View style={styles.billingToggle}>
          <TouchableOpacity
            style={[styles.toggleOption, billingCycle === 'monthly' && styles.toggleOptionActive]}
            onPress={() => setBillingCycle('monthly')}
          >
            <Text style={[styles.toggleText, billingCycle === 'monthly' && styles.toggleTextActive]}>
              Mensuel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleOption, billingCycle === 'yearly' && styles.toggleOptionActive]}
            onPress={() => setBillingCycle('yearly')}
          >
            <Text style={[styles.toggleText, billingCycle === 'yearly' && styles.toggleTextActive]}>
              Annuel (-45%)
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.plansContainer}>
          {PLANS.map((plan) => {
            const Icon = plan.icon || Building2;
            return (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  selectedPlan === plan.id && styles.planCardSelected,
                  plan.recommended && styles.planCardRecommended,
                ]}
                onPress={() => setSelectedPlan(plan.id)}
              >
                {plan.recommended && (
                  <View style={styles.recommendedBadge}>
                    <Star size={12} color="#FFFFFF" />
                    <Text style={styles.recommendedText}>Recommandé</Text>
                  </View>
                )}
                <View style={styles.planHeader}>
                  <View style={[styles.planIcon, { backgroundColor: `${plan.color || '#3B82F6'}15` }]}>
                    <Icon size={28} color={plan.color || '#3B82F6'} />
                  </View>
                  <View>
                    <Text style={styles.planName}>{plan.nom}</Text>
                    <Text style={styles.planDescription}>{plan.description}</Text>
                  </View>
                </View>
                <View style={styles.planPrice}>
                  <Text style={styles.priceAmount}>
                    {formatPrice(billingCycle === 'monthly' ? plan.prix_mensuel : plan.prix_annuel)}
                  </Text>
                  <Text style={styles.pricePeriod}>
                    FCFA / {billingCycle === 'monthly' ? 'mois' : 'an'}
                  </Text>
                </View>
                <View style={styles.featuresList}>
                  {plan.features.slice(0, 4).map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <Check size={14} color="#10B981" />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                  {plan.features.length > 4 && (
                    <Text style={styles.moreFeatures}>+{plan.features.length - 4} autres fonctionnalités</Text>
                  )}
                </View>
                {selectedPlan === plan.id && (
                  <View style={styles.selectedIndicator}>
                    <Crown size={14} color="#3B82F6" />
                    <Text style={styles.selectedText}>Plan sélectionné</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.subscribeButton, (!selectedPlan || loading) && styles.subscribeButtonDisabled]}
          onPress={handleOpenPayment}
          disabled={!selectedPlan || loading}
        >
          <CreditCard size={20} color="#FFFFFF" />
          <Text style={styles.subscribeButtonText}>
            {selectedPlan 
              ? `Souscrire à l'offre ${PLANS.find(p => p.id === selectedPlan)?.nom}`
              : 'Sélectionnez une offre'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          En souscrivant, vous acceptez les conditions générales d'utilisation.
          Le paiement sera effectué en toute sécurité via Mobile Money.
        </Text>
      </ScrollView>

      {/* Modal de paiement */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleClosePaymentModal}
        statusBarTranslucent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {paymentStep === 'form' && 'Paiement Mobile Money'}
                {paymentStep === 'processing' && 'Traitement en cours'}
                {paymentStep === 'success' && 'Paiement réussi !'}
                {paymentStep === 'error' && 'Paiement échoué'}
              </Text>
              {paymentStep !== 'processing' && (
                <TouchableOpacity onPress={handleClosePaymentModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <X size={24} color="#6B7280" />
                </TouchableOpacity>
              )}
            </View>

            {paymentStep === 'form' && (
              <>
                <View style={styles.modalBody}>
                  <View style={styles.paymentSummary}>
                    <Text style={styles.paymentSummaryTitle}>Récapitulatif</Text>
                    <Text style={styles.paymentSummaryPlan}>
                      {selectedPlanDataFull?.nom} - {billingCycle === 'monthly' ? 'Mensuel' : 'Annuel'}
                    </Text>
                    <Text style={styles.paymentSummaryAmount}>
                      {formatPrice(getMontant())} FCFA
                    </Text>
                  </View>

                  <Text style={styles.paymentLabel}>Opérateur</Text>
                  <View style={styles.operatorRow}>
                    {OPERATORS.map((op) => {
                      const Icon = op.icon;
                      return (
                        <TouchableOpacity
                          key={op.id}
                          style={[
                            styles.operatorButton,
                            operator === op.id && styles.operatorButtonActive,
                          ]}
                          onPress={() => setOperator(op.id)}
                          activeOpacity={0.7}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Icon size={24} color={operator === op.id ? '#FFFFFF' : '#6B7280'} />
                            <Text style={[styles.operatorText, operator === op.id && styles.operatorTextActive]}>
                              {op.name}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.paymentLabel}>Numéro de téléphone</Text>
                  <Text style={styles.phoneHint}>10 chiffres (exemple: 01 23 45 67 89)</Text>
                  <View style={[styles.phoneInputContainer, phoneError && styles.phoneInputError]}>
                    <Wallet size={20} color={phoneError ? '#EF4444' : '#9CA3AF'} />
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="01 23 45 67 89"
                      placeholderTextColor="#9CA3AF"
                      value={phoneNumber}
                      onChangeText={handlePhoneChange}
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>
                  {phoneError && (
                    <Text style={styles.phoneErrorText}>{phoneError}</Text>
                  )}
                  {phoneNumber.length === 10 && !phoneError && (
                    <Text style={styles.phoneValidText}>✓ Numéro valide</Text>
                  )}

                  <View style={styles.secureNote}>
                    <Lock size={14} color="#10B981" />
                    <Text style={styles.secureNoteText}>Paiement sécurisé – Mode test</Text>
                  </View>
                </View>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={styles.modalCancelButton}
                    onPress={handleClosePaymentModal}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalCancelText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalValidateButton,
                      (!operator || !phoneNumber || phoneNumber.length !== 10 || !!phoneError) && styles.modalValidateButtonDisabled
                    ]}
                    onPress={handleProcessPayment}
                    disabled={!operator || !phoneNumber || phoneNumber.length !== 10 || !!phoneError}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.modalValidateText}>Payer {formatPrice(getMontant())} FCFA</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {paymentStep === 'processing' && (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
                <Text style={styles.processingText}>Traitement du paiement en cours...</Text>
                <Text style={styles.processingSubtext}>Veuillez patienter</Text>
              </View>
            )}

            {paymentStep === 'success' && (
              <View style={styles.successContainer}>
                <View style={styles.successIcon}>
                  <Check size={48} color="#FFFFFF" />
                </View>
                <Text style={styles.successTitle}>Paiement réussi !</Text>
                <Text style={styles.successText}>
                  Votre abonnement {selectedPlanDataFull?.nom} est actif.
                  Votre établissement est maintenant visible publiquement.
                </Text>
                <TouchableOpacity style={styles.successButton} onPress={handleClosePaymentModal} activeOpacity={0.7}>
                  <Text style={styles.successButtonText}>Voir mon site</Text>
                  <ChevronRight size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            )}

            {paymentStep === 'error' && (
              <View style={styles.errorContainer}>
                <View style={styles.errorIcon}>
                  <X size={48} color="#FFFFFF" />
                </View>
                <Text style={styles.errorTitle}>Paiement échoué</Text>
                <Text style={styles.errorTextModal}>{paymentError || 'Une erreur est survenue'}</Text>
                <TouchableOpacity style={styles.retryButtonModal} onPress={() => setPaymentStep('form')} activeOpacity={0.7}>
                  <Text style={styles.retryButtonTextModal}>Réessayer</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
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
  testModeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  testModeText: {
    flex: 1,
    fontSize: 12,
    color: '#D97706',
    fontWeight: '500',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  billingToggle: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleOptionActive: {
    backgroundColor: '#3B82F6',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  plansContainer: {
    gap: 16,
    marginBottom: 24,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#F0F9FF',
  },
  planCardRecommended: {
    borderColor: '#F59E0B',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    flexDirection: 'row',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
    alignItems: 'center',
    zIndex: 1,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  planIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  planDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  planPrice: {
    marginBottom: 16,
  },
  priceAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1F2937',
  },
  pricePeriod: {
    fontSize: 12,
    color: '#6B7280',
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 12,
    color: '#4B5563',
  },
  moreFeatures: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  selectedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 6,
  },
  selectedText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  subscribeButton: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  subscribeButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  subscribeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footerNote: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  warningText: {
    fontSize: 13,
    color: '#D97706',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalBody: {
    padding: 20,
  },
  paymentSummary: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  paymentSummaryTitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  paymentSummaryPlan: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  paymentSummaryAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3B82F6',
  },
  paymentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  phoneHint: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  operatorRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  operatorButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  operatorButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  operatorText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
  operatorTextActive: {
    color: '#FFFFFF',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  phoneInputError: {
    borderColor: '#EF4444',
    borderWidth: 1,
  },
  phoneInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  phoneErrorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 4,
  },
  phoneValidText: {
    fontSize: 12,
    color: '#10B981',
    marginTop: 4,
    marginLeft: 4,
  },
  secureNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
  },
  secureNoteText: {
    fontSize: 12,
    color: '#10B981',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6B7280',
  },
  modalValidateButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
  },
  modalValidateButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  modalValidateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  processingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  processingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 20,
  },
  processingSubtext: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 8,
  },
  successContainer: {
    padding: 32,
    alignItems: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  successText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  successButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  successButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  errorContainer: {
    padding: 32,
    alignItems: 'center',
  },
  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  errorTextModal: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButtonModal: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonTextModal: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#6B7280',
  },
  activeSubscriptionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 60,
  },
  activeSubscriptionIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  activeSubscriptionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  activeSubscriptionText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
  },
  viewSiteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
    width: '100%',
    justifyContent: 'center',
  },
  viewSiteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  contactSupportButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    width: '100%',
    alignItems: 'center',
  },
  contactSupportButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
});