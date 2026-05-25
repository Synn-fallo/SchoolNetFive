import { Stack } from 'expo-router';

export default function InstitutionLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen 
        name="demande-etablissement" 
        options={{ title: 'Créer un établissement' }} 
      />
      <Stack.Screen 
        name="demande-partenariat" 
        options={{ title: 'Devenir partenaire' }} 
      />
      <Stack.Screen 
        name="mes-demandes" 
        options={{ title: 'Mes demandes' }} 
      />
      <Stack.Screen 
        name="[id]/detail" 
        options={{ title: 'Détail de la demande' }} 
      />
    </Stack>
  );
}