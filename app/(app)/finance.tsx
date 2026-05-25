import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Download, 
  Filter, 
  Plus, 
  Eye, 
  Check, 
  X,
  CreditCard,
  Wallet,
  PiggyBank,
  Receipt,
  FileText,
  ChevronRight,
  Search
} from 'lucide-react-native';
import { Card } from '@/components/Card';
import theme from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  status: 'pending' | 'completed' | 'cancelled';
  payment_method: string;
  reference?: string;
  eleve_id?: string;
  eleve_nom?: string;
  eleve_prenom?: string;
}

interface FinancialSummary {
  total_income: number;
  total_expenses: number;
  balance: number;
  pending_amount: number;
  monthly_income: number;
  monthly_expenses: number;
}

export default function FinanceScreen() {
  const router = useRouter();
  const { hasRole } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<FinancialSummary>({
    total_income: 0,
    total_expenses: 0,
    balance: 0,
    pending_amount: 0,
    monthly_income: 0,
    monthly_expenses: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed' | 'cancelled'>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    type: 'income' as 'income' | 'expense',
    category: '',
    payment_method: 'cash',
    reference: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const isAdminOrChef = hasRole('admin') || hasRole('chef_etablissement');

  useEffect(() => {
    if (isAdminOrChef) {
      loadFinancialData();
    }
  }, [isAdminOrChef]);

  const loadFinancialData = async () => {
    setLoading(true);
    try {
      // Récupérer toutes les transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (transactionsError) throw transactionsError;

      // Récupérer les noms des élèves pour les transactions liées
      const transactionsWithNames = await Promise.all(
        (transactionsData || []).map(async (t) => {
          let eleve_nom = undefined;
          let eleve_prenom = undefined;
          
          if (t.eleve_id) {
            const { data: eleve } = await supabase
              .from('eleves')
              .select('user_id')
              .eq('id', t.eleve_id)
              .single();
            
            if (eleve?.user_id) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('nom, prenom')
                .eq('id', eleve.user_id)
                .single();
              
              if (profile) {
                eleve_nom = profile.nom;
                eleve_prenom = profile.prenom;
              }
            }
          }
          
          return { ...t, eleve_nom, eleve_prenom };
        })
      );

      setTransactions(transactionsWithNames);

      // Calculer les totaux
      const total_income = transactionsWithNames
        .filter(t => t.type === 'income' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const total_expenses = transactionsWithNames
        .filter(t => t.type === 'expense' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const pending_amount = transactionsWithNames
        .filter(t => t.status === 'pending')
        .reduce((sum, t) => sum + t.amount, 0);
      
      // Calculer les montants du mois en cours
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      const monthly_income = transactionsWithNames
        .filter(t => {
          const date = new Date(t.date);
          return t.type === 'income' && t.status === 'completed' && 
                 date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + t.amount, 0);
      
      const monthly_expenses = transactionsWithNames
        .filter(t => {
          const date = new Date(t.date);
          return t.type === 'expense' && t.status === 'completed' && 
                 date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      setSummary({
        total_income,
        total_expenses,
        balance: total_income - total_expenses,
        pending_amount,
        monthly_income,
        monthly_expenses,
      });
    } catch (error) {
      console.error('Error loading financial data:', error);
      Alert.alert('Erreur', 'Impossible de charger les données financières');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTransaction = async () => {
    if (!formData.description || !formData.amount) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      Alert.alert('Erreur', 'Montant invalide');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('transactions')
        .insert({
          description: formData.description,
          amount: amountNum,
          type: formData.type,
          category: formData.category,
          payment_method: formData.payment_method,
          reference: formData.reference || null,
          status: 'completed',
          date: new Date().toISOString(),
        });

      if (error) throw error;

      Alert.alert('Succès', 'Transaction ajoutée');
      setShowAddModal(false);
      setFormData({
        description: '',
        amount: '',
        type: 'income',
        category: '',
        payment_method: 'cash',
        reference: '',
      });
      loadFinancialData();
    } catch (error) {
      console.error('Error adding transaction:', error);
      Alert.alert('Erreur', 'Impossible d\'ajouter la transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (transactionId: string, newStatus: 'pending' | 'completed' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ status: newStatus })
        .eq('id', transactionId);

      if (error) throw error;

      Alert.alert('Succès', 'Statut mis à jour');
      loadFinancialData();
      setModalVisible(false);
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le statut');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return 'Complété';
      case 'pending': return 'En attente';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      cash: 'Espèces',
      card: 'Carte bancaire',
      transfer: 'Virement',
      check: 'Chèque',
      mobile: 'Mobile money',
    };
    return methods[method] || method;
  };

  const filteredTransactions = transactions.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        t.description.toLowerCase().includes(query) ||
        t.reference?.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query)
      );
    }
    return true;
  });

  if (!isAdminOrChef) {
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
        <Text style={styles.title}>💰 Finance</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Plus size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      {/* Cartes de synthèse */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <View style={[styles.summaryIcon, { backgroundColor: '#10B98120' }]}>
            <TrendingUp size={24} color="#10B981" />
          </View>
          <Text style={styles.summaryLabel}>Revenus</Text>
          <Text style={[styles.summaryValue, styles.incomeValue]}>
            {summary.total_income.toLocaleString()} FCFA
          </Text>
          <Text style={styles.summarySubtext}>
            Mensuel: {summary.monthly_income.toLocaleString()} FCFA
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={[styles.summaryIcon, { backgroundColor: '#EF444420' }]}>
            <TrendingDown size={24} color="#EF4444" />
          </View>
          <Text style={styles.summaryLabel}>Dépenses</Text>
          <Text style={[styles.summaryValue, styles.expenseValue]}>
            {summary.total_expenses.toLocaleString()} FCFA
          </Text>
          <Text style={styles.summarySubtext}>
            Mensuel: {summary.monthly_expenses.toLocaleString()} FCFA
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={[styles.summaryIcon, { backgroundColor: '#3B82F620' }]}>
            <Wallet size={24} color="#3B82F6" />
          </View>
          <Text style={styles.summaryLabel}>Solde</Text>
          <Text style={[styles.summaryValue, summary.balance >= 0 ? styles.incomeValue : styles.expenseValue]}>
            {summary.balance.toLocaleString()} FCFA
          </Text>
          <Text style={styles.summarySubtext}>
            En attente: {summary.pending_amount.toLocaleString()} FCFA
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={[styles.summaryIcon, { backgroundColor: '#F59E0B20' }]}>
            <PiggyBank size={24} color="#F59E0B" />
          </View>
          <Text style={styles.summaryLabel}>En attente</Text>
          <Text style={styles.summaryValue}>
            {summary.pending_amount.toLocaleString()} FCFA
          </Text>
        </View>
      </ScrollView>

      {/* Filtres et recherche */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Search size={18} color={theme.colors.neutral[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={theme.colors.neutral[400]}
          />
        </View>

        <View style={styles.filterButtons}>
          <TouchableOpacity
            style={[styles.filterButton, filterType === 'all' && styles.filterButtonActive]}
            onPress={() => setFilterType('all')}
          >
            <Text style={[styles.filterButtonText, filterType === 'all' && styles.filterButtonTextActive]}>
              Tous
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterType === 'income' && styles.filterButtonActive]}
            onPress={() => setFilterType('income')}
          >
            <TrendingUp size={14} color={filterType === 'income' ? '#10B981' : '#6B7280'} />
            <Text style={[styles.filterButtonText, filterType === 'income' && styles.filterButtonTextActive]}>
              Revenus
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterType === 'expense' && styles.filterButtonActive]}
            onPress={() => setFilterType('expense')}
          >
            <TrendingDown size={14} color={filterType === 'expense' ? '#EF4444' : '#6B7280'} />
            <Text style={[styles.filterButtonText, filterType === 'expense' && styles.filterButtonTextActive]}>
              Dépenses
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusButtons}>
          <TouchableOpacity
            style={[styles.statusButton, filterStatus === 'all' && styles.statusButtonActive]}
            onPress={() => setFilterStatus('all')}
          >
            <Text style={[styles.statusButtonText, filterStatus === 'all' && styles.statusButtonTextActive]}>
              Tous
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statusButton, filterStatus === 'completed' && styles.statusButtonActive]}
            onPress={() => setFilterStatus('completed')}
          >
            <Text style={[styles.statusButtonText, filterStatus === 'completed' && styles.statusButtonTextActive]}>
              Complétés
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statusButton, filterStatus === 'pending' && styles.statusButtonActive]}
            onPress={() => setFilterStatus('pending')}
          >
            <Text style={[styles.statusButtonText, filterStatus === 'pending' && styles.statusButtonTextActive]}>
              En attente
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.statusButton, filterStatus === 'cancelled' && styles.statusButtonActive]}
            onPress={() => setFilterStatus('cancelled')}
          >
            <Text style={[styles.statusButtonText, filterStatus === 'cancelled' && styles.statusButtonTextActive]}>
              Annulés
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Liste des transactions */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary.DEFAULT} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : filteredTransactions.length === 0 ? (
        <View style={styles.centerContainer}>
          <Receipt size={48} color={theme.colors.neutral[300]} />
          <Text style={styles.emptyText}>Aucune transaction trouvée</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {filteredTransactions.map((transaction) => (
            <TouchableOpacity
              key={transaction.id}
              onPress={() => {
                setSelectedTransaction(transaction);
                setModalVisible(true);
              }}
            >
              <Card style={styles.transactionCard}>
                <View style={styles.transactionHeader}>
                  <View style={styles.transactionLeft}>
                    <View style={[
                      styles.transactionIcon,
                      { backgroundColor: transaction.type === 'income' ? '#10B98120' : '#EF444420' }
                    ]}>
                      {transaction.type === 'income' ? (
                        <TrendingUp size={20} color="#10B981" />
                      ) : (
                        <TrendingDown size={20} color="#EF4444" />
                      )}
                    </View>
                    <View>
                      <Text style={styles.transactionDescription}>{transaction.description}</Text>
                      <Text style={styles.transactionDate}>
                        {new Date(transaction.date).toLocaleDateString('fr-FR')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.transactionRight}>
                    <Text style={[
                      styles.transactionAmount,
                      transaction.type === 'income' ? styles.incomeAmount : styles.expenseAmount
                    ]}>
                      {transaction.type === 'income' ? '+' : '-'}{transaction.amount.toLocaleString()} FCFA
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(transaction.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(transaction.status) }]}>
                        {getStatusLabel(transaction.status)}
                      </Text>
                    </View>
                  </View>
                </View>
                {transaction.eleve_nom && (
                  <Text style={styles.transactionEleve}>
                    Élève: {transaction.eleve_prenom} {transaction.eleve_nom}
                  </Text>
                )}
                <ChevronRight size={16} color={theme.colors.neutral[300]} style={styles.chevron} />
              </Card>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Modal détails transaction */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Détails de la transaction</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={20} color={theme.colors.neutral[600]} />
              </TouchableOpacity>
            </View>

            {selectedTransaction && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailValue}>{selectedTransaction.description}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Montant</Text>
                  <Text style={[
                    styles.detailValue,
                    selectedTransaction.type === 'income' ? styles.incomeAmount : styles.expenseAmount
                  ]}>
                    {selectedTransaction.type === 'income' ? '+' : '-'}{selectedTransaction.amount.toLocaleString()} FCFA
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Type</Text>
                  <Text style={styles.detailValue}>
                    {selectedTransaction.type === 'income' ? 'Revenu' : 'Dépense'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Catégorie</Text>
                  <Text style={styles.detailValue}>{selectedTransaction.category || '-'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Moyen de paiement</Text>
                  <Text style={styles.detailValue}>{getPaymentMethodLabel(selectedTransaction.payment_method)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Référence</Text>
                  <Text style={styles.detailValue}>{selectedTransaction.reference || '-'}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedTransaction.date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Statut</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedTransaction.status) + '20', alignSelf: 'flex-start' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(selectedTransaction.status) }]}>
                      {getStatusLabel(selectedTransaction.status)}
                    </Text>
                  </View>
                </View>

                {selectedTransaction.status !== 'completed' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.completeButton]}
                      onPress={() => handleUpdateStatus(selectedTransaction.id, 'completed')}
                    >
                      <Check size={16} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Marquer comme complété</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.cancelButton]}
                      onPress={() => handleUpdateStatus(selectedTransaction.id, 'cancelled')}
                    >
                      <X size={16} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Annuler</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal ajout transaction */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouvelle transaction</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={20} color={theme.colors.neutral[600]} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.typeSwitch}>
                <TouchableOpacity
                  style={[styles.typeButton, formData.type === 'income' && styles.typeButtonActive]}
                  onPress={() => setFormData({ ...formData, type: 'income' })}
                >
                  <TrendingUp size={16} color={formData.type === 'income' ? '#10B981' : '#6B7280'} />
                  <Text style={[styles.typeButtonText, formData.type === 'income' && styles.typeButtonTextActive]}>
                    Revenu
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeButton, formData.type === 'expense' && styles.typeButtonActive]}
                  onPress={() => setFormData({ ...formData, type: 'expense' })}
                >
                  <TrendingDown size={16} color={formData.type === 'expense' ? '#EF4444' : '#6B7280'} />
                  <Text style={[styles.typeButtonText, formData.type === 'expense' && styles.typeButtonTextActive]}>
                    Dépense
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Paiement scolarité"
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
              />

              <Text style={styles.inputLabel}>Montant (FCFA) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={formData.amount}
                onChangeText={(text) => setFormData({ ...formData, amount: text })}
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Catégorie</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Scolarité, Fournitures, etc."
                value={formData.category}
                onChangeText={(text) => setFormData({ ...formData, category: text })}
              />

              <Text style={styles.inputLabel}>Moyen de paiement</Text>
              <View style={styles.paymentMethods}>
                {['cash', 'card', 'transfer', 'check', 'mobile'].map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={[
                      styles.paymentMethod,
                      formData.payment_method === method && styles.paymentMethodActive
                    ]}
                    onPress={() => setFormData({ ...formData, payment_method: method })}
                  >
                    <Text style={[
                      styles.paymentMethodText,
                      formData.payment_method === method && styles.paymentMethodTextActive
                    ]}>
                      {getPaymentMethodLabel(method)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Référence (optionnel)</Text>
              <TextInput
                style={styles.input}
                placeholder="Numéro de reçu, chèque, etc."
                value={formData.reference}
                onChangeText={(text) => setFormData({ ...formData, reference: text })}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowAddModal(false)}
                >
                  <Text style={styles.modalCancelButtonText}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalSubmitButton, submitting && styles.modalSubmitButtonDisabled]}
                  onPress={handleAddTransaction}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitButtonText}>Ajouter</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary.DEFAULT,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    minWidth: 140,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  incomeValue: {
    color: '#10B981',
  },
  expenseValue: {
    color: '#EF4444',
  },
  summarySubtext: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#1F2937',
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: theme.colors.primary.DEFAULT,
  },
  filterButtonText: {
    fontSize: 12,
    color: '#6B7280',
  },
  filterButtonTextActive: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    alignItems: 'center',
  },
  statusButtonActive: {
    backgroundColor: theme.colors.primary.DEFAULT,
  },
  statusButtonText: {
    fontSize: 11,
    color: '#6B7280',
  },
  statusButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  transactionCard: {
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionDescription: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  transactionDate: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
  incomeAmount: {
    color: '#10B981',
  },
  expenseAmount: {
    color: '#EF4444',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  transactionEleve: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 8,
  },
  chevron: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -8,
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
    marginTop: 12,
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
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalBody: {
    padding: 16,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  completeButton: {
    backgroundColor: '#10B981',
  },
  cancelButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  typeSwitch: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  typeButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: theme.colors.primary.DEFAULT,
  },
  typeButtonText: {
    fontSize: 13,
    color: '#6B7280',
  },
  typeButtonTextActive: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  paymentMethods: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  paymentMethod: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  paymentMethodActive: {
    backgroundColor: '#EFF6FF',
    borderColor: theme.colors.primary.DEFAULT,
  },
  paymentMethodText: {
    fontSize: 12,
    color: '#6B7280',
  },
  paymentMethodTextActive: {
    color: theme.colors.primary.DEFAULT,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
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
  modalSubmitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  modalSubmitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});