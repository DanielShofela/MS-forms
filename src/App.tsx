import React, { useState, useEffect } from 'react';
import ProductLanding from './components/ProductLanding';
import OrderForm from './components/OrderForm';
import SuccessView from './components/SuccessView';
import AdminPanel from './components/AdminPanel';
import CustomerOrders from './components/CustomerOrders';
import { Product } from './types';
import { ShieldCheck, LogIn, X, LogOut, ShoppingBag, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

const DUMMY_PRODUCT: Product = {
  id: 'ref-smart-101',
  name: "Réfrigérateur Intelligent MAISON SMART + - 450L",
  description: "Gardez vos aliments frais plus longtemps avec la technologie Smart Cooling. Design élégant en acier inoxydable, faible consommation d'énergie (A+++), et contrôle tactile intuitif.",
  price: 245000,
  oldPrice: 320000,
  imageUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=2070&auto=format&fit=crop",
  images: [],
  stock: 12,
  isPromo: true,
  marketingPoints: [
    "Livraison gratuite à domicile",
    "Garantie 2 ans certifiée",
    "Installation incluse"
  ]
};

type ViewState = 'landing' | 'form' | 'success' | 'admin' | 'customerOrders';

export default function App() {
  const [view, setView] = useState<ViewState>('landing');
  const [lastOrderId, setLastOrderId] = useState<string>('');
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Authentication observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoadingAuth(false);
      
      if (u) {
        if (window.location.hash === '#admin' && u.email === 'digitalsoutien@gmail.com') {
          setView('admin');
        } else if (window.location.hash === '#orders') {
          setView('customerOrders');
        }
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

  const [authError, setAuthError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const provider = new GoogleAuthProvider();
      // Force account selection to avoid some silent failures
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      setShowLogin(false);
      
      if (result.user.email === 'digitalsoutien@gmail.com') {
        setView('admin');
        window.location.hash = 'admin';
      } else {
        setView('customerOrders');
        window.location.hash = 'orders';
      }
    } catch (error: any) {
      console.error("Login failed", error);
      if (error.code === 'auth/network-request-failed') {
        setAuthError("Erreur réseau. Veuillez vérifier votre connexion ou assurez-vous que ce domaine est autorisé dans votre console Firebase.");
      } else if (error.code === 'auth/popup-blocked') {
        setAuthError("Le popup de connexion a été bloqué par votre navigateur. Veuillez l'autoriser.");
      } else if (error.code === 'auth/popup-closed-by-user') {
        setAuthError("La fenêtre de connexion a été fermée avant la fin du processus.");
      } else {
        setAuthError("Une erreur est survenue lors de la connexion.");
      }
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
            <div className="bg-dark text-white p-4 flex justify-between items-center h-16">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center font-bold">M</div>
                <span className="font-display font-bold tracking-tight uppercase">MAISON SMART +</span>
              </div>
              <div className="flex items-center gap-1">
                {user && (
                  <button 
                    onClick={() => isAdminLoggedIn ? setView('admin') : setView('customerOrders')}
                    className="p-2 text-brand"
                  >
                    {isAdminLoggedIn ? <ShieldCheck size={22} /> : <ShoppingBag size={22} />}
                  </button>
                )}
                <button 
                  onClick={() => user ? logout() : setShowLogin(true)}
                  className="p-2 text-gray-500"
                >
                  {user ? <LogOut size={20} /> : <User size={22} />}
                </button>
              </div>
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

        {view === 'customerOrders' && user && (
          <motion.div 
            key="customer-orders"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <CustomerOrders 
              userEmail={user.email} 
              onBack={() => setView('landing')} 
              onLogout={logout} 
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Login Modal */}
      <AnimatePresence>
        {showLogin && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="bg-white rounded-3xl p-8 w-full max-w-sm flex flex-col gap-6 relative"
            >
              <button onClick={() => setShowLogin(false)} className="absolute top-4 right-4 p-2 text-gray-400">
                <X size={20} />
              </button>
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="w-16 h-16 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mb-2">
                  <User size={32} />
                </div>
                <h3 className="text-2xl">Connectez-vous</h3>
                <p className="text-gray-500 text-sm">Suivez vos commandes et gérez vos informations personnelles.</p>
              </div>
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                {authError && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[10px] text-red-600 font-medium">
                    {authError}
                  </div>
                )}
                <button className="cta-button w-full bg-dark">
                  <LogIn size={20} />
                  Se connecter avec Google
                </button>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-3">
                  <ShoppingBag size={18} className="text-brand shrink-0 mt-1" />
                  <p className="text-[10px] text-gray-500">
                    <span className="font-bold text-dark block mb-1">NOTE POUR LE SUIVI</span>
                    Utilisez le <span className="font-bold">même email Google</span> que celui renseigné lors de votre commande pour voir vos colis.
                  </p>
                </div>
                <p className="text-[10px] text-center text-gray-400 uppercase tracking-widest mt-2">
                  Protégé par MAISON SMART + Security
                </p>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
