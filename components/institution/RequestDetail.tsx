import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import RequestStatus, { RequestStatusType } from './RequestStatus';
import { Mail, Phone, MapPin, Globe, Building2, User, Calendar, FileText } from 'lucide-react-native';

interface RequestDetailProps {
  request: any;
  type: 'etablissement' | 'partenariat';
  onCancel?: (id: string) => Promise<void>;
  onBack: () => void;
}

export default function RequestDetail({ request, type, onCancel, onBack }: RequestDetailProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleCancel = () => {
    Alert.alert(
      'Annuler la demande',
      'Êtes-vous sûr de vouloir annuler cette demande ? Cette action est irréversible.',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler',
          style: 'destructive',
          onPress: async () => {
            if (onCancel) {
              await onCancel(request.id);
            }
          },
        },
      ]
    );
  };

  const handleEmailPress = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  const handlePhonePress = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const isCancelable = request.statut === 'en_attente';

  if (type === 'etablissement') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <Building2 size={32} color="#3B82F6" />
            <Text style={styles.title}>Demande d'établissement</Text>
          </View>
          <RequestStatus status={request.statut} />
        </View>

        {/* Informations */}
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Informations générales</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Nom:</Text>
            <Text style={styles.value}>{request.nom_etablissement}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Type:</Text>
            <Text style={styles.value}>
              {request.type_etablissement === 'public' ? 'Public' : 'Privé'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Adresse:</Text>
            <Text style={styles.value}>{request.adresse}, {request.ville}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Téléphone:</Text>
            <TouchableOpacity onPress={() => handlePhonePress(request.telephone)}>
              <Text style={[styles.value, styles.link]}>{request.telephone}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Email:</Text>
            <TouchableOpacity onPress={() => handleEmailPress(request.email_contact)}>
              <Text style={[styles.value, styles.link]}>{request.email_contact}</Text>
            </TouchableOpacity>
          </View>
          {request.site_web && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Site web:</Text>
              <Text style={styles.value}>{request.site_web}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.label}>Plan souhaité:</Text>
            <Text style={styles.value}>{request.plan_souhaite}</Text>
          </View>
        </Card>

        {/* Message */}
        {request.message_demandeur && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Message</Text>
            <Text style={styles.message}>{request.message_demandeur}</Text>
          </Card>
        )}

        {/* Traitement */}
        {request.traitee_at && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Traitement</Text>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Date de traitement:</Text>
              <Text style={styles.value}>{formatDate(request.traitee_at)}</Text>
            </View>
            {request.commentaire_admin && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Commentaire:</Text>
                <Text style={styles.value}>{request.commentaire_admin}</Text>
              </View>
            )}
          </Card>
        )}

        {/* Boutons */}
        <View style={styles.buttonContainer}>
          <Button title="Retour" onPress={onBack} variant="secondary" fullWidth={false} />
          {isCancelable && (
            <Button title="Annuler la demande" onPress={handleCancel} variant="danger" fullWidth={false} />
          )}
        </View>
      </ScrollView>
    );
  }

  // Partenariat view
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Building2 size={32} color="#3B82F6" />
          <Text style={styles.title}>Demande de partenariat</Text>
        </View>
        <RequestStatus status={request.statut} />
      </View>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Organisation</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Nom:</Text>
          <Text style={styles.value}>{request.organisation_nom}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Type:</Text>
          <Text style={styles.value}>{request.type_partenaire}</Text>
        </View>
        {request.organisation_site && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Site web:</Text>
            <Text style={styles.value}>{request.organisation_site}</Text>
          </View>
        )}
        {request.organisation_siege && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Siège:</Text>
            <Text style={styles.value}>{request.organisation_siege}</Text>
          </View>
        )}
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Contact</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Nom:</Text>
          <Text style={styles.value}>{request.contact_nom}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Email:</Text>
          <TouchableOpacity onPress={() => handleEmailPress(request.contact_email)}>
            <Text style={[styles.value, styles.link]}>{request.contact_email}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Téléphone:</Text>
          <TouchableOpacity onPress={() => handlePhonePress(request.contact_telephone)}>
            <Text style={[styles.value, styles.link]}>{request.contact_telephone}</Text>
          </TouchableOpacity>
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Proposition</Text>
        <Text style={styles.sectionSubtitle}>Type de collaboration: {request.type_collaboration}</Text>
        <Text style={styles.message}>{request.proposition}</Text>
        {request.montant_propose && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>Montant proposé:</Text>
            <Text style={styles.value}>{Number(request.montant_propose).toLocaleString()} FCFA</Text>
          </View>
        )}
      </Card>

      {request.notes_internes && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Notes internes</Text>
          <Text style={styles.message}>{request.notes_internes}</Text>
        </Card>
      )}

      <View style={styles.buttonContainer}>
        <Button title="Retour" onPress={onBack} variant="secondary" fullWidth={false} />
        {isCancelable && (
          <Button title="Annuler la demande" onPress={handleCancel} variant="danger" fullWidth={false} />
        )}
      </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  link: {
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
  message: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 24,
  },
});