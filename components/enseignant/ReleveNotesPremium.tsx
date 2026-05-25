import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Download, Printer, FileText, FileSpreadsheet } from 'lucide-react-native';
import theme from '@/constants/theme';

interface Props {
  onExportPDF: () => void;
  onExportExcel: () => void;
  onPrint: () => void;
}

export default function ReleveNotesPremium({ onExportPDF, onExportExcel, onPrint }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>📄 Export premium</Text>
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.button} onPress={onExportPDF}>
          <FileText size={18} color="#FFFFFF" />
          <Text style={styles.buttonText}>PDF</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={onExportExcel}>
          <FileSpreadsheet size={18} color="#FFFFFF" />
          <Text style={styles.buttonText}>Excel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={onPrint}>
          <Printer size={18} color="#FFFFFF" />
          <Text style={styles.buttonText}>Imprimer</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});