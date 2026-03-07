'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ShoppingCart, ArrowRight, Minus, Plus, Package } from 'lucide-react';
import { productsApi } from '@/lib/api';
import { useCartStore } from '@/store';
import StoreLayout from '@/components/layout/StoreLayout';
import toast from 'react-hot-toast';

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const { addItem } = useCartStore();

  useEffect(() => {
    productsApi.getById(id)
      .then((r) => setProduct(r.data))
      .catch(() => router.push('/products'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAdd = () => {
    addItem({
      productId: product.id,
      name: product.nameHe,
      price: Number(product.price),
      quantity: qty,
      image: product.images?.[0],
    });
    toast.success(`${qty} יחידות נוספו לעגלה!`);
  };

  if (loading) return (
    <StoreLayout>
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-pulse">
          <div className="bg-gray-200 rounded-xl h-80" />
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded w-3/4" />
            <div className="h-8 bg-gray-200 rounded w-1/3" />
            <div className="h-20 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    </StoreLayout>
  );

  if (!product) return null;

  return (
    <StoreLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 mb-6 transition-colors">
          <ArrowRight className="w-4 h-4" />
          חזרה לחנות
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Images */}
          <div>
            <div className="relative h-80 bg-gray-100 rounded-xl overflow-hidden mb-3">
              {product.images?.[activeImg] ? (
                <Image src={product.images[activeImg]} alt={product.nameHe} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <Package className="w-16 h-16" />
                </div>
              )}
            </div>
            {product.images?.length > 1 && (
              <div className="flex gap-2">
                {product.images.map((img: string, i: number) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                      activeImg === i ? 'border-primary-500' : 'border-gray-200'
                    }`}
                  >
                    <Image src={img} alt="" fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.nameHe}</h1>
            <p className="text-3xl font-bold text-primary-600 mb-4">₪{Number(product.price).toFixed(2)}</p>

            {product.descriptionHe && (
              <p className="text-gray-600 text-sm leading-relaxed mb-6">{product.descriptionHe}</p>
            )}

            <div className="flex items-center gap-2 text-sm mb-6">
              <Package className="w-4 h-4" />
              {product.stock > 0 ? (
                <span className="text-green-600 font-medium">במלאי</span>
              ) : (
                <span className="text-red-500 font-medium">אזל מהמלאי</span>
              )}
            </div>

            {/* Quantity */}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-sm font-medium text-gray-700">כמות:</span>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="px-3 py-2 hover:bg-gray-50 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 py-2 font-medium text-gray-900 min-w-[3rem] text-center">{qty}</span>
                <button
                  onClick={() => setQty(Math.min(product.stock, qty + 1))}
                  className="px-3 py-2 hover:bg-gray-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              onClick={handleAdd}
              disabled={product.stock === 0}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-base"
            >
              <ShoppingCart className="w-5 h-5" />
              {product.stock === 0 ? 'אזל מהמלאי' : 'הוסף לעגלה'}
            </button>
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}
