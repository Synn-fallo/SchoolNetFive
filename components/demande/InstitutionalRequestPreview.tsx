import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Building2, Landmark, Handshake, CheckCircle } from 'lucide-react-native';
import { InstitutionalRole } from '@/hooks/useInstitutionalRequest';
import theme from '@/constants/theme';

interface InstitutionalRequestPreviewProps {
  role: InstitutionalRole;
  formData: any;
  userName: string;
  userEmail: string;
  userPhone?: string;
  justificatifName?: string;
}

export default function InstitutionalRequestPreview({
  role,
  formData,
  userName,
  userEmail,
  userPhone,
  justificatifName,
}: InstitutionalRequestPreviewProps) {
  const getRoleIcon = () => {
    switch (role) {
      case 'chef_etablissement':
        return { icon: Building2, color: '#3B82F6', label: 'Chef d\'établissement' };
      case 'autorite':
        return { icon: Landmark, color: '#8B5CF6', label: 'Autorité' };
      case 'partenaire':
        return { icon: Handshake, color: '#10B981', label: 'Partenaire' };
    }
  };

  const roleConfig = getRoleIcon();
  const Icon = roleConfig.icon;
  const today = new Date();
  const formattedDate = today.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.previewHeader}>
        <View style={styles.previewBadge}>
          <CheckCircle size={20} color={theme.colors.success.DEFAULT} />
          <Text style={styles.previewBadgeText}>Prévisualisation de votre demande</Text>
        </View>
        <Text style={styles.previewSubtitle}>
          Vérifiez attentivement les informations avant de confirmer l'envoi.
        </Text>
      </View>

      {/* Lettre officielle */}
      <View style={styles.letterContainer}>
        {/* En-tête */}
        <View style={styles.letterHeader}>
          <View style={styles.letterHeaderTop}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>SchoolNet</Text>
            </View>
            <Text style={styles.letterDate}>Le {formattedDate}</Text>
          </View>
          
          <View style={styles.letterRecipient}>
            <Text style={styles.recipientTitle}>À l'attention de l'équipe administrative</Text>
            <Text style={styles.recipientSubtitle}>Plateforme SchoolNet</Text>
            <Text style={styles.recipientSubtitle}>Service des demandes institutionnelles</Text>
          </View>
        </View>

        {/* Objet */}
        <View style={styles.letterSubject}>
          <Text style={styles.subjectLabel}>Objet :</Text>
          <Text style={styles.subjectText}>Demande d'attribution du rôle {roleConfig.label}</Text>
        </View>

        {/* Corps de la lettre */}
        <View style={styles.letterBody}>
          <Text style={styles.bodyText}>
            Je soussigné(e), <Text style={styles.bodyBold}>{userName}</Text>,
          </Text>
          <Text style={styles.bodyText}>
            demeurant à l'adresse email <Text style={styles.bodyBold}>{userEmail}</Text>
            {userPhone && <Text>, téléphone : <Text style={styles.bodyBold}>{userPhone}</Text></Text>},
          </Text>
          <Text style={styles.bodyText}>
            ai l'honneur de solliciter auprès de votre institution l'attribution du rôle 
            <Text style={styles.bodyBold}> {roleConfig.label}</Text> sur la plateforme SchoolNet.
          </Text>

          <Text style={styles.bodySubtitle}>📌 Informations fournies :</Text>
          
          {role === 'chef_etablissement' && (
            <View style={styles.infoList}>
              <Text style={styles.infoItem}>• Nom de l'établissement : <Text style={styles.infoValue}>{formData.nom_etablissement}</Text></Text>
              <Text style={styles.infoItem}>• Ville : <Text style={styles.infoValue}>{formData.ville}</Text></Text>
              <Text style={styles.infoItem}>• Adresse : <Text style={styles.infoValue}>{formData.adresse}</Text></Text>
              <Text style={styles.infoItem}>• Téléphone : <Text style={styles.infoValue}>{formData.telephone_etablissement}</Text></Text>
              <Text style={styles.infoItem}>• Statut juridique : <Text style={styles.infoValue}>{formData.statut_juridique}</Text></Text>
            </View>
          )}

          {role === 'autorite' && (
            <View style={styles.infoList}>
              <Text style={styles.infoItem}>• Institution : <Text style={styles.infoValue}>{formData.institution_nom}</Text></Text>
              <Text style={styles.infoItem}>• Fonction : <Text style={styles.infoValue}>{formData.fonction}</Text></Text>
            </View>
          )}

          {role === 'partenaire' && (
            <View style={styles.infoList}>
              <Text style={styles.infoItem}>• Organisation : <Text style={styles.infoValue}>{formData.organisation_nom}</Text></Text>
              <Text style={styles.infoItem}>• Secteur d'activité : <Text style={styles.infoValue}>{formData.secteur}</Text></Text>
            </View>
          )}

          {formData.message && (
            <>
              <Text style={styles.bodySubtitle}>📌 Message complémentaire :</Text>
              <Text style={styles.messageText}>"{formData.message}"</Text>
            </>
          )}

          <Text style={styles.bodySubtitle}>📌 Pièces justificatives jointes :</Text>
          {justificatifName ? (
            <Text style={styles.justificatifText}>• {justificatifName}</Text>
          ) : (
            <Text style={styles.justificatifMissing}>Aucun justificatif joint</Text>
          )}

          <Text style={styles.certificationText}>
            Je certifie sur l'honneur l'exactitude des informations fournies et je m'engage à respecter 
            les conditions générales d'utilisation de la plateforme SchoolNet.
          </Text>

          <View style={styles.signatureBlock}>
            <Text style={styles.signatureText}>Fait à {formData.ville || '[...]'}, le {formattedDate}</Text>
            <Text style={styles.signatureName}>{userName}</Text>
          </View>
        </View>

        {/* Pied de lettre */}
        <View style={styles.letterFooter}>
          <Text style={styles.footerText}>
            Une copie de cette demande vous sera adressée par email. 
            Vous serez notifié de l'avancement de votre dossier.
          </Text>
        </View>
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
    padding: 16,
    paddingBottom: 32,
  },
  previewHeader: {
    marginBottom: 20,
    alignItems: 'center',
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 8,
  },
  previewBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.success.DEFAULT,
  },
  previewSubtitle: {
    fontSize: 13,
    color: theme.colors.neutral[500],
    textAlign: 'center',
  },
  letterContainer: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    overflow: 'hidden',
    ...theme.shadows.md,
  },
  letterHeader: {
    backgroundColor: '#F9FAFB',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
  },
  letterHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  logoContainer: {
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  logoText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  letterDate: {
    fontSize: 12,
    color: theme.colors.neutral[500],
  },
  letterRecipient: {
    marginBottom: 16,
  },
  recipientTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.neutral[700],
    marginBottom: 4,
  },
  recipientSubtitle: {
    fontSize: 12,
    color: theme.colors.neutral[500],
  },
  letterSubject: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFBEB',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
    flexDirection: 'row',
    gap: 8,
  },
  subjectLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.neutral[700],
  },
  subjectText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.neutral[800],
    flex: 1,
  },
  letterBody: {
    padding: 20,
  },
  bodyText: {
    fontSize: 13,
    color: theme.colors.neutral[700],
    lineHeight: 22,
    marginBottom: 8,
  },
  bodyBold: {
    fontWeight: '600',
    color: theme.colors.neutral[900],
  },
  bodySubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.neutral[800],
    marginTop: 16,
    marginBottom: 8,
  },
  infoList: {
    marginLeft: 8,
    marginBottom: 8,
  },
  infoItem: {
    fontSize: 12,
    color: theme.colors.neutral[600],
    lineHeight: 20,
  },
  infoValue: {
    fontWeight: '500',
    color: theme.colors.neutral[800],
  },
  messageText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: theme.colors.neutral[600],
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  justificatifText: {
    fontSize: 12,
    color: theme.colors.success.DEFAULT,
    marginBottom: 8,
  },
  justificatifMissing: {
    fontSize: 12,
    color: theme.colors.danger.DEFAULT,
    marginBottom: 8,
  },
  certificationText: {
    fontSize: 11,
    color: theme.colors.neutral[500],
    fontStyle: 'italic',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
  },
  signatureBlock: {
    marginTop: 24,
    alignItems: 'flex-end',
  },
  signatureText: {
    fontSize: 12,
    color: theme.colors.neutral[600],
    marginBottom: 8,
  },
  signatureName: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.neutral[800],
  },
  letterFooter: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
  },
  footerText: {
    fontSize: 11,
    color: theme.colors.neutral[500],
    textAlign: 'center',
  },
});