import { useEffect, useState } from 'react';
import { Droplet, ImagePlus, Layers, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { Category, Product, ProductImage, Sauce, Supplement } from '../../lib/types';
import { api } from '../../lib/api';
import supabase from '../../lib/supabase';
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
  const [sauces, setSauces] = useState<Sauce[]>([]);
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [loading, setLoading] = useState(true);

  const [newCat, setNewCat] = useState({ name: '', icon: '🍽️' });
  const [newSauce, setNewSauce] = useState({ name: '', price: '', image_url: '' });
  const [savingSauce, setSavingSauce] = useState(false);
  const [uploadingSaucePhoto, setUploadingSaucePhoto] = useState<'new' | number | null>(null);
  const [newSupplement, setNewSupplement] = useState({ name: '', price: '', image_url: '' });
  const [savingSupplement, setSavingSupplement] = useState(false);
  const [uploadingSupplementPhoto, setUploadingSupplementPhoto] = useState<'new' | number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  // Gallery photos (in addition to the single cover `image_url`). Saved
  // products keep theirs in `gallery`; a brand-new product has nowhere to
  // attach photos to yet, so uploads sit in `pendingGallery` (URLs already
  // in storage) until `save()` creates the product and links them.
  const [gallery, setGallery] = useState<ProductImage[]>([]);
  const [pendingGallery, setPendingGallery] = useState<string[]>([]);
  const [galleryUploading, setGalleryUploading] = useState(false);

  // Which supplements (from the general catalog above) this specific
  // product offers — set from `product.supplements` when editing, sent
  // back as `supplement_ids` on save. Unlike sauces, this is a per-product
  // pick, not category-driven, so it lives on the product form itself.
  const [selectedSupplementIds, setSelectedSupplementIds] = useState<number[]>([]);

  const load = () => {
    Promise.all([
      fetch('/api/categories').then((r) => r.json()),
      fetch('/api/products').then((r) => r.json()),
      fetch('/api/sauces').then((r) => r.json()),
      fetch('/api/sauces?type=supplement').then((r) => r.json()),
    ])
      .then(([c, p, s, sup]) => {
        setCategories(Array.isArray(c) ? c : []);
        setProducts(Array.isArray(p) ? p : []);
        setSauces(Array.isArray(s) ? s : []);
        setSupplements(Array.isArray(sup) ? sup : []);
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
    setGallery([]);
    setPendingGallery([]);
    setSelectedSupplementIds([]);
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
    setGallery(p.images ?? []);
    setPendingGallery([]);
    setSelectedSupplementIds((p.supplements ?? []).map((s) => s.id));
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
      supplement_ids: selectedSupplementIds,
    };
    try {
      if (editing) {
        await api('/api/products', { method: 'PUT', body: JSON.stringify({ id: editing.id, ...payload }) });
      } else {
        const created = await api<Product>('/api/products', { method: 'POST', body: JSON.stringify(payload) });
        // Flush any gallery photos uploaded before the product existed.
        if (pendingGallery.length) {
          await Promise.all(
            pendingGallery.map((url) =>
              api('/api/product-images', { method: 'POST', body: JSON.stringify({ product_id: created.id, url }) }),
            ),
          ).catch(console.error);
        }
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

  const toggleCategorySauces = async (c: Category) => {
    await api('/api/categories', { method: 'PUT', body: JSON.stringify({ id: c.id, allows_sauces: !c.allows_sauces }) }).catch(console.error);
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
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData.session?.access_token;
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
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

  /** Uploads to storage first, then either attaches to the saved product or
   *  queues the URL for a not-yet-created one (see `pendingGallery`). */
  const addGalleryFiles = async (files: FileList) => {
    setGalleryUploading(true);
    setError('');
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      for (const file of Array.from(files)) {
        const base64: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({ fileName: file.name, fileBase64: base64, contentType: file.type }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Upload failed');

        if (editing) {
          const saved = await api<ProductImage>('/api/product-images', {
            method: 'POST',
            body: JSON.stringify({ product_id: editing.id, url: data.url }),
          });
          setGallery((g) => [...g, saved]);
        } else {
          setPendingGallery((g) => [...g, data.url]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gallery upload failed');
    } finally {
      setGalleryUploading(false);
    }
  };

  const removeGalleryImage = async (img: ProductImage) => {
    setGallery((g) => g.filter((x) => x.id !== img.id));
    await api('/api/product-images', { method: 'DELETE', body: JSON.stringify({ id: img.id }) }).catch(console.error);
  };

  const removePendingGallery = (url: string) => setPendingGallery((g) => g.filter((u) => u !== url));

  /** Shared with both the "new sauce" form (target 'new') and an existing
   *  sauce's own photo swatch (target = that sauce's id). */
  const uploadSaucePhoto = async (file: File, target: 'new' | number) => {
    setUploadingSaucePhoto(target);
    setError('');
    try {
      const base64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ fileName: file.name, fileBase64: base64, contentType: file.type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      if (target === 'new') {
        setNewSauce((s) => ({ ...s, image_url: data.url }));
      } else {
        await api('/api/sauces', { method: 'PUT', body: JSON.stringify({ id: target, image_url: data.url }) });
        load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sauce photo upload failed');
    } finally {
      setUploadingSaucePhoto(null);
    }
  };

  const addSauce = async () => {
    if (!newSauce.name.trim()) return;
    setSavingSauce(true);
    try {
      await api('/api/sauces', {
        method: 'POST',
        body: JSON.stringify({ name: newSauce.name.trim(), price: Number(newSauce.price) || 0, image_url: newSauce.image_url || null }),
      });
      setNewSauce({ name: '', price: '', image_url: '' });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not add sauce');
    } finally {
      setSavingSauce(false);
    }
  };

  const toggleSauceActive = async (s: Sauce) => {
    await api('/api/sauces', { method: 'PUT', body: JSON.stringify({ id: s.id, is_active: !s.is_active }) }).catch(console.error);
    load();
  };

  const removeSauce = async (s: Sauce) => {
    if (!confirm(`Delete sauce "${s.name}"?`)) return;
    await api('/api/sauces', { method: 'DELETE', body: JSON.stringify({ id: s.id }) }).catch(console.error);
    load();
  };

  /** Shared with both the "new supplement" form (target 'new') and an
   *  existing supplement's own photo swatch (target = that supplement's id). */
  const uploadSupplementPhoto = async (file: File, target: 'new' | number) => {
    setUploadingSupplementPhoto(target);
    setError('');
    try {
      const base64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ fileName: file.name, fileBase64: base64, contentType: file.type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      if (target === 'new') {
        setNewSupplement((s) => ({ ...s, image_url: data.url }));
      } else {
        await api('/api/sauces', { method: 'PUT', body: JSON.stringify({ id: target, type: 'supplement', image_url: data.url }) });
        load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Supplement photo upload failed');
    } finally {
      setUploadingSupplementPhoto(null);
    }
  };

  const addSupplement = async () => {
    if (!newSupplement.name.trim()) return;
    setSavingSupplement(true);
    try {
      await api('/api/sauces', {
        method: 'POST',
        body: JSON.stringify({
          type: 'supplement',
          name: newSupplement.name.trim(),
          price: Number(newSupplement.price) || 0,
          image_url: newSupplement.image_url || null,
        }),
      });
      setNewSupplement({ name: '', price: '', image_url: '' });
      load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not add supplement');
    } finally {
      setSavingSupplement(false);
    }
  };

  const toggleSupplementActive = async (s: Supplement) => {
    await api('/api/sauces', { method: 'PUT', body: JSON.stringify({ id: s.id, type: 'supplement', is_active: !s.is_active }) }).catch(console.error);
    load();
  };

  const removeSupplement = async (s: Supplement) => {
    if (!confirm(`Delete supplement "${s.name}"?`)) return;
    await api('/api/sauces', { method: 'DELETE', body: JSON.stringify({ id: s.id, type: 'supplement' }) }).catch(console.error);
    load();
  };

  const toggleProductSupplement = (id: number) =>
    setSelectedSupplementIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

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
              <button
                onClick={() => toggleCategorySauces(c)}
                title={c.allows_sauces ? 'Sauces offered on these products — click to turn off (e.g. drinks, desserts)' : 'Sauces are hidden for these products — click to turn on'}
                className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${c.allows_sauces ? 'bg-brand-50 text-brand-700' : 'bg-zinc-100 text-zinc-400'}`}
              >
                <Droplet size={10} />
              </button>
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

      {/* sauces */}
      <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
        <h2 className="mb-1 font-display text-sm font-bold text-zinc-900">Sauces</h2>
        <p className="mb-3 text-xs text-zinc-400">Optional add-ons shown on the product sheet — but only for categories with the 🥫 toggle on above (turn it off for Drinks, Desserts, etc). Hide a sauce here to pull it off the e-menu without deleting it.</p>
        <div className="flex flex-wrap items-start gap-3">
          {sauces.map((s) => (
            <div key={s.id} className="flex w-20 flex-col items-center gap-1.5 text-center">
              <label className="group relative h-16 w-16 cursor-pointer">
                {s.image_url ? (
                  <img src={s.image_url} alt="" className={`h-16 w-16 rounded-full object-cover ring-1 ring-zinc-200 ${s.is_active ? '' : 'opacity-40 grayscale'}`} />
                ) : (
                  <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-zinc-50 text-zinc-300 ring-1 ring-zinc-200 ${s.is_active ? '' : 'opacity-40'}`}>
                    <ImagePlus size={18} />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-zinc-900/0 text-transparent transition group-hover:bg-zinc-900/40 group-hover:text-white">
                  {uploadingSaucePhoto === s.id ? <span className="text-[9px] font-bold">…</span> : <Pencil size={13} />}
                </div>
                <input
                  type="file"
                  accept="image/*,.heic,.heif,.avif,.svg,.webp,.gif,.bmp,.tiff"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadSaucePhoto(e.target.files[0], s.id)}
                />
              </label>
              <p className="truncate text-[11px] font-bold text-zinc-700">{s.name}</p>
              {s.price > 0 && <p className="-mt-1 text-[10px] text-zinc-400">+{money(s.price)}</p>}
              <button onClick={() => toggleSauceActive(s)} title={s.is_active ? 'Hide from e-menu' : 'Show on e-menu'} className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${s.is_active ? 'bg-brand-50 text-brand-700' : 'bg-zinc-100 text-zinc-400'}`}>
                {s.is_active ? 'Visible' : 'Hidden'}
              </button>
              <button onClick={() => removeSauce(s)} className="text-zinc-300 hover:text-red-500"><Trash2 size={11} /></button>
            </div>
          ))}
          {sauces.length === 0 && <p className="text-xs text-zinc-400">No sauces yet — add your first one.</p>}
        </div>

        <div className="mt-4 flex items-end gap-2 border-t border-zinc-50 pt-3">
          <label className="group relative h-12 w-12 shrink-0 cursor-pointer">
            {newSauce.image_url ? (
              <img src={newSauce.image_url} alt="" className="h-12 w-12 rounded-full object-cover ring-1 ring-zinc-200" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-zinc-300 bg-zinc-50 text-zinc-300">
                <ImagePlus size={16} />
              </div>
            )}
            <input
              type="file"
              accept="image/*,.heic,.heif,.avif,.svg,.webp,.gif,.bmp,.tiff"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadSaucePhoto(e.target.files[0], 'new')}
            />
          </label>
          <input value={newSauce.name} onChange={(e) => setNewSauce({ ...newSauce, name: e.target.value })} placeholder="New sauce…" className="w-32 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs outline-none focus:border-brand-400" />
          <input value={newSauce.price} onChange={(e) => setNewSauce({ ...newSauce, price: e.target.value })} type="number" step="0.10" min="0" placeholder="Extra €" className="w-20 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs outline-none focus:border-brand-400" />
          <button onClick={addSauce} disabled={savingSauce || uploadingSaucePhoto === 'new'} className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-60">Add</button>
        </div>
      </div>

      {/* supplements */}
      <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-100">
        <h2 className="mb-1 font-display text-sm font-bold text-zinc-900">Supplements</h2>
        <p className="mb-3 text-xs text-zinc-400">Paid add-ons like double cheese, extra meat, kofta, double chicken… Unlike Sauces, which products offer a supplement is chosen per-product (open a product below → Supplements). Hide one here to pull it off every product without deleting it.</p>
        <div className="flex flex-wrap items-start gap-3">
          {supplements.map((s) => (
            <div key={s.id} className="flex w-20 flex-col items-center gap-1.5 text-center">
              <label className="group relative h-16 w-16 cursor-pointer">
                {s.image_url ? (
                  <img src={s.image_url} alt="" className={`h-16 w-16 rounded-full object-cover ring-1 ring-zinc-200 ${s.is_active ? '' : 'opacity-40 grayscale'}`} />
                ) : (
                  <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-zinc-50 text-zinc-300 ring-1 ring-zinc-200 ${s.is_active ? '' : 'opacity-40'}`}>
                    <ImagePlus size={18} />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-zinc-900/0 text-transparent transition group-hover:bg-zinc-900/40 group-hover:text-white">
                  {uploadingSupplementPhoto === s.id ? <span className="text-[9px] font-bold">…</span> : <Pencil size={13} />}
                </div>
                <input
                  type="file"
                  accept="image/*,.heic,.heif,.avif,.svg,.webp,.gif,.bmp,.tiff"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadSupplementPhoto(e.target.files[0], s.id)}
                />
              </label>
              <p className="truncate text-[11px] font-bold text-zinc-700">{s.name}</p>
              {s.price > 0 && <p className="-mt-1 text-[10px] text-zinc-400">+{money(s.price)}</p>}
              <button onClick={() => toggleSupplementActive(s)} title={s.is_active ? 'Hide from e-menu' : 'Show on e-menu'} className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${s.is_active ? 'bg-brand-50 text-brand-700' : 'bg-zinc-100 text-zinc-400'}`}>
                {s.is_active ? 'Visible' : 'Hidden'}
              </button>
              <button onClick={() => removeSupplement(s)} className="text-zinc-300 hover:text-red-500"><Trash2 size={11} /></button>
            </div>
          ))}
          {supplements.length === 0 && <p className="text-xs text-zinc-400">No supplements yet — add your first one.</p>}
        </div>

        <div className="mt-4 flex items-end gap-2 border-t border-zinc-50 pt-3">
          <label className="group relative h-12 w-12 shrink-0 cursor-pointer">
            {newSupplement.image_url ? (
              <img src={newSupplement.image_url} alt="" className="h-12 w-12 rounded-full object-cover ring-1 ring-zinc-200" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-zinc-300 bg-zinc-50 text-zinc-300">
                <ImagePlus size={16} />
              </div>
            )}
            <input
              type="file"
              accept="image/*,.heic,.heif,.avif,.svg,.webp,.gif,.bmp,.tiff"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadSupplementPhoto(e.target.files[0], 'new')}
            />
          </label>
          <input value={newSupplement.name} onChange={(e) => setNewSupplement({ ...newSupplement, name: e.target.value })} placeholder="New supplement…" className="w-32 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs outline-none focus:border-brand-400" />
          <input value={newSupplement.price} onChange={(e) => setNewSupplement({ ...newSupplement, price: e.target.value })} type="number" step="0.10" min="0" placeholder="Extra €" className="w-20 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs outline-none focus:border-brand-400" />
          <button onClick={addSupplement} disabled={savingSupplement || uploadingSupplementPhoto === 'new'} className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-zinc-800 disabled:opacity-60">Add</button>
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
            <input
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://…  (paste an image link, or upload below)"
              className="mb-2 w-full rounded-xl border border-zinc-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
            <div className="flex items-center gap-3">
              {form.image_url ? (
                <img src={form.image_url} alt="" className="h-14 w-14 rounded-xl object-cover ring-1 ring-zinc-200" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-50 text-zinc-300"><ImagePlus size={20} /></div>
              )}
              <label className="cursor-pointer rounded-xl border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-50">
                {uploading ? 'Uploading…' : 'Upload image'}
                <input type="file" accept="image/*,.heic,.heif,.avif,.svg,.webp,.gif,.bmp,.tiff" className="hidden" onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])} />
              </label>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">Gallery — additional photos</label>
            <div className="flex flex-wrap items-center gap-2">
              {gallery.map((img) => (
                <div key={img.id} className="group relative h-16 w-16 shrink-0">
                  <img src={img.url} alt="" className="h-16 w-16 rounded-xl object-cover ring-1 ring-zinc-200" />
                  <button
                    onClick={() => removeGalleryImage(img)}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-white shadow"
                    aria-label="Remove photo"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              {pendingGallery.map((url) => (
                <div key={url} className="group relative h-16 w-16 shrink-0">
                  <img src={url} alt="" className="h-16 w-16 rounded-xl object-cover ring-1 ring-zinc-200" />
                  <button
                    onClick={() => removePendingGallery(url)}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-white shadow"
                    aria-label="Remove photo"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
              <label className="flex h-16 w-16 shrink-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-zinc-300 text-zinc-400 hover:bg-zinc-50">
                <ImagePlus size={16} />
                <span className="text-[9px] font-bold">{galleryUploading ? '…' : 'Add'}</span>
                <input
                  type="file"
                  accept="image/*,.heic,.heif,.avif,.svg,.webp,.gif,.bmp,.tiff"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files?.length && addGalleryFiles(e.target.files)}
                />
              </label>
            </div>
            <p className="mt-1.5 text-[10px] text-zinc-400">Shown as a swipeable gallery on the product detail sheet, in addition to the cover photo above.</p>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase text-zinc-400">Supplements — offered on this product</label>
            {supplements.length === 0 ? (
              <p className="text-xs text-zinc-400">No supplements in the catalog yet — add some in the Supplements section above.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {supplements.map((s) => {
                  const active = selectedSupplementIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleProductSupplement(s.id)}
                      title={s.is_active ? undefined : 'Hidden from the e-menu — toggle it back on in the Supplements section above'}
                      className={`flex items-center gap-1.5 rounded-full border-2 py-1.5 pl-1.5 pr-3 text-xs font-bold transition ${
                        active ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-zinc-100 bg-white text-zinc-500 hover:border-zinc-200'
                      } ${s.is_active ? '' : 'opacity-50'}`}
                    >
                      {s.image_url ? (
                        <img src={s.image_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-100 text-zinc-400"><Layers size={12} /></span>
                      )}
                      {s.name}{s.price > 0 && <span className="opacity-60">+{money(s.price)}</span>}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="mt-1.5 text-[10px] text-zinc-400">Pick which supplements customers can add to this specific product. Unlike sauces, this isn't tied to the category.</p>
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
