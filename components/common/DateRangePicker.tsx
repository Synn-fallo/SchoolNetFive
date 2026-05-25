// /home/project/components/common/DateRangePicker.tsx
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput } from 'react-native';
import { useState } from 'react';
import { Calendar, ChevronDown, X } from 'lucide-react-native';
import theme from '@/constants/theme';

interface DateRangePickerProps {
  startDate: string;
  endDate: string | null;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string | null) => void;
  placeholderStart?: string;
  placeholderEnd?: string;
  showEndDate?: boolean;
  label?: string;
}

const DatePickerInput = ({ value, onChange, placeholder }: { value: string; onChange: (date: string) => void; placeholder: string }) => {
  return (
    <input
      type="date"
      style={{
        width: '100%',
        padding: '10px 12px',
        fontSize: '14px',
        border: '1px solid #E5E7EB',
        borderRadius: '8px',
        backgroundColor: '#FFFFFF',
      }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
};

export default function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  placeholderStart = 'Date de début',
  placeholderEnd = 'Date de fin',
  showEndDate = true,
  label,
}: DateRangePickerProps) {
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const handleStartDateChange = (date: string) => {
    onStartDateChange(date);
    setShowStartPicker(false);
  };

  const handleEndDateChange = (date: string) => {
    onEndDateChange(date || null);
    setShowEndPicker(false);
  };

  const clearEndDate = () => {
    onEndDateChange(null);
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={styles.row}>
        {/* Date de début */}
        <TouchableOpacity style={styles.dateInput} onPress={() => setShowStartPicker(true)}>
          <Calendar size={16} color={theme.colors.neutral[500]} />
          <Text style={[styles.dateText, !startDate && styles.placeholderText]}>
            {startDate ? formatDisplayDate(startDate) : placeholderStart}
          </Text>
          <ChevronDown size={14} color={theme.colors.neutral[400]} />
        </TouchableOpacity>

        {showEndDate && (
          <>
            <Text style={styles.separator}>→</Text>
            
            {/* Date de fin */}
            <TouchableOpacity style={styles.dateInput} onPress={() => setShowEndPicker(true)}>
              <Calendar size={16} color={theme.colors.neutral[500]} />
              <Text style={[styles.dateText, !endDate && styles.placeholderText]}>
                {endDate ? formatDisplayDate(endDate) : placeholderEnd}
              </Text>
              {endDate ? (
                <TouchableOpacity onPress={clearEndDate}>
                  <X size={14} color={theme.colors.neutral[400]} />
                </TouchableOpacity>
              ) : (
                <ChevronDown size={14} color={theme.colors.neutral[400]} />
              )}
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Modals (simulés pour web) – En vrai, un vrai Modal natif serait mieux */}
      {showStartPicker && (
        <Modal visible={showStartPicker} transparent animationType="fade" onRequestClose={() => setShowStartPicker(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Date de début</Text>
              <DatePickerInput value={startDate} onChange={handleStartDateChange} placeholder={placeholderStart} />
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowStartPicker(false)}>
                <Text style={styles.modalCloseText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {showEndPicker && (
        <Modal visible={showEndPicker} transparent animationType="fade" onRequestClose={() => setShowEndPicker(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Date de fin</Text>
              <DatePickerInput value={endDate || ''} onChange={handleEndDateChange} placeholder={placeholderEnd} />
              <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowEndPicker(false)}>
                <Text style={styles.modalCloseText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  dateText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  separator: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  modalCloseButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  modalCloseText: {
    fontSize: 14,
    color: '#6B7280',
  },
});
