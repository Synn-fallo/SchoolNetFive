import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { useState } from 'react';
import { ChevronDown, Building2, Check } from 'lucide-react-native';
import { useActiveEtablissement } from '@/hooks/useActiveEtablissement';
import theme from '@/constants/theme';

interface EtablissementSelectorProps {
  variant?: 'header' | 'sidebar';
  onSelect?: () => void;
}

export default function EtablissementSelector({ variant = 'header', onSelect }: EtablissementSelectorProps) {
  const { activeEtablissement, allEtablissements, switchToEtablissement, loading } = useActiveEtablissement();
  const [modalVisible, setModalVisible] = useState(false);

  if (loading || !activeEtablissement) return null;

  const handleSelect = async (etablissementId: string) => {
    await switchToEtablissement(etablissementId);
    setModalVisible(false);
    if (onSelect) onSelect();
  };

  if (variant === 'sidebar') {
    return (
      <TouchableOpacity style={styles.sidebarContainer} onPress={() => setModalVisible(true)} activeOpacity={0.7}>
        <Building2 size={16} color={theme.colors.neutral[500]} />
        <Text style={styles.sidebarName} numberOfLines={1}>
          {activeEtablissement.nom}
        </Text>
        <ChevronDown size={14} color={theme.colors.neutral[400]} />
      </TouchableOpacity>
    );
  }

  return (
    <>
      <TouchableOpacity style={styles.headerContainer} onPress={() => setModalVisible(true)} activeOpacity={0.7}>
        <Text style={styles.headerName} numberOfLines={1}>
          {activeEtablissement.nom}
        </Text>
        <ChevronDown size={16} color={theme.colors.neutral[500]} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Changer d'établissement</Text>
            </View>
            <FlatList
              data={allEtablissements}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.etablissementItem,
                    activeEtablissement.id === item.id && styles.etablissementItemActive,
                  ]}
                  onPress={() => handleSelect(item.id)}
                >
                  <View style={styles.etablissementInfo}>
                    <Building2 size={18} color={activeEtablissement.id === item.id ? theme.colors.primary.DEFAULT : theme.colors.neutral[600]} />
                    <View>
                      <Text style={[styles.etablissementName, activeEtablissement.id === item.id && styles.etablissementNameActive]}>
                        {item.nom}
                      </Text>
                      {item.ville && (
                        <Text style={styles.etablissementVille}>{item.ville}</Text>
                      )}
                    </View>
                  </View>
                  {activeEtablissement.id === item.id && (
                    <Check size={18} color={theme.colors.primary.DEFAULT} />
                  )}
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.modalList}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Styles pour l'en-tête (header)
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  headerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    maxWidth: 180,
  },
  // Styles pour la sidebar
  sidebarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 8,
    marginBottom: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  sidebarName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  modalList: {
    padding: 8,
  },
  etablissementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
  },
  etablissementItemActive: {
    backgroundColor: '#EFF6FF',
  },
  etablissementInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  etablissementName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  etablissementNameActive: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '600',
  },
  etablissementVille: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
});