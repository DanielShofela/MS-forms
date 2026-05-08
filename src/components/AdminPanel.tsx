import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Order, Product } from '../types';
import { formatPrice } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import ProductForm from './ProductForm';
import { 
  BarChart3, 
  Search, 
  Filter, 
  Calendar, 
  MoreVertical, 
  CheckCircle, 
  Truck, 
  Clock, 
  XCircle,
  Smartphone,
  MapPin,
  RefreshCcw,
  LogOut,
  Package
} from 'lucide-react';

export default function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'orders' | 'products'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      setOrders(ordersData);
      if (activeTab === 'orders') setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });

    const qProducts = query(collection(db, 'products'), orderBy('name', 'asc'));
    const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Product[];
      setProducts(productsData);
      if (activeTab === 'products') setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'products');
    });

    return () => {
      unsubscribeOrders();
      unsubscribeProducts();
    };
  }, [activeTab]);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { 
        status,
        updatedAt: new Date()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const deleteOrder = async (orderId: string) => {
    if(!confirm("Supprimer cette commande ?")) return;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `orders/${orderId}`);
    }
  };

  const deleteProduct = async (productId: string) => {
    if(!confirm("Supprimer ce produit ?")) return;
    try {
      await deleteDoc(doc(db, 'products', productId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.phone.includes(searchTerm) ||
      order.id?.includes(searchTerm);
    
    const matchesFilter = filterStatus === 'all' || order.status === filterStatus;
    
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    revenue: orders.reduce((acc, o) => acc + (o.status === 'delivered' ? o.totalPrice : 0), 0)
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'processing': return 'bg-blue-100 text-blue-700';
      case 'delivered': return 'bg-green-100 text-green-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
      {/* Header */}
      <header className="bg-dark text-white px-6 py-6 flex justify-between items-center sticky top-0 z-20">
        <div className="flex flex-col">
          <h1 className="text-xl">Dashboard Admin</h1>
          <span className="text-xs text-gray-400">MAISON SMART + | Back-office</span>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              setEditingProduct(null);
              setShowProductForm(true);
            }} 
            className="p-2 bg-brand rounded-lg text-white"
            title="Ajouter un produit"
          >
            <Smartphone size={20} />
          </button>
          <button onClick={onLogout} className="p-2 bg-white/10 rounded-lg">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex p-4 gap-2">
        <button 
          onClick={() => setActiveTab('orders')}
          className={cn(
            "flex-1 py-3 rounded-xl font-bold transition-all",
            activeTab === 'orders' ? "bg-dark text-white shadow-lg" : "bg-white text-gray-500 border border-gray-100"
          )}
        >
          Commandes ({orders.length})
        </button>
        <button 
          onClick={() => setActiveTab('products')}
          className={cn(
            "flex-1 py-3 rounded-xl font-bold transition-all",
            activeTab === 'products' ? "bg-dark text-white shadow-lg" : "bg-white text-gray-500 border border-gray-100"
          )}
        >
          Boutique ({products.length})
        </button>
      </div>

      {activeTab === 'orders' ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-4 mb-4">
            {[
              { label: 'Attente', value: stats.pending, icon: Clock, color: 'text-yellow-500' },
              { label: 'En Cours', value: stats.processing, icon: Truck, color: 'text-blue-500' },
              { label: 'Livré', value: stats.delivered, icon: CheckCircle, color: 'text-green-500' },
              { label: 'Chiffre (L)', value: formatPrice(stats.revenue), icon: BarChart3, color: 'text-green-600' },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <stat.icon size={20} className={stat.color} />
                  <span className="text-[10px] uppercase font-bold text-gray-400">Aujourd'hui</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold">{stat.value}</span>
                  <span className="text-xs text-gray-500">{stat.label}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="px-4 flex flex-col gap-3">
            <div className="relative">
              <Search className="absolute left-4 top-3 text-gray-400" size={18} />
              <input 
                type="text"
                placeholder="Rechercher nom, tel..."
                className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-11 pr-4 focus:ring-2 focus:ring-brand/20 outline-none"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {['all', 'pending', 'processing', 'delivered', 'cancelled'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border",
                    filterStatus === status ? "bg-dark text-white border-dark" : "bg-white text-gray-500 border-gray-200"
                  )}
                >
                  {status === 'all' ? 'Toutes' : 
                   status === 'pending' ? 'Attente' :
                   status === 'processing' ? 'En cours' :
                   status === 'delivered' ? 'Livré' : 'Annulé'}
                </button>
              ))}
            </div>
          </div>

          {/* Order List */}
          <div className="flex flex-col gap-4 p-4 max-w-2xl mx-auto w-full">
            {loading ? (
              <div className="flex justify-center p-10"><RefreshCcw className="animate-spin text-brand" /></div>
            ) : filteredOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center text-gray-400 border border-dashed border-gray-200">
                Aucune commande trouvée
              </div>
            ) : filteredOrders.map(order => (
              <div key={order.id} className="admin-card p-5 flex flex-col gap-4">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-lg text-dark">{order.customerName}</span>
                    <div className="flex items-center gap-2">
                      <span className={cn("text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider", getStatusColor(order.status))}>
                        {order.status === 'pending' ? 'Attente' : 
                         order.status === 'processing' ? 'En cours' :
                         order.status === 'delivered' ? 'Livré' : 'Annulé'}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">{order.id?.slice(-6).toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-brand">{formatPrice(order.totalPrice)}</div>
                    <span className="text-[10px] text-gray-400">{order.deliveryMode === 'express' ? '⚡ Express' : '🚚 Standard'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <a href={`tel:${order.phone}`} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-brand border border-gray-100 shadow-sm">
                      <Smartphone size={16} />
                    </div>
                    <span className="font-medium text-dark">{order.phone}</span>
                  </a>
                  <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-gray-400 border border-gray-100 shadow-sm">
                      <MapPin size={16} />
                    </div>
                    <span className="truncate">{order.city}</span>
                  </div>
                </div>

                <div className="bg-gray-50/50 rounded-2xl p-4 text-xs border border-gray-100/50">
                  <div className="flex justify-between mb-2">
                    <span className="text-gray-400 font-medium">Panier:</span>
                    <span className="font-bold text-dark">{order.productName} <span className="text-brand">x{order.quantity}</span></span>
                  </div>
                  <div className="flex flex-col gap-1 border-t border-gray-100 mt-2 pt-2">
                    <span className="text-gray-400 font-medium">Adresse de livraison:</span>
                    <p className="text-dark leading-relaxed">{order.address}</p>
                  </div>
                </div>

                <div className="flex gap-2 mt-2">
                  <div className="flex-1 relative">
                    <select 
                      value={order.status}
                      onChange={(e) => updateStatus(order.id!, e.target.value)}
                      className="w-full bg-dark text-white rounded-xl py-3 px-4 text-xs font-bold outline-none appearance-none cursor-pointer text-center"
                    >
                      <option value="pending">⏳ Attente</option>
                      <option value="processing">🚚 En cours</option>
                      <option value="delivered">🏁 Livré</option>
                      <option value="cancelled">❌ Annulé</option>
                    </select>
                  </div>
                  <button 
                    onClick={() => deleteOrder(order.id!)}
                    className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors shrink-0"
                  >
                    <XCircle size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Products List */
        <div className="flex flex-col gap-4 p-4">
          {products.map(product => (
            <div key={product.id} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex gap-4">
              <img src={product.imageUrl} className="w-24 h-24 rounded-xl object-cover shrink-0 bg-gray-100" />
              <div className="flex flex-col justify-between flex-1 py-1">
                <div>
                  <h3 className="text-sm font-bold line-clamp-1">{product.name}</h3>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-brand font-bold">{formatPrice(product.price)}</span>
                      {product.oldPrice && <span className="text-[10px] text-gray-400 line-through">{formatPrice(product.oldPrice)}</span>}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                      <Package size={10} className="text-gray-400" />
                      <span className={cn("font-bold", product.stock <= 5 ? "text-red-500" : "text-gray-600")}>
                        {product.stock} en stock
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setEditingProduct(product);
                      setShowProductForm(true);
                    }}
                    className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold"
                  >
                    Modifier
                  </button>
                  <button 
                    onClick={() => deleteProduct(product.id)}
                    className="p-2 bg-red-50 text-red-500 rounded-lg"
                  >
                    <XCircle size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {products.length === 0 && (
            <div className="bg-white rounded-2xl p-10 text-center text-gray-400 border border-dashed">
              Aucun produit en boutique
            </div>
          )}
        </div>
      )}

      {/* Product Form Modal */}
      {showProductForm && (
        <ProductForm 
          product={editingProduct} 
          onClose={() => setShowProductForm(false)} 
        />
      )}
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
