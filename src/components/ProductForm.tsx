import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Save, Tag, PenTool, Hash, Info, Image as ImageIcon, Package } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Product } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface ProductFormProps {
  product: Product | null;
  onClose: () => void;
}

export default function ProductForm({ product, onClose }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
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
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState<number | null>(null);

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
      setAdditionalImages(product.images || []);
    }
  }, [product]);

  const compressImage = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Define target dimensions (HD is enough for products)
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
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
        if (ctx) {
          // Add white background for transparent PNGs converted to JPEGs
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
        }
        
        // JPEG compression 0.6 provides a great reduction in size (around 100-150kb) while looking perfect on mobile
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent, index: number) => {
    let file: File | undefined;
    
    if ('files' in (e.target as any) && (e.target as any).files) {
      file = (e.target as any).files[0];
    } else if ('dataTransfer' in (e as any) && (e as any).dataTransfer) {
      file = (e as any).dataTransfer.files[0];
    }

    if (!file) return;

    if (file.size > 1200000) {
      alert("L'image est vraiment trop lourde (" + Math.round(file.size/1024) + " Ko). Veuillez choisir une image de moins de 1.2 Mo (1200 Ko).");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const result = reader.result as string;
      // Automatically compress the image after reading it
      const compressed = await compressImage(result);
      
      if (index === 0) {
        setImageUrl(compressed);
      } else {
        const newImages = [...additionalImages];
        newImages[index - 1] = compressed;
        setAdditionalImages(newImages);
      }
    };
    reader.readAsDataURL(file);
  };

  const setImageUrlAtIndex = (val: string, index: number) => {
    if (index === 0) {
      setImageUrl(val);
    } else {
      const newImages = [...additionalImages];
      newImages[index - 1] = val;
      // Filter out empty strings if they are at the end, but keep the slots for UI
      setAdditionalImages(newImages);
    }
  };

  const removeImage = (index: number) => {
    if (index === 0) {
      setImageUrl('');
    } else {
      const newImages = [...additionalImages];
      newImages.splice(index - 1, 1);
      setAdditionalImages(newImages);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!imageUrl || imageUrl.trim() === '') {
      alert("La première image est obligatoire.");
      return;
    }

    if (!formData.name || !formData.price) {
      alert("Nom et prix sont obligatoires.");
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
        images: additionalImages.filter(img => img && img.trim() !== ''),
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
          {/* Section Images */}
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand/10 rounded-lg text-brand">
                  <ImageIcon size={18} />
                </div>
                <h3 className="text-sm font-bold text-dark">Images du produit (Max 4)</h3>
              </div>
              <span className="text-[10px] text-gray-400 font-medium bg-gray-100 px-2 py-0.5 rounded-full">
                {1 + additionalImages.filter(img => img && img.trim() !== '').length} / 4
              </span>
            </div>

            {/* Main Image Slot */}
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Image Principale (Obligatoire)</span>
              <div 
                onDragOver={(e) => { e.preventDefault(); setDragActive(0); }}
                onDragLeave={() => setDragActive(null)}
                onDrop={(e) => { e.preventDefault(); setDragActive(null); handleImageUpload(e, 0); }}
                className={`relative aspect-video rounded-3xl border-2 border-dashed transition-all overflow-hidden flex flex-col items-center justify-center gap-3 ${
                  dragActive === 0 ? 'border-brand bg-brand/5' : 'border-gray-200 bg-gray-50'
                }`}
              >
                {imageUrl ? (
                  <>
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button type="button" onClick={() => removeImage(0)} className="bg-white/20 backdrop-blur-md p-3 rounded-full text-white">
                        <X size={20} />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <Upload size={24} className="text-brand" />
                    <p className="text-[10px] font-bold text-dark">Glissez ou cliquez</p>
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 0)} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </>
                )}
              </div>
              <input 
                type="text" 
                placeholder="Lien URL de l'image principale..." 
                className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-[10px] outline-none"
                value={imageUrl.startsWith('data:') ? '' : imageUrl}
                onChange={(e) => setImageUrlAtIndex(e.target.value, 0)}
              />
            </div>

            {/* Additional Images Grid */}
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((idx) => {
                const currentImg = additionalImages[idx - 1];
                return (
                  <div key={idx} className="flex flex-col gap-2">
                    <div 
                      onDragOver={(e) => { e.preventDefault(); setDragActive(idx); }}
                      onDragLeave={() => setDragActive(null)}
                      onDrop={(e) => { e.preventDefault(); setDragActive(null); handleImageUpload(e, idx); }}
                      className={`relative aspect-square rounded-2xl border-2 border-dashed transition-all overflow-hidden flex flex-col items-center justify-center gap-1 ${
                        dragActive === idx ? 'border-brand bg-brand/5' : 'border-gray-100 bg-gray-50'
                      }`}
                    >
                      {currentImg ? (
                        <>
                          <img src={currentImg} alt={`Extra ${idx}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                            <button type="button" onClick={() => removeImage(idx)} className="bg-white/20 backdrop-blur-sm p-1.5 rounded-full text-white">
                              <X size={14} />
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <Upload size={16} className="text-gray-300" />
                          <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, idx)} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </>
                      )}
                    </div>
                    <input 
                      type="text" 
                      placeholder="URL..." 
                      className="bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 text-[8px] outline-none"
                      value={currentImg && currentImg.startsWith('data:') ? '' : (currentImg || '')}
                      onChange={(e) => setImageUrlAtIndex(e.target.value, idx)}
                    />
                  </div>
                );
              })}
            </div>
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

            <div className="input-with-icon">
              <span className="icon text-gray-400"><Package size={18} /></span>
              <input 
                required 
                type="number" 
                placeholder="Quantité en stock" 
                className="input-field !pl-12" 
                value={formData.stock} 
                onChange={e => setFormData({ ...formData, stock: e.target.value })} 
              />
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
            disabled={loading}
            className={`cta-button w-full mb-8 ${loading ? 'opacity-50' : ''}`}
          >
            <Save size={20} />
            {loading ? 'Enregistrement...' : 'Sauvegarder le produit'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
