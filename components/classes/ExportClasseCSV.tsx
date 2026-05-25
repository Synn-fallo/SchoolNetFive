import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Download } from 'lucide-react-native';
import { exportClassesToCSV, downloadCSV } from '@/utils/exportCSV';
import theme from '@/constants/theme';

interface ExportClasseCSVProps {
  classe: {
    id: string;
    nom: string;
    eleves: any[];
    matieres: any[];
  };
  onExport?: () => void;
}

export default function ExportClasseCSV({ classe, onExport }: ExportClasseCSVProps) {
  const handleExport = () => {
    try {
      // Formater les données pour l'export
      const exportData = {
        id: classe.id,
        nom: classe.nom,
        eleves: classe.eleves || [],
        matieres: classe.matieres || []
      };

      exportClassesToCSV([exportData]);
      
      if (onExport) onExport();
      
      Alert.alert('Succès', `La classe "${classe.nom}" a été exportée en CSV.`);
    } catch (error) {
      console.error('Error exporting class:', error);
      Alert.alert('Erreur', 'Impossible d\'exporter la classe');
    }
  };

  return (
    <TouchableOpacity style={styles.button} onPress={handleExport}>
      <Download size={16} color="#FFFFFF" />
      <Text style={styles.buttonText}>Exporter en CSV</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  buttonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
});