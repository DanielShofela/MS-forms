import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mail, ArrowLeft, Send, MapPin, Phone, User, Package, Truck, CheckCircle2, ShoppingCart } from 'lucide-react';
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
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const allImages = [product.imageUrl, ...(product.images || [])].filter(img => img && img.trim() !== '');
  const secondaryImages = (product.images || []).filter(img => img && img.trim() !== '');
  
  // Use secondary images if available, otherwise fallback to main for selection
  const variantOptions = secondaryImages.length > 0 ? secondaryImages : [product.imageUrl];

  const [formData, setFormData] = useState({
    customerName: '',
    email: auth.currentUser?.email || '',
    phone: '',
    city: '',
    address: '',
    deliveryMode: 'standard'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImage) {
      alert("Veuillez choisir un modèle (cliquez sur une image)");
      return;
    }
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
        productImage: selectedImage,
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

  const deliveryFees = {
    standard: product.marketingPoints.some(p => p.toLowerCase().includes('livraison gratuite')) ? 0 : 2000,
    express: product.marketingPoints.some(p => p.toLowerCase().includes('livraison gratuite')) ? 900 : 5000
  };

  const totalPrice = (product.price * quantity) + (deliveryFees[formData.deliveryMode as keyof typeof deliveryFees] || 0);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="px-5 py-4 flex items-center gap-4 sticky top-0 bg-white z-20 border-b border-gray-100">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-500 hover:text-dark">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-bold tracking-tight">VOTRE COMMANDE</h2>
      </header>

      <form onSubmit={handleSubmit} className="px-5 py-6 flex flex-col gap-8 pb-32">
        {/* Variant Selection Section */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-black text-dark uppercase tracking-widest flex items-center gap-2">
              <span className="w-6 h-6 bg-brand text-white rounded-full flex items-center justify-center text-[10px]">1</span>
              Choisissez votre modèle
            </h3>
            <p className="text-xs text-gray-500 ml-8">Cliquez sur l'image qui vous intéresse</p>
          </div>
          
          <div className="grid grid-cols-3 gap-3 ml-8">
            {variantOptions.map((img, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedImage(img)}
                className={cn(
                  "relative aspect-square rounded-2xl overflow-hidden border-2 transition-all",
                  selectedImage === img 
                    ? "border-brand ring-4 ring-brand/10 scale-105 z-10" 
                    : "border-gray-100 opacity-60 hover:opacity-100"
                )}
              >
                <img src={img} className="w-full h-full object-cover" />
                {selectedImage === img && (
                  <div className="absolute top-1 right-1 bg-brand text-white p-0.5 rounded-full">
                    <CheckCircle2 size={12} fill="currentColor" className="text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </section>

        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-8"
          >
            {/* Quantity Selector Section */}
            <section className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-black text-dark uppercase tracking-widest flex items-center gap-2">
                  <span className="w-6 h-6 bg-brand text-white rounded-full flex items-center justify-center text-[10px]">2</span>
                  Quantité souhaitée
                </h3>
              </div>
              
              <div className="flex items-center gap-6 ml-8">
                <div className="flex items-center gap-3 p-1 bg-gray-100 rounded-2xl">
                  <button 
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center font-bold text-dark shadow-sm active:scale-95 transition-transform"
                  >
                    -
                  </button>
                  <span className="font-bold w-6 text-center text-lg">{quantity}</span>
                  <button 
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center font-bold text-dark shadow-sm active:scale-95 transition-transform"
                  >
                    +
                  </button>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Total Articles</span>
                  <span className="font-bold text-brand">{formatPrice(product.price * quantity)}</span>
                </div>
              </div>
            </section>

            {/* Customer Details Section */}
            <section className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-black text-dark uppercase tracking-widest flex items-center gap-2">
                  <span className="w-6 h-6 bg-brand text-white rounded-full flex items-center justify-center text-[10px]">3</span>
                  Informations de livraison
                </h3>
              </div>
              
              <div className="flex flex-col gap-4 ml-8">
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
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Mode de livraison</span>
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
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Summary & Submit */}
            <div className="mt-4 p-6 bg-dark text-white rounded-3xl flex flex-col gap-4 shadow-xl border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <ShoppingCart size={80} />
              </div>
              
              <div className="flex justify-between items-center text-gray-400 text-sm">
                <span>Sous-total ({quantity} articles)</span>
                <span>{formatPrice(product.price * quantity)}</span>
              </div>
              <div className="flex justify-between items-center text-gray-400 text-sm">
                <span>Frais de livraison</span>
                <span>{formatPrice(deliveryFees[formData.deliveryMode as keyof typeof deliveryFees])}</span>
              </div>
              <div className="h-px bg-white/10 my-1" />
              <div className="flex justify-between items-center">
                <div>
                  <span className="block text-[10px] text-gray-500 uppercase font-black">Total à payer</span>
                  <span className="text-2xl font-black text-brand tracking-tight">{formatPrice(totalPrice)}</span>
                </div>
                <div className="bg-brand/20 text-brand px-3 py-1 rounded-full text-[10px] font-black uppercase">
                  Paiement à la réception
                </div>
              </div>
              
              <button 
                disabled={loading}
                className={cn(
                  "cta-button w-full mt-2 h-14 text-lg",
                  loading && "opacity-50 cursor-not-allowed"
                )}
              >
                {loading ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 size={22} />
                    Valider ma commande
                  </>
                )}
              </button>
              
              <p className="text-[10px] text-center text-gray-500 leading-relaxed max-w-[200px] mx-auto">
                En confirmant, vous vous engagez à réceptionner votre colis lors du passage du livreur.
              </p>
            </div>
          </motion.div>
        )}
      </form>
    </div>
  );
}
