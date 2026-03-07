'use client';
import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Tag, ChevronDown, ChevronRight, FolderOpen, Folder } from 'lucide-react';
import { categoriesApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface Category {
  id: string;
  nameHe: string;
  nameAr?: string;
  nameEn?: string;
  children?: Category[];
  parent?: { id: string } | null;
}

const BLANK = { nameHe: '', nameAr: '', nameEn: '', parentId: '' };

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [allFlat, setAllFlat] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const loadAll = async () => {
    const [treeRes, flatRes] = await Promise.all([
      categoriesApi.getAll(),
      categoriesApi.getFlat(),
    ]);
    setCategories(treeRes.data || []);
    setAllFlat(flatRes.data || []);
  };

  useEffect(() => { loadAll().finally(() => setLoading(false)); }, []);

  const toggle = (id: string) =>
    setExpanded(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const openNew = (parentId = '') => { setEditId(null); setForm({ ...BLANK, parentId }); setShowForm(true); };
  const openEdit = (cat: Category) => {
    setEditId(cat.id);
    setForm({ nameHe: cat.nameHe, nameAr: cat.nameAr || '', nameEn: cat.nameEn || '', parentId: cat.parent?.id || '' });
    setShowForm(true);
  };
  const reset = () => { setShowForm(false); setEditId(null); setForm(BLANK); };

  const save = async () => {
    if (!form.nameHe.trim()) { toast.error('שם בעברית חובה'); return; }
    setSaving(true);
    try {
      const payload: any = { nameHe: form.nameHe.trim(), nameAr: form.nameAr || undefined, nameEn: form.nameEn || undefined };
      if (editId) {
        payload.parentId = form.parentId || null;
        await categoriesApi.update(editId, payload);
        toast.success('קטגוריה עודכנה');
      } else {
        if (form.parentId) payload.parentId = form.parentId;
        await categoriesApi.create(payload);
        toast.success('קטגוריה נוספה');
      }
      reset();
      await loadAll();
    } finally { setSaving(false); }
  };

  const del = async (id: string, name: string) => {
    if (!confirm(`למחוק "${name}"? תת-הקטגוריות שלה יימחקו גם כן.`)) return;
    await categoriesApi.delete(id);
    toast.success('קטגוריה נמחקה');
    await loadAll();
  };

  const parentOptions = allFlat.filter(c => !c.parent && c.id !== editId);

  const renderCat = (cat: Category, depth = 0): React.ReactNode => {
    const hasKids = (cat.children?.length ?? 0) > 0;
    const open = expanded.has(cat.id);
    return (
      <div key={cat.id}>
        <div className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 border-b border-gray-50"
          style={{ paddingRight: `${16 + depth * 28}px` }}>
          <button onClick={() => hasKids && toggle(cat.id)}
            className={`w-5 h-5 flex items-center justify-center text-gray-400 ${hasKids ? 'hover:text-gray-700 cursor-pointer' : 'cursor-default'}`}>
            {hasKids ? (open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />) : <span className="w-4" />}
          </button>
          {hasKids
            ? <FolderOpen className={`w-4 h-4 shrink-0 ${depth === 0 ? 'text-primary-500' : 'text-blue-400'}`} />
            : <Tag className="w-4 h-4 shrink-0 text-gray-400" />}
          <div className="flex-1 min-w-0">
            <span className={`font-medium text-gray-900 ${depth === 0 ? 'text-sm' : 'text-xs'}`}>{cat.nameHe}</span>
            {cat.nameAr && <span className="text-xs text-gray-500 mr-2" dir="rtl">{cat.nameAr}</span>}
            {hasKids && <span className="text-xs text-gray-400 mr-1">({cat.children!.length})</span>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {depth === 0 && (
              <button onClick={() => openNew(cat.id)} title="הוסף תת-קטגוריה"
                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
            <button onClick={() => openEdit(cat)} title="עריכה"
              className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
              <Edit className="w-4 h-4" />
            </button>
            <button onClick={() => del(cat.id, cat.nameHe)} title="מחיקה"
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        {hasKids && open && cat.children!.map(child => renderCat(child, depth + 1))}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ניהול קטגוריות</h1>
          <p className="text-sm text-gray-500 mt-1">לחץ <strong>+</strong> על קטגוריה ראשית כדי להוסיף תת-קטגוריה</p>
        </div>
        <button onClick={() => openNew()} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />קטגוריה ראשית
        </button>
      </div>

      {showForm && (
        <div className="card mb-6 border-2 border-primary-200 bg-primary-50/30">
          <h3 className="font-semibold text-gray-900 mb-4 text-sm">
            {editId ? 'עריכת קטגוריה' : form.parentId ? 'הוספת תת-קטגוריה' : 'קטגוריה ראשית חדשה'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">שם בעברית *</label>
              <input value={form.nameHe} onChange={e => setForm({ ...form, nameHe: e.target.value })}
                className="input-field" placeholder="מחשבים ולפטופים" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">الاسم بالعربية</label>
              <input value={form.nameAr} onChange={e => setForm({ ...form, nameAr: e.target.value })}
                className="input-field" placeholder="أجهزة الكمبيوتر" dir="rtl" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">English Name</label>
              <input value={form.nameEn} onChange={e => setForm({ ...form, nameEn: e.target.value })}
                className="input-field" placeholder="Computers and Laptops" />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-700 mb-1">שייך לקטגוריה ראשית (ריק = קטגוריה ראשית)</label>
            <select value={form.parentId} onChange={e => setForm({ ...form, parentId: e.target.value })} className="input-field">
              <option value="">קטגוריה ראשית</option>
              {parentOptions.map(c => (
                <option key={c.id} value={c.id}>{c.nameHe}{c.nameAr ? ` / ${c.nameAr}` : ''}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="btn-primary text-sm px-6">{saving ? 'שומר...' : 'שמור'}</button>
            <button onClick={reset} className="btn-secondary text-sm px-6">ביטול</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="card animate-pulse h-12" />)}</div>
      ) : categories.length === 0 ? (
        <div className="card text-center py-12">
          <Tag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 mb-4">אין קטגוריות עדיין</p>
          <button onClick={() => openNew()} className="btn-primary text-sm inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />הוסף קטגוריה ראשונה
          </button>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-100 px-4 py-2 flex items-center gap-2 text-xs text-gray-500">
            <Folder className="w-3.5 h-3.5" />
            <span>{categories.length} קטגוריות ראשיות · {allFlat.filter(c => c.parent).length} תת-קטגוריות</span>
            <button onClick={() => setExpanded(new Set(categories.map(c => c.id)))}
              className="mr-auto text-primary-600 hover:underline">פתח הכל</button>
            <button onClick={() => setExpanded(new Set())} className="text-gray-400 hover:underline">סגור הכל</button>
          </div>
          {categories.map(cat => renderCat(cat))}
        </div>
      )}
    </div>
  );
}
