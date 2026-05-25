// /home/project/components/common/SelectorModal.tsx
// Modal générique de sélection d'options

import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { X, Check } from 'lucide-react-native';
import theme from '@/constants/theme';

interface SelectorModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  items: any[];
  selectedId: string;
  onSelect: (id: string) => void;
  getItemLabel: (item: any) => string;
  getItemSubLabel?: (item: any) => string;
}

export default function SelectorModal({
  visible,
  onClose,
  title,
  items,
  selectedId,
  onSelect,
  getItemLabel,
  getItemSubLabel,
}: SelectorModalProps) {
  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalList}>
            {items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.modalItem, selectedId === item.id && styles.modalItemActive]}
                onPress={() => {
                  onSelect(item.id);
                  onClose();
                }}
              >
                <View style={styles.modalItemContent}>
                  <Text style={[styles.modalItemText, selectedId === item.id && styles.modalItemTextActive]}>
                    {getItemLabel(item)}
                  </Text>
                  {getItemSubLabel && (
                    <Text style={styles.modalItemSubText}>{getItemSubLabel(item)}</Text>
                  )}
                </View>
                {selectedId === item.id && <Check size={16} color={theme.colors.primary.DEFAULT} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalList: {
    padding: 8,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    marginVertical: 2,
  },
  modalItemActive: {
    backgroundColor: '#EFF6FF',
  },
  modalItemContent: {
    flex: 1,
  },
  modalItemText: {
    fontSize: 14,
    color: '#1F2937',
  },
  modalItemTextActive: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  modalItemSubText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
});