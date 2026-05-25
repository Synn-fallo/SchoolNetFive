import { View, Text, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Users, Building2, GraduationCap } from 'lucide-react-native';
import AnimatedNumber from './AnimatedNumber';

interface StatsData {
  etablissements: number;
  utilisateurs: number;
  notes: number;
}

export default function StatsSection() {
  const [stats, setStats] = useState<StatsData>({
    etablissements: 0,
    utilisateurs: 0,
    notes: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [etablissementsRes, utilisateursRes, notesRes] = await Promise.all([
        supabase.from('public_etablissements').select('id', { count: 'exact', head: true }),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('notes').select('id', { count: 'exact', head: true }),
      ]);

      setStats({
        etablissements: etablissementsRes.count || 0,
        utilisateurs: utilisateursRes.count || 0,
        notes: notesRes.count || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statItems = [
    {
      icon: Building2,
      value: stats.etablissements,
      label: 'Établissements',
      suffix: '+',
    },
    {
      icon: Users,
      value: stats.utilisateurs,
      label: 'Utilisateurs',
      suffix: '+',
    },
    {
      icon: GraduationCap,
      value: stats.notes,
      label: 'Notes saisies',
      suffix: 'k',
      divider: 1000,
    },
  ];

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.grid}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.card}>
              <View style={styles.iconPlaceholder} />
              <View style={styles.numberPlaceholder} />
              <View style={styles.labelPlaceholder} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>SchoolNet en chiffres</Text>
      <View style={styles.grid}>
        {statItems.map((item, index) => {
          const IconComponent = item.icon;
          const displayValue = item.divider ? Math.floor(item.value / item.divider) : item.value;
          
          return (
            <View key={index} style={styles.card}>
              <View style={styles.iconContainer}>
                <IconComponent size={32} color="#3B82F6" />
              </View>
              <Text style={styles.number}>
                <AnimatedNumber value={displayValue} duration={1500} />
                {item.suffix}
              </Text>
              <Text style={styles.label}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 48,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 32,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 24,
    maxWidth: 1024,
    alignSelf: 'center',
    width: '100%',
  },
  card: {
    flex: 1,
    minWidth: 200,
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  number: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1F2937',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  iconPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E5E7EB',
    marginBottom: 16,
  },
  numberPlaceholder: {
    width: 80,
    height: 36,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 8,
  },
  labelPlaceholder: {
    width: 100,
    height: 20,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
});