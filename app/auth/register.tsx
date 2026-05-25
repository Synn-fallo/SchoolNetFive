import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleRegister = async () => {
    try {
      setLoading(true);
      setError('');

      if (!email || !password || !nom || !prenom) {
        setError('Tous les champs sont requis');
        setLoading(false);
        return;
      }

      // 1. Création du compte utilisateur
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            nom,
            prenom,
          }
        }
      });
      
      if (signUpError) throw signUpError;

      if (signUpData.user) {
        // 2. Connexion automatique après inscription
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (signInError) {
          console.warn('Auto-login failed:', signInError);
        }

        // 3. Création du profil (maintenant auth.uid() est disponible)
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: signUpData.user.id,
            nom,
            prenom,
            is_active: true,
            active_role: 'visiteur',
          });

        if (profileError) {
          console.error('Profile error:', profileError);
          // Si erreur RLS, on tente avec le service role (si disponible)
          // Sinon, on laisse faire et on redirige quand même
        }

        // 4. Attribution du rôle visiteur
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: signUpData.user.id,
            role: 'visiteur',
            is_active: true,
          });

        if (roleError) {
          console.error('Role error:', roleError);
        }
      }

      // 5. Attendre un peu pour la propagation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 6. Redirection
      router.replace('/(app)');
      
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || "Erreur lors de l'inscription");
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView 
      style={styles.screenContainer} 
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.cardColumn}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(public)')}>
          <ArrowLeft size={20} color="#2563EB" />
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>

        <Text style={styles.title}>SchoolNet</Text>
        
        <View style={styles.subtitleWrapper}>
          <Text style={styles.subtitle}>Créer un compte</Text>
          <View style={styles.decorativeLine} />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder="Prénom"
          placeholderTextColor="#9CA3AF"
          value={prenom}
          onChangeText={setPrenom}
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Nom"
          placeholderTextColor="#9CA3AF"
          value={nom}
          onChangeText={setNom}
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#9CA3AF"
          value={email}
          onChangeText={setEmail}
          editable={!loading}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Mot de passe"
            placeholderTextColor="#9CA3AF"
            value={password}
            onChangeText={setPassword}
            editable={!loading}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity 
            style={styles.eyeButton} 
            onPress={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff size={20} color="#9CA3AF" />
            ) : (
              <Eye size={20} color="#9CA3AF" />
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>S'inscrire</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Vous avez un compte? </Text>
          <Link href="/auth/login" asChild>
            <TouchableOpacity>
              <Text style={styles.link}>Connexion <Text style={styles.linkArrow}>→</Text></Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  cardColumn: {
    width: '90%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 24,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  backButtonText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
  title: {
    fontSize: 38,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    color: '#2563EB',
    letterSpacing: -0.5,
  },
  subtitleWrapper: {
    alignItems: 'center',
    marginBottom: 32,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    color: '#6B7280',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  decorativeLine: {
    width: 50,
    height: 3,
    backgroundColor: '#F59E0B',
    borderRadius: 2,
    marginTop: 10,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  passwordInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  eyeButton: {
    paddingHorizontal: 14,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    height: 50,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  footerText: {
    color: '#6B7280',
    fontSize: 14,
  },
  link: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
  linkArrow: {
    fontSize: 14,
    fontWeight: '600',
  },
});