'use client';
import { useEffect, useState } from 'react';
import { ShoppingBag, MapPin, Phone, User, Navigation } from 'lucide-react';
import { ordersApi } from '@/lib/api';
import VendorLayout from '@/components/layout/VendorLayout';

const statusMap: Record<string, { label: string; cls: string }> = {
  pending:    { label: 'معلق',          cls: 'badge-pending' },
  confirmed:  { label: 'مؤكد',         cls: 'badge-approved' },
  processing: { label: 'قيد التنفيذ',  cls: 'bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full' },
  shipped:    { label: 'تم الشحن',     cls: 'bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full' },
  delivered:  { label: 'تم التسليم',   cls: 'badge-approved' },
  cancelled:  { label: 'ملغي',         cls: 'badge-rejected' },
};

function buildWazeLink(city: string, street: string, apartment?: string) {
  const address = [street, apartment, city].filter(Boolean).join(', ');
  const encoded = encodeURIComponent(address);
  return `https://waze.com/ul?q=${encoded}&navigate=yes`;
}

export default function VendorOrdersPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    ordersApi.getMyOrders()
      .then((r) => setItems(r.data || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? items : items.filter((i) => i.order?.status === filter);

  return (
    <VendorLayout>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">الطلبات</h1>

      <div className="flex gap-2 mb-4 flex-wrap">
        {['all','pending','confirmed','processing','shipped','delivered','cancelled'].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === s ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {{ all:'الكل', pending:'معلق', confirmed:'مؤكد', processing:'قيد التنفيذ', shipped:'مشحون', delivered:'مسلم', cancelled:'ملغي' }[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="card animate-pulse h-28" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">لا توجد طلبات</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => {
            const order = item.order || {};
            const s = statusMap[order.status] || statusMap.pending;
            const customerName = order.guestName || order.shippingFullName || order.customer?.fullName || 'لقوح';
            const customerPhone = order.guestPhone || order.shippingPhone || order.customer?.phone || '';
            const city = order.shippingCity || '';
            const street = order.shippingStreet || '';
            const apartment = order.shippingApartment || '';
            const wazeLink = city && street ? buildWazeLink(city, street, apartment) : null;

            return (
              <div key={item.id} className="card border border-gray-200">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      طلب #{(item.orderId || item.id || '').slice(0,8).toUpperCase()}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString('ar-IL', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' }) : ''}
                    </p>
                  </div>
                  <span className={s.cls}>{s.label}</span>
                </div>

                <div className="bg-gray-50 rounded-xl p-3 mb-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {item.productImageUrl && (
                        <img src={item.productImageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-800">{item.productNameHe}</p>
                        <p className="text-xs text-gray-500">كمية: {item.quantity}</p>
                      </div>
                    </div>
                    <p className="font-bold text-primary-600">&#8362;{Number(item.lineTotal || 0).toFixed(0)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <User className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>{customerName}</span>
                  </div>

                  {customerPhone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                      <a href={`tel:${customerPhone}`} className="text-primary-600 hover:underline font-medium">
                        {customerPhone}
                      </a>
                    </div>
                  )}

                  {city && street && (
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 text-sm text-gray-700">
                        <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                        <span>{street}{apartment ? `, ${apartment}` : ''}, {city}</span>
                      </div>
                      {wazeLink && (
                        <a
                          href={wazeLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 bg-[#05C8F7] text-white text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-[#04b5e0] transition-colors shrink-0"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          Waze
                        </a>
                      )}
                    </div>
                  )}

                  {order.shippingNotes && (
                    <p className="text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                      ملاحظات: {order.shippingNotes}
                    </p>
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
