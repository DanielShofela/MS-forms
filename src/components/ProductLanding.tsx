import React from 'react';
import { motion } from 'motion/react';
import { ShoppingCart, Star, Clock, Truck, ShieldCheck, Package } from 'lucide-react';
import { Product } from '../types';
import { formatPrice } from '../lib/utils';

interface ProductLandingProps {
  product: Product;
  onOrderClick: () => void;
}

export default function ProductLanding({ product, onOrderClick }: ProductLandingProps) {
  return (
    <div className="flex flex-col gap-6 pb-24">
      {/* Product Image Section */}
      <div className="relative w-full aspect-square bg-gray-200 overflow-hidden">
        <img 
          src={product.imageUrl} 
          alt={product.name}
          className="w-full h-full object-cover"
        />
        {product.isPromo && (
          <div className="absolute top-4 left-4 bg-brand text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
            PROMO -{Math.round((1 - product.price/product.oldPrice!) * 100)}%
          </div>
        )}
        <div className="absolute bottom-4 right-4 bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1 shadow-lg animate-pulse">
          <Clock size={16} />
          Stock limité !
        </div>
      </div>

      {/* Product Info */}
      <div className="px-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl leading-tight">{product.name}</h1>
          <div className="flex items-center gap-2 text-brand">
            <div className="flex">
              {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
            </div>
            <span className="text-sm font-medium text-gray-500">(128 avis clients)</span>
          </div>
        </div>

        <div className="flex items-end gap-3">
          <span className="text-4xl font-bold text-brand">{formatPrice(product.price)}</span>
          {product.oldPrice && (
            <span className="text-xl text-gray-400 line-through mb-1">{formatPrice(product.oldPrice)}</span>
          )}
        </div>

        <p className="text-gray-600 leading-relaxed">
          {product.description}
        </p>

        {/* Marketing Points */}
        <div className="grid grid-cols-1 gap-3 mt-2">
          {product.marketingPoints.map((point, index) => (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              key={index} 
              className="flex items-center gap-3 marketing-card"
            >
              <div className="w-10 h-10 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0">
                {index === 0 && <Truck size={20} />}
                {index === 1 && <ShieldCheck size={20} />}
                {index === 2 && <Clock size={20} />}
              </div>
              <span className="font-medium text-sm">{point}</span>
            </motion.div>
          ))}
        </div>

        {/* Tracking info for conversion */}
        <div className="mt-4 p-5 bg-dark text-white rounded-3xl flex flex-col gap-4 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-2xl" />
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand/20 rounded-lg text-brand">
              <Package size={20} />
            </div>
            <h4 className="font-bold">Suivi de commande</h4>
          </div>
          <p className="text-xs text-gray-400">
            Une fois votre commande passée, vous pourrez suivre son état en temps réel directement ici.
          </p>
          <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-widest font-bold border-t border-white/10 pt-3">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Service actif 24h/24
          </div>
        </div>

        {/* Floating CTA */}
        <div className="fixed bottom-0 left-0 w-full p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 z-50">
          <button 
            onClick={onOrderClick}
            className="cta-button w-full text-lg shadow-xl"
          >
            <ShoppingCart size={22} />
            Commander maintenant
          </button>
        </div>
      </div>
    </div>
  );
}
