import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Building2, MapPin, Phone, Mail, Globe, Calendar, GraduationCap, BookOpen, Award, Edit2 } from 'lucide-react-native';
import theme from '@/constants/theme';

interface EtablissementSummaryProps {
  data: {
    nom: string;
    description_courte?: string;
    description?: string;
    logo_url?: string;
    ville?: string;
    telephone?: string;
    email?: string;
    site_web?: string;
    metadata?: {
      regime?: string;
      corps?: string;
      enseignement?: string;
      cycles?: string[];
      options?: string[];
      taux_reussite?: number;
    };
  };
  onEdit: () => void;
}

const getRegimeLabel = (regime?: string): string => {
  switch (regime) {
    case 'public': return 'Public';
    case 'prive': return 'Privé';
    case 'mixte': return 'Mixte';
    default: return 'Non renseigné';
  }
};

const getCorpsLabel = (corps?: string): string => {
  switch (corps) {
    case 'college': return 'Collège';
    case 'lycee': return 'Lycée';
    case 'centre_metiers': return 'Centre de Métiers';
    default: return 'Non renseigné';
  }
};

const getEnseignementLabel = (enseignement?: string): string => {
  switch (enseignement) {
    case 'general': return 'Général';
    case 'technique': return 'Technique';
    default: return 'Non renseigné';
  }
};

const getCyclesLabels = (cycles?: string[]): string => {
  if (!cycles || cycles.length === 0) return 'Non renseigné';
  const labels = cycles.map(c => {
    switch (c) {
      case 'premier': return '1er Cycle';
      case 'second': return '2nd Cycle';
      default: return c;
    }
  });
  return labels.join(' • ');
};

const getOptionsLabels = (options?: string[]): string => {
  if (!options || options.length === 0) return 'Aucune option';
  const labels = options.map(o => {
    switch (o) {
      case 'sti': return 'STI';
      case 'stag': return 'STAG';
      case 'technologie': return 'Technologie';
      case 'lettres': return 'Lettres';
      case 'sciences': return 'Sciences';
      default: return o;
    }
  });
  return labels.join(', ');
};

export default function EtablissementSummary({ data, onEdit }: EtablissementSummaryProps) {
  const metadata = data.metadata || {};

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Informations de l'établissement</Text>
        <TouchableOpacity style={styles.editButton} onPress={onEdit}>
          <Edit2 size={16} color={theme.colors.primary.DEFAULT} />
          <Text style={styles.editButtonText}>Modifier</Text>
        </TouchableOpacity>
      </View>

      {/* Description courte */}
      {data.description_courte && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.descriptionText}>{data.description_courte}</Text>
        </View>
      )}

      {/* Coordonnées */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Coordonnées</Text>
        
        {data.ville && (
          <View style={styles.infoRow}>
            <MapPin size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.infoText}>Ville: {data.ville}</Text>
          </View>
        )}
        
        {data.telephone && (
          <View style={styles.infoRow}>
            <Phone size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.infoText}>Téléphone: {data.telephone}</Text>
          </View>
        )}
        
        {data.email && (
          <View style={styles.infoRow}>
            <Mail size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.infoText}>Email: {data.email}</Text>
          </View>
        )}
        
        {data.site_web && (
          <View style={styles.infoRow}>
            <Globe size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.infoText}>Site web: {data.site_web}</Text>
          </View>
        )}
      </View>

      {/* Caractéristiques pédagogiques */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Caractéristiques pédagogiques</Text>
        
        <View style={styles.infoRow}>
          <Building2 size={16} color={theme.colors.neutral[500]} />
          <Text style={styles.infoText}>Régime: {getRegimeLabel(metadata.regime)}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <GraduationCap size={16} color={theme.colors.neutral[500]} />
          <Text style={styles.infoText}>Corps: {getCorpsLabel(metadata.corps)}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <BookOpen size={16} color={theme.colors.neutral[500]} />
          <Text style={styles.infoText}>Enseignement: {getEnseignementLabel(metadata.enseignement)}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Calendar size={16} color={theme.colors.neutral[500]} />
          <Text style={styles.infoText}>Cycles: {getCyclesLabels(metadata.cycles)}</Text>
        </View>
        
        {metadata.options && metadata.options.length > 0 && (
          <View style={styles.infoRow}>
            <Award size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.infoText}>Options: {getOptionsLabels(metadata.options)}</Text>
          </View>
        )}
        
        {metadata.taux_reussite && (
          <View style={styles.infoRow}>
            <Award size={16} color={theme.colors.neutral[500]} />
            <Text style={styles.infoText}>Taux de réussite: {metadata.taux_reussite}%</Text>
          </View>
        )}
      </View>

      {/* Description complète (optionnelle) */}
      {data.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Présentation complète</Text>
          <Text style={styles.descriptionText}>{data.description}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.primary.DEFAULT,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#4B5563',
    flex: 1,
  },
  descriptionText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
});