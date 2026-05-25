import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Card } from '@/components/Card';
import RequestStatus, { RequestStatusType } from './RequestStatus';

interface RequestItem {
  id: string;
  created_at: string;
  statut: RequestStatusType;
  type: 'etablissement' | 'partenariat';
  nom_etablissement?: string;
  organisation_nom?: string;
  ville?: string;
  contact_nom?: string;
  [key: string]: any;
}

interface RequestListProps {
  requests: RequestItem[];
  onSelect: (id: string) => void;
  loading?: boolean;
}

export default function RequestList({ requests, onSelect, loading = false }: RequestListProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getTitle = (item: RequestItem) => {
    if (item.type === 'etablissement') {
      return item.nom_etablissement || 'Demande d\'établissement';
    }
    return item.organisation_nom || 'Demande de partenariat';
  };

  const getSubtitle = (item: RequestItem) => {
    if (item.type === 'etablissement') {
      return item.ville || '';
    }
    return item.contact_nom || '';
  };

  const getTypeLabel = (type: string) => {
    if (type === 'etablissement') {
      return 'Établissement';
    }
    return 'Partenariat';
  };

  if (loading && requests.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (requests.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>Aucune demande trouvée</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={requests}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => onSelect(item.id)} activeOpacity={0.7}>
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.titleContainer}>
                <Text style={styles.typeBadge}>
                  {getTypeLabel(item.type)}
                </Text>
                <Text style={styles.title} numberOfLines={1}>
                  {getTitle(item)}
                </Text>
              </View>
              <RequestStatus status={item.statut} />
            </View>
            {getSubtitle(item) ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {getSubtitle(item)}
              </Text>
            ) : null}
            <Text style={styles.date}>{formatDate(item.created_at)}</Text>
          </Card>
        </TouchableOpacity>
      )}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    marginBottom: 0,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  typeBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: '#3B82F6',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  date: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});