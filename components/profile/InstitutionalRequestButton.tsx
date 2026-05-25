import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Building2, FileText, ChevronRight, AlertCircle } from 'lucide-react-native';
import theme from '@/constants/theme';

interface InstitutionalRequestButtonProps {
  variant?: 'default' | 'compact';
  onPress?: () => void;
}

export default function InstitutionalRequestButton({ variant = 'default', onPress }: InstitutionalRequestButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/(app)/(sidebar)/demande-institutionnelle');
    }
  };

  if (variant === 'compact') {
    return (
      <TouchableOpacity style={styles.compactButton} onPress={handlePress} activeOpacity={0.7}>
        <View style={styles.compactIconWrapper}>
          <Building2 size={20} color={theme.colors.primary.DEFAULT} />
        </View>
        <View style={styles.compactContent}>
          <Text style={styles.compactTitle}>Demande institutionnelle</Text>
          <Text style={styles.compactSubtitle}>
            Chef d'établissement, Autorité, Partenaire
          </Text>
        </View>
        <ChevronRight size={18} color={theme.colors.neutral[400]} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.button} onPress={handlePress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.iconWrapper}>
          <FileText size={24} color={theme.colors.primary.DEFAULT} />
        </View>
        <Text style={styles.title}>Démarches institutionnelles</Text>
      </View>
      <Text style={styles.description}>
        Vous représentez un établissement, une autorité ou un organisme partenaire ?
        Effectuez une demande officielle.
      </Text>
      <View style={styles.notice}>
        <AlertCircle size={14} color={theme.colors.warning.DEFAULT} />
        <Text style={styles.noticeText}>
          Cette démarche engage votre responsabilité. Un dossier justificatif vous sera demandé.
        </Text>
      </View>
      <TouchableOpacity style={styles.actionButton} onPress={handlePress}>
        <Text style={styles.actionButtonText}>Faire une demande institutionnelle</Text>
        <ChevronRight size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.colors.background.primary,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    ...theme.shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.neutral[800],
  },
  description: {
    fontSize: 14,
    color: theme.colors.neutral[500],
    lineHeight: 20,
    marginBottom: 16,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.warning.DEFAULT,
    lineHeight: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.background.primary,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  compactIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.neutral[800],
    marginBottom: 2,
  },
  compactSubtitle: {
    fontSize: 11,
    color: theme.colors.neutral[500],
  },
});