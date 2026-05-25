import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, Link } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { signIn, user } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // ✅ Lire le paramètre redirect (ex: ?redirect=/auto-inscription)
  const redirectUrl = (params.redirect as string) || '/(app)';
  
  // ✅ Log de débogage
  console.log('🔍 [Login] Paramètres reçus:', params);
  console.log('🔍 [Login] Redirection vers:', redirectUrl);

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      await signIn(email, password);
      
      // ✅ Récupérer l'utilisateur après connexion si nécessaire
      let currentUser = user;
      if (!currentUser) {
        const { data: sessionData } = await supabase.auth.getSession();
        currentUser = sessionData.session?.user;
      }
      
      // ✅ Vérifier si l'utilisateur est un parent en première connexion
      if (currentUser) {
        const { data: parentData, error: parentError } = await supabase
          .from('parents')
          .select('premiere_connexion')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        // Si c'est un parent et que c'est sa première connexion
        if (parentData && parentData.premiere_connexion === true) {
          console.log('🔍 Parent en première connexion, redirection vers first-login');
          router.replace('/first-login');
          return;
        }
      }
      
      // Sinon, redirection normale
      const redirectParam = params.redirect as string;
      let redirectUrl = '/(app)';
      
      if (redirectParam) {
        try {
          redirectUrl = decodeURIComponent(redirectParam);
        } catch (e) {
          redirectUrl = redirectParam;
        }
      }
      
      console.log('🔍 [Login] Redirection vers:', redirectUrl);
      router.replace(redirectUrl);
    } catch (err: any) {
      console.error('🔍 [Login] Erreur:', err);
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screenContainer}>
      <View style={styles.cardColumn}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/(public)')}>
          <ArrowLeft size={20} color="#2563EB" />
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>

        <Text style={styles.title}>SchoolNet</Text>
        
        <View style={styles.subtitleWrapper}>
          <Text style={styles.subtitle}>Plateforme Éducative</Text>
          <View style={styles.decorativeLine} />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

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

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Connexion</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Pas de compte? </Text>
          {/* ✅ Transmettre le paramètre redirect à la page register */}
          <Link href={`/auth/register?redirect=${encodeURIComponent(redirectUrl)}`} asChild>
            <TouchableOpacity>
              <Text style={styles.link}>S'inscrire <Text style={styles.linkArrow}>→</Text></Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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