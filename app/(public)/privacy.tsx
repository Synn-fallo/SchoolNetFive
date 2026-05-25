import { View, Text, StyleSheet, ScrollView } from 'react-native';
import theme from '@/constants/theme';

export default function PrivacyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Politique de confidentialité</Text>
      <Text style={styles.date}>Dernière mise à jour : 28 mars 2026</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Collecte des données</Text>
        <Text style={styles.text}>
          SchoolNet collecte les informations suivantes :{'\n\n'}
          • Nom, prénom, email, téléphone{'\n'}
          • Données scolaires (notes, classes, inscriptions){'\n'}
          • Données d'utilisation (connexions, interactions)
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Utilisation des données</Text>
        <Text style={styles.text}>
          Vos données sont utilisées pour :{'\n\n'}
          • Gérer votre compte utilisateur{'\n'}
          • Assurer le bon fonctionnement de la plateforme{'\n'}
          • Communiquer avec vous (notifications, messages){'\n'}
          • Améliorer nos services
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Partage des données</Text>
        <Text style={styles.text}>
          SchoolNet ne vend pas vos données personnelles. Vos données sont partagées uniquement avec les établissements scolaires auxquels vous êtes rattaché et les services techniques nécessaires au fonctionnement de la plateforme.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. Droit des utilisateurs</Text>
        <Text style={styles.text}>
          Conformément à la réglementation applicable, vous disposez des droits suivants :{'\n\n'}
          • Droit d'accès à vos données{'\n'}
          • Droit de rectification{'\n'}
          • Droit à l'effacement (droit à l'oubli){'\n'}
          • Droit à la limitation du traitement{'\n'}
          • Droit à la portabilité des données{'\n\n'}
          Pour exercer ces droits, contactez-nous à privacy@schoolnet.bj.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. Sécurité</Text>
        <Text style={styles.text}>
          SchoolNet met en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données contre tout accès non autorisé, perte ou altération.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>6. Contact</Text>
        <Text style={styles.text}>
          Pour toute question relative à cette politique, vous pouvez nous contacter à :{'\n\n'}
          📧 privacy@schoolnet.bj{'\n'}
          📞 +229 99 00 00 00
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  content: {
    padding: 24,
    paddingBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.neutral[800],
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: theme.colors.neutral[500],
    marginBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.neutral[800],
    marginBottom: 12,
  },
  text: {
    fontSize: 14,
    color: theme.colors.neutral[600],
    lineHeight: 22,
  },
});