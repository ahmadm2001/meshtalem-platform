'use client';
import { useEffect, useState } from 'react';
import { ShoppingBag, User, Phone, Navigation, Package, Copy, Check } from 'lucide-react';
import { ordersApi } from '@/lib/api';
import VendorLayout from '@/components/layout/VendorLayout';
import toast from 'react-hot-toast';
import { getColorByKey, getDeliveryLabelAr } from '@/lib/colors';

const ITEM_STATUSES = [
  { value: 'pending',    label: 'معلق',         cls: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmed',  label: 'مؤكد',         cls: 'bg-blue-100 text-blue-800' },
  { value: 'processing', label: 'قيد التنفيذ',  cls: 'bg-indigo-100 text-indigo-800' },
  { value: 'shipped',    label: 'تم الشحن',     cls: 'bg-purple-100 text-purple-800' },
  { value: 'delivered',  label: 'تم التسليم',   cls: 'bg-green-100 text-green-800' },
  { value: 'cancelled',  label: 'ملغي',         cls: 'bg-red-100 text-red-800' },
];

function buildWazeLink(city: string, street: string, apartment?: string) {
  const addr = [street, apartment, city].filter(Boolean).join(', ');
  return `https://waze.com/ul?q=${encodeURIComponent(addr)}&navigate=yes`;
}

// Group flat items array into orders grouped by orderId
function groupByOrder(items: any[]): { orderId: string; order: any; items: any[] }[] {
  const map = new Map<string, { orderId: string; order: any; items: any[] }>();
  for (const item of items) {
    const oid = item.orderId || item.id;
    if (!map.has(oid)) {
      map.set(oid, { orderId: oid, order: item.order || {}, items: [] });
    }
    map.get(oid)!.items.push(item);
  }
  return Array.from(map.values());
}

export default function VendorOrdersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const copyWazeLink = (link: string) => {
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(link);
      setTimeout(() => setCopiedLink(null), 2000);
    });
  };

  useEffect(() => {
    ordersApi.getMyOrders()
      .then((r) => setItems(r.data || []))
      .catch(() => toast.error('تعذر تحميل الطلبات'))
      .finally(() => setLoading(false));
  }, []);

  // Filter: show an order group if at least one item matches the filter
  const filteredItems = filter === 'all'
    ? items
    : items.filter((i) => (i.itemStatus || 'pending') === filter);

  const grouped = groupByOrder(filteredItems);

  const updateStatus = async (itemId: string, status: string) => {
    setUpdatingId(itemId);
    try {
      await ordersApi.updateItemStatus(itemId, status);
      setItems((prev) => prev.map((i) => i.id === itemId ? { ...i, itemStatus: status } : i));
      toast.success('تم تحديث الحالة');
    } catch {
      toast.error('فشل تحديث الحالة');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusInfo = (status: string) =>
    ITEM_STATUSES.find((s) => s.value === status) || ITEM_STATUSES[0];

  return (
    <VendorLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">طلباتي</h1>
        <p className="text-sm text-gray-500 mt-1">إدارة طلبات منتجاتك وتحديث حالتها</p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap mb-4">
        {[{ value: 'all', label: 'الكل' }, ...ITEM_STATUSES].map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filter === s.value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s.label}
            {s.value !== 'all' && (
              <span className="mr-1 opacity-70">
                ({items.filter((i) => (i.itemStatus || 'pending') === s.value).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="card animate-pulse h-40" />)}
        </div>
      ) : grouped.length === 0 ? (
        <div className="card text-center py-12">
          <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">لا توجد طلبات</p>
          <p className="text-xs text-gray-400 mt-1">ستظهر هنا طلبات منتجاتك عند ورودها</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ orderId, order, items: groupItems }) => {
            const customerName = order.shippingFullNameAr || order.guestName || 'غير محدد';
            const customerPhone = order.shippingPhone || order.guestPhone || '';
            const wazeCity = order.shippingCity || '';
            const wazeStreet = order.shippingStreet || '';
            const apartment = order.shippingApartment || '';
            const wazeLink = wazeCity && wazeStreet ? buildWazeLink(wazeCity, wazeStreet, apartment) : null;
            const orderDate = order.createdAt
              ? new Date(order.createdAt).toLocaleDateString('ar-IL', {
                  year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
                })
              : '';

            // Overall order status: use worst-case item status
            const statusPriority = ['cancelled', 'pending', 'confirmed', 'processing', 'shipped', 'delivered'];
            const overallStatus = groupItems.reduce((worst, item) => {
              const a = statusPriority.indexOf(worst);
              const b = statusPriority.indexOf(item.itemStatus || 'pending');
              return b < a ? item.itemStatus || 'pending' : worst;
            }, groupItems[0]?.itemStatus || 'pending');
            const overallStatusInfo = getStatusInfo(overallStatus);

            // Total vendor cost for this order group
            const totalVendorCost = groupItems.reduce((sum, item) => {
              const vp = Number(item.vendorPriceAtPurchase || item.priceAtPurchase || 0);
              const sf = Number(item.shippingFeeAtPurchase || 0);
              return sum + (vp + sf) * item.quantity;
            }, 0);

            return (
              <div key={orderId} className="card border border-gray-200 overflow-hidden">
                {/* Order header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">
                      طلب #{orderId.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{orderDate}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{groupItems.length} منتج</span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${overallStatusInfo.cls}`}>
                      {overallStatusInfo.label}
                    </span>
                  </div>
                </div>

                {/* Items list */}
                <div className="space-y-3 mb-4">
                  {groupItems.map((item) => {
                    const productName = item.productNameAr || item.productNameHe || '';
                    const vendorPrice = Number(item.vendorPriceAtPurchase || item.priceAtPurchase || 0);
                    const shippingFee = Number(item.shippingFeeAtPurchase || 0);
                    const itemStatus = item.itemStatus || 'pending';
                    const statusInfo = getStatusInfo(itemStatus);

                    // Color + delivery time
                    const colorInfo = item.selectedColor ? getColorByKey(item.selectedColor) : null;
                    const deliveryLabel = item.deliveryTimeAtPurchase ? getDeliveryLabelAr(item.deliveryTimeAtPurchase) : null;

                    return (
                      <div key={item.id} className="bg-gray-50 rounded-xl p-3">
                        <div className="flex items-center gap-3 mb-3">
                          {item.productImageUrl ? (
                            <img
                              src={item.productImageUrl}
                              alt={productName}
                              className="w-14 h-14 rounded-lg object-cover border border-gray-200 shrink-0"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-gray-200 flex items-center justify-center shrink-0">
                              <Package className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">{productName}</p>
                            <p className="text-xs text-gray-500 mt-0.5">الكمية: {item.quantity}</p>
                            <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo.cls}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                          <div className="text-left shrink-0">
                            <p className="text-xs text-gray-400 mb-0.5">سعرك</p>
                            <p className="font-bold text-primary-600 text-sm">
                              ₪{(vendorPrice * item.quantity).toFixed(0)}
                            </p>
                            {shippingFee > 0 && (
                              <p className="text-xs text-gray-500">+ ₪{shippingFee} شحن</p>
                            )}
                          </div>
                        </div>

                        {/* Color + Delivery time row */}
                        {(colorInfo || deliveryLabel) && (
                          <div className="flex flex-wrap gap-4 mb-3 pb-2 border-b border-gray-200">
                            {colorInfo && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">اللون:</span>
                                <span
                                  className="inline-block rounded"
                                  style={{
                                    width: 18,
                                    height: 18,
                                    backgroundColor: colorInfo.hex,
                                    border: colorInfo.hex === '#FFFFFF' || colorInfo.hex === '#E5D3B3'
                                      ? '1.5px solid #d1d5db'
                                      : '1.5px solid rgba(0,0,0,0.15)',
                                  }}
                                />
                                <span className="text-xs font-medium text-gray-700">{colorInfo.nameAr}</span>
                              </div>
                            )}
                            {deliveryLabel && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">مدة التوصيل:</span>
                                <span className="text-xs font-medium text-gray-700">{deliveryLabel}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Per-item status update */}
                        <div className="border-t border-gray-200 pt-2">
                          <p className="text-xs text-gray-400 mb-1.5">تحديث الحالة:</p>
                          <div className="flex gap-1.5 flex-wrap">
                            {ITEM_STATUSES.filter((s) => s.value !== itemStatus).map((s) => (
                              <button
                                key={s.value}
                                onClick={() => updateStatus(item.id, s.value)}
                                disabled={updatingId === item.id}
                                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all disabled:opacity-50 ${s.cls} hover:opacity-80`}
                              >
                                {updatingId === item.id ? '...' : s.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Total vendor cost */}
                {groupItems.length > 1 && (
                  <div className="bg-primary-50 rounded-lg px-3 py-2 mb-4 flex justify-between items-center">
                    <span className="text-xs text-gray-600">إجمالي مستحقاتك</span>
                    <span className="font-bold text-primary-700 text-sm">₪{totalVendorCost.toFixed(0)}</span>
                  </div>
                )}

                {/* Customer info */}
                <div className="border-t border-gray-100 pt-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <User className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="font-medium">{customerName}</span>
                  </div>
                  {customerPhone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                      <a href={`tel:${customerPhone}`} className="text-primary-600 hover:underline font-medium" dir="ltr">
                        {customerPhone}
                      </a>
                    </div>
                  )}
                  {wazeLink && (
                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-gray-400 shrink-0" />
                      <div className="flex items-center gap-2">
                        <a
                          href={wazeLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 bg-[#05C8F7] text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#04b5e0] transition-colors"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          التنقل عبر Waze
                        </a>
                        <button
                          onClick={() => copyWazeLink(wazeLink!)}
                          className="flex items-center gap-1 bg-gray-100 text-gray-600 text-xs font-medium px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors"
                          title="نسخ الرابط"
                        >
                          {copiedLink === wazeLink ? (
                            <><Check className="w-3.5 h-3.5 text-green-600" /><span className="text-green-600">تم النسخ</span></>
                          ) : (
                            <><Copy className="w-3.5 h-3.5" />نسخ</>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </VendorLayout>
  );
}
