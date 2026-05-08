import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, ShoppingBag, PhoneCall } from 'lucide-react';

interface SuccessViewProps {
  orderId: string;
  onReset: () => void;
}

export default function SuccessView({ orderId, onReset }: SuccessViewProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center gap-8 bg-white">
      <motion.div 
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-24 h-24 rounded-full bg-green-100 text-green-600 flex items-center justify-center"
      >
        <CheckCircle2 size={56} />
      </motion.div>
      
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl">Merci !</h1>
        <p className="text-xl font-bold text-green-600">Votre commande a bien été reçue</p>
        <div className="mt-2 py-2 px-4 bg-gray-100 rounded-lg inline-block self-center">
          <span className="text-xs text-gray-500 uppercase tracking-widest block mb-1">N° de suivi</span>
          <span className="font-mono font-bold text-lg">{orderId.slice(-8).toUpperCase()}</span>
        </div>
      </div>

      <div className="marketing-card shadow-lg flex flex-col gap-4 text-left w-full max-w-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-brand/10 text-brand">
            <PhoneCall size={20} />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm">Confirmation par téléphone</span>
            <p className="text-xs text-gray-500 mt-1">Notre équipe vous appellera dans les 15 prochaines minutes pour confirmer les détails de livraison.</p>
          </div>
        </div>
      </div>

      <button 
        onClick={onReset}
        className="cta-button w-full max-w-xs"
      >
        <ShoppingBag size={20} />
        Retour à la boutique
      </button>
    </div>
  );
}
