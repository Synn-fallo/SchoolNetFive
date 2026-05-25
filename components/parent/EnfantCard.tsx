import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { User, GraduationCap, Building2, TrendingUp, AlertCircle, ChevronRight, BookOpen, Calendar, FileText } from 'lucide-react-native';
import theme from '@/constants/theme';

interface EnfantCardProps {
  enfant: {
    id: string;
    nom: string;
    prenom: string;
    classe_nom?: string;
    etablissement_nom: string;
    derniere_note?: {
      valeur: number;
      matiere: string;
    };
    moyenne_generale?: number;
    alerte_absences?: number;
  };
  onPress?: (enfantId: string) => void;
}

export default function EnfantCard({ enfant, onPress }: EnfantCardProps) {
  const router = useRouter();

  const getNoteColor = (note: number) => {
    if (note >= 16) return '#10B981';
    if (note >= 13) return '#F59E0B';
    if (note >= 10) return '#F97316';
    return '#EF4444';
  };

  const getNoteIcon = () => {
    if (!enfant.derniere_note) return null;
    const note = enfant.derniere_note.valeur;
    if (note >= 16) return '🏆';
    if (note >= 13) return '👍';
    if (note >= 10) return '📘';
    return '⚠️';
  };

  const handleNavigateTo = (screen: string) => {
    router.push({
      pathname: screen,
      params: { enfantId: enfant.id, enfantNom: `${enfant.prenom} ${enfant.nom}` }
    });
  };

  const handleCardPress = () => {
    if (onPress) {
      onPress(enfant.id);
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handleCardPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <User size={24} color={theme.colors.primary.DEFAULT} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.nom}>{enfant.prenom} {enfant.nom}</Text>
          <View style={styles.metaRow}>
            <GraduationCap size={14} color="#6B7280" />
            <Text style={styles.metaText}>{enfant.classe_nom || 'Classe non définie'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Building2 size={14} color="#6B7280" />
            <Text style={styles.metaText}>{enfant.etablissement_nom}</Text>
          </View>
        </View>
        <ChevronRight size={20} color="#9CA3AF" />
      </View>

      <View style={styles.statsRow}>
        {enfant.derniere_note && (
          <View style={styles.statItem}>
            <View style={[styles.statBadge, { backgroundColor: getNoteColor(enfant.derniere_note.valeur) }]}>
              <Text style={styles.statBadgeText}>{getNoteIcon()}</Text>
            </View>
            <View>
              <Text style={styles.statLabel}>Dernière note</Text>
              <Text style={styles.statValue}>
                {enfant.derniere_note.valeur}/20
              </Text>
              <Text style={styles.statSubLabel}>{enfant.derniere_note.matiere}</Text>
            </View>
          </View>
        )}

        {enfant.moyenne_generale !== undefined && (
          <View style={styles.statItem}>
            <View style={[styles.statBadge, { backgroundColor: '#EFF6FF' }]}>
              <TrendingUp size={20} color={theme.colors.primary.DEFAULT} />
            </View>
            <View>
              <Text style={styles.statLabel}>Moyenne générale</Text>
              <Text style={styles.statValue}>
                {enfant.moyenne_generale.toFixed(1)}/20
              </Text>
            </View>
          </View>
        )}

        {enfant.alerte_absences && enfant.alerte_absences > 0 && (
          <View style={styles.statItem}>
            <View style={[styles.statBadge, { backgroundColor: '#FEF2F2' }]}>
              <AlertCircle size={20} color="#EF4444" />
            </View>
            <View>
              <Text style={styles.statLabel}>Absences non justifiées</Text>
              <Text style={[styles.statValue, styles.alertText]}>
                {enfant.alerte_absences}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Actions : Notes, Absences, Bulletins, EDT */}
      <View style={styles.actionsRow}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => handleNavigateTo('/(app)/parent/notes')}
        >
          <BookOpen size={16} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.actionText}>Notes</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => handleNavigateTo('/(app)/parent/absences')}
        >
          <Calendar size={16} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.actionText}>Absences</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => handleNavigateTo('/(app)/parent/bulletins')}
        >
          <FileText size={16} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.actionText}>Bulletins</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={() => handleNavigateTo('/(app)/parent/emploi-du-temps')}
        >
          <Calendar size={16} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.actionText}>EDT</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  nom: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 120,
  },
  statBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBadgeText: {
    fontSize: 18,
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  statSubLabel: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  alertText: {
    color: '#EF4444',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.primary.DEFAULT,
  },
});