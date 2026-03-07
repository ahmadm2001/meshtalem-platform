'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ShoppingCart, Star, Search } from 'lucide-react';
import { productsApi, categoriesApi } from '@/lib/api';
import { useCartStore } from '@/store';
import StoreLayout from '@/components/layout/StoreLayout';
import toast from 'react-hot-toast';

function ProductsContent() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]); // root categories with children
  const [selectedCat, setSelectedCat] = useState('');      // root category id
  const [selectedSub, setSelectedSub] = useState('');      // sub-category id
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const { addItem } = useCartStore();

  useEffect(() => {
    categoriesApi.getAll().then((r) => setCategories(r.data || []));
  }, []);

  // Sub-categories of currently selected root
  const subCategories = categories.find((c: any) => c.id === selectedCat)?.children || [];

  const selectRoot = (id: string) => {
    setSelectedCat(id);
    setSelectedSub(''); // reset sub when root changes
  };

  useEffect(() => {
    setLoading(true);
    // Filter by sub-category if selected, otherwise by root category
    const filterCatId = selectedSub || selectedCat || undefined;
    productsApi.getPublic({
      categoryId: filterCatId,
      search: search || undefined,
      limit: 40,
    })
      .then((r) => setProducts(r.data?.products || r.data || []))
      .finally(() => setLoading(false));
  }, [selectedCat, selectedSub, search]);

  const handleAddToCart = (product: any) => {
    addItem({
      productId: product.id,
      name: product.nameHe,
      price: Number(product.price),
      quantity: 1,
      image: product.images?.[0],
    });
    toast.success('נוסף לעגלה!');
  };

  return (
    <StoreLayout>
      {/* Hero */}
      <div className="bg-gradient-to-l from-primary-600 to-primary-500 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">ברוכים הבאים למשתלם</h1>
          <p className="text-primary-100 text-lg mb-6">מוצרים איכותיים במחירים הכי משתלמים, משלוח עד הבית</p>
          <div className="max-w-lg mx-auto flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="מה אתה מחפש?"
              className="flex-1 px-4 py-3 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-white"
            />
            <button className="bg-white text-primary-600 px-5 py-3 rounded-lg font-medium hover:bg-primary-50 transition-colors">
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6">
          {/* Sidebar - Categories */}
          <aside className="w-52 shrink-0 hidden md:block">
            <div className="card sticky top-24">
              <h3 className="font-bold text-gray-800 mb-3 text-sm">קטגוריות</h3>
              <ul className="space-y-0.5">
                <li>
                  <button
                    onClick={() => { selectRoot(''); }}
                    className={`w-full text-right text-sm px-3 py-2 rounded-lg transition-colors ${
                      !selectedCat ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    כל המוצרים
                  </button>
                </li>
                {categories.map((cat: any) => (
                  <li key={cat.id}>
                    <button
                      onClick={() => selectRoot(cat.id)}
                      className={`w-full text-right text-sm px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                        selectedCat === cat.id ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span>{cat.nameHe}</span>
                      {(cat.children?.length ?? 0) > 0 && (
                        <span className="text-xs text-gray-400">{cat.children.length}</span>
                      )}
                    </button>
                    {/* Sub-categories - shown when root is selected */}
                    {selectedCat === cat.id && (cat.children?.length ?? 0) > 0 && (
                      <ul className="mr-3 mt-0.5 space-y-0.5 border-r-2 border-primary-100 pr-2">
                        <li>
                          <button
                            onClick={() => setSelectedSub('')}
                            className={`w-full text-right text-xs px-2 py-1.5 rounded-lg transition-colors ${
                              !selectedSub ? 'text-primary-600 font-medium' : 'text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            הכל
                          </button>
                        </li>
                        {cat.children.map((sub: any) => (
                          <li key={sub.id}>
                            <button
                              onClick={() => setSelectedSub(sub.id)}
                              className={`w-full text-right text-xs px-2 py-1.5 rounded-lg transition-colors ${
                                selectedSub === sub.id ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {sub.nameHe}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            {/* Mobile categories */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-2 md:hidden">
              <button
                onClick={() => { selectRoot(''); }}
                className={`shrink-0 text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  !selectedCat ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-600'
                }`}
              >
                הכל
              </button>
              {categories.map((cat: any) => (
                <button
                  key={cat.id}
                  onClick={() => selectRoot(cat.id)}
                  className={`shrink-0 text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    selectedCat === cat.id ? 'bg-primary-600 text-white border-primary-600' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {cat.nameHe}
                </button>
              ))}
            </div>
            {/* Mobile sub-categories */}
            {selectedCat && subCategories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 mb-4 md:hidden">
                <button
                  onClick={() => setSelectedSub('')}
                  className={`shrink-0 text-xs px-3 py-1 rounded-full border transition-colors ${
                    !selectedSub ? 'bg-primary-100 text-primary-700 border-primary-200' : 'border-gray-200 text-gray-500'
                  }`}
                >
                  הכל
                </button>
                {subCategories.map((sub: any) => (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedSub(sub.id)}
                    className={`shrink-0 text-xs px-3 py-1 rounded-full border transition-colors ${
                      selectedSub === sub.id ? 'bg-primary-100 text-primary-700 border-primary-200' : 'border-gray-200 text-gray-500'
                    }`}
                  >
                    {sub.nameHe}
                  </button>
                ))}
              </div>
            )}

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="card animate-pulse">
                    <div className="bg-gray-200 rounded-lg h-40 mb-3" />
                    <div className="h-4 bg-gray-200 rounded mb-2" />
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingCart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium text-gray-600">לא נמצאו מוצרים</p>
                <p className="text-gray-400 text-sm mt-1">נסה לשנות את מונחי החיפוש</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {products.map((product) => (
                  <div key={product.id} className="card p-0 overflow-hidden hover:shadow-md transition-shadow group">
                    <Link href={`/products/${product.id}`}>
                      <div className="relative h-44 bg-gray-100">
                        {product.images?.[0] ? (
                          <Image
                            src={product.images[0]}
                            alt={product.nameHe}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <ShoppingCart className="w-10 h-10" />
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="font-medium text-gray-900 text-sm line-clamp-2 mb-1">{product.nameHe}</h3>
                        <p className="text-primary-600 font-bold text-base">₪{Number(product.price).toFixed(2)}</p>
                      </div>
                    </Link>
                    <div className="px-3 pb-3">
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="w-full btn-primary text-sm py-2 flex items-center justify-center gap-2"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        הוסף לעגלה
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </StoreLayout>
  );
}

export default function ProductsPage() {
  return (
    <Suspense>
      <ProductsContent />
    </Suspense>
  );
}
