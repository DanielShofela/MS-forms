import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Save, Tag, PenTool, Hash, Info, Image as ImageIcon } from 'lucide-react';
import { db, storage } from '../lib/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Product } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface ProductFormProps {
  product: Product | null;
  onClose: () => void;
}

export default function ProductForm({ product, onClose }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    oldPrice: '',
    stock: '10',
    isPromo: true,
    marketingPoint1: 'Livraison gratuite à domicile',
    marketingPoint2: 'Garantie 2 ans certifiée',
    marketingPoint3: 'Installation incluse'
  });
  const [imageUrl, setImageUrl] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        description: product.description,
        price: product.price.toString(),
        oldPrice: product.oldPrice?.toString() || '',
        stock: product.stock.toString(),
        isPromo: product.isPromo,
        marketingPoint1: product.marketingPoints[0] || '',
        marketingPoint2: product.marketingPoints[1] || '',
        marketingPoint3: product.marketingPoints[2] || ''
      });
      setImageUrl(product.imageUrl);
    }
  }, [product]);

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 2000;
          const MAX_HEIGHT = 2000;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error('Canvas to Blob failed'));
            },
            'image/jpeg',
            0.85 // High quality
          );
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let file: File | undefined;
    
    if ('files' in e.target && e.target.files) {
      file = e.target.files[0];
    } else if ('dataTransfer' in e) {
      file = e.dataTransfer.files[0];
    }

    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert("L'image est trop lourde. Le maximum autorisé est de 10 Mo.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(10);

    try {
      // Affichage immédiat du preview local
      const previewUrl = URL.createObjectURL(file);
      setImageUrl(previewUrl);

      console.log("Compression de l'image...");
      const compressedBlob = await compressImage(file);
      
      console.log("Upload HD vers Storage...");
      const fileRef = ref(storage, `products/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`);
      setUploadProgress(40);
      
      await uploadBytes(fileRef, compressedBlob);
      const downloadUrl = await getDownloadURL(fileRef);
      
      setImageUrl(downloadUrl);
      console.log("Image sauvegardée sur le cloud.");
      setUploadProgress(100);
    } catch (error) {
      console.error("Erreur upload image:", error);
      alert("Erreur lors de l'hébergement de l'image. Veuillez réessayer.");
      setImageUrl('');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isUploading) {
      alert("Veuillez attendre que l'image termine l'hébergement HD.");
      return;
    }

    if (!imageUrl || imageUrl.trim() === '' || imageUrl.startsWith('blob:')) {
      alert("Veuillez importer une image produit.");
      return;
    }

    setLoading(true);

    try {
      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        oldPrice: formData.oldPrice ? parseFloat(formData.oldPrice) : null,
        stock: parseInt(formData.stock) || 10,
        isPromo: formData.isPromo,
        imageUrl: imageUrl,
        marketingPoints: [
          formData.marketingPoint1,
          formData.marketingPoint2,
          formData.marketingPoint3
        ].filter(p => p && p.trim() !== ''),
        updatedAt: serverTimestamp()
      };

      if (product?.id) {
        await updateDoc(doc(db, 'products', product.id), productData);
      } else {
        await addDoc(collection(db, 'products'), {
          ...productData,
          createdAt: serverTimestamp()
        });
      }
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'products');
    } finally {
      setLoading(false);
    }
  };

  const handleUrlChange = (val: string) => {
    // Si on vide l'URL manuellement, on reset l'image
    setImageUrl(val);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-y-auto">
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-lg min-h-[90vh] sm:min-h-0 flex flex-col overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold">{product ? 'Modifier le produit' : 'Nouveau produit'}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-dark">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-6 flex flex-col gap-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Section Image */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-2 bg-brand/10 rounded-lg text-brand">
                <ImageIcon size={18} />
              </div>
              <h3 className="text-sm font-bold text-dark">Image du produit</h3>
            </div>

            {/* Preview and Upload */}
            <div 
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => { e.preventDefault(); setDragActive(false); handleImageUpload(e); }}
              className={`relative aspect-video rounded-3xl border-2 border-dashed transition-all overflow-hidden flex flex-col items-center justify-center gap-3 ${
                dragActive ? 'border-brand bg-brand/5' : 'border-gray-200 bg-gray-50'
              }`}
            >
              {imageUrl ? (
                <>
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button 
                      type="button" 
                      onClick={() => {
                        setImageUrl('');
                      }}
                      className="bg-white/20 backdrop-blur-md p-3 rounded-full text-white hover:bg-white/40 transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>
                  {isUploading && (
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        className="h-full bg-brand"
                      />
                    </div>
                  )}
                </>
              ) : (
                <>
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm font-bold text-gray-500">Traitement HD...</p>
                    </div>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-brand">
                        <Upload size={28} />
                      </div>
                      <div className="text-center px-4">
                        <p className="text-sm font-bold text-dark">Qualité HD (Max 10Mo)</p>
                        <p className="text-xs text-gray-500 mt-1">Glissez une image haute résolution</p>
                      </div>
                    </>
                  )}
                  <input 
                    type="file" 
                    disabled={isUploading}
                    accept="image/*" 
                    onChange={handleImageUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                </>
              )}
            </div>

            {/* URL Input as alternative */}
            <div className="input-with-icon">
              <span className="icon"><ImageIcon size={18} /></span>
              <input 
                type="text" 
                placeholder="Ou collez l'URL de l'image ici..." 
                className={`input-field text-xs ${imageUrl.startsWith('data:') ? 'bg-brand/5 border-brand/20' : ''}`} 
                value={imageUrl.startsWith('data:') ? '' : imageUrl} 
                onChange={e => handleUrlChange(e.target.value)} 
              />
              {imageUrl.startsWith('data:') && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <span className="text-[10px] font-bold text-brand uppercase">Fichier</span>
                </div>
              )}
            </div>
            <p className="text-[10px] text-gray-400 px-1">
              {imageUrl.startsWith('data:') 
                ? "L'image importée par fichier sera utilisée. Pour utiliser un lien, videz d'abord l'image."
                : "Astuce: Copiez l'adresse d'une image sur le web et collez-la ici."}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div className="input-with-icon">
              <span className="icon"><Tag size={18} /></span>
              <input required type="text" placeholder="Nom du produit" className="input-field !pl-12" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="input-with-icon">
                <span className="icon text-brand"><Hash size={18} /></span>
                <input required type="number" placeholder="Prix (CFA)" className="input-field font-bold !pl-12" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
              </div>
              <div className="input-with-icon">
                <span className="icon"><Hash size={18} /></span>
                <input type="number" placeholder="Ancien prix" className="input-field text-gray-400 line-through !pl-12" value={formData.oldPrice} onChange={e => setFormData({ ...formData, oldPrice: e.target.value })} />
              </div>
            </div>

            <div className="input-with-icon items-start">
              <span className="icon mt-4"><Info size={18} /></span>
              <textarea required rows={3} placeholder="Description marketing..." className="input-field resize-none !pl-12" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
            </div>

            <div className="flex flex-col gap-3 p-4 bg-gray-50 rounded-2xl">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Points Forts (Mise en avant)</span>
              <input type="text" placeholder="Argument 1" className="bg-transparent border-b border-gray-200 outline-none text-sm py-1" value={formData.marketingPoint1} onChange={e => setFormData({ ...formData, marketingPoint1: e.target.value })} />
              <input type="text" placeholder="Argument 2" className="bg-transparent border-b border-gray-200 outline-none text-sm py-1" value={formData.marketingPoint2} onChange={e => setFormData({ ...formData, marketingPoint2: e.target.value })} />
              <input type="text" placeholder="Argument 3" className="bg-transparent border-b border-gray-200 outline-none text-sm py-1" value={formData.marketingPoint3} onChange={e => setFormData({ ...formData, marketingPoint3: e.target.value })} />
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl">
              <div className="flex flex-col">
                <span className="text-sm font-bold">Activer la promotion</span>
                <span className="text-[10px] text-gray-500">Affiche le badge promo</span>
              </div>
              <button 
                type="button"
                onClick={() => setFormData({ ...formData, isPromo: !formData.isPromo })}
                className={`w-12 h-6 rounded-full transition-all relative ${formData.isPromo ? 'bg-brand' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.isPromo ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
          </div>

          <button 
            disabled={loading || isUploading}
            className={`cta-button w-full mb-8 relative overflow-hidden ${loading || isUploading ? 'opacity-70' : ''}`}
          >
            <Save size={20} className="relative z-10" />
            <span className="relative z-10">
              {loading ? 'Sauvegarde...' : isUploading ? 'Chargement Image HD...' : 'Sauvegarder le produit'}
            </span>
          </button>
        </form>
      </motion.div>
    </div>
  );
}
