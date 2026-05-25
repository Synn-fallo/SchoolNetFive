import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Search, Edit2, Trash2, Check, X, User, Shield, Mail, Phone, Users, ChevronDown, ChevronUp } from 'lucide-react-native';
import { Card } from '@/components/Card';
import theme from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

interface Utilisateur {
  id: string;
  email?: string;
  nom: string;
  prenom: string;
  telephone?: string;
  role: string;
  all_roles?: string[];
  etablissement_id?: string;
  etablissement_nom?: string;
  is_active: boolean;
  created_at: string;
}

export default function UtilisateursScreen() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Utilisateur | null>(null);
  const [newRole, setNewRole] = useState('');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  const isAdmin = hasRole('admin');

  useEffect(() => {
    if (isAdmin) {
      loadUtilisateurs();
    }
  }, [isAdmin]);

  const loadUtilisateurs = async () => {
    setLoading(true);
    try {
      // 1. Récupérer tous les profils
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nom, prenom, telephone, is_active, created_at');

      if (profilesError) throw profilesError;

      // 2. Récupérer tous les rôles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, etablissement_id');

      if (rolesError) throw rolesError;

      // 3. Récupérer les établissements
      const { data: etablissements, error: etabError } = await supabase
        .from('etablissements')
        .select('id, nom');

      if (etabError) throw etabError;

      const etablissementsMap = new Map();
      etablissements?.forEach(e => etablissementsMap.set(e.id, e.nom));

      // 4. Grouper les rôles par utilisateur
      const rolesByUser = new Map<string, { roles: string[]; etablissement_id?: string }>();
      for (const role of (userRoles || [])) {
        if (!rolesByUser.has(role.user_id)) {
          rolesByUser.set(role.user_id, { roles: [], etablissement_id: role.etablissement_id });
        }
        rolesByUser.get(role.user_id)!.roles.push(role.role);
      }

      // 5. Construire la liste des utilisateurs (un par profil)
      const utilisateursList = (profiles || []).map(profile => {
        const userRolesData = rolesByUser.get(profile.id);
        const userRolesList = userRolesData?.roles || ['visiteur'];
        
        // Prendre le rôle principal (ordre de priorité)
        const mainRole = userRolesList.includes('admin') ? 'admin'
          : userRolesList.includes('chef_etablissement') ? 'chef_etablissement'
          : userRolesList.includes('enseignant') ? 'enseignant'
          : userRolesList.includes('eleve') ? 'eleve'
          : userRolesList.includes('parent') ? 'parent'
          : 'visiteur';

        return {
          id: profile.id,
          nom: profile.nom || '',
          prenom: profile.prenom || '',
          telephone: profile.telephone,
          is_active: profile.is_active,
          created_at: profile.created_at,
          role: mainRole,
          all_roles: userRolesList,
          etablissement_id: userRolesData?.etablissement_id,
          etablissement_nom: userRolesData?.etablissement_id ? etablissementsMap.get(userRolesData.etablissement_id) : undefined,
        };
      });

      // Trier par date de création (plus récent en premier)
      utilisateursList.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setUtilisateurs(utilisateursList);
    } catch (error) {
      console.error('Error loading utilisateurs:', error);
      Alert.alert('Erreur', 'Impossible de charger les utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async () => {
    if (!selectedUser || !newRole) return;

    try {
      const { error } = await supabase
        .from('user_roles')
        .upsert({
          user_id: selectedUser.id,
          role: newRole,
          etablissement_id: selectedUser.etablissement_id || null,
          is_active: true,
        });

      if (error) throw error;

      Alert.alert('Succès', `Rôle modifié pour ${selectedUser.prenom} ${selectedUser.nom}`);
      setModalVisible(false);
      setSelectedUser(null);
      setNewRole('');
      loadUtilisateurs();
    } catch (error) {
      console.error('Error changing role:', error);
      Alert.alert('Erreur', 'Impossible de modifier le rôle');
    }
  };

  const handleToggleActive = async (user: Utilisateur) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !user.is_active })
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert('Succès', `Compte ${user.is_active ? 'désactivé' : 'activé'} avec succès`);
      loadUtilisateurs();
    } catch (error) {
      console.error('Error toggling user status:', error);
      Alert.alert('Erreur', 'Impossible de modifier le statut');
    }
  };

  const toggleExpandUser = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const getRoleLabel = (role: string): string => {
    const labels: Record<string, string> = {
      admin: 'Administrateur',
      chef_etablissement: 'Chef d\'établissement',
      enseignant: 'Enseignant',
      eleve: 'Élève',
      parent: 'Parent',
      visiteur: 'Visiteur',
    };
    return labels[role] || role;
  };

  const getRoleColor = (role: string): string => {
    const colors: Record<string, string> = {
      admin: '#8B5CF6',
      chef_etablissement: '#3B82F6',
      enseignant: '#10B981',
      eleve: '#F59E0B',
      parent: '#EC4899',
      visiteur: '#6B7280',
    };
    return colors[role] || '#6B7280';
  };

  const filteredUtilisateurs = utilisateurs.filter(
    (u) =>
      u.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.prenom.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Statistiques des rôles (basées sur le rôle principal)
  const stats = {
    total: utilisateurs.length,
    admins: utilisateurs.filter(u => u.role === 'admin').length,
    chefs: utilisateurs.filter(u => u.role === 'chef_etablissement').length,
    enseignants: utilisateurs.filter(u => u.role === 'enseignant').length,
    eleves: utilisateurs.filter(u => u.role === 'eleve').length,
    parents: utilisateurs.filter(u => u.role === 'parent').length,
    visiteurs: utilisateurs.filter(u => u.role === 'visiteur').length,
  };

  if (!isAdmin) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Accès non autorisé</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>👥 Utilisateurs</Text>
        <Text style={styles.subtitle}>{stats.total} utilisateur(s) au total</Text>
      </View>

      {/* Statistiques */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Users size={20} color="#6B7280" />
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Shield size={20} color="#8B5CF6" />
          <Text style={styles.statValue}>{stats.admins}</Text>
          <Text style={styles.statLabel}>Admins</Text>
        </View>
        <View style={styles.statCard}>
          <Shield size={20} color="#3B82F6" />
          <Text style={styles.statValue}>{stats.chefs}</Text>
          <Text style={styles.statLabel}>Chefs</Text>
        </View>
        <View style={styles.statCard}>
          <User size={20} color="#10B981" />
          <Text style={styles.statValue}>{stats.enseignants}</Text>
          <Text style={styles.statLabel}>Enseignants</Text>
        </View>
        <View style={styles.statCard}>
          <User size={20} color="#F59E0B" />
          <Text style={styles.statValue}>{stats.eleves}</Text>
          <Text style={styles.statLabel}>Élèves</Text>
        </View>
        <View style={styles.statCard}>
          <User size={20} color="#EC4899" />
          <Text style={styles.statValue}>{stats.parents}</Text>
          <Text style={styles.statLabel}>Parents</Text>
        </View>
        <View style={styles.statCard}>
          <User size={20} color="#6B7280" />
          <Text style={styles.statValue}>{stats.visiteurs}</Text>
          <Text style={styles.statLabel}>Visiteurs</Text>
        </View>
      </ScrollView>

      <View style={styles.searchContainer}>
        <Search size={20} color={theme.colors.neutral[400]} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un utilisateur (nom, prénom)..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={theme.colors.neutral[400]}
        />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : filteredUtilisateurs.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>Aucun utilisateur trouvé</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {filteredUtilisateurs.map((utilisateur) => {
            const isExpanded = expandedUsers.has(utilisateur.id);
            const hasMultipleRoles = utilisateur.all_roles && utilisateur.all_roles.length > 1;
            
            return (
              <Card key={utilisateur.id} style={styles.userCard}>
                <TouchableOpacity onPress={() => toggleExpandUser(utilisateur.id)} activeOpacity={0.7}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.avatar, { backgroundColor: getRoleColor(utilisateur.role) }]}>
                      <User size={24} color="#FFFFFF" />
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{utilisateur.prenom} {utilisateur.nom}</Text>
                      <View style={styles.userDetails}>
                        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(utilisateur.role) + '20' }]}>
                          <Text style={[styles.roleText, { color: getRoleColor(utilisateur.role) }]}>
                            {getRoleLabel(utilisateur.role)}
                          </Text>
                        </View>
                        {hasMultipleRoles && (
                          <Text style={styles.multipleRolesText}>
                            +{utilisateur.all_roles!.length - 1} autre(s) rôle(s)
                          </Text>
                        )}
                        {utilisateur.telephone && (
                          <View style={styles.contactRow}>
                            <Phone size={12} color={theme.colors.neutral[400]} />
                            <Text style={styles.contactText}>{utilisateur.telephone}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.userId}>ID: {utilisateur.id.slice(0, 8)}...</Text>
                    </View>
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => {
                          setSelectedUser(utilisateur);
                          setNewRole(utilisateur.role);
                          setModalVisible(true);
                        }}
                      >
                        <Edit2 size={18} color={theme.colors.neutral[600]} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleToggleActive(utilisateur)}
                      >
                        {utilisateur.is_active ? (
                          <X size={18} color="#EF4444" />
                        ) : (
                          <Check size={18} color="#10B981" />
                        )}
                      </TouchableOpacity>
                      {hasMultipleRoles && (
                        <TouchableOpacity style={styles.expandButton}>
                          {isExpanded ? (
                            <ChevronUp size={18} color={theme.colors.neutral[400]} />
                          ) : (
                            <ChevronDown size={18} color={theme.colors.neutral[400]} />
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Section déroulante pour les rôles multiples */}
                {isExpanded && hasMultipleRoles && (
                  <View style={styles.expandedSection}>
                    <Text style={styles.expandedTitle}>Tous les rôles :</Text>
                    <View style={styles.rolesList}>
                      {utilisateur.all_roles!.map((role, idx) => (
                        <View key={idx} style={[styles.smallRoleBadge, { backgroundColor: getRoleColor(role) + '20' }]}>
                          <Text style={[styles.smallRoleText, { color: getRoleColor(role) }]}>
                            {getRoleLabel(role)}
                          </Text>
                        </View>
                      ))}
                    </View>
                    {utilisateur.etablissement_nom && (
                      <Text style={styles.etablissementText}>Établissement: {utilisateur.etablissement_nom}</Text>
                    )}
                  </View>
                )}
              </Card>
            );
          })}
        </ScrollView>
      )}

      {/* Modal changement de rôle */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Modifier le rôle</Text>
            <Text style={styles.modalSubtitle}>
              {selectedUser?.prenom} {selectedUser?.nom}
            </Text>

            <View style={styles.roleOptions}>
              {['admin', 'chef_etablissement', 'enseignant', 'eleve', 'parent', 'visiteur'].map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleOption,
                    newRole === role && styles.roleOptionActive,
                  ]}
                  onPress={() => setNewRole(role)}
                >
                  <View style={styles.roleOptionContent}>
                    <View style={[styles.roleDot, { backgroundColor: getRoleColor(role) }]} />
                    <Text style={[
                      styles.roleOptionText,
                      newRole === role && styles.roleOptionTextActive,
                    ]}>
                      {getRoleLabel(role)}
                    </Text>
                  </View>
                  {newRole === role && <Check size={16} color={theme.colors.primary.DEFAULT} />}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitButton}
                onPress={handleRoleChange}
              >
                <Text style={styles.modalSubmitButtonText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statCard: {
    alignItems: 'center',
    marginRight: 24,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  userCard: {
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  userDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 2,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '500',
  },
  multipleRolesText: {
    fontSize: 10,
    color: '#F59E0B',
    fontStyle: 'italic',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  userId: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  expandButton: {
    padding: 8,
  },
  expandedSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  expandedTitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  rolesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  smallRoleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  smallRoleText: {
    fontSize: 10,
    fontWeight: '500',
  },
  etablissementText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  roleOptions: {
    gap: 8,
    marginBottom: 20,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  roleOptionActive: {
    backgroundColor: '#EFF6FF',
    borderColor: theme.colors.primary.DEFAULT,
  },
  roleOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  roleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  roleOptionText: {
    fontSize: 14,
    color: '#6B7280',
  },
  roleOptionTextActive: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  modalSubmitButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary.DEFAULT,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalSubmitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});