import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mail, ArrowLeft, Send, MapPin, Phone, User, Package, Truck, CheckCircle2 } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Product, Order } from '../types';
import { formatPrice, cn } from '../lib/utils';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface OrderFormProps {
  product: Product;
  onBack: () => void;
  onSuccess: (orderId: string) => void;
}

export default function OrderForm({ product, onBack, onSuccess }: OrderFormProps) {
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [formData, setFormData] = useState({
    customerName: '',
    email: auth.currentUser?.email || '',
    phone: '',
    city: '',
    address: '',
    deliveryMode: 'standard'
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setFormData(prev => ({ ...prev, email: u.email || prev.email }));
      }
    });
    return () => unsubscribe();
  }, []);

  const isFreeDelivery = product.marketingPoints.some(p => p.toLowerCase().includes('livraison gratuite'));

  const deliveryFees = {
    standard: isFreeDelivery ? 0 : 2000,
    express: isFreeDelivery ? 900 : 5000
  };

  const totalPrice = (product.price * quantity) + (deliveryFees[formData.deliveryMode as keyof typeof deliveryFees] || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const orderData: Order = {
        customerName: formData.customerName,
        email: formData.email,
        phone: formData.phone,
        city: formData.city,
        address: formData.address,
        productId: product.id,
        productName: product.name,
        quantity,
        deliveryMode: formData.deliveryMode,
        totalPrice,
        status: 'pending',
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      onSuccess(docRef.id);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'orders');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="px-5 py-4 flex items-center gap-4 sticky top-0 bg-white z-10 border-bottom border-gray-100">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-500 hover:text-dark">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl">Finaliser ma commande</h2>
      </header>

      <form onSubmit={handleSubmit} className="px-5 py-6 flex flex-col gap-6">
        {/* Product Summary */}
        <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-4">
          <img src={product.imageUrl} alt="" className="w-20 h-20 rounded-xl object-cover" />
          <div className="flex flex-col">
            <span className="font-bold">{product.name}</span>
            <span className="text-brand font-medium">{formatPrice(product.price)}</span>
            <div className="flex items-center gap-3 mt-2">
              <button 
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center font-bold"
              >
                -
              </button>
              <span className="font-bold w-4 text-center">{quantity}</span>
              <button 
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center font-bold"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="flex flex-col gap-4">
          <div className="input-with-icon">
            <User className="icon" size={20} />
            <input 
              required
              type="text"
              placeholder="Nom complet"
              className="input-field"
              value={formData.customerName}
              onChange={e => setFormData({ ...formData, customerName: e.target.value })}
            />
          </div>

          <div className="input-with-icon">
            <Mail className="icon" size={20} />
            <input 
              required
              type="email"
              placeholder="Email pour le suivi"
              className="input-field"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="input-with-icon">
            <Phone className="icon" size={20} />
            <input 
              required
              type="tel"
              placeholder="Téléphone WhatsApp"
              className="input-field"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="input-with-icon">
            <MapPin className="icon" size={20} />
            <input 
              required
              type="text"
              placeholder="Ville / Commune"
              className="input-field"
              value={formData.city}
              onChange={e => setFormData({ ...formData, city: e.target.value })}
            />
          </div>

          <div className="input-with-icon items-start">
            <Package className="icon mt-4" size={20} />
            <textarea 
              required
              rows={2}
              placeholder="Adresse précise (Quartier, porte...)"
              className="input-field resize-none"
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <span className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">Mode de livraison</span>
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button"
                onClick={() => setFormData({ ...formData, deliveryMode: 'standard' })}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2",
                  formData.deliveryMode === 'standard' ? "border-brand bg-brand/5" : "border-gray-100 bg-white"
                )}
              >
                <Truck size={24} className={formData.deliveryMode === 'standard' ? "text-brand" : "text-gray-400"} />
                <div className="flex flex-col items-center">
                  <span className="font-bold text-sm">Standard</span>
                  <span className="text-xs text-brand font-bold">{deliveryFees.standard === 0 ? "Gratuit" : formatPrice(deliveryFees.standard)}</span>
                  <span className="text-[10px] text-gray-500">2-3 jours</span>
                </div>
              </button>
              <button 
                type="button"
                onClick={() => setFormData({ ...formData, deliveryMode: 'express' })}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2",
                  formData.deliveryMode === 'express' ? "border-brand bg-brand/5" : "border-gray-100 bg-white"
                )}
              >
                <Send size={24} className={formData.deliveryMode === 'express' ? "text-brand" : "text-gray-400"} />
                <div className="flex flex-col items-center">
                  <span className="font-bold text-sm">Express</span>
                  <span className="text-xs text-brand font-bold">{formatPrice(deliveryFees.express)}</span>
                  <span className="text-[10px] text-gray-500">24h max</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Summary & Submit */}
        <div className="mt-4 p-5 bg-dark text-white rounded-2xl flex flex-col gap-3">
          <div className="flex justify-between items-center text-gray-400 text-sm">
            <span>Sous-total ({quantity}x)</span>
            <span>{formatPrice(product.price * quantity)}</span>
          </div>
          <div className="flex justify-between items-center text-gray-400 text-sm">
            <span>Frais de livraison</span>
            <span>{formatPrice(deliveryFees[formData.deliveryMode as keyof typeof deliveryFees])}</span>
          </div>
          <div className="h-px bg-white/10 my-1" />
          <div className="flex justify-between items-center text-xl font-bold">
            <span>Total à payer</span>
            <span className="text-brand">{formatPrice(totalPrice)}</span>
          </div>
          <button 
            disabled={loading}
            className={cn(
              "cta-button w-full mt-4 bg-brand hover:bg-brand-dark transition-colors border-none",
              loading && "opacity-50 cursor-not-allowed"
            )}
          >
            {loading ? "Traitement..." : (
              <>
                <CheckCircle2 size={22} />
                Confirmer ma commande
              </>
            )}
          </button>
          <p className="text-[10px] text-center text-gray-500 mt-2">
            Paiement à la livraison. En cliquant, vous acceptez nos conditions de vente.
          </p>
        </div>
      </form>
    </div>
  );
}
