import axios from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isLoginEndpoint = err.config?.url?.includes('/auth/login');
    if (err.response?.status === 401 && !isLoginEndpoint) {
      Cookies.remove('token');
      if (typeof window !== 'undefined') {
        const isAdminPath = window.location.pathname.startsWith('/admin');
        window.location.href = isAdminPath ? '/admin-login' : '/auth/login';
      }
    }
    return Promise.reject(err);
  }
);

// ─── Auth ───────────────────────────────────────────────
export const authApi = {
  registerCustomer: (data: any) => api.post('/auth/register/customer', data),
  login: (data: any) => api.post('/auth/login', data),
};

// ─── Products ───────────────────────────────────────────
export const productsApi = {
  getPublic: (params?: any) => api.get('/products/public', { params }),
  getById: (id: string) => api.get(`/products/public/${id}`),
  // Admin - correct paths
  getPending: () => api.get('/products/admin/pending'),
  approve: (id: string, adminNote?: string) => api.put(`/products/admin/${id}/approve`, { adminNote }),
  reject: (id: string, reason: string) => api.put(`/products/admin/${id}/reject`, { reason }),
  updateTranslation: (id: string, nameHe: string, descriptionHe: string) =>
    api.put(`/products/admin/${id}/translation`, { nameHe, descriptionHe }),
  getAll: (params?: any) => api.get('/products/admin/all', { params }),
  getByIdAdmin: (id: string) => api.get(`/products/admin/${id}`),
  adminUpdate: (id: string, data: any) => api.put(`/products/admin/${id}`, data),
  adminDelete: (id: string) => api.delete(`/products/admin/${id}`),
  toggleHide: (id: string) => api.patch(`/products/admin/${id}/toggle-hide`),
};

// ─── Categories ─────────────────────────────────────────
export const categoriesApi = {
  getAll: () => api.get('/categories'),
  getFlat: () => api.get('/categories/flat'),
  getById: (id: string) => api.get(`/categories/${id}`),
  create: (data: any) => api.post('/categories/admin', data),
  update: (id: string, data: any) => api.put(`/categories/admin/${id}`, data),
  delete: (id: string) => api.delete(`/categories/admin/${id}`),
};

// ─── Orders ─────────────────────────────────────────────
export const ordersApi = {
  create: (data: any) => api.post('/orders', data),
  getMyOrders: () => api.get('/orders/my'),
  // Admin - correct paths
  getAll: (params?: any) => api.get('/orders/admin', { params }),
  updateStatus: (id: string, status: string) => api.put(`/orders/admin/${id}/status`, { status }),
  getDashboardStats: () => api.get('/orders/admin/reports/dashboard'),
  getReportByVendor: (vendorId?: string) =>
    api.get('/orders/admin/reports/by-vendor', { params: vendorId ? { vendorId } : {} }),
};

// ─── Vendors (Admin) ────────────────────────────────────
export const vendorsApi = {
  getAll: (status?: string) => api.get('/vendors/admin', { params: status ? { status } : {} }),
  approve: (id: string) => api.put(`/vendors/admin/${id}/approve`),
  reject: (id: string, reason: string) => api.put(`/vendors/admin/${id}/reject`, { reason }),
  suspend: (id: string) => api.put(`/vendors/admin/${id}/suspend`),
  getById: (id: string) => api.get(`/vendors/admin/${id}`),
};

export default api;
