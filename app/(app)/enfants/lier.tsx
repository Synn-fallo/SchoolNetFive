import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import { ArrowLeft, UserPlus } from 'lucide-react-native';
import LierEnfantForm from '@/components/parent/LierEnfantForm';
import theme from '@/constants/theme';

export default function LierEnfantScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [success, setSuccess] = useState(false);
  const [enfantNom, setEnfantNom] = useState('');

  const handleSuccess = (nom: string, prenom: string) => {
    setEnfantNom(`${prenom} ${nom}`);
    setSuccess(true);
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.neutral[600]} />
        </TouchableOpacity>
        <Text style={styles.title}>Lier un enfant</Text>
        <View style={{ width: 40 }} />
      </View>

      {success ? (
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <UserPlus size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.successTitle}>Enfant lié avec succès !</Text>
          <Text style={styles.successText}>
            {enfantNom} est maintenant lié à votre compte parent.
          </Text>
          <Text style={styles.successSubtext}>
            Vous pouvez maintenant suivre ses notes, absences et activités scolaires depuis votre tableau de bord.
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>Retour au tableau de bord</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>📌 Comment lier votre enfant ?</Text>
            <Text style={styles.infoText}>
              L'établissement scolaire de votre enfant vous a fourni un code d'invitation.
            </Text>
            <Text style={styles.infoText}>
              Saisissez ce code ci-dessous avec l'EducMaster de votre enfant pour le lier à votre compte.
            </Text>
          </View>

          <LierEnfantForm onSuccess={handleSuccess} />
        </>
      )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  infoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#1F2937',
    marginBottom: 6,
    lineHeight: 18,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 40,
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
    textAlign: 'center',
  },
  successText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  closeButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  closeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});