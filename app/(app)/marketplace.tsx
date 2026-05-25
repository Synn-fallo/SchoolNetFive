import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, FlatList } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { ShoppingCart } from 'lucide-react-native';

interface Produit {
  id: string;
  titre: string;
  description: string | null;
  prix: number;
  categorie: string | null;
  vendeur_id: string;
  is_disponible: boolean;
}

export default function MarketplaceScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadProduits();
  }, [user]);

  const loadProduits = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('produits')
        .select('*')
        .eq('is_disponible', true)
        .order('created_at', { ascending: false });

      setProduits(data || []);

      // Extract unique categories
      const cats = Array.from(new Set(data?.map((p) => p.categorie).filter(Boolean))) as string[];
      setCategories(cats);
    } catch (error) {
      console.error('Error loading produits:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProduits = selectedCategory
    ? produits.filter((p) => p.categorie === selectedCategory)
    : produits;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Marketplace</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Categories */}
        {categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
            contentContainerStyle={styles.categoriesContent}
          >
            <TouchableOpacity
              style={[styles.categoryButton, !selectedCategory && styles.activeCategoryButton]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  !selectedCategory && styles.activeCategoryButtonText,
                ]}
              >
                Tous
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryButton,
                  selectedCategory === cat && styles.activeCategoryButton,
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryButtonText,
                    selectedCategory === cat && styles.activeCategoryButtonText,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Products Grid */}
        {filteredProduits.length > 0 ? (
          filteredProduits.map((produit) => (
            <Card key={produit.id} style={styles.productCard}>
              <View style={styles.productHeader}>
                <View style={styles.productImage}>
                  <ShoppingCart size={32} color="#D1D5DB" />
                </View>
                <View style={styles.productContent}>
                  <Text style={styles.productTitle}>{produit.titre}</Text>
                  {produit.description && (
                    <Text style={styles.productDescription} numberOfLines={2}>
                      {produit.description}
                    </Text>
                  )}
                  <Text style={styles.productPrice}>{produit.prix}€</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.buyButton}>
                <Text style={styles.buyButtonText}>Ajouter au panier</Text>
              </TouchableOpacity>
            </Card>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <ShoppingCart size={48} color="#D1D5DB" />
            <Text style={styles.emptyText}>Aucun produit disponible</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingVertical: 16,
    paddingBottom: 32,
  },
  categoriesContainer: {
    marginBottom: 16,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
    marginRight: 8,
  },
  activeCategoryButton: {
    backgroundColor: '#3B82F6',
  },
  categoryButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeCategoryButtonText: {
    color: '#FFFFFF',
  },
  productCard: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  productHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  productImage: {
    width: 60,
    height: 60,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productContent: {
    flex: 1,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  buyButton: {
    height: 36,
    backgroundColor: '#3B82F6',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    marginTop: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 16,
  },
});
