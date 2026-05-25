import { View, Text, StyleSheet } from 'react-native';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminDemandes } from '@/hooks/useAdminDemandes';
import DemandeList from '@/components/admin/DemandeList';
import DemandeDetailModal from '@/components/admin/DemandeDetailModal';
import { DemandeRole } from '@/hooks/useAdminDemandes';
import theme from '@/constants/theme';

export default function AdminDemandesRoleScreen() {
  const { hasRole } = useAuth();
  const [selectedDemande, setSelectedDemande] = useState<DemandeRole | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const {
    demandes,
    loading,
    error,
    isAdmin,
    statutFilter,
    setStatutFilter,
    roleFilter,
    setRoleFilter,
    fetchDemandes,
    validerDemande,
    rejeterDemande,
  } = useAdminDemandes();

  // Vérifier les droits admin
  if (!isAdmin) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Accès non autorisé</Text>
        <Text style={styles.errorSubtext}>Vous devez être administrateur pour accéder à cette page.</Text>
      </View>
    );
  }

  const handleDemandePress = (demande: DemandeRole) => {
    setSelectedDemande(demande);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedDemande(null);
    fetchDemandes();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestion des demandes</Text>
        <Text style={styles.subtitle}>
          Demandes de rôles institutionnels (Chef d'établissement, Autorité, Partenaire)
        </Text>
      </View>

      <DemandeList
        demandes={demandes}
        loading={loading}
        error={error}
        statutFilter={statutFilter}
        setStatutFilter={setStatutFilter}
        roleFilter={roleFilter}
        setRoleFilter={setRoleFilter}
        onDemandePress={handleDemandePress}
        onRefresh={fetchDemandes}
      />

      <DemandeDetailModal
        visible={modalVisible}
        demande={selectedDemande}
        onClose={handleCloseModal}
        onValidate={validerDemande}
        onReject={rejeterDemande}
      />
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.neutral[800],
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.neutral[500],
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: theme.colors.background.secondary,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.danger.DEFAULT,
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: theme.colors.neutral[500],
    textAlign: 'center',
  },
});