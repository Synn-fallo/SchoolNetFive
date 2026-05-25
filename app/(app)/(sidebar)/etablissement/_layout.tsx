import { Stack } from 'expo-router';

export default function EtablissementLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen 
        name="gestion" 
        options={{ title: 'Gérer mon établissement' }} 
      />
      <Stack.Screen 
        name="preview" 
        options={{ title: 'Aperçu du site' }} 
      />
      <Stack.Screen 
        name="abonnement" 
        options={{ title: 'Choisir un abonnement' }} 
      />
      <Stack.Screen 
        name="delegations" 
        options={{ title: 'Gérer les délégations' }} 
      />
    </Stack>
  );
}