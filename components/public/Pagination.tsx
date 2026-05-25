import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import theme from '@/constants/theme';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.navButton, currentPage === 1 && styles.navButtonDisabled]}
        onPress={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <ChevronLeft size={18} color={currentPage === 1 ? theme.colors.neutral[300] : theme.colors.neutral[600]} />
        <Text style={[styles.navButtonText, currentPage === 1 && styles.navButtonTextDisabled]}>
          Précédent
        </Text>
      </TouchableOpacity>

      <View style={styles.pageNumbers}>
        {getPageNumbers().map((page, index) => (
          typeof page === 'number' ? (
            <TouchableOpacity
              key={index}
              style={[styles.pageButton, currentPage === page && styles.pageButtonActive]}
              onPress={() => onPageChange(page)}
            >
              <Text style={[styles.pageButtonText, currentPage === page && styles.pageButtonTextActive]}>
                {page}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text key={index} style={styles.ellipsis}>...</Text>
          )
        ))}
      </View>

      <TouchableOpacity
        style={[styles.navButton, currentPage === totalPages && styles.navButtonDisabled]}
        onPress={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <Text style={[styles.navButtonText, currentPage === totalPages && styles.navButtonTextDisabled]}>
          Suivant
        </Text>
        <ChevronRight size={18} color={currentPage === totalPages ? theme.colors.neutral[300] : theme.colors.neutral[600]} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing[4],
    paddingVertical: theme.spacing[4],
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[2],
    borderRadius: theme.borderRadius.DEFAULT,
    backgroundColor: theme.colors.neutral[100],
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.neutral[600],
  },
  navButtonTextDisabled: {
    color: theme.colors.neutral[300],
  },
  pageNumbers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing[1],
  },
  pageButton: {
    minWidth: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: theme.borderRadius.DEFAULT,
    backgroundColor: theme.colors.neutral[100],
  },
  pageButtonActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  pageButtonText: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.neutral[600],
  },
  pageButtonTextActive: {
    color: '#FFFFFF',
  },
  ellipsis: {
    fontSize: theme.typography.bodySmall.fontSize,
    color: theme.colors.neutral[400],
    paddingHorizontal: theme.spacing[1],
  },
});