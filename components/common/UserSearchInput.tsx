// /home/project/components/common/UserSearchInput.tsx
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { Search, UserPlus, X } from 'lucide-react-native';
import { searchUserByEmail, UserSearchResult } from '@/utils/userSearch';
import theme from '@/constants/theme';

interface UserSearchInputProps {
  /** Callback appelé quand un utilisateur est sélectionné */
  onUserSelected?: (user: UserSearchResult) => void;
  /** Callback appelé quand la recherche est annulée / utilisateur désélectionné */
  onUserCleared?: () => void;
  /** Placeholder du champ de recherche */
  placeholder?: string;
  /** Valeur initiale (email pré-rempli) */
  initialEmail?: string;
  /** Désactiver le composant */
  disabled?: boolean;
}

export default function UserSearchInput({
  onUserSelected,
  onUserCleared,
  placeholder = "Email de l'utilisateur",
  initialEmail = '',
  disabled = false,
}: UserSearchInputProps) {
  const [email, setEmail] = useState(initialEmail);
  const [searching, setSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<UserSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!email.trim()) {
      setError('Veuillez saisir un email');
      return;
    }

    setSearching(true);
    setError(null);
    setFoundUser(null);

    try {
      const user = await searchUserByEmail(email);
      
      if (user) {
        setFoundUser(user);
        onUserSelected?.(user);
      } else {
        setError('Aucun utilisateur trouvé avec cet email');
        onUserCleared?.();
      }
    } catch (err) {
      console.error('Search error:', err);
      setError('Erreur lors de la recherche');
    } finally {
      setSearching(false);
    }
  };

  const handleClear = () => {
    setEmail('');
    setFoundUser(null);
    setError(null);
    onUserCleared?.();
  };

  return (
    <View style={styles.container}>
      {/* Champ de recherche */}
      <View style={styles.searchRow}>
        <TextInput
          style={[styles.input, disabled && styles.inputDisabled]}
          placeholder={placeholder}
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (foundUser) {
              setFoundUser(null);
              onUserCleared?.();
            }
            if (error) setError(null);
          }}
          editable={!disabled && !foundUser}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        {!foundUser && (
          <TouchableOpacity
            style={[styles.searchButton, (disabled || searching) && styles.searchButtonDisabled]}
            onPress={handleSearch}
            disabled={disabled || searching}
          >
            {searching ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Search size={16} color="#FFFFFF" />
                <Text style={styles.searchButtonText}>Rechercher</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        {foundUser && (
          <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
            <X size={20} color="#6B7280" />
          </TouchableOpacity>
        )}
      </View>

      {/* Message d'erreur */}
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}

      {/* Carte utilisateur trouvé */}
      {foundUser && (
        <View style={styles.userCard}>
          <View style={styles.userCardAvatar}>
            <UserPlus size={24} color={theme.colors.primary.DEFAULT} />
          </View>
          <View style={styles.userCardInfo}>
            <Text style={styles.userCardName}>
              {foundUser.prenom} {foundUser.nom}
            </Text>
            <Text style={styles.userCardEmail}>{foundUser.email}</Text>
            {foundUser.telephone && (
              <Text style={styles.userCardPhone}>📞 {foundUser.telephone}</Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#9CA3AF',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  searchButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  searchButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  clearButton: {
    padding: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    marginTop: 8,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: theme.colors.primary.light,
  },
  userCardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCardInfo: {
    flex: 1,
  },
  userCardName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  userCardEmail: {
    fontSize: 13,
    color: '#6B7280',
  },
  userCardPhone: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
});
