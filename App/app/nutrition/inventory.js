import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../services/api';
import { ChevronLeft, Plus, Trash2, Package, Search } from 'lucide-react-native';

export default function KitchenInventoryScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [newItem, setNewItem] = useState({ name: '', quantity: '', unit: 'pcs' });

  const fetchInventory = async () => {
    try {
      const res = await api.get('/nutrition/kitchen-inventory');
      setItems(res.data?.items || []);
    } catch (err) {
      console.error('Failed to fetch inventory', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleAddItem = async () => {
    if (!newItem.name.trim()) return;
    
    const updatedItems = [...items, { ...newItem, id: Date.now().toString() }];
    try {
      await api.put('/nutrition/kitchen-inventory', { items: updatedItems });
      setItems(updatedItems);
      setNewItem({ name: '', quantity: '', unit: 'pcs' });
    } catch (err) {
      Alert.alert('Error', 'Failed to add item');
    }
  };

  const removeItem = async (id) => {
    const updatedItems = items.filter(item => item.id !== id);
    try {
      await api.put('/nutrition/kitchen-inventory', { items: updatedItems });
      setItems(updatedItems);
    } catch (err) {
      Alert.alert('Error', 'Failed to remove item');
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kitchen Inventory</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchContainer}>
        <Search size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search pantry..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Add New Item Form */}
        <View style={styles.addCard}>
          <Text style={styles.sectionTitle}>Add Item</Text>
          <View style={styles.formRow}>
            <TextInput
              style={[styles.input, { flex: 2 }]}
              placeholder="Item name (e.g. Eggs)"
              value={newItem.name}
              onChangeText={(text) => setNewItem({ ...newItem, name: text })}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Qty"
              keyboardType="numeric"
              value={newItem.quantity}
              onChangeText={(text) => setNewItem({ ...newItem, quantity: text })}
            />
            <TouchableOpacity style={styles.addButton} onPress={handleAddItem}>
              <Plus size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Inventory List */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Pantry ({filteredItems.length})</Text>
          {filteredItems.length > 0 ? (
            filteredItems.map((item, index) => (
              <View key={item.id || index} style={styles.itemRow}>
                <View style={styles.itemIconBox}>
                  <Package size={20} color="#666" />
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemQty}>{item.quantity} {item.unit}</Text>
                </View>
                <TouchableOpacity onPress={() => removeItem(item.id)}>
                  <Trash2 size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{search ? 'No items match your search' : 'Your pantry is empty'}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 16,
  },
  scrollContent: {
    padding: 16,
  },
  addCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  formRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 45,
  },
  addButton: {
    backgroundColor: '#000',
    width: 45,
    height: 45,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listSection: {
    flex: 1,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  itemIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
  },
  itemQty: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#999',
    fontSize: 14,
  },
});
