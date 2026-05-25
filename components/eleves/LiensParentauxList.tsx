import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { User, Mail, Phone, X, Star, Edit2, MessageCircle } from 'lucide-react-native';
import { Card } from '@/components/Card';
import theme from '@/constants/theme';

export interface LienParental {
  id: string;
  parent_id: string;
  parent_nom: string;
  parent_prenom: string;
  parent_email: string;
  parent_telephone?: string;
  lien_parente: string;
  est_principal: boolean;
}

interface LiensParentauxListProps {
  liens?: LienParental[];  // ← Rendre optionnel
  onRemove?: (lienId: string, parentId: string) => void;
  onSetPrincipal?: (lienId: string, parentId: string) => void;
  onEdit?: (parentId: string) => void;
  onContact?: (parentId: string, email: string) => void;
  canEdit?: boolean;
}

export default function LiensParentauxList({
  liens = [],  // ← Valeur par défaut : tableau vide
  onRemove,
  onSetPrincipal,
  onEdit,
  onContact,
  canEdit = false,
}: LiensParentauxListProps) {
  const getLienLabel = (lien: string) => {
    switch (lien) {
      case 'pere': return 'Père';
      case 'mere': return 'Mère';
      case 'tuteur': return 'Tuteur';
      default: return 'Autre';
    }
  };

  const getLienIcon = (lien: string) => {
    switch (lien) {
      case 'pere': return '👨';
      case 'mere': return '👩';
      case 'tuteur': return '👨‍🏫';
      default: return '👤';
    }
  };

  const formatTelephone = (tel?: string): string => {
    if (!tel) return '';
    const cleaned = tel.replace(/\D/g, '');
    if (cleaned.length !== 10) return tel;
    return `${cleaned.slice(0,2)} ${cleaned.slice(2,4)} ${cleaned.slice(4,6)} ${cleaned.slice(6,8)} ${cleaned.slice(8,10)}`;
  };

  const handleRemove = (lien: LienParental) => {
    Alert.alert(
      'Retirer le parent',
      `Êtes-vous sûr de vouloir retirer ${lien.parent_prenom} ${lien.parent_nom} de la liste des parents de cet élève ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: () => onRemove && onRemove(lien.id, lien.parent_id),
        },
      ]
    );
  };

  const handleSetPrincipal = (lien: LienParental) => {
    Alert.alert(
      'Parent principal',
      `Définir ${lien.parent_prenom} ${lien.parent_nom} comme parent principal ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: () => onSetPrincipal && onSetPrincipal(lien.id, lien.parent_id),
        },
      ]
    );
  };

  const handleEdit = (lien: LienParental) => {
    if (onEdit) {
      onEdit(lien.parent_id);
    }
  };

  const handleContact = (lien: LienParental) => {
    if (onContact && lien.parent_email) {
      onContact(lien.parent_id, lien.parent_email);
    } else if (lien.parent_email) {
      Alert.alert('Contacter', `Envoyer un message à ${lien.parent_prenom} ${lien.parent_nom} (${lien.parent_email})`);
    } else {
      Alert.alert('Information', 'Ce parent n\'a pas d\'email renseigné');
    }
  };

  // ✅ Vérification de sécurité avant d'utiliser liens.length
  if (!liens || liens.length === 0) {
    return (
      <Card style={styles.emptyCard}>
        <Text style={styles.emptyText}>Aucun parent lié</Text>
        <Text style={styles.emptySubtext}>
          Ajoutez un parent pour permettre le suivi scolaire
        </Text>
      </Card>
    );
  }

  return (
    <View style={styles.container}>
      {liens.map((lien) => (
        <Card key={lien.id} style={styles.parentCard}>
          <View style={styles.parentHeader}>
            <View style={styles.parentInfo}>
              <Text style={styles.parentIcon}>{getLienIcon(lien.lien_parente)}</Text>
              <View>
                <Text style={styles.parentName}>
                  {lien.parent_prenom} {lien.parent_nom}
                </Text>
                <Text style={styles.parentLien}>{getLienLabel(lien.lien_parente)}</Text>
              </View>
              {lien.est_principal && (
                <View style={styles.principalBadge}>
                  <Star size={10} color="#D97706" />
                  <Text style={styles.principalText}>Principal</Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.parentDetails}>
            <View style={styles.detailRow}>
              <Mail size={14} color={theme.colors.neutral[500]} />
              <Text style={styles.detailText}>{lien.parent_email}</Text>
            </View>
            {lien.parent_telephone && (
              <View style={styles.detailRow}>
                <Phone size={14} color={theme.colors.neutral[500]} />
                <Text style={styles.detailText}>{formatTelephone(lien.parent_telephone)}</Text>
              </View>
            )}
          </View>
          
          {canEdit && (
            <View style={styles.actions}>
              {!lien.est_principal && onSetPrincipal && (
                <TouchableOpacity
                  style={styles.principalButton}
                  onPress={() => handleSetPrincipal(lien)}
                >
                  <Star size={14} color={theme.colors.primary.DEFAULT} />
                  <Text style={styles.principalButtonText}>Principal</Text>
                </TouchableOpacity>
              )}
              {onEdit && (
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEdit(lien)}
                >
                  <Edit2 size={14} color={theme.colors.neutral[600]} />
                  <Text style={styles.editButtonText}>Modifier</Text>
                </TouchableOpacity>
              )}
              {onContact && lien.parent_email && (
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() => handleContact(lien)}
                >
                  <MessageCircle size={14} color={theme.colors.secondary.DEFAULT} />
                  <Text style={styles.contactButtonText}>Contacter</Text>
                </TouchableOpacity>
              )}
              {onRemove && (
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemove(lien)}
                >
                  <X size={14} color="#EF4444" />
                  <Text style={styles.removeText}>Retirer</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  parentCard: {
    padding: 16,
  },
  parentHeader: {
    marginBottom: 12,
  },
  parentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  parentIcon: {
    fontSize: 28,
  },
  parentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  parentLien: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  principalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  principalText: {
    fontSize: 10,
    color: '#D97706',
    fontWeight: '500',
  },
  parentDetails: {
    marginLeft: 40,
    gap: 4,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: '#6B7280',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  principalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
  },
  principalButtonText: {
    fontSize: 11,
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  editButtonText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
  },
  contactButtonText: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '500',
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
  },
  removeText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '500',
  },
});