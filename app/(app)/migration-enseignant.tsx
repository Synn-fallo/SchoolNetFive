// /home/project/app/(app)/migration-enseignant.tsx
// Page de migration (indépendant → affilié)
// Vérifications + conteneur pour le composant principal

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  Alert
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import MigrationIndependantVersAffilie from '@/components/enseignant/MigrationIndependantVersAffilie';
import { isEtablissementAbonne } from '@/lib/abonnement';
import { AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react-native';
import theme from '@/constants/theme';

export default function MigrationEnseignantScreen() {
  const router = useRouter();
  const { user, primaryRole, loading: authLoading } = useAuth();
  
  const [verificationStatus, setVerificationStatus] = useState<'checking' | 'eligible' | 'not_eligible'>('checking');
  const [hasPersonalData, setHasPersonalData] = useState(false);
  const [isAffiliated, setIsAffiliated] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Vérifications préalables
  useEffect(() => {
    checkEligibility();
  }, [user, primaryRole]);

  const checkEligibility = async () => {
    if (!user || authLoading) return;
    
    setLoading(true);
    setVerificationStatus('checking');
    
    try {
      // 1. Vérifier que l'utilisateur a le rôle enseignant
      if (primaryRole !== 'enseignant') {
        setVerificationStatus('not_eligible');
        setErrorMessage('Seuls les enseignants peuvent accéder à cette page.');
        setLoading(false);
        return;
      }
      
      // 2. Vérifier que l'enseignant est affilié à un établissement abonné
      const { data: enseignantEtab, error: err1 } = await supabase
        .from('enseignant_etablissements')
        .select('etablissement_id')
        .eq('enseignant_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      
      if (err1 || !enseignantEtab?.etablissement_id) {
        setVerificationStatus('not_eligible');
        setErrorMessage('Vous n\'êtes pas affilié à un établissement. La migration nécessite un établissement abonné.');
        setLoading(false);
        return;
      }
      
      const affiliated = await isEtablissementAbonne(enseignantEtab.etablissement_id);
      setIsAffiliated(affiliated);
      
      if (!affiliated) {
        setVerificationStatus('not_eligible');
        setErrorMessage('Votre établissement n\'est pas abonné. La migration nécessite un établissement abonné.');
        setLoading(false);
        return;
      }
      
      // 3. Vérifier que l'enseignant a des données personnelles à migrer
      const { data: classesPerso, error: err2 } = await supabase
        .from('classes_personnelles')
        .select('id, nom, eleves, matieres')
        .eq('enseignant_id', user.id);
      
      if (err2) throw err2;
      
      const hasData = classesPerso && classesPerso.length > 0;
      setHasPersonalData(hasData);
      
      if (!hasData) {
        setVerificationStatus('not_eligible');
        setErrorMessage('Vous n\'avez aucune classe personnelle à migrer.');
        setLoading(false);
        return;
      }
      
      // 4. Tout est OK
      setVerificationStatus('eligible');
      setErrorMessage(null);
      
    } catch (error) {
      console.error('Error checking eligibility:', error);
      setVerificationStatus('not_eligible');
      setErrorMessage('Une erreur est survenue lors de la vérification.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  const handleRetry = () => {
    checkEligibility();
  };

  if (authLoading || loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
        <Text style={styles.loadingText}>Vérification de votre éligibilité...</Text>
      </View>
    );
  }

  if (verificationStatus === 'not_eligible') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <ArrowLeft size={20} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
        
        <Card style={styles.errorCard}>
          <View style={styles.errorIconContainer}>
            <AlertCircle size={48} color="#EF4444" />
          </View>
          <Text style={styles.errorTitle}>Migration non disponible</Text>
          <Text style={styles.errorMessage}>{errorMessage}</Text>
          
          {!isAffiliated && (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Pourquoi ?</Text>
              <Text style={styles.infoText}>
                La migration vers un établissement nécessite que votre établissement soit abonné à SchoolNet.
                Contactez votre chef d'établissement pour plus d'informations.
              </Text>
            </View>
          )}
          
          {!hasPersonalData && (
            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Comment créer des données personnelles ?</Text>
              <Text style={styles.infoText}>
                En mode indépendant, vous pouvez créer vos propres classes, ajouter des élèves et saisir des notes.
                Ces données pourront ensuite être migrées vers un établissement abonné.
              </Text>
            </View>
          )}
          
          <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
        <ArrowLeft size={20} color={theme.colors.primary.DEFAULT} />
        <Text style={styles.backButtonText}>Retour</Text>
      </TouchableOpacity>
      
      <View style={styles.header}>
        <Text style={styles.title}>Migration vers l'établissement</Text>
        <Text style={styles.subtitle}>
          Transférez vos données personnelles vers votre établissement abonné
        </Text>
      </View>
      
      {isAffiliated && (
        <View style={styles.affiliatedBadge}>
          <CheckCircle size={16} color="#10B981" />
          <Text style={styles.affiliatedText}>
            Établissement abonné – Migration possible
          </Text>
        </View>
      )}
      
      <MigrationIndependantVersAffilie onComplete={() => {
        Alert.alert(
          'Migration terminée',
          'Vos données ont été transférées avec succès. Vous pouvez consulter vos notes dans l\'espace officiel.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }} />
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 14,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  affiliatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  affiliatedText: {
    fontSize: 13,
    color: '#065F46',
    fontWeight: '500',
  },
  errorCard: {
    padding: 24,
    alignItems: 'center',
  },
  errorIconContainer: {
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  infoBox: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    width: '100%',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});