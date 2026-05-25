import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Download, Calendar, CheckCircle, Clock } from 'lucide-react-native';
import { Card } from '@/components/Card';

interface Bulletin {
  id: string;
  periode: string;
  moyenne_generale: number;
  appreciation_generale: string;
  bulletin_url: string | null;
  is_published: boolean;
  created_at: string;
  annee_scolaire?: {
    libelle: string;
  };
}

interface BulletinCardProps {
  bulletin: Bulletin;
  onDownload: () => void;
}

const getPeriodeLabel = (periode: string): string => {
  switch (periode) {
    case 'T1': return '1er Trimestre';
    case 'T2': return '2ème Trimestre';
    case 'T3': return '3ème Trimestre';
    case 'SEM1': return '1er Semestre';
    case 'SEM2': return '2ème Semestre';
    case 'ANNEE': return 'Année scolaire';
    default: return periode;
  }
};

export default function BulletinCard({ bulletin, onDownload }: BulletinCardProps) {
  const periodeLabel = getPeriodeLabel(bulletin.periode);
  const moyenneColor = bulletin.moyenne_generale >= 10 ? '#10B981' : '#EF4444';
  const isAvailable = bulletin.is_published && bulletin.bulletin_url;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.periodeContainer}>
          <Calendar size={18} color="#3B82F6" />
          <Text style={styles.periode}>{periodeLabel}</Text>
        </View>
        {bulletin.annee_scolaire && (
          <Text style={styles.annee}>{bulletin.annee_scolaire.libelle}</Text>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.moyenneContainer}>
          <Text style={[styles.moyenneValue, { color: moyenneColor }]}>
            {bulletin.moyenne_generale.toFixed(1)}
          </Text>
          <Text style={styles.moyenneUnit}>/20</Text>
        </View>
        <Text style={styles.appreciation}>{bulletin.appreciation_generale}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.statusContainer}>
          {isAvailable ? (
            <>
              <CheckCircle size={14} color="#10B981" />
              <Text style={styles.statusText}>Publié</Text>
            </>
          ) : (
            <>
              <Clock size={14} color="#F59E0B" />
              <Text style={[styles.statusText, styles.statusPending]}>En attente</Text>
            </>
          )}
        </View>
        <TouchableOpacity
          style={[styles.downloadButton, !isAvailable && styles.downloadButtonDisabled]}
          onPress={onDownload}
          disabled={!isAvailable}
        >
          <Download size={16} color={isAvailable ? '#FFFFFF' : '#9CA3AF'} />
          <Text style={[styles.downloadText, !isAvailable && styles.downloadTextDisabled]}>
            Télécharger
          </Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  periodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  periode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  annee: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  moyenneContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  moyenneValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  moyenneUnit: {
    fontSize: 14,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  appreciation: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#10B981',
  },
  statusPending: {
    color: '#F59E0B',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  downloadButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  downloadText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  downloadTextDisabled: {
    color: '#9CA3AF',
  },
});