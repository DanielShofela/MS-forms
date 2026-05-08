export interface Order {
  id?: string;
  customerName: string;
  phone: string;
  city: string;
  address: string;
  productId: string;
  productName: string;
  quantity: number;
  deliveryMode: string;
  totalPrice: number;
  status: 'pending' | 'processing' | 'delivered' | 'cancelled';
  createdAt: any;
  updatedAt?: any;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  oldPrice?: number;
  imageUrl: string;
  stock: number;
  isPromo: boolean;
  marketingPoints: string[];
  createdAt?: any;
  updatedAt?: any;
}
