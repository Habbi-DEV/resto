import { useEffect, useState } from 'react';
import { ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Category, Product } from '../../lib/types';
import { api } from '../../lib/api';
import { money } from '../../lib/format';
import Modal from '../../components/ui/Modal';
import Spinner from '../../components/ui/Spinner';

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  category_id: '',
  image_url: '',
  stock: '20',
  is_available: true,
};

export default function MenuManagePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [newCat, setNewCat] = useState({ name: '', icon: '🍽️' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  const load = () => {
    Promise.all([
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/products').then((r) => r.json()),
    ])
      .then(([c, p]) => {
        setCategories(Array.isArray(c) ? c : []);
        setProducts(Array.isArray(p) ? p : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const catName = (id: number | null) => categories.find((c) => c.id === id)?.name ?? '—';

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError('');
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description,
      price: String(p.price),
      category_id: p.category_id ? String(p.category_id) : '',
      image_url: p.image_url,
      stock: String(p.stock),
      is_available: p.is_available,
    });
    setError('');
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.price || isNaN(Number(form.price))) {
      setError('A name and a valid price are required.');
      return;
    }
    setSaving(true);
    setError('');
    const payload = {
      name: form.name.trim(),
      description: form.description,
      price: Number(form.price),
      category_id: form.category_id ? Number(form.category_id) : null,
      image_url: form.image_url,
      stock: Number(form.stock) || 0,
      is_available: form.is_available,
    };
    try {
      if (editing) {
        await api('/api/products', { method: 'PUT', body: JSON.stringify({ id: editing.id, ...payload }) });
      } else {
        await api('/api/products', { method: 'POST', body: JSON.stringify(payload) });
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async (p: Product) => {
    if (!confirm(`Delete "${p.name}" from the menu?`)) return;
    await api('/api/products', { method: 'DELETE', body: JSON.stringify({ id: p.id }) }).catch(console.error);
    load();
  };

  const toggleAvailable = async (p: Product) => {
    await api('/api/products', {
      method: 'PUT',
      body: JSON.stringify({ id: p.id, is_available: !p.is_available }),
    }).catch(console.error);
    load();
  };

  const addCategory = async () => {
    if (!newCat.name.trim()) return;
    await api('/api/categories', { method: 'POST', body: JSON.stringify(newCat) }).catch(console.error);
    setNewCat({ name: '', icon: '🍽️' });
    load();
  };

  const toggleCategory = async (c: Category) => {
    await api('/api/categories', { method: 'PUT', body: JSON.stringify({ id: c.id, is_active: !c.is_active }) }).catch(console.error);
    load();
  };

  const removeCategory = async (c: Category) => {
    if (!confirm(`Delete category "${c.name}"? Its products will stay but become uncategorized.`)) return;
    await api('/api/categories', { method: 'DELETE', body: JSON.stringify({ id: c.id }) }).catch(console.error);
    load();
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = String(reader.result).split(',')[1];
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: file.name, fileBase64: base64, contentType: file.type }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Upload failed');
          setForm((f) => ({ ...f, image_url: data.url }));
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
    }
  };

  if (loading) return <Spinner label="Loading the menu…" />;

  return (
    <div className="p-4 md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-zinc-900">Menu management</h1>
          <p className="text-sm text-zinc-500">{products.length} products · {categories.length} categories</p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-orange-500/30 transition hover:bg-brand-600">
          <Plus size={16} /> Add product
        </button>
      </div>

      {/* categories */}
      <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
        <h2 className="mb-3 font-display text-sm font-bold text-zinc-900">Categories</h2>
        <div className="flex flex-wrap items-center gap-2">
          {categories.map((c) => (
            <div key={c.id} className={`flex items-center gap-2 rounded-full border py-1.5 pl-3 pr-1.5 text-xs font-semibold ${c.is_active ? 'border-zinc-200 bg-white text-zinc-700' : 'border-dashed border-zinc-200 bg-zinc-50 text-zinc-400'}`}>
              <span>{c.icon} {c.name}</span>
              <button onClick={() => toggleCategory(c)} title={c.is_active ? 'Deactivate' : 'Activate'} className={`h-2 w-2 rounded-full ${c.is_active ? 'bg-brand-500' : 'bg-zinc-300'}`} />
              <button onClick={() => removeCategory(c)} className="text-zinc-300 hover:text-red-500"><Trash2 size={12} /></button>
            </div>
          ))}
          <div className="flex items-center gap-1.5">
            <input value={newCat.icon} onChange={(e) => setNewCat({ ...newCat, icon: e.target.value })} className="w-12 rounded-lg border border-zinc-200 px-2 py-1.5 text-center text-xs" maxLength={4} />
            <input value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} placeholder="New category…" className="w-36 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs outline-none focus:border-brand-400" />
            <button onClick={addCategory} className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-zinc-800">Add</button>
          </div>
        </div>
      </div>

      {/* products */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((p) => (
          <div key={p.id} className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-100">
            <img src={p.image_url || '/images/menu/classic-burger.jpg'} alt="" className="h-20 w-20 shrink-0 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-sm font-bold text-zinc-900">{p.name}</p>
                <span className="shrink-0 font-display text-sm font-bold text-burnt">{money(p.price)}</span>
              </div>
              <p className="text-[11px] text-zinc-400">{catName(p.category_id)} · stock {p.stock}</p>
              <div className="mt-2 flex items-center gap-1.5">
                <button
                  onClick={() => toggleAvailable(p)}
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${p.is_available ? 'bg-brand-50 text-brand-700' : 'bg-zinc-100 text-zinc-400'}`}
                >
                  {p.is_available ? 'Available' : 'Hidden'}
                </button>
                <button onClick={() => openEdit(p)} className="ml-auto rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-50 hover:text-brand-600"><Pencil size={14} /></button>
                <button onClick={() => removeProduct(p)} className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* product modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit product' : 'New product'}>
        <div className="space-y-3">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Product name *" className="w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" rows={2} className="w-full resize-none rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">Price € *</label>
              <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} type="number" step="0.10" min="0" className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">Stock</label>
              <input value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} type="number" min="0" className="w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-brand-400" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">Category</label>
              <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="w-full rounded-xl border border-zinc-200 bg-white px-2 py-2.5 text-sm outline-none focus:border-brand-400">
                <option value="">None</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">Photo</label>
            <div className="flex items-center gap-3">
              {form.image_url ? (
                <img src={form.image_url} alt="" className="h-14 w-14 rounded-xl object-cover ring-1 ring-zinc-200" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-50 text-zinc-300"><ImagePlus size={20} /></div>
              )}
              <label className="cursor-pointer rounded-xl border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50">
                {uploading ? 'Uploading…' : 'Upload image'}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
              </label>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
            <input type="checkbox" checked={form.is_available} onChange={(e) => setForm({ ...form, is_available: e.target.checked })} className="h-4 w-4 accent-orange-500" />
            Visible on the e-menu
          </label>

          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{error}</p>}

          <button onClick={save} disabled={saving || uploading} className="w-full rounded-xl bg-brand-500 py-3 font-display text-sm font-bold text-white shadow-lg shadow-orange-500/30 hover:bg-brand-600 disabled:opacity-60">
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create product'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
