// /home/project/components/parametres/OngletSecurite.tsx
// Version refactorée avec sections accordéon

import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useState } from 'react';
import { Shield, Lock, Key, UserCheck, History, Fingerprint, Settings } from 'lucide-react-native';
import CollapsibleSection from './CollapsibleSection';
import theme from '@/constants/theme';

interface OngletSecuriteProps {
  etablissementId: string;
}

export default function OngletSecurite({ etablissementId }: OngletSecuriteProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('gestion_acces');

  // Gestion de l'accordéon
  const handleExpandChange = (sectionId: string, expanded: boolean) => {
    if (expanded) {
      setExpandedSection(sectionId);
    } else if (expandedSection === sectionId) {
      setExpandedSection(null);
    }
  };

  // Section 1 – Gestion des accès
  const renderGestionAccesSection = () => (
    <CollapsibleSection
      title="Gestion des accès"
      icon={<Shield size={20} color={theme.colors.primary.DEFAULT} />}
      expanded={expandedSection === 'gestion_acces'}
      onExpandChange={(expanded) => handleExpandChange('gestion_acces', expanded)}
    >
      <View style={styles.cardContent}>
        <Text style={styles.cardDescription}>
          • Définir les rôles et permissions
          {'\n'}• Contrôle d'accès par module
          {'\n'}• Gestion des sessions actives
          {'\n'}• Matrice des droits par profil
        </Text>
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>À venir</Text>
        </View>
      </View>
    </CollapsibleSection>
  );

  // Section 2 – Authentification
  const renderAuthentificationSection = () => (
    <CollapsibleSection
      title="Authentification"
      icon={<Key size={20} color={theme.colors.primary.DEFAULT} />}
      expanded={expandedSection === 'authentification'}
      onExpandChange={(expanded) => handleExpandChange('authentification', expanded)}
    >
      <View style={styles.cardContent}>
        <Text style={styles.cardDescription}>
          • Forcer l'authentification à deux facteurs (2FA)
          {'\n'}• Politique de mots de passe (complexité, expiration)
          {'\n'}• Connexion par code QR / empreinte digitale
          {'\n'}• Reconnexion automatique (session persistante)
        </Text>
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>À venir</Text>
        </View>
      </View>
    </CollapsibleSection>
  );

  // Section 3 – Journal d'audit
  const renderJournalAuditSection = () => (
    <CollapsibleSection
      title="Journal d'audit"
      icon={<History size={20} color={theme.colors.primary.DEFAULT} />}
      expanded={expandedSection === 'journal_audit'}
      onExpandChange={(expanded) => handleExpandChange('journal_audit', expanded)}
    >
      <View style={styles.cardContent}>
        <Text style={styles.cardDescription}>
          • Consulter l'historique des connexions
          {'\n'}• Tracer les modifications sensibles
          {'\n'}• Exporter les logs d'activité
          {'\n'}• Filtrage par date, utilisateur, action
        </Text>
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>À venir</Text>
        </View>
      </View>
    </CollapsibleSection>
  );

  // Section 4 – Sessions utilisateurs
  const renderSessionsSection = () => (
    <CollapsibleSection
      title="Sessions utilisateurs"
      icon={<UserCheck size={20} color={theme.colors.primary.DEFAULT} />}
      expanded={expandedSection === 'sessions'}
      onExpandChange={(expanded) => handleExpandChange('sessions', expanded)}
    >
      <View style={styles.cardContent}>
        <Text style={styles.cardDescription}>
          • Visualiser les sessions actives
          {'\n'}• Révoquer des sessions à distance
          {'\n'}• Définir une durée d'inactivité avant déconnexion
          {'\n'}• Notifications de nouvelle connexion
        </Text>
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>À venir</Text>
        </View>
      </View>
    </CollapsibleSection>
  );

  // Section 5 – Données sensibles
  const renderDonneesSensiblesSection = () => (
    <CollapsibleSection
      title="Données sensibles"
      icon={<Fingerprint size={20} color={theme.colors.primary.DEFAULT} />}
      expanded={expandedSection === 'donnees_sensibles'}
      onExpandChange={(expanded) => handleExpandChange('donnees_sensibles', expanded)}
    >
      <View style={styles.cardContent}>
        <Text style={styles.cardDescription}>
          • Chiffrement des données personnelles
          {'\n'}• Politique de conservation des données
          {'\n'}• Gestion du consentement (RGPD)
          {'\n'}• Droit à l'oubli (suppression des comptes)
        </Text>
        <View style={styles.comingSoonBadge}>
          <Text style={styles.comingSoonText}>À venir</Text>
        </View>
      </View>
    </CollapsibleSection>
  );

  // Section 6 – Politique de sécurité
  const renderPolitiqueSecuriteSection = () => (
    <CollapsibleSection
      title="Politique de sécurité"
      icon={<Settings size={20} color={theme.colors.primary.DEFAULT} />}
      expanded={expandedSection === 'politique_securite'}
      onExpandChange={(expanded) => handleExpandChange('politique_securite', expanded)}
    >
      <View style={styles.cardContent}>
        <Text style={styles.cardDescription}>
          • Définir la politique de mot de passe
          {'\n'}• Verrouillage automatique après tentatives échouées
          {'\n'}• IPs autorisées / restreintes
          {'\n'}• Maintenance et mises à jour planifiées
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
          ⚙️ Configuration de la sécurité
        </Text>
        <Text style={styles.infoBannerSubtext}>
          Gérez les accès, l'authentification et les données sensibles
        </Text>
      </View>

      {renderGestionAccesSection()}
      {renderAuthentificationSection()}
      {renderJournalAuditSection()}
      {renderSessionsSection()}
      {renderDonneesSensiblesSection()}
      {renderPolitiqueSecuriteSection()}

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
