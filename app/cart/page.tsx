'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft } from 'lucide-react';
import { useCartStore } from '@/store';
import StoreLayout from '@/components/layout/StoreLayout';

export default function CartPage() {
  const router = useRouter();
  const { items, removeItem, updateQty, total, clearCart } = useCartStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <StoreLayout>
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </StoreLayout>
    );
  }

  if (items.length === 0) {
    return (
      <StoreLayout>
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <ShoppingCart className="w-20 h-20 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">העגלה שלך ריקה</h2>
          <p className="text-gray-500 mb-6">הוסף מוצרים כדי להתחיל לקנות</p>
          <Link href="/products" className="btn-primary inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />לחנות
          </Link>
        </div>
      </StoreLayout>
    );
  }

  return (
    <StoreLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">עגלת קניות</h1>
          <button onClick={clearCart} className="text-sm text-red-500 hover:text-red-700 transition-colors">נקה עגלה</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {items.map((item) => (
              <div key={item.productId} className="card flex items-center gap-4">
                <div className="relative w-20 h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                  {item.image ? (
                    <Image src={item.image} alt={item.name} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingCart className="w-8 h-8 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 text-sm truncate">{item.name}</h3>
                  <p className="text-primary-600 font-bold mt-1">&#8362;{item.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    <button onClick={() => updateQty(item.productId, item.quantity - 1)} className="px-2 py-1.5 hover:bg-gray-50 transition-colors"><Minus className="w-3 h-3" /></button>
                    <span className="px-3 py-1.5 text-sm font-medium">{item.quantity}</span>
                    <button onClick={() => updateQty(item.productId, item.quantity + 1)} className="px-2 py-1.5 hover:bg-gray-50 transition-colors"><Plus className="w-3 h-3" /></button>
                  </div>
                  <button onClick={() => removeItem(item.productId)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="text-sm font-bold text-gray-900 w-20 text-left">&#8362;{(item.price * item.quantity).toFixed(2)}</div>
              </div>
            ))}
          </div>
          <div className="lg:col-span-1">
            <div className="card sticky top-24">
              <h2 className="font-bold text-gray-900 mb-4">סיכום הזמנה</h2>
              <div className="space-y-2 mb-4">
                {items.map((item) => (
                  <div key={item.productId} className="flex justify-between text-sm text-gray-600">
                    <span>{item.name} x{item.quantity}</span>
                    <span>&#8362;{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-100 pt-3 mb-4">
                <div className="flex justify-between font-bold text-gray-900">
                  <span>סה&quot;כ</span>
                  <span className="text-primary-600 text-lg">&#8362;{total().toFixed(2)}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">+ &#8362;25 משלוח עד הבית</p>
              </div>
              <button onClick={() => router.push('/checkout')} className="btn-primary w-full text-center block py-3">
                המשך לתשלום
              </button>
              <Link href="/products" className="btn-secondary w-full text-center block py-2 mt-2 text-sm">
                המשך בקניות
              </Link>
            </div>
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}
