import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card } from '@/components/Card';
import { Mail, Phone, BookOpen, Users, ChevronRight, UserCheck } from 'lucide-react-native';

interface EnseignantCardProps {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  classes?: Array<{ id: string; nom: string; role?: string }>;
  matieres?: Array<{ id: string; nom: string }>;
  isActive?: boolean;
  onPress?: () => void;
  onEdit?: () => void;
}

export default function EnseignantCard({
  nom,
  prenom,
  email,
  telephone,
  classes = [],
  matieres = [],
  isActive = true,
  onPress,
  onEdit,
}: EnseignantCardProps) {
  const classesCount = classes.length;
  const matieresCount = matieres.length;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={[styles.card, !isActive && styles.inactiveCard]}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{prenom[0]}{nom[0]}</Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{prenom} {nom}</Text>
            {!isActive && (
              <View style={styles.inactiveBadge}>
                <UserCheck size={10} color="#EF4444" />
                <Text style={styles.inactiveText}>Inactif</Text>
              </View>
            )}
          </View>
          {onEdit && (
            <TouchableOpacity style={styles.editButton} onPress={onEdit}>
              <Text style={styles.editButtonText}>Modifier</Text>
              <ChevronRight size={16} color="#3B82F6" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.contactInfo}>
          <View style={styles.contactRow}>
            <Mail size={14} color="#9CA3AF" />
            <Text style={styles.contactText}>{email}</Text>
          </View>
          {telephone && (
            <View style={styles.contactRow}>
              <Phone size={14} color="#9CA3AF" />
              <Text style={styles.contactText}>{telephone}</Text>
            </View>
          )}
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Users size={16} color="#3B82F6" />
            <Text style={styles.statNumber}>{classesCount}</Text>
            <Text style={styles.statLabel}>Classe(s)</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <BookOpen size={16} color="#10B981" />
            <Text style={styles.statNumber}>{matieresCount}</Text>
            <Text style={styles.statLabel}>Matière(s)</Text>
          </View>
        </View>

        {classes.length > 0 && (
          <View style={styles.classesPreview}>
            <Text style={styles.previewLabel}>Classes:</Text>
            <Text style={styles.previewText}>
              {classes.slice(0, 2).map(c => c.nom).join(', ')}
              {classes.length > 2 && ` +${classes.length - 2}`}
            </Text>
          </View>
        )}

        {matieres.length > 0 && (
          <View style={styles.matieresPreview}>
            <Text style={styles.previewLabel}>Matières:</Text>
            <Text style={styles.previewText}>
              {matieres.slice(0, 3).map(m => m.nom).join(', ')}
              {matieres.length > 3 && ` +${matieres.length - 3}`}
            </Text>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 12,
  },
  inactiveCard: {
    opacity: 0.7,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  inactiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  inactiveText: {
    fontSize: 10,
    color: '#EF4444',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editButtonText: {
    fontSize: 12,
    color: '#3B82F6',
  },
  contactInfo: {
    marginBottom: 12,
    gap: 4,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactText: {
    fontSize: 12,
    color: '#6B7280',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E5E7EB',
  },
  classesPreview: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  matieresPreview: {
    flexDirection: 'row',
  },
  previewLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    width: 55,
  },
  previewText: {
    fontSize: 11,
    color: '#4B5563',
    flex: 1,
  },
});