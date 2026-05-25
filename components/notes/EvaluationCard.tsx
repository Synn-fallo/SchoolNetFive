import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card } from '@/components/Card';
import { Edit2, Trash2, FileText, Building2, User, Calendar, BookOpen, Clock, CheckCircle, Lock } from 'lucide-react-native';
import theme from '@/constants/theme';
import { EvaluationType, getEvaluationTypeLabel } from '@/types/notes.types';

type StatutGlobal = 'en_attente' | 'publiee' | 'livree';

interface EvaluationCardProps {
  id: string;
  titre: string;
  type: EvaluationType;
  date: string;
  noteSur: number;
  coefficient: number;
  classeNom: string;
  classeType: 'officielle' | 'personnelle';
  matiereNom: string;
  statutGlobal: StatutGlobal;
  onPressSaisie: () => void;
  onPressModifier: () => void;
  onPressSupprimer: () => void;
  description?: string;
}

const getStatutConfig = (statut: StatutGlobal) => {
  switch (statut) {
    case 'livree':
      return { label: 'Livrée', icon: Lock, color: '#059669', bgColor: '#D1FAE5' };
    case 'publiee':
      return { label: 'Publiée', icon: CheckCircle, color: '#10B981', bgColor: '#D1FAE5' };
    default:
      return { label: 'En attente', icon: Clock, color: '#F59E0B', bgColor: '#FEF3C7' };
  }
};

export default function EvaluationCard({
  id,
  titre,
  type,
  date,
  noteSur,
  coefficient,
  classeNom,
  classeType,
  matiereNom,
  statutGlobal,
  onPressSaisie,
  onPressModifier,
  onPressSupprimer,
  description
}: EvaluationCardProps) {
  const formattedDate = new Date(date).toLocaleDateString('fr-FR');
  const statutConfig = getStatutConfig(statutGlobal);
  const StatutIcon = statutConfig.icon;

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>📝 {titre}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{getEvaluationTypeLabel(type)}</Text>
          </View>
        </View>
        {classeType === 'personnelle' && (
          <View style={styles.personnelBadge}>
            <User size={12} color="#FFFFFF" />
            <Text style={styles.badgeText}>Personnel</Text>
          </View>
        )}
        {classeType === 'officielle' && (
          <View style={styles.officielBadge}>
            <Building2 size={12} color="#FFFFFF" />
            <Text style={styles.badgeText}>Officiel</Text>
          </View>
        )}
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Building2 size={14} color="#6B7280" />
          <Text style={styles.infoText}>{classeNom}</Text>
        </View>
        <View style={styles.infoItem}>
          <BookOpen size={14} color="#6B7280" />
          <Text style={styles.infoText}>{matiereNom}</Text>
        </View>
      </View>

      {description && (
        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>
      )}

      <View style={styles.infoRow}>
        <View style={styles.infoItem}>
          <Calendar size={14} color="#6B7280" />
          <Text style={styles.infoText}>{formattedDate}</Text>
        </View>
        <View style={styles.infoItem}>
          <FileText size={14} color="#6B7280" />
          <Text style={styles.infoText}>Note sur {noteSur} • Coef {coefficient}</Text>
        </View>
      </View>

      {/* Statut global */}
      <View style={[styles.statutContainer, { backgroundColor: statutConfig.bgColor }]}>
        <StatutIcon size={14} color={statutConfig.color} />
        <Text style={[styles.statutText, { color: statutConfig.color }]}>
          {statutConfig.label}
        </Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.saisieButton} onPress={onPressSaisie}>
          <FileText size={14} color="#3B82F6" />
          <Text style={styles.saisieButtonText}>Saisir</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.modifyButton} onPress={onPressModifier}>
          <Edit2 size={14} color="#F59E0B" />
          <Text style={styles.modifyButtonText}>Modifier</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={onPressSupprimer}>
          <Trash2 size={14} color="#EF4444" />
          <Text style={styles.deleteButtonText}>Supprimer</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  typeBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 10,
    color: '#4B5563',
    fontWeight: '500',
  },
  personnelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  officielBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#6B7280',
  },
  statutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 12,
    marginTop: 4,
  },
  statutText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  saisieButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  saisieButtonText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  modifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  modifyButtonText: {
    fontSize: 12,
    color: '#F59E0B',
    fontWeight: '500',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
});