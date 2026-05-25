import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Settings, Lock, Eye, CreditCard, Clock, AlertTriangle } from 'lucide-react-native';
import theme from '@/constants/theme';
import { useEffect, useState } from 'react';

interface ConstructionBannerProps {
  etablissementId: string;
  isOwner: boolean;
  statut: string;
  createdAt?: string;
  onPreview?: () => void;
  onSubscribe?: () => void;
  onComplete?: () => void;
}

export default function ConstructionBanner({ 
  etablissementId, 
  isOwner, 
  statut,
  createdAt,
  onPreview,
  onSubscribe,
  onComplete,
}: ConstructionBannerProps) {
  const router = useRouter();
  const [daysSinceCreation, setDaysSinceCreation] = useState<number | null>(null);
  const [alertLevel, setAlertLevel] = useState<'none' | 'warning' | 'critical'>('none');

  useEffect(() => {
    if (createdAt && isOwner && statut === 'INFOS_MINIMALES_COMPLETE') {
      const createdDate = new Date(createdAt);
      const now = new Date();
      const days = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      setDaysSinceCreation(days);
      
      if (days >= 60) {
        setAlertLevel('critical');
      } else if (days >= 30) {
        setAlertLevel('warning');
      } else if (days >= 7) {
        setAlertLevel('warning');
      } else {
        setAlertLevel('none');
      }
    }
  }, [createdAt, isOwner, statut]);

  const getDaysMessage = () => {
    if (daysSinceCreation === null) return null;
    if (daysSinceCreation >= 60) {
      return `🔴 Action urgente : ${daysSinceCreation} jours en construction sans activation.`;
    }
    if (daysSinceCreation >= 30) {
      return `⚠️ ${daysSinceCreation} jours en construction. Votre établissement n'est pas encore visible publiquement.`;
    }
    if (daysSinceCreation >= 7) {
      return `⏳ ${daysSinceCreation} jours en construction. Activez votre site pour être visible.`;
    }
    return null;
  };

  if (!isOwner) {
    return (
      <View style={styles.bannerVisitor}>
        <Lock size={24} color="#D97706" />
        <Text style={styles.titleVisitor}>Site en construction</Text>
        <Text style={styles.descriptionVisitor}>
          Cet établissement prépare actuellement son site officiel.
          Revenez bientôt pour découvrir son espace complet.
        </Text>
      </View>
    );
  }

  if (statut === 'EN_ATTENTE_ACTIVATION') {
    return (
      <View style={styles.bannerOwner}>
        <Settings size={24} color="#3B82F6" />
        <Text style={styles.titleOwner}>Complétez votre établissement</Text>
        <Text style={styles.descriptionOwner}>
          Renseignez les informations de votre établissement pour le rendre visible dans l'annuaire.
        </Text>
        <TouchableOpacity style={styles.button} onPress={onComplete || (() => router.push('/(app)/(sidebar)/etablissement/gestion'))}>
          <Text style={styles.buttonText}>Compléter les informations</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (statut === 'INFOS_MINIMALES_COMPLETE') {
    return (
      <View style={[
        styles.bannerOwner,
        alertLevel === 'critical' && styles.bannerCritical,
        alertLevel === 'warning' && styles.bannerWarning,
      ]}>
        {alertLevel === 'critical' ? (
          <AlertTriangle size={24} color="#DC2626" />
        ) : alertLevel === 'warning' ? (
          <Clock size={24} color="#F59E0B" />
        ) : (
          <CreditCard size={24} color="#F59E0B" />
        )}
        
        <Text style={[
          styles.titleOwner,
          alertLevel === 'critical' && styles.titleCritical,
          alertLevel === 'warning' && styles.titleWarning,
        ]}>
          Activez votre site officiel
        </Text>
        
        <Text style={styles.descriptionOwner}>
          Votre établissement est prêt ! Souscrivez à un abonnement pour le rendre public et accessible à tous.
        </Text>
        
        {getDaysMessage() && (
          <Text style={[
            styles.daysMessage,
            alertLevel === 'critical' && styles.daysMessageCritical,
            alertLevel === 'warning' && styles.daysMessageWarning,
          ]}>
            {getDaysMessage()}
          </Text>
        )}
        
        <View style={styles.buttonGroup}>
          <TouchableOpacity 
            style={[styles.button, styles.buttonOrange]} 
            onPress={onSubscribe || (() => router.push('/(app)/(sidebar)/etablissement/abonnement'))}
          >
            <Text style={styles.buttonText}>Voir les offres</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.previewButton} onPress={onPreview || (() => router.push(`/preview/${etablissementId}`))}>
            <Eye size={16} color="#3B82F6" />
            <Text style={styles.previewButtonText}>Voir l'aperçu</Text>
          </TouchableOpacity>
        </View>
        
        {alertLevel === 'critical' && (
          <Text style={styles.criticalNote}>
            Sans souscription dans les 30 jours, votre fiche annuaire sera désactivée.
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.bannerOwner}>
      <Settings size={24} color="#3B82F6" />
      <Text style={styles.titleOwner}>Site en construction</Text>
      <Text style={styles.descriptionOwner}>
        Votre site est en cours de configuration.
      </Text>
      <TouchableOpacity style={styles.button} onPress={onComplete || (() => router.push('/(app)/(sidebar)/etablissement/gestion'))}>
        <Text style={styles.buttonText}>Gérer mon établissement</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerVisitor: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  bannerOwner: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  bannerWarning: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  bannerCritical: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#DC2626',
  },
  titleVisitor: {
    fontSize: 18,
    fontWeight: '700',
    color: '#D97706',
    marginTop: 12,
    marginBottom: 8,
  },
  titleOwner: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3B82F6',
    marginTop: 12,
    marginBottom: 8,
  },
  titleWarning: {
    color: '#F59E0B',
  },
  titleCritical: {
    color: '#DC2626',
  },
  descriptionVisitor: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  descriptionOwner: {
    fontSize: 14,
    color: '#1E40AF',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  daysMessage: {
    fontSize: 13,
    color: '#F59E0B',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    fontWeight: '500',
  },
  daysMessageWarning: {
    color: '#F59E0B',
    backgroundColor: '#FEF3C7',
  },
  daysMessageCritical: {
    color: '#DC2626',
    backgroundColor: '#FEE2E2',
  },
  criticalNote: {
    fontSize: 12,
    color: '#DC2626',
    textAlign: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#FEE2E2',
  },
  button: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonOrange: {
    backgroundColor: '#F59E0B',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  previewButtonText: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '500',
  },
});