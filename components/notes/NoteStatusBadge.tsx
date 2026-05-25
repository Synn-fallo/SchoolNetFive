import { View, Text, StyleSheet } from 'react-native';
import { NoteStatus, getNoteStatusLabel, getNoteStatusColor } from '@/types/notes.types';

interface NoteStatusBadgeProps {
  status: NoteStatus;
  size?: 'small' | 'normal';
}

export default function NoteStatusBadge({ status, size = 'normal' }: NoteStatusBadgeProps) {
  const label = getNoteStatusLabel(status);
  const color = getNoteStatusColor(status);
  const isSmall = size === 'small';

  return (
    <View style={[styles.badge, { backgroundColor: `${color}15` }, isSmall && styles.badgeSmall]}>
      <View style={[styles.dot, { backgroundColor: color }, isSmall && styles.dotSmall]} />
      <Text style={[styles.text, { color }, isSmall && styles.textSmall]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
  },
  textSmall: {
    fontSize: 10,
  },
});