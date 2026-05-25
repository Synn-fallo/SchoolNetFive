import { Stack } from 'expo-router';
import BackButton from '@/components/common/BackButton';

export default function SidebarLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerLeft: () => <BackButton />,
        headerTitleAlign: 'center',
        headerStyle: {
          backgroundColor: '#FFFFFF',
        },
        headerShadowVisible: false,
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '600',
          color: '#1F2937',
        },
      }}
    >
      <Stack.Screen 
        name="institution" 
        options={{ 
          title: 'Institution',
        }} 
      />
      <Stack.Screen 
        name="etablissement" 
        options={{ 
          title: 'Établissement',
        }} 
      />
      <Stack.Screen 
        name="admin" 
        options={{ 
          title: 'Administration',
        }} 
      />
      <Stack.Screen 
        name="classes" 
        options={{ 
          title: 'Classes',
        }} 
      />
      <Stack.Screen 
        name="enseignants" 
        options={{ 
          title: 'Enseignants',
        }} 
      />
      <Stack.Screen 
        name="eleves" 
        options={{ 
          title: 'Élèves',
        }} 
      />
      <Stack.Screen 
        name="delegations" 
        options={{ 
          title: 'Délégations',
        }} 
      />
      <Stack.Screen 
        name="mes-etablissements" 
        options={{ 
          title: 'Mes établissements',
        }} 
      />
    </Stack>
  );
}