import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import InstitutionalRequestForm from '@/components/demande/InstitutionalRequestForm';
import { Building2, Landmark, Handshake, ArrowLeft } from 'lucide-react-native';
import theme from '@/constants/theme';

type InstitutionalRole = 'chef_etablissement' | 'autorite' | 'partenaire';

export default function DemandeInstitutionnelleScreen() {
  const router = useRouter();
  const { role } = useLocalSearchParams<{ role: InstitutionalRole }>();
  const [selectedRole, setSelectedRole] = useState<InstitutionalRole | null>(role || null);

  const roles = [
    { id: 'chef_etablissement', label: 'Chef d\'établissement', icon: Building2, color: '#3B82F6', description: 'Créer et gérer un établissement scolaire' },
    { id: 'autorite', label: 'Autorité', icon: Landmark, color: '#8B5CF6', description: 'Représenter une institution publique' },
    { id: 'partenaire', label: 'Partenaire', icon: Handshake, color: '#10B981', description: 'Devenir partenaire de SchoolNet' },
  ];

  // Si un rôle est déjà sélectionné (via paramètre URL), afficher le formulaire directement
  if (selectedRole) {
    return <InstitutionalRequestForm role={selectedRole} />;
  }

  // Sinon, afficher la sélection du rôle
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.neutral[600]} />
        </TouchableOpacity>
        <Text style={styles.title}>Demande institutionnelle</Text>
        <Text style={styles.subtitle}>
          Choisissez le statut pour lequel vous souhaitez faire une demande
        </Text>
      </View>

      <View style={styles.rolesContainer}>
        {roles.map((roleItem) => (
          <TouchableOpacity
            key={roleItem.id}
            style={styles.roleCard}
            onPress={() => setSelectedRole(roleItem.id as InstitutionalRole)}
            activeOpacity={0.7}
          >
            <View style={[styles.roleIcon, { backgroundColor: `${roleItem.color}15` }]}>
              <roleItem.icon size={28} color={roleItem.color} />
            </View>
            <View style={styles.roleContent}>
              <Text style={styles.roleLabel}>{roleItem.label}</Text>
              <Text style={styles.roleDescription}>{roleItem.description}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeTitle}>📌 Important</Text>
        <Text style={styles.noticeText}>
          Cette démarche engage votre responsabilité. Un dossier justificatif vous sera demandé.
          Toute fausse déclaration expose son auteur aux poursuites prévues par la loi.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.secondary,
  },
  header: {
    backgroundColor: theme.colors.background.primary,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  backButton: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.neutral[800],
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.neutral[500],
    lineHeight: 20,
  },
  rolesContainer: {
    padding: 16,
    gap: 12,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background.primary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    gap: 16,
    ...theme.shadows.sm,
  },
  roleIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleContent: {
    flex: 1,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.neutral[800],
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 12,
    color: theme.colors.neutral[500],
  },
  notice: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D97706',
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
});