import { View, Text, StyleSheet, ScrollView } from 'react-native';
import theme from '@/constants/theme';

export default function LegalScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Mentions légales</Text>
      <Text style={styles.date}>Dernière mise à jour : 28 mars 2026</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>1. Éditeur du site</Text>
        <Text style={styles.text}>
          SchoolNet est une plateforme éducative éditée par :{'\n\n'}
          SchoolNet SAS{'\n'}
          Cotonou, Bénin{'\n'}
          Email : contact@schoolnet.bj{'\n'}
          Téléphone : +229 99 00 00 00{'\n\n'}
          Directeur de publication : Modeste GANDO
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>2. Hébergement</Text>
        <Text style={styles.text}>
          Le site SchoolNet est hébergé par :{'\n\n'}
          Supabase Inc.{'\n'}
          San Francisco, CA, États-Unis{'\n\n'}
          Plateforme : Supabase Cloud
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>3. Propriété intellectuelle</Text>
        <Text style={styles.text}>
          L'ensemble des éléments composant le site SchoolNet (textes, logos, icônes, base de données, etc.) sont la propriété exclusive de SchoolNet SAS et sont protégés par le droit d'auteur.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>4. Protection des données personnelles</Text>
        <Text style={styles.text}>
          SchoolNet s'engage à protéger les données personnelles de ses utilisateurs conformément à la législation en vigueur. Pour plus d'informations, consultez notre{' '}
          <Text style={styles.link} onPress={() => {}}>Politique de confidentialité</Text>.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>5. Contact</Text>
        <Text style={styles.text}>
          Pour toute question relative aux présentes mentions légales, vous pouvez nous contacter à :{'\n\n'}
          📧 contact@schoolnet.bj{'\n'}
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
  link: {
    color: theme.colors.primary.DEFAULT,
    textDecorationLine: 'underline',
  },
});