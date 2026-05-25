// /home/project/components/parametres/OngletNotifications.tsx
// Version refactorée avec sections accordéon

import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useState } from 'react';
import { Bell, Mail, AlertCircle, Smartphone, Settings } from 'lucide-react-native';
import CollapsibleSection from './CollapsibleSection';
import theme from '@/constants/theme';

interface OngletNotificationsProps {
  etablissementId: string;
}

export default function OngletNotifications({ etablissementId }: OngletNotificationsProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('alertes_notes');

  // Gestion de l'accordéon
  const handleExpandChange = (sectionId: string, expanded: boolean) => {
    if (expanded) {
      setExpandedSection(sectionId);
    } else if (expandedSection === sectionId) {
      setExpandedSection(null);
    }
  };

  // Section 1 – Alertes notes
  const renderAlertesNotesSection = () => (
    <CollapsibleSection
      title="Alertes notes"
      icon={<Bell size={20} color={theme.colors.primary.DEFAULT} />}
      expanded={expandedSection === 'alertes_notes'}
      onExpandChange={(expanded) => handleExpandChange('alertes_notes', expanded)}
    >
      <View style={styles.cardContent}>
        <Text style={styles.cardDescription}>
          • Alerter les parents lors de la saisie d'une note basse (moins de 10/20)
          {'\n'}• Notifier les enseignants des notes manquantes
          {'\n'}• Rapports périodiques des performances
          {'\n'}• Seuils personnalisables par matière
        </Text>
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>À venir</Text>
        </View>
      </View>
    </CollapsibleSection>
  );

  // Section 2 – Communications
  const renderCommunicationsSection = () => (
    <CollapsibleSection
      title="Communications"
      icon={<Mail size={20} color={theme.colors.primary.DEFAULT} />}
      expanded={expandedSection === 'communications'}
      onExpandChange={(expanded) => handleExpandChange('communications', expanded)}
    >
      <View style={styles.cardContent}>
        <Text style={styles.cardDescription}>
          • Envoi automatique des bulletins par email
          {'\n'}• Notifications des événements scolaires
          {'\n'}• Rappels de réunions parents-professeurs
          {'\n'}• Templates d'emails personnalisables
        </Text>
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>À venir</Text>
        </View>
      </View>
    </CollapsibleSection>
  );

  // Section 3 – Notifications push
  const renderNotificationsPushSection = () => (
    <CollapsibleSection
      title="Notifications push"
      icon={<Smartphone size={20} color={theme.colors.primary.DEFAULT} />}
      expanded={expandedSection === 'notifications_push'}
      onExpandChange={(expanded) => handleExpandChange('notifications_push', expanded)}
    >
      <View style={styles.cardContent}>
        <Text style={styles.cardDescription}>
          • Activation/désactivation des notifications push
          {'\n'}• Personnalisation des types de notifications
          {'\n'}• Gestion des canaux de notification
          {'\n'}• Notifications silencieuses / avec son
        </Text>
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>À venir</Text>
        </View>
      </View>
    </CollapsibleSection>
  );

  // Section 4 – Alertes système
  const renderAlertesSystemeSection = () => (
    <CollapsibleSection
      title="Alertes système"
      icon={<AlertCircle size={20} color={theme.colors.primary.DEFAULT} />}
      expanded={expandedSection === 'alertes_systeme'}
      onExpandChange={(expanded) => handleExpandChange('alertes_systeme', expanded)}
    >
      <View style={styles.cardContent}>
        <Text style={styles.cardDescription}>
          • Alertes de sauvegarde des données
          {'\n'}• Notifications des mises à jour
          {'\n'}• Rapports d'erreurs et d'incidents
          {'\n'}• Journaux d'activité système
        </Text>
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>À venir</Text>
        </View>
      </View>
    </CollapsibleSection>
  );

  // Section 5 – Paramètres généraux
  const renderParametresSection = () => (
    <CollapsibleSection
      title="Paramètres généraux"
      icon={<Settings size={20} color={theme.colors.primary.DEFAULT} />}
      expanded={expandedSection === 'parametres'}
      onExpandChange={(expanded) => handleExpandChange('parametres', expanded)}
    >
      <View style={styles.cardContent}>
        <Text style={styles.cardDescription}>
          • Activer/désactiver toutes les notifications
          {'\n'}• Plages horaires de silence
          {'\n'}• Email de notification par défaut
          {'\n'}• Fréquence des rapports
        </Text>
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>À venir</Text>
        </View>
      </View>
    </CollapsibleSection>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Bandeau d'information */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerText}>
          ⚙️ Configuration des notifications
        </Text>
        <Text style={styles.infoBannerSubtext}>
          Gérez les alertes, communications et notifications système
        </Text>
      </View>

      {renderAlertesNotesSection()}
      {renderCommunicationsSection()}
      {renderNotificationsPushSection()}
      {renderAlertesSystemeSection()}
      {renderParametresSection()}

      {/* Note */}
      <View style={styles.noteBox}>
        <Text style={styles.noteText}>
          💡 Ces fonctionnalités seront déployées dans les prochaines semaines.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
  },
  infoBanner: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  infoBannerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 4,
  },
  infoBannerSubtext: {
    fontSize: 12,
    color: '#1E40AF',
  },
  cardContent: {
    paddingVertical: 8,
  },
  cardDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  comingSoonBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  comingSoonText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  noteBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    marginBottom: 32,
  },
  noteText: {
    fontSize: 12,
    color: '#92400E',
    textAlign: 'center',
  },
});
