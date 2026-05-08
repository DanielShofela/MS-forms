import React, { useState, useEffect } from 'react';
import ProductLanding from './components/ProductLanding';
import OrderForm from './components/OrderForm';
import SuccessView from './components/SuccessView';
import AdminPanel from './components/AdminPanel';
import { Product } from './types';
import { ShieldCheck, LogIn, X, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

const DUMMY_PRODUCT: Product = {
  id: 'ref-smart-101',
  name: "Réfrigérateur Intelligent Maison Smart - 450L",
  description: "Gardez vos aliments frais plus longtemps avec la technologie Smart Cooling. Design élégant en acier inoxydable, faible consommation d'énergie (A+++), et contrôle tactile intuitif.",
  price: 245000,
  oldPrice: 320000,
  imageUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=2070&auto=format&fit=crop",
  stock: 12,
  isPromo: true,
  marketingPoints: [
    "Livraison gratuite à domicile",
    "Garantie 2 ans certifiée",
    "Installation incluse"
  ]
};

type ViewState = 'landing' | 'form' | 'success' | 'admin';

export default function App() {
  const [view, setView] = useState<ViewState>('landing');
  const [lastOrderId, setLastOrderId] = useState<string>('');
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Authentication observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoadingAuth(false);
      
      if (u && window.location.hash === '#admin') {
        setView('admin');
      }
    });

    // Fetch products
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsubscribeProducts = onSnapshot(q, (snapshot) => {
      const pData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[];
      setProducts(pData);
      setLoadingProducts(false);
    });

    return () => {
      unsubscribe();
      unsubscribeProducts();
    };
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setShowAdminLogin(false);
      setView('admin');
      window.location.hash = 'admin';
    } catch (error) {
      console.error("Login failed", error);
      alert("Erreur de connexion");
    }
  };

  const handleOrderSuccess = (id: string) => {
    setLastOrderId(id);
    setView('success');
    window.scrollTo(0, 0);
  };

  const logout = async () => {
    await signOut(auth);
    setView('landing');
    window.location.hash = '';
  };

  const isAdminLoggedIn = !!(user && user.email === 'digitalsoutien@gmail.com');

  // Select the product to show: latest added or specific from hash ?p=id
  const currentProduct = products.length > 0 ? products[0] : DUMMY_PRODUCT;

  return (
    <div className="max-w-md mx-auto min-h-screen bg-white shadow-2xl relative">
      <AnimatePresence mode="wait">
        {view === 'landing' && (
          <motion.div 
            key="landing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="bg-dark text-white p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center font-bold">M</div>
                <span className="font-display font-bold tracking-tight uppercase">Maison Smart</span>
              </div>
              <button 
                onClick={() => isAdminLoggedIn ? setView('admin') : setShowAdminLogin(true)}
                className="p-2 text-gray-500"
              >
                <ShieldCheck size={20} />
              </button>
            </div>
            
            {loadingProducts ? (
              <div className="flex justify-center p-20">
                <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <ProductLanding 
                product={currentProduct} 
                onOrderClick={() => setView('form')} 
              />
            )}
          </motion.div>
        )}

        {view === 'form' && (
          <motion.div 
            key="form"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <OrderForm 
              product={currentProduct} 
              onBack={() => setView('landing')} 
              onSuccess={handleOrderSuccess}
            />
          </motion.div>
        )}

        {view === 'success' && (
          <motion.div 
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <SuccessView orderId={lastOrderId} onReset={() => setView('landing')} />
          </motion.div>
        )}

        {view === 'admin' && isAdminLoggedIn && (
          <motion.div 
            key="admin"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <AdminPanel onLogout={logout} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Login Modal */}
      <AnimatePresence>
        {showAdminLogin && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-sm flex flex-col gap-6 relative"
            >
              <button onClick={() => setShowAdminLogin(false)} className="absolute top-4 right-4 p-2 text-gray-400">
                <X size={20} />
              </button>
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="w-16 h-16 rounded-2xl bg-dark text-white flex items-center justify-center mb-2">
                  <ShieldCheck size={32} />
                </div>
                <h3 className="text-2xl">Accès Admin</h3>
                <p className="text-gray-500 text-sm">Entrez votre code pour accéder au dashboard</p>
              </div>
              <form onSubmit={handleAdminLogin} className="flex flex-col gap-4">
                <button className="cta-button w-full bg-dark">
                  <LogIn size={20} />
                  Se connecter avec Google
                </button>
                <p className="text-[10px] text-center text-gray-400 uppercase tracking-widest mt-2">
                  Protégé par Maison Smart Security
                </p>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
