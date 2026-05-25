import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Pressable } from 'react-native';
import { Link, usePathname, useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Menu, X, Search, User, LogIn } from 'lucide-react-native';
import { useState } from 'react';
import SearchBar from './SearchBar';

const { width } = Dimensions.get('window');
const isMobile = width < 768;

interface PublicHeaderProps {
  onSearch?: (query: string) => void;
  showSearch?: boolean;
}

export default function PublicHeader({ onSearch, showSearch = true }: PublicHeaderProps) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { name: 'Annuaire', href: '/(public)/etablissements' },
    { name: 'À propos', href: '/(public)/a-propos' },
    { name: 'Comment ça marche', href: '/(public)/comment-ca-marche' },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <>
      <View style={styles.header}>
        <View style={styles.container}>
          {/* Logo */}
          <Link href="/(public)" asChild>
            <TouchableOpacity style={styles.logoContainer}>
              <Text style={styles.logo}>SchoolNet</Text>
              <Text style={styles.tagline}>Éducation connectée</Text>
            </TouchableOpacity>
          </Link>

          {/* Desktop Navigation */}
          {!isMobile && (
            <View style={styles.navDesktop}>
              {navItems.map((item) => (
                <Link key={item.href} href={item.href} asChild>
                  <TouchableOpacity style={styles.navItem}>
                    <Text style={[styles.navText, isActive(item.href) && styles.navTextActive]}>
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                </Link>
              ))}
            </View>
          )}

          {/* Search Bar (Desktop) */}
          {!isMobile && showSearch && onSearch && (
            <View style={styles.searchContainer}>
              <SearchBar onSearch={onSearch} placeholder="Rechercher un établissement..." />
            </View>
          )}

          {/* Auth Buttons */}
          <View style={styles.authContainer}>
            {user ? (
              <Link href="/(app)" asChild>
                <TouchableOpacity style={styles.userButton}>
                  <User size={20} color="#FFFFFF" />
                  <Text style={styles.userButtonText}>Mon espace</Text>
                </TouchableOpacity>
              </Link>
            ) : (
              <>
                <Link href="/auth/login" asChild>
                  <TouchableOpacity style={styles.loginButton}>
                    <LogIn size={18} color="#3B82F6" />
                    <Text style={styles.loginText}>Connexion</Text>
                  </TouchableOpacity>
                </Link>
                <Link href="/auth/register" asChild>
                  <TouchableOpacity style={styles.registerButton}>
                    <Text style={styles.registerText}>Inscription</Text>
                  </TouchableOpacity>
                </Link>
              </>
            )}
          </View>

          {/* Mobile Menu Button */}
          {isMobile && (
            <TouchableOpacity style={styles.menuButton} onPress={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X size={24} color="#1F2937" /> : <Menu size={24} color="#1F2937" />}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Mobile Menu Overlay */}
      {isMobile && menuOpen && (
        <View style={styles.mobileMenu}>
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} asChild>
              <TouchableOpacity style={styles.mobileNavItem} onPress={() => setMenuOpen(false)}>
                <Text style={[styles.mobileNavText, isActive(item.href) && styles.mobileNavTextActive]}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            </Link>
          ))}
          {showSearch && onSearch && (
            <View style={styles.mobileSearchContainer}>
              <SearchBar onSearch={onSearch} placeholder="Rechercher..." />
            </View>
          )}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    maxWidth: 1280,
    alignSelf: 'center',
    width: '100%',
  },
  logoContainer: {
    flexDirection: 'column',
  },
  logo: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3B82F6',
  },
  tagline: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  navDesktop: {
    flexDirection: 'row',
    gap: 24,
    marginLeft: 48,
  },
  navItem: {
    paddingVertical: 8,
  },
  navText: {
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '500',
  },
  navTextActive: {
    color: '#3B82F6',
  },
  searchContainer: {
    flex: 1,
    maxWidth: 300,
    marginHorizontal: 24,
  },
  authContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
    backgroundColor: 'transparent',
  },
  loginText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  registerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
  },
  registerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  userButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#3B82F6',
  },
  userButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  menuButton: {
    padding: 8,
  },
  mobileMenu: {
    position: 'absolute',
    top: 68,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 24,
    paddingVertical: 16,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  mobileNavItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  mobileNavText: {
    fontSize: 16,
    color: '#4B5563',
  },
  mobileNavTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  mobileSearchContainer: {
    marginTop: 12,
  },
});