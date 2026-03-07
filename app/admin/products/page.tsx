'use client';
import { useEffect, useState } from 'react';
import {
  CheckCircle, XCircle, Edit, Search, Package, Eye, EyeOff,
  Trash2, X, ShoppingBag, Star, ChevronLeft, ChevronRight, Save, AlertTriangle
} from 'lucide-react';
import { productsApi } from '@/lib/api';
import toast from 'react-hot-toast';

const STATUS_LABELS: Record<string, string> = {
  pending: 'ממתין', approved: 'מאושר', rejected: 'נדחה', draft: 'טיוטה'
};
const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  draft: 'bg-gray-100 text-gray-600',
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');

  // Preview modal
  const [previewProduct, setPreviewProduct] = useState<any | null>(null);
  const [previewImageIdx, setPreviewImageIdx] = useState(0);

  // Edit modal
  const [editProduct, setEditProduct] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [editSaving, setEditSaving] = useState(false);

  // Reject modal
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = async (f: string) => {
    setLoading(true);
    try {
      const r = f === 'pending'
        ? await productsApi.getPending()
        : await productsApi.getAll({ status: f });
      setProducts(r.data?.products || r.data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(filter); }, [filter]);

  const openPreview = async (product: any) => {
    // Load full product details (admin endpoint - works for pending/hidden products too)
    try {
      const r = await productsApi.getByIdAdmin(product.id);
      setPreviewProduct(r.data);
    } catch {
      setPreviewProduct(product);
    }
    setPreviewImageIdx(0);
  };

  const approve = async (id: string) => {
    try {
      // Show loading toast while translating
      const toastId = toast.loading('מתרגם אוטומטית...');
      await productsApi.approve(id);
      toast.dismiss(toastId);
      setProducts((p) => p.filter((x) => x.id !== id));
      setPreviewProduct(null);
      toast.success('✅ מוצר אושר ותורגם לעברית אוטומטית');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'שגיאה באישור המוצר';
      toast.error(`שגיאה: ${msg}`);
    }
  };

  const submitReject = async () => {
    if (!rejectId || !rejectReason.trim()) return;
    await productsApi.reject(rejectId, rejectReason);
    setProducts((p) => p.filter((x) => x.id !== rejectId));
    setRejectId(null);
    setRejectReason('');
    setPreviewProduct(null);
    toast.success('מוצר נדחה');
  };

  const toggleHide = async (id: string) => {
    const r = await productsApi.toggleHide(id);
    setProducts((p) => p.map((x) => x.id === id ? { ...x, isHidden: r.data.isHidden } : x));
    toast.success(r.data.isHidden ? '🙈 מוצר הוסתר' : '👁 מוצר הוצג מחדש');
  };

  const deleteProduct = async (id: string, name: string) => {
    if (!confirm(`למחוק את "${name}"? פעולה זו לא ניתנת לביטול.`)) return;
    await productsApi.adminDelete(id);
    setProducts((p) => p.filter((x) => x.id !== id));
    toast.success('מוצר נמחק');
  };

  const openEdit = (product: any) => {
    setEditProduct(product);
    setEditForm({
      nameHe: product.nameHe || '',
      nameAr: product.nameAr || '',
      descriptionHe: product.descriptionHe || '',
      descriptionAr: product.descriptionAr || '',
      price: product.price || '',
      stock: product.stock || '',
      images: (product.images || []).join('\n'),
    });
  };

  const saveEdit = async () => {
    if (!editProduct) return;
    setEditSaving(true);
    try {
      const payload = {
        ...editForm,
        price: Number(editForm.price),
        stock: Number(editForm.stock),
        images: editForm.images.split('\n').map((s: string) => s.trim()).filter(Boolean),
      };
      const r = await productsApi.adminUpdate(editProduct.id, payload);
      setProducts((p) => p.map((x) => x.id === editProduct.id ? { ...x, ...r.data } : x));
      setEditProduct(null);
      toast.success('✅ מוצר עודכן בהצלחה');
    } finally { setEditSaving(false); }
  };

  // Unique vendors for filter
  const vendors = Array.from(new Map(
    products.filter((p) => p.vendor?.user).map((p) => [p.vendor.user.email, p.vendor])
  ).values());

  const filtered = products.filter((p) => {
    const matchSearch = (p.nameHe || p.nameAr || '').toLowerCase().includes(search.toLowerCase());
    const matchVendor = !vendorFilter || p.vendorId === vendorFilter;
    return matchSearch && matchVendor;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">ניהול מוצרים</h1>

      {/* Filters */}
      <div className="card mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="חיפוש מוצרים..." className="input-field pr-9" />
          </div>
          {vendors.length > 0 && (
            <select value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)}
              className="input-field text-sm">
              <option value="">כל הספקים</option>
              {vendors.map((v: any) => (
                <option key={v.id} value={v.id}>{v.businessName || v.user?.email}</option>
              ))}
            </select>
          )}
          <div className="flex gap-2 flex-wrap">
            {['pending', 'approved', 'rejected'].map((s) => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {{ pending: 'ממתינים', approved: 'מאושרים', rejected: 'נדחו' }[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products List */}
      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="card animate-pulse h-20" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">לא נמצאו מוצרים</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((product) => (
            <div key={product.id} className={`card ${product.isHidden ? 'opacity-60 border-dashed' : ''}`}>
              <div className="flex items-start gap-4">
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                  {product.images?.[0] ? (
                    <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{product.nameHe || product.nameAr}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[product.status]}`}>
                      {STATUS_LABELS[product.status]}
                    </span>
                    {product.isHidden && (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">מוסתר</span>
                    )}
                  </div>
                  <div className="flex gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                    <span>₪{Number(product.price).toFixed(2)}</span>
                    <span>מלאי: {product.stock}</span>
                    {product.vendor?.businessName && (
                      <span className="text-blue-600">ספק: {product.vendor.businessName}</span>
                    )}
                    {product.vendor?.user?.email && (
                      <span>{product.vendor.user.email}</span>
                    )}
                    {product.category?.nameHe && (
                      <span>קטגוריה: {product.category.nameHe}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                  {/* Preview */}
                  <button onClick={() => openPreview(product)}
                    title="תצוגה מקדימה"
                    className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors">
                    <Eye className="w-4 h-4" />
                  </button>

                  {/* Edit */}
                  <button onClick={() => openEdit(product)}
                    title="עריכה"
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>

                  {/* Hide/Show */}
                  <button onClick={() => toggleHide(product.id)}
                    title={product.isHidden ? 'הצג מוצר' : 'הסתר מוצר'}
                    className={`p-1.5 rounded-lg transition-colors ${product.isHidden ? 'text-green-500 hover:bg-green-50' : 'text-orange-400 hover:bg-orange-50'}`}>
                    {product.isHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>

                  {/* Approve (pending only) */}
                  {product.status === 'pending' && (
                    <button onClick={() => openPreview(product)}
                      className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-medium">
                      <CheckCircle className="w-3.5 h-3.5" />אשר
                    </button>
                  )}

                  {/* Reject (pending only) */}
                  {product.status === 'pending' && (
                    <button onClick={() => { setRejectId(product.id); setRejectReason(''); }}
                      className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-medium">
                      <XCircle className="w-3.5 h-3.5" />דחה
                    </button>
                  )}

                  {/* Delete */}
                  <button onClick={() => deleteProduct(product.id, product.nameHe || product.nameAr)}
                    title="מחיקה"
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== PREVIEW MODAL ===== */}
      {previewProduct && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setPreviewProduct(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
              <div>
                <h2 className="font-bold text-gray-900">תצוגה מקדימה - כמו בחנות</h2>
                <p className="text-xs text-gray-500 mt-0.5">כך הלקוח יראה את המוצר</p>
              </div>
              <button onClick={() => setPreviewProduct(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Product Preview - Customer View */}
            <div className="p-6">
              {/* Images Carousel */}
              {previewProduct.images?.length > 0 && (
                <div className="relative mb-6">
                  <div className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                    <img
                      src={previewProduct.images[previewImageIdx]}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  </div>
                  {previewProduct.images.length > 1 && (
                    <>
                      <button onClick={() => setPreviewImageIdx((i) => Math.max(0, i - 1))}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-1 shadow">
                        <ChevronLeft className="w-5 h-5" />
                      </button>
                      <button onClick={() => setPreviewImageIdx((i) => Math.min(previewProduct.images.length - 1, i + 1))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-1 shadow">
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      <div className="flex gap-2 mt-3 justify-center">
                        {previewProduct.images.map((_: any, i: number) => (
                          <button key={i} onClick={() => setPreviewImageIdx(i)}
                            className={`w-2 h-2 rounded-full transition-colors ${i === previewImageIdx ? 'bg-primary-600' : 'bg-gray-300'}`} />
                        ))}
                      </div>
                      <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                        {previewProduct.images.map((img: string, i: number) => (
                          <button key={i} onClick={() => setPreviewImageIdx(i)}
                            className={`w-14 h-14 rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${i === previewImageIdx ? 'border-primary-500' : 'border-gray-200'}`}>
                            <img src={img} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Product Info */}
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{previewProduct.nameHe || previewProduct.nameAr}</h1>
                  {previewProduct.nameAr && previewProduct.nameHe && (
                    <p className="text-sm text-gray-400 mt-1" dir="rtl">{previewProduct.nameAr}</p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-3xl font-bold text-primary-600">₪{Number(previewProduct.price).toFixed(2)}</span>
                  <div className="flex items-center gap-1 text-yellow-400">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                  </div>
                </div>

                {previewProduct.descriptionHe && (
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">תיאור המוצר</h3>
                    <p className="text-gray-600 text-sm leading-relaxed">{previewProduct.descriptionHe}</p>
                  </div>
                )}

                {previewProduct.descriptionAr && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <h3 className="font-semibold text-gray-700 mb-1 text-sm">التوصيف الأصلي (ערבית)</h3>
                    <p className="text-gray-600 text-sm leading-relaxed" dir="rtl">{previewProduct.descriptionAr}</p>
                  </div>
                )}

                <div className="flex gap-4 text-sm text-gray-500">
                  <span>מלאי: {previewProduct.stock} יחידות</span>
                  {previewProduct.category?.nameHe && <span>קטגוריה: {previewProduct.category.nameHe}</span>}
                </div>

                {/* Vendor Info (admin only) */}
                {previewProduct.vendor && (
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <h3 className="font-semibold text-blue-800 mb-2 text-sm">🏪 פרטי ספק (נראה למנהל בלבד)</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
                      <div><span className="font-medium">שם עסק:</span> {previewProduct.vendor.businessName || '-'}</div>
                      <div><span className="font-medium">מייל:</span> {previewProduct.vendor.user?.email || '-'}</div>
                      <div><span className="font-medium">טלפון:</span> {previewProduct.vendor.phone || previewProduct.vendor.user?.phone || '-'}</div>
                      <div><span className="font-medium">כתובת:</span> {previewProduct.vendor.address || '-'}</div>
                    </div>
                  </div>
                )}

                {/* Simulated Add to Cart */}
                <button className="w-full btn-primary flex items-center justify-center gap-2 py-3 pointer-events-none opacity-90">
                  <ShoppingBag className="w-5 h-5" />
                  הוסף לעגלה (תצוגה בלבד)
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            {previewProduct.status === 'pending' && (
              <div className="p-4 border-t bg-gray-50 flex gap-3">
                <button onClick={() => approve(previewProduct.id)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors">
                  <CheckCircle className="w-5 h-5" />
                  אשר ופרסם בחנות
                </button>
                <button onClick={() => { setRejectId(previewProduct.id); setRejectReason(''); setPreviewProduct(null); }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-semibold border border-red-200 transition-colors">
                  <XCircle className="w-5 h-5" />
                  דחה מוצר
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== EDIT MODAL ===== */}
      {editProduct && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setEditProduct(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
              <h2 className="font-bold text-gray-900">עריכת מוצר</h2>
              <button onClick={() => setEditProduct(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">שם עברי</label>
                  <input value={editForm.nameHe} onChange={(e) => setEditForm({ ...editForm, nameHe: e.target.value })}
                    className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">שם ערבי</label>
                  <input value={editForm.nameAr} onChange={(e) => setEditForm({ ...editForm, nameAr: e.target.value })}
                    className="input-field" dir="rtl" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">תיאור עברי</label>
                <textarea value={editForm.descriptionHe} onChange={(e) => setEditForm({ ...editForm, descriptionHe: e.target.value })}
                  className="input-field" rows={3} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">תיאור ערבי</label>
                <textarea value={editForm.descriptionAr} onChange={(e) => setEditForm({ ...editForm, descriptionAr: e.target.value })}
                  className="input-field" rows={3} dir="rtl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">מחיר (₪)</label>
                  <input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">מלאי</label>
                  <input type="number" value={editForm.stock} onChange={(e) => setEditForm({ ...editForm, stock: e.target.value })}
                    className="input-field" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">תמונות (URL אחד בכל שורה)</label>
                <textarea value={editForm.images} onChange={(e) => setEditForm({ ...editForm, images: e.target.value })}
                  className="input-field font-mono text-xs" rows={4} placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg" />
              </div>
            </div>
            <div className="p-4 border-t flex gap-3">
              <button onClick={saveEdit} disabled={editSaving}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold disabled:opacity-50">
                <Save className="w-5 h-5" />
                {editSaving ? 'שומר...' : 'שמור שינויים'}
              </button>
              <button onClick={() => setEditProduct(null)}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium">
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== REJECT MODAL ===== */}
      {rejectId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="font-bold text-gray-900">דחיית מוצר</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">הספק יקבל הודעה עם הסיבה. נא לפרט כדי לעזור לו לתקן.</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="לדוגמה: התמונות לא ברורות, המחיר גבוה מדי, תיאור חסר..."
              className="input-field mb-4" rows={3}
            />
            <div className="flex gap-3">
              <button onClick={submitReject} disabled={!rejectReason.trim()}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold disabled:opacity-40">
                דחה מוצר
              </button>
              <button onClick={() => setRejectId(null)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl">
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
