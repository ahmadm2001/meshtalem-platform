'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, CheckCircle, Plus } from 'lucide-react';
import { productsApi, categoriesApi } from '@/lib/api';
import VendorLayout from '@/components/layout/VendorLayout';
import ImageUploader from '@/components/ImageUploader';
import toast from 'react-hot-toast';
import { PRODUCT_COLORS, DELIVERY_TIME_OPTIONS } from '@/lib/colors';

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [images, setImages] = useState<string[]>(['']);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [form, setForm] = useState({
    nameAr: '',
    descriptionAr: '',
    price: '',
    shippingFee: '0',
    warranty: 'none',
    stock: '',
    categoryId: '',
    subCategoryId: '',
    deliveryTime: '',
  });

  useEffect(() => {
    categoriesApi.getAll().then((r) => setCategories(r.data || [])).catch(() => {});
  }, []);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const rootId = e.target.value;
    const root = categories.find((c: any) => c.id === rootId);
    setSubCategories(root?.children || []);
    setForm({ ...form, categoryId: rootId, subCategoryId: '' });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageChange = (index: number, value: string) => {
    const updated = [...images];
    updated[index] = value;
    setImages(updated);
  };

  const addImageField = () => {
    if (images.length < 8) setImages([...images, '']);
  };

  const removeImageField = (index: number) => {
    if (images.length <= 1) { toast.error('يجب إضافة صورة واحدة على الأقل'); return; }
    setImages(images.filter((_, i) => i !== index));
  };

  const toggleColor = (key: string) => {
    setSelectedColors((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  };

  const validImages = images.filter((url) => url.trim() !== '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nameAr.trim()) { toast.error('يرجى إدخال اسم المنتج'); return; }
    if (!form.price || Number(form.price) <= 0) { toast.error('يرجى إدخال سعر صحيح'); return; }
    if (validImages.length < 1) {
      toast.error('يجب إضافة صورة واحدة على الأقل للمنتج');
      return;
    }

    setLoading(true);
    try {
      const finalCategoryId = form.subCategoryId || form.categoryId || undefined;
      await productsApi.create({
        nameAr: form.nameAr,
        descriptionAr: form.descriptionAr,
        price: Number(form.price),
        shippingFee: Number(form.shippingFee) || 0,
        warranty: form.warranty,
        stock: Number(form.stock) || 0,
        categoryId: finalCategoryId,
        images: validImages,
        deliveryTime: form.deliveryTime || undefined,
        colors: selectedColors.length > 0 ? selectedColors : undefined,
      });
      setDone(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'حدث خطأ أثناء إضافة المنتج');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <VendorLayout>
        <div className="max-w-lg mx-auto text-center py-16">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">تم إرسال المنتج للمراجعة!</h2>
          <p className="text-gray-500 text-sm mb-2">
            سيتم ترجمة المنتج تلقائياً إلى العبرية بواسطة الذكاء الاصطناعي.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            بعد مراجعة الإدارة وموافقتها، سيظهر المنتج في المتجر.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setDone(false);
                setForm({ nameAr:'', descriptionAr:'', price:'', shippingFee:'0', warranty:'none', stock:'', categoryId:'', subCategoryId:'', deliveryTime:'' });
                setImages(['']);
                setSubCategories([]);
                setSelectedColors([]);
              }}
              className="btn-primary"
            >
              إضافة منتج آخر
            </button>
            <button onClick={() => router.push('/products')} className="btn-secondary">
              قائمة منتجاتي
            </button>
          </div>
        </div>
      </VendorLayout>
    );
  }

  return (
    <VendorLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">إضافة منتج جديد</h1>

        {/* AI Translation Notice */}
        <div className="bg-gradient-to-l from-purple-50 to-blue-50 border border-purple-100 rounded-xl p-4 mb-6 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-purple-800 text-sm">ترجمة تلقائية بالذكاء الاصطناعي</p>
            <p className="text-purple-600 text-xs mt-0.5">
              أدخل بيانات المنتج بالعربية. سيتم ترجمتها تلقائياً إلى العبرية بواسطة الذكاء الاصطناعي قبل عرضها للعملاء.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Product Info */}
          <div className="card">
            <h2 className="font-semibold text-gray-800 mb-4 text-sm">معلومات المنتج</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المنتج (بالعربية) *</label>
                <input name="nameAr" value={form.nameAr} onChange={handleChange} required className="input-field" placeholder="مثال: حذاء رياضي أديداس" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">وصف المنتج (بالعربية)</label>
                <textarea name="descriptionAr" value={form.descriptionAr} onChange={handleChange} className="input-field" rows={4} placeholder="اكتب وصفاً تفصيلياً للمنتج، مميزاته، المواد المستخدمة..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">سعر المنتج (₪) *</label>
                  <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleChange} required className="input-field" placeholder="99.90" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رسم شحن (₪)</label>
                  <input name="shippingFee" type="number" min="0" step="0.01" value={form.shippingFee} onChange={handleChange} className="input-field" placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ضمان المنتج</label>
                  <select name="warranty" value={form.warranty} onChange={handleChange} className="input-field">
                    <option value="none">لا يوجد ضمان</option>
                    <option value="6_months">نصف سنة (6 أشهر)</option>
                    <option value="1_year">سنة</option>
                    <option value="1.5_years">سنة ونصف</option>
                    <option value="2_years">سنتان</option>
                    <option value="2.5_years">سنتان ونصف</option>
                    <option value="3_years">ثلاث سنوات</option>
                    <option value="3.5_years">ثلاث سنوات ونصف</option>
                    <option value="4_years">أربع سنوات</option>
                    <option value="4.5_years">أربع سنوات ونصف</option>
                    <option value="5_years">خمس سنوات</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الكمية المتاحة *</label>
                  <input name="stock" type="number" min="0" value={form.stock} onChange={handleChange} required className="input-field" placeholder="100" />
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الفئة الرئيسية</label>
                  <select value={form.categoryId} onChange={handleCategoryChange} className="input-field">
                    <option value="">-- اختر فئة رئيسية --</option>
                    {categories.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>{cat.nameAr || cat.nameHe}</option>
                    ))}
                  </select>
                </div>
                {subCategories.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الفئة الفرعية <span className="text-gray-400 font-normal">(اختياري)</span>
                    </label>
                    <select name="subCategoryId" value={form.subCategoryId}
                      onChange={e => setForm({ ...form, subCategoryId: e.target.value })}
                      className="input-field">
                      <option value="">-- كل {categories.find((c:any)=>c.id===form.categoryId)?.nameAr || 'الفئة'} --</option>
                      {subCategories.map((sub: any) => (
                        <option key={sub.id} value={sub.id}>{sub.nameAr || sub.nameHe}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Delivery Time */}
          <div className="card">
            <h2 className="font-semibold text-gray-800 mb-1 text-sm">مدة التوصيل</h2>
            <p className="text-xs text-gray-500 mb-3">المدة المتوقعة لتوصيل هذا المنتج للعميل</p>
            <select name="deliveryTime" value={form.deliveryTime} onChange={handleChange} className="input-field">
              <option value="">-- اختر مدة التوصيل --</option>
              {DELIVERY_TIME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.labelAr}</option>
              ))}
            </select>
          </div>

          {/* Colors */}
          <div className="card">
            <h2 className="font-semibold text-gray-800 mb-1 text-sm">الألوان المتوفرة</h2>
            <p className="text-xs text-gray-500 mb-4">اختر الألوان المتاحة لهذا المنتج (اختياري)</p>
            <div className="flex flex-wrap gap-3">
              {PRODUCT_COLORS.map((color) => {
                const isSelected = selectedColors.includes(color.key);
                return (
                  <button
                    key={color.key}
                    type="button"
                    onClick={() => toggleColor(color.key)}
                    title={color.nameAr}
                    className="flex flex-col items-center gap-1 group"
                  >
                    <span
                      className="block transition-all duration-150"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 4,
                        backgroundColor: color.hex,
                        border: isSelected
                          ? '3px solid #2563EB'
                          : color.hex === '#FFFFFF' || color.hex === '#E5D3B3'
                          ? '2px solid #d1d5db'
                          : '2px solid transparent',
                        boxShadow: isSelected ? '0 0 0 2px #bfdbfe' : undefined,
                        outline: 'none',
                      }}
                    />
                    <span className={`text-xs ${isSelected ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
                      {color.nameAr}
                    </span>
                  </button>
                );
              })}
            </div>
            {selectedColors.length > 0 && (
              <p className="mt-3 text-xs text-green-700 font-medium">
                تم اختيار {selectedColors.length} لون: {selectedColors.map(k => PRODUCT_COLORS.find(c=>c.key===k)?.nameAr).join('، ')}
              </p>
            )}
          </div>

          {/* Images Section */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-800 text-sm">صور المنتج *</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  أضف صوراً عبر رابط URL أو ارفعها مباشرة من جهازك
                </p>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${validImages.length >= 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {validImages.length} صور
              </span>
            </div>

            <div className="space-y-4">
              {images.map((url, index) => (
                <div key={index}>
                  <p className="text-xs font-medium text-gray-500 mb-1.5">
                    صورة {index + 1}{index === 0 ? ' (رئيسية)' : ''}
                  </p>
                  <ImageUploader
                    value={url}
                    onChange={(val) => handleImageChange(index, val)}
                    index={index}
                    required={index === 0}
                    showRemove={index >= 1}
                    onRemove={() => removeImageField(index)}
                  />
                </div>
              ))}
            </div>

            {images.length < 8 && (
              <button type="button" onClick={addImageField} className="mt-4 flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium">
                <Plus className="w-4 h-4" />
                إضافة صورة أخرى
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={loading} className="flex-1 btn-primary py-3 text-base">
              {loading ? 'جاري الإرسال...' : 'إرسال للمراجعة'}
            </button>
            <button type="button" onClick={() => router.push('/products')} className="btn-secondary px-6">
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </VendorLayout>
  );
}
