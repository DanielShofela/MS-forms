import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Package, Truck, CheckCircle2, Clock, ChevronLeft, LogOut, ShoppingBag, X, Trash2, Ban, ShieldCheck } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Order } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface CustomerOrdersProps {
  userEmail: string;
  onBack: () => void;
  onLogout: () => void;
}

export default function CustomerOrders({ userEmail, onBack, onLogout }: CustomerOrdersProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userEmail) return;

    // We filter by email which matches the order email
    // We also exclude orders hidden by the customer
    const q = query(
      collection(db, 'orders'),
      where('email', '==', userEmail),
      where('status', '!=', 'deleted_by_customer'),
      orderBy('status'), // Needed because of the != filter
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const oData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Order[];
      setOrders(oData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userEmail]);

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'delivered': return { icon: <CheckCircle2 className="text-green-500" />, label: 'Livré', color: 'bg-green-50 text-green-700' };
      case 'processing': return { icon: <Truck className="text-blue-500" />, label: 'En cours', color: 'bg-blue-50 text-blue-700' };
      case 'cancelled': 
      case 'cancelled_by_customer': return { icon: <X className="text-red-500" />, label: 'Annulé', color: 'bg-red-50 text-red-700' };
      default: return { icon: <Clock className="text-orange-500" />, label: 'En attente', color: 'bg-orange-50 text-orange-700' };
    }
  };

  const cancelOrder = async (orderId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir annuler cette commande ?")) return;
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'cancelled_by_customer',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const hideOrder = async (orderId: string) => {
    if (!window.confirm("Voulez-vous retirer cette commande de votre historique ? Elle restera visible pour l'administration.")) return;
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: 'deleted_by_customer',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fr-FR').format(price) + ' F CFA';
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="bg-dark text-white p-6 shadow-lg sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 -ml-2 text-gray-400">
              <ChevronLeft size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold">Mes Commandes</h1>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">{userEmail}</p>
            </div>
          </div>
          <button onClick={onLogout} className="p-2 text-gray-400">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <div className="flex-1 px-4 py-8">
        <div className="mb-6 flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
          <ShieldCheck className="text-blue-500 shrink-0" size={20} />
          <p className="text-[11px] text-blue-800 leading-tight">
            Toutes vos commandes et demandes sont transmises directement à l'administrateur pour traitement.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4">
            <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500">Chargement de vos commandes...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center gap-6">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
              <ShoppingBag size={40} />
            </div>
            <div>
              <h3 className="text-lg font-bold">Aucune commande trouvée</h3>
              <p className="text-sm text-gray-500 mt-2">
                Pensez à utiliser le même email lors de votre commande pour la retrouver ici.
              </p>
            </div>
            <button onClick={onBack} className="cta-button">
              Explorer les produits
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {orders.map((order, index) => {
              const status = getStatusInfo(order.status);
              return (
                <motion.div 
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border border-gray-100 rounded-3xl p-5 shadow-sm bg-white"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center overflow-hidden">
                        {order.productImage ? (
                          <img src={order.productImage} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={24} className="text-gray-400" />
                        )}
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Commande #{order.id?.slice(-6).toUpperCase()}</span>
                        <h4 className="font-bold text-sm line-clamp-1">{order.productName}</h4>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold ${status.color}`}>
                      {status.icon}
                      {status.label}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Quantité</span>
                      <span className="font-bold">{order.quantity}x</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Mode de livraison</span>
                      <span className="font-bold capitalize">{order.deliveryMode === 'express' ? '✈️ Express' : '🚚 Standard'}</span>
                    </div>
                    <div className="h-px bg-gray-200" />
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-gray-500 font-medium">Total payé à la livraison</span>
                      <span className="text-lg font-bold text-dark">{formatPrice(order.totalPrice)}</span>
                    </div>
                  </div>

                  {order.status === 'pending' && (
                    <div className="mt-4 flex flex-col gap-4">
                      <div className="flex items-center gap-2 p-3 bg-brand/5 rounded-2xl border border-brand/10">
                        <div className="w-2 h-2 rounded-full bg-brand animate-pulse" />
                        <p className="text-[10px] text-brand font-medium">
                          Votre commande est en attente de traitement par nos équipes.
                        </p>
                      </div>
                      <button 
                        onClick={() => cancelOrder(order.id!)}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100"
                      >
                        <Ban size={14} />
                        Annuler la commande
                      </button>
                    </div>
                  )}

                  {(order.status === 'delivered' || order.status === 'cancelled' || order.status === 'cancelled_by_customer') && (
                    <div className="mt-4">
                      <button 
                        onClick={() => hideOrder(order.id!)}
                        className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gray-50 text-gray-500 rounded-2xl text-xs font-bold border border-gray-100"
                      >
                        <Trash2 size={14} />
                        Retirer de l'historique
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <footer className="p-8 text-center bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-400">
          Une question ? Contactez notre support au <span className="text-dark font-bold">+225 00 00 00 00 00</span>
        </p>
      </footer>
    </div>
  );
}
