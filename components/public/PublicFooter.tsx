import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Link } from 'expo-router';
import { Facebook, Twitter, Linkedin, Mail, Phone, MapPin } from 'lucide-react-native';
import theme from '@/constants/theme';

export default function PublicFooter() {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { icon: Facebook, url: 'https://facebook.com/schoolnet', label: 'Facebook' },
    { icon: Twitter, url: 'https://twitter.com/schoolnet', label: 'Twitter' },
    { icon: Linkedin, url: 'https://linkedin.com/company/schoolnet', label: 'LinkedIn' },
  ];

  const quickLinks = [
    { name: 'Annuaire', href: '/(public)/etablissements' },
    { name: 'À propos', href: '/(public)/a-propos' },
    { name: 'Comment ça marche', href: '/(public)/comment-ca-marche' },
    { name: 'Mentions légales', href: '/(public)/legal' },
    { name: 'Confidentialité', href: '/(public)/privacy' },
  ];

  return (
    <View style={styles.footer}>
      <View style={styles.container}>
        {/* Colonne 1: Logo & Description */}
        <View style={styles.section}>
          <Text style={styles.logo}>SchoolNet</Text>
          <Text style={styles.description}>
            La plateforme éducative qui connecte tous les acteurs de l'éducation.
          </Text>
        </View>

        {/* Colonne 2: Liens rapides */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Liens rapides</Text>
          <View style={styles.linksGrid}>
            {quickLinks.map((link) => (
              link.href.startsWith('http') ? (
                <TouchableOpacity key={link.name} onPress={() => Linking.openURL(link.href)}>
                  <Text style={styles.link}>{link.name}</Text>
                </TouchableOpacity>
              ) : (
                <Link key={link.name} href={link.href} asChild>
                  <TouchableOpacity>
                    <Text style={styles.link}>{link.name}</Text>
                  </TouchableOpacity>
                </Link>
              )
            ))}
          </View>
        </View>

        {/* Colonne 3: Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <View style={styles.contactItem}>
            <Mail size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.contactText}>contact@schoolnet.bj</Text>
          </View>
          <View style={styles.contactItem}>
            <Phone size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.contactText}>+229 99 00 00 00</Text>
          </View>
          <View style={styles.contactItem}>
            <MapPin size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.contactText}>Cotonou, Bénin</Text>
          </View>
        </View>

        {/* Colonne 4: Réseaux sociaux */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Suivez-nous</Text>
          <View style={styles.socialContainer}>
            {socialLinks.map((social) => (
              <TouchableOpacity
                key={social.label}
                style={styles.socialIcon}
                onPress={() => Linking.openURL(social.url)}
              >
                <social.icon size={20} color={theme.colors.neutral[500]} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Copyright */}
      <View style={styles.copyright}>
        <Text style={styles.copyrightText}>
          © {currentYear} SchoolNet. Tous droits réservés.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    backgroundColor: theme.colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
    paddingTop: 32,
    paddingBottom: 16,
  },
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 24,
    paddingBottom: 24,
    maxWidth: 1280,
    alignSelf: 'center',
    width: '100%',
    gap: 24,
  },
  section: {
    flex: 1,
    minWidth: 160,
  },
  logo: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary.DEFAULT,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: theme.colors.neutral[500],
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.neutral[700],
    marginBottom: 12,
  },
  linksGrid: {
    flexDirection: 'column',
    gap: 8,
  },
  link: {
    fontSize: 14,
    color: theme.colors.neutral[500],
    marginBottom: 4,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  contactText: {
    fontSize: 14,
    color: theme.colors.neutral[500],
  },
  socialContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  socialIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  copyright: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
    paddingVertical: 16,
    alignItems: 'center',
  },
  copyrightText: {
    fontSize: 12,
    color: theme.colors.neutral[400],
  },
});