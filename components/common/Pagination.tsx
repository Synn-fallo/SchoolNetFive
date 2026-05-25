// /home/project/components/common/Pagination.tsx
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import theme from '@/constants/theme';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPageNumbers = (): (number | string)[] => {
    const totalNumbers = siblingCount * 2 + 3;
    const totalBlocks = totalNumbers + 2;

    if (totalPages <= totalBlocks) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const showLeftDots = leftSiblingIndex > 2;
    const showRightDots = rightSiblingIndex < totalPages - 1;

    if (!showLeftDots && showRightDots) {
      const leftItems = 3 + 2 * siblingCount;
      const leftRange = Array.from({ length: leftItems }, (_, i) => i + 1);
      return [...leftRange, '...', totalPages];
    }

    if (showLeftDots && !showRightDots) {
      const rightItems = 3 + 2 * siblingCount;
      const rightRange = Array.from({ length: rightItems }, (_, i) => totalPages - rightItems + i + 1);
      return [1, '...', ...rightRange];
    }

    if (showLeftDots && showRightDots) {
      const middleRange = Array.from(
        { length: rightSiblingIndex - leftSiblingIndex + 1 },
        (_, i) => leftSiblingIndex + i
      );
      return [1, '...', ...middleRange, '...', totalPages];
    }

    return [];
  };

  const pages = getPageNumbers();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.pageButton, currentPage === 1 && styles.pageButtonDisabled]}
        onPress={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <ChevronLeft size={16} color={currentPage === 1 ? '#9CA3AF' : '#6B7280'} />
        <Text style={[styles.pageButtonText, currentPage === 1 && styles.pageButtonTextDisabled]}>
          Précédent
        </Text>
      </TouchableOpacity>

      <View style={styles.pagesContainer}>
        {pages.map((page, index) => {
          if (page === '...') {
            return (
              <View key={`dots-${index}`} style={styles.dots}>
                <Text style={styles.dotsText}>...</Text>
              </View>
            );
          }

          const pageNum = page as number;
          const isActive = pageNum === currentPage;

          return (
            <TouchableOpacity
              key={pageNum}
              style={[styles.pageNumber, isActive && styles.pageNumberActive]}
              onPress={() => onPageChange(pageNum)}
            >
              <Text style={[styles.pageNumberText, isActive && styles.pageNumberTextActive]}>
                {pageNum}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.pageButton, currentPage === totalPages && styles.pageButtonDisabled]}
        onPress={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <Text style={[styles.pageButtonText, currentPage === totalPages && styles.pageButtonTextDisabled]}>
          Suivant
        </Text>
        <ChevronRight size={16} color={currentPage === totalPages ? '#9CA3AF' : '#6B7280'} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  pageButtonDisabled: {
    backgroundColor: '#F9FAFB',
  },
  pageButtonText: {
    fontSize: 13,
    color: '#6B7280',
  },
  pageButtonTextDisabled: {
    color: '#9CA3AF',
  },
  pagesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pageNumber: {
    minWidth: 36,
    height: 36,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  pageNumberActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  pageNumberText: {
    fontSize: 14,
    color: '#6B7280',
  },
  pageNumberTextActive: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  dots: {
    minWidth: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});
