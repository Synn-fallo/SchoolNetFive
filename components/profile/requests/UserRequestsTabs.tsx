import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRequestTabs, RequestTabType } from '@/hooks/useRequestTabs';
import RoleRequestsList from './RoleRequestsList';
import EtablissementRequestsList from './EtablissementRequestsList';
import PartenariatRequestsList from './PartenariatRequestsList';
import { Users, Building2, Handshake } from 'lucide-react-native';
import theme from '@/constants/theme';

interface TabConfig {
  id: RequestTabType;
  label: string;
  icon: any;
  component: React.ComponentType;
}

const TABS: TabConfig[] = [
  { id: 'roles', label: 'Rôles', icon: Users, component: RoleRequestsList },
  { id: 'etablissements', label: 'Établissements', icon: Building2, component: EtablissementRequestsList },
  { id: 'partenariats', label: 'Partenariats', icon: Handshake, component: PartenariatRequestsList },
];

export default function UserRequestsTabs() {
  const { activeTab, setActiveTab } = useRequestTabs();

  const ActiveComponent = TABS.find(tab => tab.id === activeTab)?.component || RoleRequestsList;

  return (
    <View style={styles.container}>
      {/* Onglets */}
      <View style={styles.tabsContainer}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.7}
            >
              <Icon size={16} color={isActive ? theme.colors.primary.DEFAULT : theme.colors.neutral[500]} />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Contenu de l'onglet actif */}
      <View style={styles.contentContainer}>
        <ActiveComponent />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 16,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  tabActive: {
    backgroundColor: '#EFF6FF',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.neutral[500],
  },
  tabLabelActive: {
    color: theme.colors.primary.DEFAULT,
  },
  contentContainer: {
    flex: 1,
    padding: 16,
  },
});