import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Order, Product, Admin } from '../types';
import { formatPrice } from '../lib/utils';
import { auth } from '../lib/firebase';
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
  Package,
  Trash2,
  ShieldCheck,
  UserPlus,
  Bell,
  BellRing
} from 'lucide-react';

export default function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'admins'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [admins, setAdmins] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<{id: string, text: string, time: Date}[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const lastOrderCount = React.useRef(-1);

  // Sound & Speech Notification
  const playNotification = (customerName: string) => {
    // Visual Notification
    const newNotif = {
      id: Math.random().toString(36).substr(2, 9),
      text: `Nouvelle commande de ${customerName}`,
      time: new Date()
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 50));

    // Audible Notification (Alex style TTS)
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(`Nouvelle commande reçue de la part de ${customerName}`);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      
      // Try to find a high quality voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.name.includes('Alex') || v.name.includes('Thomas') || v.name.includes('Premium'));
      if (preferredVoice) utterance.voice = preferredVoice;
      
      window.speechSynthesis.speak(utterance);
    }
  };
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const isSuperAdmin = auth.currentUser?.email?.toLowerCase() === 'digitalsoutien@gmail.com';

  useEffect(() => {
    const qOrders = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      
      // Trigger notification if order count increases
      if (lastOrderCount.current !== -1 && ordersData.length > lastOrderCount.current) {
        const latestOrder = ordersData[0];
        playNotification(latestOrder.customerName);
      }
      
      lastOrderCount.current = ordersData.length;
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

    const qAdmins = query(collection(db, 'admins'), orderBy('createdAt', 'desc'));
    const unsubscribeAdmins = onSnapshot(qAdmins, (snapshot) => {
      const adminsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAdmins(adminsData);
      if (activeTab === 'admins') setLoading(false);
    }, (error) => {
      console.warn("User might not have permissions to list admins yet", error);
    });

    return () => {
      unsubscribeOrders();
      unsubscribeProducts();
      unsubscribeAdmins();
    };
  }, [activeTab]);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { 
        status,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const [confirmDeleteOrderId, setConfirmDeleteOrderId] = useState<string | null>(null);

  const deleteOrder = async (orderId: string) => {
    if(!orderId) return;
    try {
      await deleteDoc(doc(db, 'orders', orderId));
      setConfirmDeleteOrderId(null);
    } catch (error: any) {
      console.error("Error deleting order:", error);
      handleFirestoreError(error, OperationType.DELETE, `orders/${orderId}`);
    }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const deleteProduct = async (productId: string | undefined) => {
    console.log("Attempting to delete product:", productId);
    if(!productId) {
      alert("Erreur: ID du produit manquant.");
      return;
    }

    try {
      console.log("Calling deleteDoc for product:", productId);
      await deleteDoc(doc(db, 'products', productId));
      console.log("Product deleted successfully");
      setConfirmDeleteId(null);
    } catch (error: any) {
      console.error("Error deleting product:", error);
      handleFirestoreError(error, OperationType.DELETE, `products/${productId}`);
    }
  };

  const addAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;
    setIsAddingAdmin(true);
    try {
      const email = newAdminEmail.trim().toLowerCase();
      await setDoc(doc(db, 'admins', email), {
        email,
        addedBy: auth.currentUser?.email,
        createdAt: serverTimestamp()
      });
      setNewAdminEmail('');
      alert("Administrateur ajouté avec succès.");
    } catch (error) {
      console.error("Error adding admin:", error);
      alert("Erreur: Vous n'avez probablement pas les permissions pour gérer les administrateurs.");
    } finally {
      setIsAddingAdmin(false);
    }
  };

  const removeAdmin = async (email: string) => {
    if (email === "digitalsoutien@gmail.com") {
      alert("Impossible de supprimer l'administrateur principal.");
      return;
    }
    if (!confirm(`Supprimer ${email} des administrateurs ?`)) return;
    try {
      await deleteDoc(doc(db, 'admins', email.toLowerCase()));
    } catch (error) {
      console.error("Error removing admin:", error);
      alert("Erreur lors de la suppression.");
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
      case 'cancelled': 
      case 'cancelled_by_customer': return 'bg-red-100 text-red-700';
      case 'deleted_by_customer': return 'bg-gray-100 text-gray-500';
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
        <div className="flex gap-2 relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)} 
            className={cn(
              "p-2 rounded-lg relative",
              notifications.length > 0 ? "bg-brand/10 text-brand" : "bg-white/10 text-white"
            )}
            title="Notifications"
          >
            {notifications.length > 0 ? <BellRing size={20} className="animate-bounce" /> : <Bell size={20} />}
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-dark">
                {notifications.length}
              </span>
            )}
          </button>
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

          {/* Notification dropdown */}
          <AnimatePresence>
            {showNotifications && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
              >
                <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
                  <h3 className="font-bold text-dark flex items-center gap-2">
                    <Bell size={16} className="text-brand" />
                    Notifications
                  </h3>
                  <button 
                    onClick={() => setNotifications([])}
                    className="text-[10px] uppercase font-black tracking-widest text-gray-400 hover:text-brand"
                  >
                    Effacer
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-10 text-center flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-200">
                        <Bell size={24} />
                      </div>
                      <p className="text-xs text-gray-400 font-medium italic">Aucune nouvelle notification</p>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {notifications.map((notif) => (
                        <div key={notif.id} className="p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                          <p className="text-sm text-dark font-medium leading-snug">{notif.text}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <Clock size={10} className="text-gray-300" />
                            <span className="text-[10px] text-gray-400">
                              {notif.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex p-4 gap-2">
        <button 
          onClick={() => setActiveTab('orders')}
          className={cn(
            "flex-1 py-3 rounded-xl font-bold transition-all text-sm",
            activeTab === 'orders' ? "bg-dark text-white shadow-lg" : "bg-white text-gray-500 border border-gray-100"
          )}
        >
          Orders ({orders.length})
        </button>
        <button 
          onClick={() => setActiveTab('products')}
          className={cn(
            "flex-1 py-3 rounded-xl font-bold transition-all text-sm",
            activeTab === 'products' ? "bg-dark text-white shadow-lg" : "bg-white text-gray-500 border border-gray-100"
          )}
        >
          Stock ({products.length})
        </button>
        <button 
          onClick={() => setActiveTab('admins')}
          className={cn(
            "flex-1 py-3 rounded-xl font-bold transition-all text-sm",
            activeTab === 'admins' ? "bg-dark text-white shadow-lg" : "bg-white text-gray-500 border border-gray-100"
          )}
        >
          Admins ({admins.length + 1})
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
              {['all', 'pending', 'processing', 'delivered', 'cancelled', 'cancelled_by_customer', 'deleted_by_customer'].map(status => (
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
                   status === 'delivered' ? 'Livré' :
                   status === 'cancelled' ? 'Annulé (Admin)' :
                   status === 'cancelled_by_customer' ? 'Annulé (Client)' : 'Masqué (Client)'}
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
                  <div className="flex items-center gap-4">
                    {order.productImage ? (
                      <img src={order.productImage} className="w-16 h-16 rounded-xl object-cover shrink-0 bg-gray-100 shadow-sm" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gray-50 flex items-center justify-center shrink-0">
                        <Package size={24} className="text-gray-300" />
                      </div>
                    )}
                    <div className="flex flex-col gap-1">
                      <span className="font-bold text-lg text-dark">{order.customerName}</span>
                      <div className="flex items-center gap-2">
                        <span className={cn("text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider", getStatusColor(order.status))}>
                        {order.status === 'pending' ? 'Attente' : 
                         order.status === 'processing' ? 'En cours' :
                         order.status === 'delivered' ? 'Livré' :
                         order.status === 'cancelled_by_customer' ? 'Annulé par Client' :
                         order.status === 'deleted_by_customer' ? 'Supprimé par Client' : 'Annulé'}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">{order.id?.slice(-6).toUpperCase()}</span>
                    </div>
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
                      <option value="cancelled_by_customer" disabled>👤 Client: Annulé</option>
                      <option value="deleted_by_customer" disabled>👤 Client: Masqué</option>
                    </select>
                  </div>
                  {confirmDeleteOrderId === order.id ? (
                    <div className="flex gap-1 shrink-0">
                      <button 
                        onClick={() => deleteOrder(order.id!)}
                        className="px-3 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase ring-2 ring-red-100"
                      >
                        OK
                      </button>
                      <button 
                        onClick={() => setConfirmDeleteOrderId(null)}
                        className="px-3 bg-gray-200 text-gray-600 rounded-xl text-[10px] font-bold"
                      >
                        ANNULER
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setConfirmDeleteOrderId(order.id!)}
                      className="w-12 h-12 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-100 transition-colors shrink-0"
                      title="Supprimer la commande"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : activeTab === 'products' ? (
        /* Products List */
        <div className="flex flex-col gap-4 p-4">
          {products.map(product => (
            <div key={product.id} className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex gap-4">
              <div className="relative shrink-0">
                <img src={product.imageUrl} className="w-24 h-24 rounded-xl object-cover bg-gray-100" />
                {product.images && product.images.length > 0 && (
                  <div className="absolute -top-2 -right-2 bg-brand text-white text-[8px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    +{product.images.length}
                  </div>
                )}
              </div>
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
                    {confirmDeleteId === product.id ? (
                      <div className="flex gap-1 flex-1">
                        <button 
                          onClick={() => deleteProduct(product.id)}
                          className="flex-1 py-2 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase ring-2 ring-red-100"
                        >
                          CONFIRMER
                        </button>
                        <button 
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-2 bg-gray-200 text-gray-600 rounded-lg text-[10px] font-bold"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setConfirmDeleteId(product.id!)}
                        className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"
                        title="Supprimer le produit"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
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
      ) : (
        /* Admins Section */
        <div className="flex flex-col gap-6 p-4 max-w-2xl mx-auto w-full">
          {isSuperAdmin ? (
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <ShieldCheck className="text-brand" size={24} />
                Ajouter un administrateur
              </h2>
              <form onSubmit={addAdmin} className="flex gap-2">
                <input 
                  type="email"
                  placeholder="Email du nouvel admin..."
                  required
                  className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand/20"
                  value={newAdminEmail}
                  onChange={e => setNewAdminEmail(e.target.value)}
                />
                <button 
                  type="submit"
                  disabled={isAddingAdmin}
                  className="p-3 bg-brand text-white rounded-xl shadow-lg shadow-brand/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  <UserPlus size={24} />
                </button>
              </form>
              <p className="text-[10px] text-gray-400 mt-3 italic">
                L'email doit être celui utilisé par la personne pour se connecter via Google.
              </p>
            </div>
          ) : (
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 text-sm text-blue-800">
              Seul l'administrateur principal peut ajouter ou révoquer des accès.
            </div>
          )}

          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest px-2">Liste des accès</h3>
            
            {/* Primary Admin */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-brand/20 flex justify-between items-center bg-brand/5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center font-bold">
                  DS
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-dark">digitalsoutien@gmail.com</span>
                  <span className="text-[10px] text-brand font-black uppercase tracking-wider">Créateur / Root</span>
                </div>
              </div>
              <div className="p-2 text-brand">
                <ShieldCheck size={20} />
              </div>
            </div>

            {/* Other Admins */}
            {admins.map(admin => (
              <div key={admin.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex justify-between items-center group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center font-bold">
                    {admin.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-dark">{admin.email}</span>
                    <span className="text-[10px] text-gray-400">Ajouté par: {admin.addedBy || 'Système'}</span>
                  </div>
                </div>
                {isSuperAdmin && (
                  <button 
                    onClick={() => removeAdmin(admin.email)}
                    className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                    title="Révoquer l'accès"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="bg-yellow-50 rounded-2xl p-4 border border-yellow-100 flex gap-3">
            <Clock size={20} className="text-yellow-600 shrink-0" />
            <p className="text-xs text-yellow-800 leading-relaxed">
              <strong>Conseil:</strong> Ne partagez l'accès qu'à des personnes de confiance. Un administrateur peut modifier vos produits, prix et voir toutes les commandes clients.
            </p>
          </div>
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
