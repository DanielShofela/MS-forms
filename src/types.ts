export interface Order {
  id?: string;
  customerName: string;
  email: string;
  phone: string;
  city: string;
  address: string;
  productId: string;
  productName: string;
  productImage: string;
  variant?: string;
  quantity: number;
  deliveryMode: string;
  totalPrice: number;
  status: 'pending' | 'processing' | 'delivered' | 'cancelled' | 'cancelled_by_customer' | 'deleted_by_customer';
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
  images?: string[];
  stock: number;
  isPromo: boolean;
  marketingPoints: string[];
  createdAt?: any;
  updatedAt?: any;
}

export interface Admin {
  id?: string;
  email: string;
  addedBy?: string;
  createdAt: any;
}
